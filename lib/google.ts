import { db } from "@/db";
import { integrations, type Integration } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encryptToken, decryptToken } from "./encryption";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// ─── Token Management ─────────────────────────────────────────────────────────

/** Refresh access token if expired, update DB, return valid access token */
export async function getValidAccessToken(integration: Integration): Promise<string> {
    if (integration.expiresAt && integration.expiresAt > new Date()) {
        return decryptToken(integration.accessToken);
    }

    const refreshToken = decryptToken(integration.refreshToken);
    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    });

    if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);

    const data = await res.json();
    const newExpiry = new Date(Date.now() + data.expires_in * 1000);

    await db
        .update(integrations)
        .set({
            accessToken: encryptToken(data.access_token),
            expiresAt: newExpiry,
        })
        .where(eq(integrations.id, integration.id));

    return data.access_token as string;
}

// ─── Gmail ────────────────────────────────────────────────────────────────────

interface GmailMessage {
    id: string;
    threadId: string;
    from: string;
    to: string;
    subject: string;
    date: string;
    snippet: string;
    body: string;
}

/** Fetch unread emails from Gmail */
export async function fetchUnreadEmails(accessToken: string, maxResults = 10): Promise<GmailMessage[]> {
    const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=${maxResults}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`);
    const { messages = [] } = await listRes.json();
    if (!messages.length) return [];

    const results: GmailMessage[] = [];
    for (const { id } of messages) {
        const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!msgRes.ok) continue;
        const msg = await msgRes.json();

        const headers = msg.payload?.headers || [];
        const getHeader = (name: string) => headers.find((h: { name: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

        const body = extractBody(msg.payload);
        results.push({
            id: msg.id,
            threadId: msg.threadId,
            from: getHeader("From"),
            to: getHeader("To"),
            subject: getHeader("Subject"),
            date: getHeader("Date"),
            snippet: msg.snippet || "",
            body: body.slice(0, 3000), // cap to avoid huge payloads
        });
    }

    return results;
}

/** Extract plain text body from Gmail message payload */
function extractBody(payload: any): string {
    if (!payload) return "";
    if (payload.body?.data) {
        return Buffer.from(payload.body.data, "base64url").toString("utf-8");
    }
    if (payload.parts) {
        const textPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
        if (textPart?.body?.data) {
            return Buffer.from(textPart.body.data, "base64url").toString("utf-8");
        }
        // fallback: recurse into first part
        return extractBody(payload.parts[0]);
    }
    return "";
}

/** Create a draft reply in Gmail */
export async function createGmailDraft(
    accessToken: string,
    to: string,
    subject: string,
    body: string,
    threadId?: string
): Promise<string> {
    const raw = Buffer.from(
        `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`
    ).toString("base64url");

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            message: { raw, ...(threadId && { threadId }) },
        }),
    });

    if (!res.ok) throw new Error(`Draft creation failed: ${res.status}`);
    const data = await res.json();
    return data.id;
}

/** Mark an email as read */
export async function markAsRead(accessToken: string, messageId: string): Promise<void> {
    await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
        }
    );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export interface CalendarEvent {
    id: string;
    summary: string;
    start: string;
    end: string;
    description?: string;
}

/** Fetch upcoming calendar events */
export async function fetchUpcomingEvents(
    accessToken: string,
    days = 7
): Promise<CalendarEvent[]> {
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + days * 86400000).toISOString();

    const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=20`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);
    const data = await res.json();

    return (data.items || []).map((e: any) => ({
        id: e.id,
        summary: e.summary || "(No title)",
        start: e.start?.dateTime || e.start?.date || "",
        end: e.end?.dateTime || e.end?.date || "",
        description: e.description,
    }));
}
