"use client";

import { CalendarIcon, MailIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const PROVIDERS = [
    {
        key: "gmail",
        name: "Gmail",
        description: "Read and manage your emails.",
        icon: MailIcon,
    },
    {
        key: "google_calendar",
        name: "Google Calendar",
        description: "Read and manage your calendar.",
        icon: CalendarIcon,
    },
] as const;

type ProviderKey = (typeof PROVIDERS)[number]["key"];

// Helper to validate provider keys
function isValidProvider(value: string | null): value is ProviderKey {
    return value !== null && PROVIDERS.some((p) => p.key === value);
}

function SettingsContent() {
    const searchParams = useSearchParams();
    const [connectedProviders, setConnectedProviders] = useState<ProviderKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState<ProviderKey | null>(null);

    const successParam = searchParams.get("success");
    const errorParam = searchParams.get("error");

    // Validate success param is a valid provider
    const validSuccessParam = isValidProvider(successParam) ? successParam : null;

    useEffect(() => {
        async function fetchIntegrations() {
            try {
                const response = await fetch("/api/integrations");
                if (response.ok) {
                    const data = await response.json();
                    // Filter to only valid providers
                    const validProviders = (data.integrations || []).filter(isValidProvider);
                    setConnectedProviders(validProviders);
                }
            } catch (error) {
                console.error("Failed to fetch integrations:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchIntegrations();
    }, [successParam]);

    const handleDisconnect = async (providerKey: ProviderKey) => {
        setDisconnecting(providerKey);
        try {
            const response = await fetch("/api/integrations", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ provider: providerKey }),
            });

            if (response.ok) {
                setConnectedProviders((prev) =>
                    prev.filter((p) => p !== providerKey)
                );
            }
        } catch (error) {
            console.error("Failed to disconnect:", error);
        } finally {
            setDisconnecting(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    Settings
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                    Manage your account and application preferences
                </p>
            </div>

            {/* Success/Error Messages */}
            {validSuccessParam && (
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                    <p className="text-sm text-green-700 dark:text-green-400">
                        Successfully connected {validSuccessParam.replace("_", " ")}!
                    </p>
                </div>
            )}
            {errorParam && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                    <p className="text-sm text-red-700 dark:text-red-400">
                        Failed to connect: {errorParam}
                    </p>
                </div>
            )}

            <div className="space-y-4">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    Integrations
                </h2>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                    {loading ? (
                        <div className="p-4 text-center text-zinc-500">
                            Loading integrations...
                        </div>
                    ) : (
                        PROVIDERS.map((provider) => {
                            const Icon = provider.icon;
                            const isConnected = connectedProviders.includes(provider.key);
                            return (
                                <div
                                    key={provider.key}
                                    className="flex items-center justify-between p-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center size-10 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                                            <Icon className="size-5 text-zinc-600 dark:text-zinc-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                                                {provider.name}
                                            </h3>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                {provider.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isConnected ? (
                                            <>
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    <CheckCircle2 className="size-3.5" />
                                                    Connected
                                                </span>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDisconnect(provider.key)}
                                                    disabled={disconnecting === provider.key}
                                                >
                                                    {disconnecting === provider.key
                                                        ? "Disconnecting..."
                                                        : "Disconnect"}
                                                </Button>
                                            </>
                                        ) : (
                                            <Button variant="destructive" size="sm" asChild>
                                                <a href={`/api/auth/google?provider=${provider.key}`}>
                                                    Connect
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Heartbeat Configuration */}
            <HeartbeatConfig />
        </div>
    );
}

const INTERVALS = [
    { value: 5, label: "5 minutes" },
    { value: 10, label: "10 minutes" },
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "60 minutes" },
];

function HeartbeatConfig() {
    const [interval, setIntervalValue] = useState(15);
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetch("/api/agent/stats")
            .then((r) => r.json())
            .then((d) => {
                if (d.heartbeatInterval) setIntervalValue(d.heartbeatInterval);
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, []);

    const handleSave = async (value: number) => {
        setSaving(true);
        setIntervalValue(value);
        try {
            await fetch("/api/agent/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ heartbeatInterval: value }),
            });
        } catch (e) {
            console.error("Failed to save interval:", e);
        } finally {
            setSaving(false);
        }
    };

    if (!loaded) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-medium text-zinc-100">Agent Configuration</h2>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium text-zinc-100">Heartbeat Interval</h3>
                        <p className="text-sm text-zinc-400">
                            How often the agent checks for new activity
                        </p>
                    </div>
                    <select
                        value={interval}
                        onChange={(e) => handleSave(Number(e.target.value))}
                        disabled={saving}
                        className="rounded-md border border-zinc-700 bg-zinc-800 text-zinc-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    >
                        {INTERVALS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense
            fallback={
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                            Settings
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                            Manage your account and application preferences
                        </p>
                    </div>
                    <div className="p-4 text-center text-zinc-500">
                        Loading...
                    </div>
                </div>
            }
        >
            <SettingsContent />
        </Suspense>
    );
}
