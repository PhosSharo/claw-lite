import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { runAgentForUser } from "@/lib/agent/run-agent";
import { getUserByClerkId } from "@/lib/user";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
    // Check if this is a cron request
    const authHeader = request.headers.get("authorization");
    const isCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;

    if (isCron) {
        // Cron mode: run for all eligible users
        const eligibleUsers = await db
            .select({ id: users.id })
            .from(users)
            .innerJoin(integrations, and(
                eq(integrations.userId, users.id),
                eq(integrations.provider, "gmail")
            ))
            .where(eq(users.agentEnabled, true));

        const results = await Promise.allSettled(
            eligibleUsers.map((u) => runAgentForUser(u.id))
        );

        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;

        return NextResponse.json({
            mode: "cron",
            usersProcessed: eligibleUsers.length,
            succeeded,
            failed,
        });
    }

    // Manual mode: run for authenticated user
    const { userId: clerkId } = await auth();
    if (!clerkId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByClerkId(clerkId);
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const runId = await runAgentForUser(user.id);

    if (!runId) {
        return NextResponse.json({
            message: "Agent is already running or Gmail not connected",
        });
    }

    return NextResponse.json({ success: true, runId });
}
