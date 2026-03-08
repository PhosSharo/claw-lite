import { NextResponse } from "next/server";
import { Telegraf } from "telegraf";
import { db } from "@/db";
import { integrations, tasks, agentRuns } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { decryptToken } from "@/lib/encryption";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

export async function POST(request: Request) {
    try {
        const url = new URL(request.url);
        const userId = url.searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // Fetch user's telegram integration
        const [integration] = await db
            .select()
            .from(integrations)
            .where(
                and(
                    eq(integrations.userId, userId),
                    eq(integrations.provider, "telegram")
                )
            );

        if (!integration) {
            return NextResponse.json({ error: "Integration not found" }, { status: 404 });
        }

        const botToken = decryptToken(integration.accessToken);
        const bot = new Telegraf(botToken);
        const body = await request.json();

        // Very lightweight intent recognition using Groq
        bot.on("text", async (ctx) => {
            const message = ctx.message.text;

            // Show typing indicator
            await ctx.sendChatAction("typing");

            const userName = ctx.message.from?.first_name || ctx.message.from?.username || "there";

            // Simple command routing or AI intent handling
            if (message.startsWith("/start") || message.startsWith("/help")) {
                return ctx.reply(`👋 Hello ${userName}! I'm your Claw Lite mentor. I'm here to help you get things done and figure things out. What's on your mind?`);
            }

            try {
                // Fetch context for the AI (recent tasks, latest run)
                const recentTasks = await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt)).limit(5);
                const [latestRun] = await db.select().from(agentRuns).where(eq(agentRuns.userId, userId)).orderBy(desc(agentRuns.startedAt)).limit(1);

                const tasksContext = recentTasks.map(t => `- [${t.status}] ${t.title} ${t.dueDate ? `(Due: ${new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})` : ''}`).join('\n') || "No recent tasks.";
                const runContext = latestRun ? `Latest run summary: ${latestRun.summary || 'No summary'}` : "No agent runs yet.";

                const { text: aiResponse } = await generateText({
                    model: createGroq({ apiKey: process.env.GROQ_API_KEY })("llama-3.1-8b-instant"),
                    system: `You are the Claw Lite AI mentor talking to ${userName} via Telegram.
Your core philosophy is "guide, don't give." You are a Socratic, curiosity-driven senior developer/mentor. 
- Instead of immediately providing full answers or solutions, gently push ${userName} to discover them.
- Ask questions like "What do you think happens if...?" before giving explanations.
- Provide hints progressively: start small, offer more if needed, and only give the full answer when clearly stuck.
- Use analogies to connect new ideas to familiar concepts.
- Celebrate small milestones. Ask them to explain reasoning before correcting them.
- Push back slightly if they seem overly confident about a wrong assumption.
- Be patient, encouraging, non-judgmental, witty, and slightly sarcastic. Avoid stiff corporate language.
Format using Telegram Markdown: *bold*, _italic_, \`code\`.
If asked about tasks or status, use the provided context to guide them.

Context:
Recent Tasks:
${tasksContext}

Agent Status:
${runContext}`,
                    prompt: message,
                });

                await ctx.reply(aiResponse, { parse_mode: "Markdown" });
            } catch (aiError) {
                console.error("AI/DB Error processing telegram message:", aiError);
                await ctx.reply("I'm sorry, I ran into an issue while thinking about that. Please try again later. 🛠️");
            }
        });

        // Handle the incoming webhook update
        await bot.handleUpdate(body);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error processing Telegram webhook:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
