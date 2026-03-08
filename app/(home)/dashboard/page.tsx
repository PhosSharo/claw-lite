import { currentUser } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/user";
import { getDashboardStats, getLatestAgentRun, getUserIntegrations } from "@/lib/db/queries";
import { DashboardClient } from "./client";

export default async function DashboardPage() {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    let stats = null;
    let latestRun = null;
    let connectedProviders: string[] = [];
    let heartbeatInterval = 15;

    try {
        const user = await getUserByClerkId(clerkUser.id);
        if (user) {
            [stats, latestRun] = await Promise.all([
                getDashboardStats(user.id),
                getLatestAgentRun(user.id),
            ]);
            const integrations = await getUserIntegrations(user.id);
            connectedProviders = integrations.map((i) => i.provider);
            heartbeatInterval = user.heartbeatInterval;
        }
    } catch (e) {
        console.error("Dashboard data fetch error:", e);
    }

    const hasGmail = connectedProviders.includes("gmail");
    const hasCalendar = connectedProviders.includes("google_calendar");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-zinc-100">
                    Welcome back{clerkUser.firstName ? `, ${clerkUser.firstName}` : ""}!
                </h1>
                <p className="text-zinc-400 mt-1">
                    Here&apos;s what&apos;s happening with your AI assistant.
                </p>
            </div>

            {/* Onboarding Checklist */}
            <OnboardingCard hasGmail={hasGmail} hasCalendar={hasCalendar} />

            {/* Agent Status + Last Run */}
            <div className="grid gap-4 md:grid-cols-2">
                <DashboardClient
                    hasGmail={hasGmail}
                    latestRun={latestRun ? {
                        status: latestRun.status,
                        summary: latestRun.summary,
                        startedAt: latestRun.startedAt.toISOString(),
                        completedAt: latestRun.completedAt?.toISOString() || null,
                    } : null}
                />
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard label="Unread Emails" value={stats?.emailsProcessed ?? 0} sub="View all" />
                <StatCard label="Pending Tasks" value={stats?.pendingTasks ?? 0} sub="View all" />
                <StatCard label="Email Drafts" value={stats?.draftsCreated ?? 0} sub={stats?.draftsCreated ? "View all" : "No items"} />
            </div>
        </div>
    );
}

function OnboardingCard({ hasGmail, hasCalendar }: { hasGmail: boolean; hasCalendar: boolean }) {
    const steps = [
        { label: "Connect Gmail", done: hasGmail },
        { label: "Connect Google Calendar", done: hasCalendar },
        { label: "Subscribe to activate agent", done: true }, // free tier counts
    ];
    const completed = steps.filter((s) => s.done).length;

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold text-zinc-100">Get Started</h2>
            <p className="text-sm text-zinc-400 mt-1">Complete these steps to activate your AI assistant.</p>
            <div className="mt-4 space-y-3">
                {steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${step.done ? "border-emerald-500 bg-emerald-500/20" : "border-zinc-600"}`}>
                            {step.done && (
                                <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                        <span className={`text-sm ${step.done ? "text-zinc-400 line-through" : "text-zinc-200"}`}>
                            {i + 1}. {step.label}
                        </span>
                    </div>
                ))}
            </div>
            {/* Progress bar */}
            <div className="mt-4">
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${(completed / steps.length) * 100}%` }}
                    />
                </div>
                <p className="text-xs text-emerald-400 mt-2">{completed} of {steps.length} steps complete</p>
            </div>
        </div>
    );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <div className="text-sm font-medium text-zinc-400">{label}</div>
            <div className="text-3xl font-semibold text-zinc-100 mt-2">{value}</div>
            {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
        </div>
    );
}
