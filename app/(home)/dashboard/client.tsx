"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    hasGmail: boolean;
    latestRun: {
        status: string;
        summary: string | null;
        startedAt: string;
        completedAt: string | null;
    } | null;
}

export function DashboardClient({ hasGmail, latestRun }: Props) {
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleRun = async () => {
        setRunning(true);
        setResult(null);
        try {
            const res = await fetch("/api/agent/run", { method: "POST" });
            const data = await res.json();
            setResult(data.message || data.success ? "Agent run started!" : "Failed to start");
        } catch {
            setResult("Failed to connect");
        } finally {
            setRunning(false);
        }
    };

    const statusColor = hasGmail ? "bg-emerald-500" : "bg-zinc-500";
    const statusLabel = hasGmail ? "Ready" : "Disconnected";

    function timeAgo(dateStr: string) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    }

    return (
        <>
            {/* Agent Status */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-zinc-400" />
                    <h2 className="text-lg font-semibold text-zinc-100">Agent Status</h2>
                </div>
                <p className="text-sm text-zinc-400 mb-4">Your AI agent is running autonomously</p>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-400">Status</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${hasGmail ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-400"}`}>
                            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                            {statusLabel}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-400">Gmail</span>
                        <span className="text-sm text-zinc-200">{hasGmail ? "Connected" : "Not connected"}</span>
                    </div>
                </div>

                <Button
                    className="w-full mt-4"
                    onClick={handleRun}
                    disabled={running || !hasGmail}
                >
                    {running ? "Running..." : "Run Agent Now"}
                </Button>
                {result && <p className="text-xs text-zinc-400 mt-2 text-center">{result}</p>}
            </div>

            {/* Last Agent Run */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-lg font-semibold text-zinc-100 mb-1">Last Agent Run</h2>
                <p className="text-sm text-zinc-500 mb-4">Most recent activity</p>

                {latestRun ? (
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-sm text-zinc-400">Time</span>
                            <span className="text-sm text-zinc-200">{timeAgo(latestRun.startedAt)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-zinc-400">Status</span>
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${latestRun.status === "success"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : latestRun.status === "failed"
                                        ? "bg-red-500/20 text-red-400"
                                        : "bg-yellow-500/20 text-yellow-400"
                                }`}>
                                {latestRun.status}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-zinc-400">Summary</span>
                            <span className="text-sm text-zinc-200 text-right max-w-[200px]">
                                {latestRun.summary || "—"}
                            </span>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-zinc-500">No runs yet. Connect Gmail and run the agent.</p>
                )}
            </div>
        </>
    );
}
