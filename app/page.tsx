import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, PricingTable } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

export default async function Home() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm">
        <div className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
          Claw Lite
        </div>
        <nav className="flex items-center gap-4">
          {!user ? (
            <>
              <SignInButton mode="redirect">
                <button className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="redirect">
                <button className="text-sm font-medium px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors">
                  Sign Up
                </button>
              </SignUpButton>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
              >
                Dashboard
              </Link>
              <UserButton />
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="pt-16">
        <section className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Autonomous AI Operating System
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-6 max-w-4xl">
            Your AI-powered{" "}
            <span className="text-zinc-400 dark:text-zinc-500">productivity partner</span>
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mb-8">
            Claw Lite runs in the background, monitoring your communications and converting
            incoming information into structured outcomes. Focus on high-value work while
            routine tasks are handled automatically.
          </p>
          {!user ? (
            <SignUpButton mode="redirect">
              <button className="text-base font-medium px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors">
                Get Started Free
              </button>
            </SignUpButton>
          ) : (
            <Link
              href="/dashboard"
              className="text-base font-medium px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
            >
              Go to Dashboard
            </Link>
          )}
        </section>

        {/* Features Section */}
        <section className="px-6 py-16 border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 text-center mb-12">
              How it works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="h-12 w-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-6 w-6 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">15-Minute Heartbeat</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Reviews new email activity and determines what requires attention on a recurring cycle.
                </p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-6 w-6 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">Drafts & Tasks</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Automatically drafts replies, schedules meetings, and extracts actionable tasks.
                </p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-6 w-6 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">Background Operation</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Runs persistently without prompts, processing your inbox on your behalf.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="px-6 py-16 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Simple Pricing
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Start free, upgrade when you need more.
              </p>
            </div>
            <PricingTable
              checkoutProps={{
                appearance: {
                  elements: {
                    root: "bg-transparent"
                  }
                }
              }}
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              © 2024 Claw Lite. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <Link href="#" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
