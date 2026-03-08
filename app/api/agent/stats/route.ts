import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/user";
import { getDashboardStats, getLatestAgentRun, getAgentRuns, getUserIntegrations } from "@/lib/db/queries";

export async function GET() {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByClerkId(clerkId);
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [stats, latestRun, recentRuns, connectedIntegrations] = await Promise.all([
        getDashboardStats(user.id),
        getLatestAgentRun(user.id),
        getAgentRuns(user.id, 20),
        getUserIntegrations(user.id),
    ]);

    return NextResponse.json({
        stats,
        latestRun,
        recentRuns,
        integrations: connectedIntegrations.map((i) => i.provider),
        heartbeatInterval: user.heartbeatInterval,
        agentEnabled: user.agentEnabled,
    });
}
