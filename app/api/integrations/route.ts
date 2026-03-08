import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserByClerkId } from "@/lib/user";

// Valid provider types
const VALID_PROVIDERS = ["gmail", "google_calendar", "telegram"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

export async function GET() {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user from database
        const user = await getUserByClerkId(clerkId);

        if (!user) {
            // Return empty integrations for users not yet in database
            return NextResponse.json({ integrations: [] });
        }

        // Get all integrations for the user
        const userIntegrations = await db
            .select({
                provider: integrations.provider,
            })
            .from(integrations)
            .where(eq(integrations.userId, user.id));

        // Transform to a simple list of provider keys
        const connectedProviders = userIntegrations.map((i) => i.provider);

        return NextResponse.json({
            integrations: connectedProviders,
        });
    } catch (error) {
        console.error("Error in GET /api/integrations:", error);
        return NextResponse.json(
            { error: "Internal server error", details: String(error) },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { provider } = await request.json();

        if (!provider) {
            return NextResponse.json({ error: "Provider required" }, { status: 400 });
        }

        // Validate provider is a known value
        if (!VALID_PROVIDERS.includes(provider as Provider)) {
            return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
        }

        // Get user from database
        const user = await getUserByClerkId(clerkId);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Delete the specific integration
        await db
            .delete(integrations)
            .where(
                and(
                    eq(integrations.userId, user.id),
                    eq(integrations.provider, provider)
                )
            );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in DELETE /api/integrations:", error);
        return NextResponse.json(
            { error: "Internal server error", details: String(error) },
            { status: 500 }
        );
    }
}
