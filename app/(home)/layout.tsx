import { Sidebar } from "@/components/sidebar";

export default function HomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <Sidebar />
            <main className="pl-[var(--sidebar-width)]">
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
