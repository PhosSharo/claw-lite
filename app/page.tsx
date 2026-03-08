import Link from "next/link";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

export default async function Home() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
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
            <UserButton />
          )}
        </nav>
      </header>

      {/* Hero */}
      <main className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-6">
          Welcome to Claw Lite
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-md mb-8">
          A minimal starter with Clerk authentication. Sign up to get started.
        </p>
        {!user ? (
          <SignUpButton mode="redirect">
            <button className="text-base font-medium px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors">
              Get Started
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
      </main>
    </div>
  );
}
