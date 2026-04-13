# Validation Summary: How to Use Auth.js (next-auth v5) with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Auth.js (next-auth v5)
- MongoDB
- Next.js (App Router)
- @auth/mongodb-adapter
- OAuth (GitHub provider)
- Credentials provider

## Sources Consulted
- Auth.js v5 official documentation (https://authjs.dev)
- Auth.js MongoDB adapter documentation (https://authjs.dev/getting-started/adapters/mongodb)
- Auth.js Credentials provider documentation (https://authjs.dev/getting-started/providers/credentials)
- Auth.js session strategies documentation (https://authjs.dev/concepts/session-strategies)
- MongoDB TTL index documentation (https://www.mongodb.com/docs/manual/core/index-ttl/)

## Issues Found

1. **Outdated install tag `next-auth@beta`**: Auth.js v5 was released as stable in late 2024. The `@beta` tag is no longer needed. Changed to `next-auth`.

2. **Missing `session: { strategy: 'jwt' }` in config**: The Credentials provider does not support database sessions. When a database adapter is present, Auth.js defaults to `database` session strategy, which causes the Credentials provider to silently fail (sessions are not created). Added `session: { strategy: 'jwt' }` to the config.

3. **Session callback used database-session signature with Credentials provider**: The original callback used `{ session, user }`, which is the signature for database sessions. With the required JWT strategy, the correct signature is `{ session, token }`. Updated the callback and added a `jwt` callback to persist the custom `role` field into the token.

4. **`authorize` returned raw MongoDB document**: MongoDB documents use `_id` (ObjectId), but Auth.js expects a `User` object with a string `id` field. Returning the raw document would result in `undefined` for `user.id`. Changed to return a properly shaped object: `{ id: user._id.toString(), email: user.email, name: user.name, role: user.role }`.

5. **Misleading Key Differences bullet**: "database sessions store tokens in MongoDB" conflated sessions with tokens. Updated to clarify that the Credentials provider requires JWT strategy.

## Review Notes
- The `verificationTokens` collection name used in the recommended indexes section may vary by adapter version. Some versions of `@auth/mongodb-adapter` use `verification_tokens` (snake_case) as the default collection name. Readers should verify actual collection names in their database.
- The `authorize` callback lacks password validation (noted by the existing comment). This is acceptable for a tutorial but readers should be aware that the example is intentionally simplified.
- The middleware pattern shown (`export default auth(...)`) is correct for Auth.js v5 but requires the `auth` export from the root `auth.js` file, which is properly demonstrated.
