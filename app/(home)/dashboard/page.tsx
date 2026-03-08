import { currentUser } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/user";
import { getDashboardStats, getLatestAgentRun, getUserIntegrations } from "@/lib/db/queries";
import { DashboardClient } from "./client";
import { MailIcon, CalendarIcon, MessageCircle, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

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
    const hasTelegram = connectedProviders.includes("telegram");

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

            {/* Integration Status Panel */}
            <IntegrationStatusPanel hasGmail={hasGmail} hasCalendar={hasCalendar} hasTelegram={hasTelegram} />

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
                <StatCard label="Emails Processed" value={stats?.emailsProcessed ?? 0} sub="Lifetime" />
                <StatCard label="Pending Tasks" value={stats?.pendingTasks ?? 0} sub="View all" />
                <StatCard label="Email Drafts" value={stats?.draftsCreated ?? 0} sub={stats?.draftsCreated ? "Action required" : "No items"} />
            </div>
        </div>
    );
}

function IntegrationStatusPanel({ hasGmail, hasCalendar, hasTelegram }: { hasGmail: boolean; hasCalendar: boolean; hasTelegram: boolean }) {
    const integrations = [
        { name: "Telegram Bot", icon: MessageCircle, connected: hasTelegram },
        { name: "Gmail", icon: MailIcon, connected: hasGmail },
        { name: "Google Calendar", icon: CalendarIcon, connected: hasCalendar },
    ];

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-zinc-100">System Integrations</h2>
                    <p className="text-sm text-zinc-400 mt-1">Core services required for agent operations.</p>
                </div>
                <Link href="/settings" className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                    Manage
                </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {integrations.map((int) => {
                    const Icon = int.icon;
                    return (
                        <div key={int.name} className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/50 border border-zinc-800 transition-colors hover:border-zinc-700">
                            <div className={`p-2.5 rounded-md ${int.connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                <Icon className="size-4" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-zinc-200">{int.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    {int.connected ? (
                                        <>
                                            <CheckCircle2 className="size-3 text-emerald-500" />
                                            <span className="text-xs text-emerald-500 font-medium">Active</span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="size-3 text-red-500" />
                                            <span className="text-xs text-red-500 font-medium">Inactive</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
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
