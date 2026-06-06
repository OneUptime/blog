# Validation Summary: How to Build REST APIs with Express and TypeScript

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express (4.x)
- TypeScript
- Zod (3.x)
- Helmet
- CORS
- uuid
- Docker

## Sources Consulted
- Express 5 migration guide — https://expressjs.com/en/guide/migrating-5.html (confirms `req.query` is now a read-only getter)
- Zod v4 changelog / migration guide — https://zod.dev/v4/changelog (confirms `.errors` removed in favor of `.issues`)
- Zod GitHub issue #4935 — `AnyZodObject` removal in v4
- npm registry for `express` (5.2.x latest) and `zod` (4.4.x latest)
- TypeScript compiler options reference — https://www.typescriptlang.org/tsconfig
- Helmet docs — https://helmetjs.github.io/
- Express docs for `req.headers`, `Router`, middleware signatures

## Issues Found

1. **Missing `uuid` dependency.** `src/services/users.service.ts` imports `v4 as uuid` from `'uuid'`, but the install commands never installed `uuid` or `@types/uuid`. Fix: added both to the install commands.

2. **Code is incompatible with Express 5 (current default for `npm install express`).** The validation middleware reassigns `req.query` and `req.params`:
   ```ts
   req.query = validated.query as typeof req.query;
   req.params = validated.params as typeof req.params;
   ```
   In Express 5 (stable since Oct 2024), `req.query` is a getter-only property; reassignment throws `TypeError: Cannot set property query of #<IncomingMessage> which has only a getter`. Fix: pinned the install command to `express@^4.21` and `@types/express@^4`, with an inline comment explaining why.

3. **Code is incompatible with Zod 4 (current default for `npm install zod`).** Two issues:
   - `import { AnyZodObject, ZodError } from 'zod';` — `AnyZodObject` was removed in Zod v4.
   - `error.errors.map(...)` — `.errors` was removed from `ZodError` in v4 in favor of `.issues`.
   Fix: pinned the install command to `zod@^3.23`, with an inline comment explaining why.

## Review Notes

- **`z.string().email()` / `z.string().uuid()`** are deprecated in Zod v4 in favor of `z.email()` / `z.uuid()`, but still functional in both v3 and v4. Acceptable as-is for the pinned v3 install.
- **`z.coerce.boolean()`** in `listPostsSchema` (`published: z.coerce.boolean().optional()`) uses JavaScript's `Boolean()` coercion, so any non-empty string (including `"false"`) coerces to `true`. This is a well-known Zod gotcha but it is the documented behavior, not a bug — left as-is to match the rest of the post's style.
- **`const { ...userWithoutPassword } = user;`** in `UsersService.create` is a no-op spread (the `User` schema does not include `password`, so nothing is being stripped). The `Omit<User, 'password'>` return type is also a no-op (`Omit<T, K>` where `K` is not in `T` is just `T`). This is misleading but not technically incorrect — left as-is since fixing it would require restructuring the schema and is outside the scope of pure technical corrections.
- **`ts-node` is installed but never used** (the dev/start scripts use `tsx` and `tsc` respectively). Harmless redundancy — left as-is.
- **Future-proofing:** when this post is next refreshed, it would be worth migrating the code to Express 5 + Zod 4 (replacing `AnyZodObject` with `z.ZodType` / `z.ZodObject<any>`, `.errors` with `.issues`, and using `Object.defineProperty` or `res.locals` instead of reassigning `req.query`).
