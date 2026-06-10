# Validation Summary: How to Implement Middleware in Deno

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Deno (runtime)
- TypeScript
- Oak web framework (v12.6.1)
- djwt (v3.0.1) for JWT signing/verification
- Zod (v3.22.4) for schema validation
- Web Crypto API (`crypto.subtle.importKey`, `crypto.randomUUID`)
- Middleware patterns: logging, authentication (JWT, API key), authorization (RBAC), CORS, rate limiting (fixed window, token bucket), error handling, composition, request validation

## Sources Consulted
- Oak v12.6.1 source: https://deno.land/x/oak@v12.6.1/mod.ts (verified `Application`, `Router`, `Context`, `isHttpError`, `Status`, `Middleware`, `Next` exports)
- Oak v12 `Request.body()` API (function returning `{ type, value }` union, distinct from v13+ `body.json()` form): https://deno.land/x/oak@v12.6.1/request.ts
- Oak v12 `Request.ip` accessor: https://deno.land/x/oak@v12.6.1/request.ts
- djwt v3.0.1 source: https://deno.land/x/djwt@v3.0.1/mod.ts (verified `create(header, payload, key)`, `verify(token, key)`, `getNumericDate(seconds | Date)` signatures)
- Zod v3.22.4 source: https://deno.land/x/zod@v3.22.4/mod.ts (verified `z`, `ZodError`, `ZodSchema` exports; `ZodError.errors` getter returning issues with `path` and `message`)
- MDN: Web Crypto `SubtleCrypto.importKey` for HMAC-SHA-256
- MDN: CORS preflight headers (`Access-Control-Allow-*`, `Access-Control-Max-Age`)
- RFC 6585 for HTTP 429 Too Many Requests and `Retry-After` header semantics
- RFC 7519 (JWT structure and claims: `sub`, `exp`)

## Issues Found

1. **Rate limiter mislabeled as "Sliding window".** The `createRateLimitMiddleware` example stores `{ count, resetTime }` per key and resets the counter when `now > resetTime`. This is the textbook fixed-window algorithm — a true sliding window would track individual request timestamps (or weight across two adjacent fixed windows). Fix: relabeled the section heading to "Fixed window rate limiter implementation for request counting" so the description matches the algorithm. The code itself is correct for a fixed window and was left unchanged.

2. **Missing `Context` and `Next` imports in the final `main.ts` example.** The `requestIdMiddleware` function references the `Context` and `Next` types, but the imports only pulled in `Application` and `Router` from `./deps.ts`. As written, the file would fail to type-check. Fix: added `Context` to the value import and `Next` as a separate `import type` (since `Next` is re-exported as a type from `deps.ts`).

3. **Unused `compose` import in the final `main.ts` example.** `compose` was imported alongside `unless` but never used in the example. Fix: removed `compose` from the import to avoid an unused-import warning under common Deno lint configs. `unless` is still imported and used.

## Review Notes

- **Oak version pin is older than current.** Oak v12.6.1 is correct for the code shown (especially the `ctx.request.body().value` pattern used by the Zod validator), but Oak v13+ moved to `ctx.request.body.json()`/`.text()` accessors. Readers porting to a newer Oak will need to update body parsing and re-verify `Middleware`/`Next` type locations. Not a defect for the pinned version.
- **`catch (error)` accesses `error.message` / `error.stack` without narrowing.** In TypeScript 4.4+ default config, `error` is typed `unknown` and these property accesses would be type errors under strict mode. Deno's default `tsconfig` is permissive enough that these compile, and the pattern is conventional in tutorials, so left as-is — but a production codebase should narrow with `error instanceof Error` before access.
- **In-memory rate-limit and token-bucket stores will not work across multiple processes/instances.** The post correctly notes "in production, use Redis" in a comment. Not a defect.
- **`setInterval` cleanup runs forever.** The `createRateLimitMiddleware` registers a `setInterval` that is never cleared, so it will leak if the middleware factory is invoked repeatedly. Acceptable for a singleton at app startup (the documented usage pattern), but worth noting for tests or hot-reload scenarios.
- **`X-RateLimit-Reset` is emitted as raw `Date.now()` milliseconds.** There is no formal standard for this header — GitHub uses Unix seconds, some APIs use delta-seconds. Both are seen in the wild; the post's milliseconds form is uncommon but not wrong. A production deployment should pick a convention and document it.
- **JWT secret default `"your-secret-key"`.** The post explicitly recommends `Deno.env.get("JWT_SECRET")` and the fallback is only a development convenience. Acceptable for a teaching example.
- **`payload.sub as string` casts in `authMiddleware`.** djwt's `Payload` type has `sub?: string`, so the cast bypasses the `undefined` case. Not a runtime bug for tokens issued by `createToken` (which always sets `sub`), but a stricter implementation would validate the payload shape after verification.
