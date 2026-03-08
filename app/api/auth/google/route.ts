import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`;

// Valid provider types
const VALID_PROVIDERS = ["gmail", "google_calendar"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

// Scopes for Gmail and Google Calendar
const SCOPES: Record<Provider, string[]> = {
    gmail: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
    ],
    google_calendar: [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
    ],
};

export async function GET(request: NextRequest) {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get("provider") as Provider | null;

    // Validate provider
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
        return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Generate state with provider info for CSRF protection
    const state = Buffer.from(
        JSON.stringify({
            provider,
            clerkId,
            timestamp: Date.now(),
        })
    ).toString("base64");

    // Build Google OAuth URL
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", SCOPES[provider].join(" "));
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl.toString());
}
