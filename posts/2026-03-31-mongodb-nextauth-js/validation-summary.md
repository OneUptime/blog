# Validation Summary: How to Use NextAuth.js with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NextAuth.js / Auth.js v5
- MongoDB
- Next.js (App Router)
- `@auth/mongodb-adapter`
- `mongodb` Node.js driver
- Google OAuth provider

## Sources Consulted
- Auth.js Getting Started documentation — https://authjs.dev/getting-started
- Auth.js MongoDB Adapter reference — https://authjs.dev/getting-started/adapters/mongodb
- Auth.js Migration to v5 guide — https://authjs.dev/getting-started/migrating-to-v5
- Auth.js Session Strategies documentation — https://authjs.dev/concepts/session-strategies
- next-auth npm package — https://www.npmjs.com/package/next-auth

## Issues Found

### 1. Missing `ObjectId` import (runtime error)
- **What was wrong:** The "Adding Custom User Fields" code snippet used `new ObjectId(user.id)` without importing `ObjectId` from the `mongodb` package. This would cause a `ReferenceError: ObjectId is not defined` at runtime.
- **Fix:** Added `import { ObjectId } from 'mongodb';` to the code snippet.

### 2. Deprecated environment variable names
- **What was wrong:** The Environment Variables section listed `NEXTAUTH_SECRET` and `NEXTAUTH_URL`, which are the v4 naming convention. The code examples use the Auth.js v5 API pattern (`export const { handlers, auth, signIn, signOut } = NextAuth({...})`), so the environment variables should use the v5 names.
- **Fix:** Changed `NEXTAUTH_SECRET` to `AUTH_SECRET` and `NEXTAUTH_URL` to `AUTH_URL` to match Auth.js v5 conventions.

## Review Notes
- **File structure:** Auth.js v5 recommends defining the NextAuth configuration in a root-level `auth.js`/`auth.ts` file, then re-exporting only `{ GET, POST }` from the route handler at `app/api/auth/[...nextauth]/route.js`. The blog places the full config in the route file. This works for a simple tutorial but means `auth()`, `signIn()`, and `signOut()` cannot be easily imported from other server components. A future revision could split the config into a separate file.
- **Redundant session strategy:** When a database adapter is provided, Auth.js v5 defaults the session strategy to `'database'` automatically. The explicit `session: { strategy: 'database' }` is redundant but not incorrect — it makes the behavior explicit for readers, which is reasonable in a tutorial context.
- **`NEXTAUTH_SECRET`/`NEXTAUTH_URL` backwards compatibility:** Auth.js v5 still reads the old `NEXTAUTH_*` env vars for backwards compatibility, so the original values would technically work at runtime. However, using the v5 names (`AUTH_SECRET`, `AUTH_URL`) is the recommended practice and avoids confusion when following v5 documentation.
- **`AUTH_URL` auto-detection:** In Auth.js v5, the application URL is auto-detected in most deployment environments (Vercel, etc.), making `AUTH_URL` optional in many cases. It is still useful for local development or custom deployments.
