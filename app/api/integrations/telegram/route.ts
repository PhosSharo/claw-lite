import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserByClerkId } from "@/lib/user";
import { encryptToken } from "@/lib/encryption";

export async function POST(request: Request) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { token } = body;

        if (!token || typeof token !== "string") {
            return NextResponse.json({ error: "Token is required" }, { status: 400 });
        }

        const user = await getUserByClerkId(clerkId);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://claw-lite.vercel.app";
        const webhookUrl = `${appUrl}/api/webhooks/telegram?userId=${user.id}`;

        // 1. Validate the token and set the webhook with Telegram
        const telegramRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`, {
            method: "POST",
        });

        if (!telegramRes.ok) {
            const errorText = await telegramRes.text();
            console.error("Telegram setWebhook failed:", errorText);
            return NextResponse.json({ error: "Failed to set Telegram webhook. Please verify the token is correct." }, { status: 400 });
        }

        // 2. Encrypt token to store it safely (just like we do for OAuth)
        const encryptedToken = encryptToken(token);

        // 3. Upsert integration in database
        // Delete any existing telegram integration first
        await db
            .delete(integrations)
            .where(
                and(
                    eq(integrations.userId, user.id),
                    eq(integrations.provider, "telegram")
                )
            );

        // Insert new
        await db.insert(integrations).values({
            userId: user.id,
            provider: "telegram",
            accessToken: encryptedToken,
            refreshToken: encryptedToken, // we don't have refresh tokens for Telegram, just storing the encrypted bot token
            scope: ["webhook"],
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error connecting Telegram:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
