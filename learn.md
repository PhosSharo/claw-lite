# learn.md
> Agent Session Log, Mistakes, incompatibilities, and corrected assumptions. Read before acting.

---

## Clerk UserButton Props — 2026-03-08

### ❌ What Failed
Used `afterSignOutUrl` prop on `<UserButton />` component from `@clerk/nextjs`.

### 🔍 Why It Failed
The `afterSignOutUrl` prop doesn't exist on the UserButton component in Clerk v7. The prop was either removed or never existed in this version.

### ✅ Fix / Workaround
Remove the prop entirely. Use `<UserButton />` without the `afterSignOutUrl` prop. The sign-out redirect is handled by Clerk's default behavior or can be configured at the provider level.

### ⚠️ Watch Out
Check Clerk's TypeScript definitions for available props before using them.

---

## Svix Package for Clerk Webhooks — 2026-03-08

### ❌ What Failed
Created webhook handler using `svix` package without it being installed.

### 🔍 Why It Failed
The `svix` package is required for verifying Clerk webhook signatures but wasn't in the project dependencies.

### ✅ Fix / Workaround
Install svix with `bun add svix` before using it in webhook handlers.

### ⚠️ Watch Out
Always verify dependencies are installed before importing them. Check package.json for existing dependencies.

---

## Next.js 16 Middleware vs Proxy — 2026-03-08

### ❌ What Failed
Created `middleware.ts` file for Clerk authentication, causing build error: "Both middleware file and proxy file are detected. Please use proxy.ts only."

### 🔍 Why It Failed
The project already had `proxy.ts` with Clerk middleware configured. Having both files causes a conflict.

### ✅ Fix / Workaround
Use `proxy.ts` instead of `middleware.ts` in Next.js 16+. Check for existing proxy.ts before creating middleware files.

### ⚠️ Watch Out
Next.js 16+ proxy.ts usually appears when a framework or tool generates a wrapper around middleware logic.

---
