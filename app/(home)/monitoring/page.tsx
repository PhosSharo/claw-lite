"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Mail, ChevronDown, ChevronUp, Sparkles, ListChecks, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionLogEntry, AgentRun } from "@/db/schema";

interface StatsData {
    stats: {
        emailsProcessed: number;
        tasksCreated: number;
        draftsCreated: number;
        totalRuns: number;
        pendingTasks: number;
    };
    recentRuns: AgentRun[];
    latestRun: AgentRun | null;
}

export default function MonitoringPage() {
    const [data, setData] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [expandedRun, setExpandedRun] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const res = await fetch("/api/agent/stats");
            if (res.ok) setData(await res.json());
        } catch (e) {
            console.error("Failed to fetch stats:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleRun = async () => {
        setRunning(true);
        try {
            await fetch("/api/agent/run", { method: "POST" });
            // Wait a bit then refresh
            setTimeout(fetchData, 2000);
        } catch (e) {
            console.error("Failed to run agent:", e);
        } finally {
            setRunning(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-100">Monitoring</h1>
                    <p className="text-zinc-400 mt-1">Loading agent activity...</p>
                </div>
            </div>
        );
    }

    const stats = data?.stats;
    const runs = data?.recentRuns || [];

    // Count high priority from recent runs
    const highPriority = runs.reduce((acc, run) => {
        const logs = (run.actionsLog || []) as ActionLogEntry[];
        return acc + logs.filter((l) => l.priority === "high").length;
    }, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-100">Monitoring</h1>
                    <p className="text-zinc-400 mt-1">Monitor your AI agent activity and performance</p>
                </div>
                <Button onClick={handleRun} disabled={running}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
                    {running ? "Running..." : "Run Agent Now"}
                </Button>
            </div>

            {/* Stats Bar */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <MiniStat icon={Mail} label="Processed" value={stats?.emailsProcessed ?? 0} />
                <MiniStat icon={AlertTriangle} label="High Priority" value={highPriority} />
                <MiniStat icon={FileText} label="Drafts Created" value={stats?.draftsCreated ?? 0} />
                <MiniStat icon={ListChecks} label="Tasks Extracted" value={stats?.tasksCreated ?? 0} />
            </div>

            {/* Run History */}
            <div className="space-y-3">
                {runs.length === 0 ? (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
                        <Sparkles className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                        <p className="text-zinc-400">No agent runs yet. Connect Gmail and run the agent to see activity here.</p>
                    </div>
                ) : (
                    runs.map((run) => (
                        <RunCard
                            key={run.id}
                            run={run}
                            expanded={expandedRun === run.id}
                            onToggle={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Icon className="h-4 w-4" />
                <span className="text-xs">{label}</span>
            </div>
            <span className="text-2xl font-semibold text-zinc-100">{value}</span>
        </div>
    );
}

function RunCard({ run, expanded, onToggle }: { run: AgentRun; expanded: boolean; onToggle: () => void }) {
    const logs = (run.actionsLog || []) as ActionLogEntry[];
    const statusColor = run.status === "success" ? "text-emerald-400 bg-emerald-500/20" : run.status === "failed" ? "text-red-400 bg-red-500/20" : "text-yellow-400 bg-yellow-500/20";

    const timeAgo = (date: Date | string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors text-left"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>
                        {run.status}
                    </span>
                    <span className="text-sm text-zinc-200 truncate">
                        {run.summary || "Agent run"}
                    </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-zinc-500">{timeAgo(run.startedAt)}</span>
                    {expanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                </div>
            </button>

            {expanded && logs.length > 0 && (
                <div className="border-t border-zinc-800 divide-y divide-zinc-800">
                    {logs.map((log, i) => (
                        <div key={i} className="p-4">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-200">{log.subject}</h4>
                                    <p className="text-xs text-zinc-500">From: {log.from} · {log.date}</p>
                                </div>
                                <div className="flex gap-2">
                                    {log.priority && (
                                        <span className={`text-xs px-2 py-0.5 rounded ${log.priority === "high" ? "bg-red-500/20 text-red-400" :
                                                log.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                                                    "bg-zinc-700 text-zinc-400"
                                            }`}>{log.priority}</span>
                                    )}
                                    {log.category && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-400">{log.category}</span>
                                    )}
                                </div>
                            </div>

                            {log.summary && (
                                <p className="text-sm text-zinc-400 mb-3">{log.summary}</p>
                            )}

                            <div className="grid gap-3 md:grid-cols-2">
                                {/* Action Items */}
                                {log.actionItems && log.actionItems.length > 0 && (
                                    <div>
                                        <h5 className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1">
                                            <ListChecks className="h-3 w-3" /> Action Items
                                        </h5>
                                        <div className="space-y-2">
                                            {log.actionItems.map((item, j) => (
                                                <div key={j} className="rounded bg-zinc-800/50 p-2">
                                                    <p className="text-sm text-emerald-300">{item.title}</p>
                                                    <p className="text-xs text-zinc-400">{item.description}</p>
                                                    {item.dueDate && <p className="text-xs text-red-400 mt-1">Due: {item.dueDate}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Draft Reply */}
                                {log.draftReply && (
                                    <div>
                                        <h5 className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1">
                                            <FileText className="h-3 w-3" /> Draft Reply
                                        </h5>
                                        <div className="rounded bg-zinc-800/50 p-3">
                                            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{log.draftReply}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {expanded && run.errorMessage && (
                <div className="border-t border-zinc-800 p-4">
                    <p className="text-sm text-red-400">Error: {run.errorMessage}</p>
                </div>
            )}
        </div>
    );
}
