import { db } from "@/db";
import { agentRuns, tasks, integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getValidAccessToken, fetchUnreadEmails, createGmailDraft, markAsRead } from "@/lib/google";
import { processEmail } from "./process-emails";
import { isAgentRunning, getIntegration } from "@/lib/db/queries";
import type { ActionLogEntry } from "@/db/schema";

/** Run the agent for a single user. Returns the agent run ID or null if skipped. */
export async function runAgentForUser(userId: string): Promise<string | null> {
    // Prevent concurrent runs
    if (await isAgentRunning(userId)) {
        console.log(`Agent already running for user ${userId}, skipping`);
        return null;
    }

    // Check Gmail integration exists
    const gmailIntegration = await getIntegration(userId, "gmail");
    if (!gmailIntegration) {
        console.log(`No Gmail integration for user ${userId}, skipping`);
        return null;
    }

    // Create agent run record
    const [run] = await db
        .insert(agentRuns)
        .values({ userId, status: "running" })
        .returning();

    const startTime = Date.now();
    let emailsProcessed = 0;
    let tasksCreated = 0;
    let draftsCreated = 0;
    const actionsLog: ActionLogEntry[] = [];

    try {
        // Get valid access token (refreshes if needed)
        const accessToken = await getValidAccessToken(gmailIntegration);

        // Fetch unread emails
        const emails = await fetchUnreadEmails(accessToken, 10);

        if (!emails.length) {
            await db
                .update(agentRuns)
                .set({
                    status: "success",
                    summary: "No unread emails to process",
                    emailsProcessed: 0,
                    completedAt: new Date(),
                    durationMs: Date.now() - startTime,
                })
                .where(eq(agentRuns.id, run.id));
            return run.id;
        }

        // Process each email with AI
        for (const email of emails) {
            try {
                const analysis = await processEmail({
                    from: email.from,
                    subject: email.subject,
                    body: email.body,
                    date: email.date,
                });

                const logEntry: ActionLogEntry = {
                    emailId: email.id,
                    from: email.from,
                    subject: email.subject,
                    date: email.date,
                    status: "success",
                    summary: analysis.summary,
                    priority: analysis.priority,
                    category: analysis.category,
                    needsReply: analysis.needsReply,
                    draftReply: analysis.draftReply,
                    actionItems: analysis.actionItems,
                    tasksCreated: 0,
                    draftCreated: false,
                };

                // Create tasks from action items
                if (analysis.actionItems.length > 0) {
                    for (const item of analysis.actionItems) {
                        await db.insert(tasks).values({
                            userId,
                            title: item.title,
                            description: item.description,
                            priority: analysis.priority as "low" | "medium" | "high",
                            dueDate: item.dueDate ? new Date(item.dueDate) : null,
                            createdByAgent: true,
                        });
                        tasksCreated++;
                    }
                    logEntry.tasksCreated = analysis.actionItems.length;
                }

                // Create draft reply if needed
                if (analysis.needsReply && analysis.draftReply) {
                    try {
                        await createGmailDraft(
                            accessToken,
                            email.from,
                            `Re: ${email.subject}`,
                            analysis.draftReply,
                            email.threadId
                        );
                        draftsCreated++;
                        logEntry.draftCreated = true;
                    } catch (draftErr) {
                        console.error(`Failed to create draft for ${email.id}:`, draftErr);
                    }
                }

                // Mark email as read
                await markAsRead(accessToken, email.id);
                emailsProcessed++;
                actionsLog.push(logEntry);
            } catch (emailErr) {
                console.error(`Failed to process email ${email.id}:`, emailErr);
                actionsLog.push({
                    emailId: email.id,
                    from: email.from,
                    subject: email.subject,
                    date: email.date,
                    status: "error",
                });
            }
        }

        // Update run as success
        const summary = `Processed ${emailsProcessed} email(s), created ${tasksCreated} task(s), drafted ${draftsCreated} reply/replies`;
        await db
            .update(agentRuns)
            .set({
                status: "success",
                summary,
                emailsProcessed,
                tasksCreated,
                draftsCreated,
                actionsLog,
                completedAt: new Date(),
                durationMs: Date.now() - startTime,
            })
            .where(eq(agentRuns.id, run.id));

        console.log(`✅ Agent run complete for ${userId}: ${summary}`);
        return run.id;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await db
            .update(agentRuns)
            .set({
                status: "failed",
                errorMessage,
                actionsLog,
                completedAt: new Date(),
                durationMs: Date.now() - startTime,
            })
            .where(eq(agentRuns.id, run.id));

        console.error(`❌ Agent run failed for ${userId}:`, errorMessage);
        return run.id;
    }
}
