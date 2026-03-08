import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
    const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

    if (!SIGNING_SECRET) {
        throw new Error(
            "Please add CLERK_WEBHOOK_SIGNING_SECRET from Clerk Dashboard to .env or .env.local"
        );
    }

    // Create new Svix instance with secret
    const wh = new Webhook(SIGNING_SECRET);

    // Get headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response("Error: Missing Svix headers", {
            status: 400,
        });
    }

    // Get body as text for verification
    const payload = await req.text();

    let evt: WebhookEvent;

    // Verify payload with headers
    try {
        evt = wh.verify(payload, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent;
    } catch (err) {
        console.error("Error: Could not verify webhook:", err);
        return new Response("Error: Verification error", {
            status: 400,
        });
    }

    // Handle the webhook
    const eventType = evt.type;

    if (eventType === "user.created") {
        const { id, email_addresses, first_name, last_name } = evt.data;

        if (!id) {
            console.error("No user ID provided for creation");
            return NextResponse.json(
                { error: "No user ID provided" },
                { status: 400 }
            );
        }

        // Get primary email
        const primaryEmail = email_addresses.find(
            (email) => email.id === evt.data.primary_email_address_id
        )?.email_address;

        if (!primaryEmail) {
            console.error("No primary email found for user:", id);
            return NextResponse.json(
                { error: "No primary email" },
                { status: 400 }
            );
        }

        try {
            // Create user in database
            await db.insert(users).values({
                clerkId: id,
                email: primaryEmail,
                name: [first_name, last_name].filter(Boolean).join(" ") || null,
                subscriptionStatus: "none",
                agentEnabled: true,
                onboardingCompleted: false,
            });

            console.log(`✅ Created user via webhook: ${id} (${primaryEmail})`);
        } catch (error: any) {
            // Ignore duplicate key errors (user might already exist from OAuth flow)
            if (error.code === "23505") {
                console.log(`User already exists: ${id}, skipping creation`);
            } else {
                console.error("Failed to create user in database:", error);
            }
        }
    }

    if (eventType === "user.updated") {
        const { id, email_addresses, first_name, last_name } = evt.data;

        if (!id) {
            console.error("No user ID provided for update");
            return NextResponse.json(
                { error: "No user ID provided" },
                { status: 400 }
            );
        }

        // Get primary email
        const primaryEmail = email_addresses.find(
            (email) => email.id === evt.data.primary_email_address_id
        )?.email_address;

        if (!primaryEmail) {
            console.error("No primary email found for user:", id);
            return NextResponse.json(
                { error: "No primary email" },
                { status: 400 }
            );
        }

        try {
            // Update user in database
            await db
                .update(users)
                .set({
                    email: primaryEmail,
                    name: [first_name, last_name].filter(Boolean).join(" ") || null,
                    updatedAt: new Date(),
                })
                .where(eq(users.clerkId, id));

            console.log(`✅ Updated user via webhook: ${id}`);
        } catch (error) {
            console.error("Failed to update user in database:", error);
        }
    }

    if (eventType === "user.deleted") {
        const { id } = evt.data;

        if (!id) {
            console.error("No user ID provided for deletion");
            return NextResponse.json(
                { error: "No user ID provided" },
                { status: 400 }
            );
        }

        try {
            // Delete user from database (cascades to integrations, tasks, etc.)
            await db.delete(users).where(eq(users.clerkId, id));
            console.log(`✅ Deleted user via webhook: ${id}`);
        } catch (error) {
            console.error("Failed to delete user from database:", error);
        }
    }

    return NextResponse.json({ success: true });
}
