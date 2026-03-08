import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const model = groq(process.env.GROQ_MODEL || "llama-3.1-8b-instant");

const EmailAnalysisSchema = z.object({
    summary: z.string().describe("One-line summary of the email"),
    priority: z.enum(["low", "medium", "high"]),
    category: z.enum(["work", "personal", "newsletter", "notification", "spam"]),
    needsReply: z.boolean(),
    draftReply: z.string().nullable().describe("Draft reply if needsReply is true, null otherwise"),
    actionItems: z.array(
        z.object({
            title: z.string(),
            description: z.string(),
            dueDate: z.string().nullable().describe("ISO date string or null"),
        })
    ),
});

export type EmailAnalysis = z.infer<typeof EmailAnalysisSchema>;

interface EmailInput {
    from: string;
    subject: string;
    body: string;
    date: string;
}

/** Analyze a single email using AI and return structured output */
export async function processEmail(email: EmailInput): Promise<EmailAnalysis> {
    const { text } = await generateText({
        model,
        prompt: `Analyze this email and extract structured information.

From: ${email.from}
Subject: ${email.subject}
Date: ${email.date}
Body:
${email.body.slice(0, 2000)}

Instructions:
- Determine priority (high = urgent/deadline, medium = requires action, low = informational)
- Categorize the email (work, personal, newsletter, notification, spam)
- If a reply is needed, draft a professional, concise response
- Extract any action items with titles, descriptions, and due dates
- Be concise in all fields

You MUST return EXACTLY and ONLY a valid JSON object matching this schema. Do not include markdown code block syntax (\`\`\`json) or any other text before or after the JSON.

{
  "summary": "One-line summary of the email",
  "priority": "low" | "medium" | "high",
  "category": "work" | "personal" | "newsletter" | "notification" | "spam",
  "needsReply": boolean,
  "draftReply": "Draft reply if needsReply is true, null otherwise",
  "actionItems": [
    {
      "title": "Action item title",
      "description": "Action item description",
      "dueDate": "ISO date string or null"
    }
  ]
}`,
    });

    try {
        const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return EmailAnalysisSchema.parse(parsed);
    } catch (error) {
        console.error("Failed to parse AI response:", text);
        throw new Error("Invalid AI response format");
    }
}
