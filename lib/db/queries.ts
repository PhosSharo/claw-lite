import { db } from "@/db";
import { users, integrations, tasks, agentRuns } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";

/** Get a user by internal UUID */
export async function getUserById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
}

/** Get connected integration for a user by provider */
export async function getIntegration(userId: string, provider: "gmail" | "google_calendar") {
    const [integration] = await db
        .select()
        .from(integrations)
        .where(and(eq(integrations.userId, userId), eq(integrations.provider, provider)))
        .limit(1);
    return integration;
}

/** Get all connected provider names for a user */
export async function getUserIntegrations(userId: string) {
    return db
        .select({ provider: integrations.provider })
        .from(integrations)
        .where(eq(integrations.userId, userId));
}

/** Get recent agent runs */
export async function getAgentRuns(userId: string, limit = 20) {
    return db
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.userId, userId))
        .orderBy(desc(agentRuns.startedAt))
        .limit(limit);
}

/** Get most recent agent run */
export async function getLatestAgentRun(userId: string) {
    const [run] = await db
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.userId, userId))
        .orderBy(desc(agentRuns.startedAt))
        .limit(1);
    return run;
}

/** Check if agent is currently running for a user */
export async function isAgentRunning(userId: string): Promise<boolean> {
    const [running] = await db
        .select({ id: agentRuns.id })
        .from(agentRuns)
        .where(and(eq(agentRuns.userId, userId), eq(agentRuns.status, "running")))
        .limit(1);
    return !!running;
}

/** Get aggregate stats for dashboard */
export async function getDashboardStats(userId: string) {
    const [emailStats] = await db
        .select({
            totalEmails: sql<number>`coalesce(sum(${agentRuns.emailsProcessed}), 0)`,
            totalTasks: sql<number>`coalesce(sum(${agentRuns.tasksCreated}), 0)`,
            totalDrafts: sql<number>`coalesce(sum(${agentRuns.draftsCreated}), 0)`,
            totalRuns: sql<number>`count(*)`,
        })
        .from(agentRuns)
        .where(eq(agentRuns.userId, userId));

    const [taskStats] = await db
        .select({
            pending: sql<number>`count(*) filter (where ${tasks.status} = 'pending')`,
            completed: sql<number>`count(*) filter (where ${tasks.status} = 'completed')`,
        })
        .from(tasks)
        .where(eq(tasks.userId, userId));

    return {
        emailsProcessed: Number(emailStats?.totalEmails || 0),
        tasksCreated: Number(emailStats?.totalTasks || 0),
        draftsCreated: Number(emailStats?.totalDrafts || 0),
        totalRuns: Number(emailStats?.totalRuns || 0),
        pendingTasks: Number(taskStats?.pending || 0),
        completedTasks: Number(taskStats?.completed || 0),
    };
}

/** Update heartbeat interval for a user */
export async function updateHeartbeatInterval(userId: string, interval: number) {
    await db
        .update(users)
        .set({ heartbeatInterval: interval, updatedAt: new Date() })
        .where(eq(users.id, userId));
}
