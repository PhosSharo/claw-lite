import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
    const user = await currentUser();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                    Here's what's happening with your AI agent
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                    <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Emails Processed
                    </div>
                    <div className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100 mt-2">
                        0
                    </div>
                </div>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                    <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Tasks Created
                    </div>
                    <div className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100 mt-2">
                        0
                    </div>
                </div>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                    <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Meetings Scheduled
                    </div>
                    <div className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100 mt-2">
                        0
                    </div>
                </div>
            </div>

            {/* Activity Placeholder */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">
                    Recent Activity
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400">
                    Connect your email account to start seeing activity here...
                </p>
            </div>
        </div>
    );
}
