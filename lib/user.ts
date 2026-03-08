import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Get a user from the database by their Clerk ID
 */
export async function getUserByClerkId(clerkId: string) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1);
    return user;
}

/**
 * Get or create a user by their Clerk ID
 * 
 * This is useful when the Clerk webhook hasn't fired yet but we need
 * to ensure the user exists in the database (e.g., during OAuth flow).
 */
export async function getOrCreateUser(clerkId: string) {
    // Try to get existing user
    const existingUser = await getUserByClerkId(clerkId);
    if (existingUser) {
        return existingUser;
    }

    // User doesn't exist, create them from Clerk data
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkId);

    // Get primary email
    const primaryEmail = clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;

    if (!primaryEmail) {
        throw new Error(`No primary email found for Clerk user ${clerkId}`);
    }

    // Create user in database
    const [newUser] = await db
        .insert(users)
        .values({
            clerkId,
            email: primaryEmail,
            name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
            subscriptionStatus: "none",
            agentEnabled: true,
            onboardingCompleted: false,
        })
        .returning();

    console.log(`✅ Created user in database: ${clerkId} (${primaryEmail})`);
    return newUser;
}

/**
 * Sync user data from Clerk to database
 * Updates email and name if they've changed
 */
export async function syncUserFromClerk(clerkId: string) {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkId);

    const primaryEmail = clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;

    if (!primaryEmail) {
        throw new Error(`No primary email found for Clerk user ${clerkId}`);
    }

    const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null;

    const [updatedUser] = await db
        .update(users)
        .set({
            email: primaryEmail,
            name,
            updatedAt: new Date(),
        })
        .where(eq(users.clerkId, clerkId))
        .returning();

    return updatedUser;
}
