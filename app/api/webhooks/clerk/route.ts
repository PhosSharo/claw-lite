import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";

export async function POST(req: Request) {
    // You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
    const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

    if (!SIGNING_SECRET) {
        throw new Error("Error: Please add CLERK_WEBHOOK_SIGNING_SECRET from Clerk Dashboard to .env or .env.local");
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

    if (eventType === "user.created" || eventType === "user.updated") {
        const { id, public_metadata } = evt.data;

        // Set default subscription for new users
        if (eventType === "user.created") {
            console.log(`New user created: ${id}, setting default subscription to free_user`);
            // The subscription will be managed through Clerk's billing
            // When users subscribe through the pricing table, Clerk handles the metadata
        }
    }

    // Handle subscription events from Clerk Billing
    if (eventType === "user.updated") {
        const { id, public_metadata, private_metadata } = evt.data;
        console.log(`User updated: ${id}`, { public_metadata, private_metadata });
    }

    return NextResponse.json({ success: true });
}
