import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { encryptToken } from "@/lib/encryption";
import { getOrCreateUser } from "@/lib/user";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`;

// Valid provider types
const VALID_PROVIDERS = ["gmail", "google_calendar"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
}

interface StateData {
    provider: Provider;
    clerkId: string;
    timestamp: number;
}

export async function GET(request: NextRequest) {
    // Verify user is authenticated
    const { userId: authenticatedClerkId } = await auth();

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors from Google
    if (error) {
        console.error("Google OAuth error:", error);
        return NextResponse.redirect(
            new URL(`/settings?error=${encodeURIComponent(error)}`, request.url)
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            new URL("/settings?error=missing_params", request.url)
        );
    }

    // Decode and validate state
    let stateData: StateData;
    try {
        stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
        return NextResponse.redirect(
            new URL("/settings?error=invalid_state", request.url)
        );
    }

    // Check state timestamp (valid for 10 minutes)
    const stateAge = Date.now() - stateData.timestamp;
    if (stateAge > 10 * 60 * 1000) {
        return NextResponse.redirect(
            new URL("/settings?error=expired_state", request.url)
        );
    }

    // Validate provider in state
    if (!VALID_PROVIDERS.includes(stateData.provider)) {
        return NextResponse.redirect(
            new URL("/settings?error=invalid_provider", request.url)
        );
    }

    // Verify authenticated user matches state's clerkId (CSRF protection)
    if (!authenticatedClerkId || authenticatedClerkId !== stateData.clerkId) {
        console.error("Auth mismatch:", { authenticatedClerkId, stateClerkId: stateData.clerkId });
        return NextResponse.redirect(
            new URL("/settings?error=auth_mismatch", request.url)
        );
    }

    try {
        // Exchange code for tokens
        console.log("Exchanging OAuth code for tokens...");
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error("Token exchange failed:", errorData);
            throw new Error(`Token exchange failed: ${errorData}`);
        }

        const tokens: TokenResponse = await tokenResponse.json();
        console.log("Token exchange successful");

        // Get or create user in database
        console.log("Getting/creating user:", stateData.clerkId);
        const user = await getOrCreateUser(stateData.clerkId);

        // Check if integration already exists
        const [existingIntegration] = await db
            .select()
            .from(integrations)
            .where(
                and(
                    eq(integrations.userId, user.id),
                    eq(integrations.provider, stateData.provider)
                )
            )
            .limit(1);

        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        const scopes = tokens.scope.split(" ");

        // Encrypt tokens before storage
        const encryptedAccessToken = encryptToken(tokens.access_token);
        const encryptedRefreshToken = encryptToken(tokens.refresh_token);

        if (existingIntegration) {
            // Update existing integration
            console.log(`Updating existing ${stateData.provider} integration`);
            await db
                .update(integrations)
                .set({
                    accessToken: encryptedAccessToken,
                    refreshToken: encryptedRefreshToken,
                    expiresAt,
                    scope: scopes,
                })
                .where(eq(integrations.id, existingIntegration.id));
        } else {
            // Create new integration
            console.log(`Creating new ${stateData.provider} integration`);
            await db.insert(integrations).values({
                userId: user.id,
                provider: stateData.provider,
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                expiresAt,
                scope: scopes,
            });
        }

        console.log(`✅ Successfully connected ${stateData.provider}`);

        // Redirect back to settings with success message
        return NextResponse.redirect(
            new URL(
                `/settings?success=${encodeURIComponent(stateData.provider)}`,
                request.url
            )
        );
    } catch (error) {
        console.error("OAuth callback error:", error);
        const errorMessage = error instanceof Error ? error.message : "oauth_failed";
        return NextResponse.redirect(
            new URL(`/settings?error=${encodeURIComponent(errorMessage)}`, request.url)
        );
    }
}
