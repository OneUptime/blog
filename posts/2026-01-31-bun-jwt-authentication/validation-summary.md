# Validation Summary: How to Implement JWT Authentication with Bun

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun runtime (Bun.serve, bun:test, bun init)
- TypeScript
- jose library (SignJWT, jwtVerify)
- bcrypt (Node.js bindings)
- JSON Web Tokens (JWT) — HS256 algorithm
- HTTP-only cookies, SameSite attribute
- Mermaid diagrams (sequence + flowchart)

## Sources Consulted
- jose library documentation: https://github.com/panva/jose and https://www.npmjs.com/package/jose (SignJWT, jwtVerify, setProtectedHeader, setExpirationTime, setIssuer, setAudience, sign APIs)
- Bun documentation: https://bun.sh/docs (Bun.serve, bun init -y, bun:test runner including expect().rejects)
- bcrypt npm package documentation: https://www.npmjs.com/package/bcrypt (hash, compare APIs)
- RFC 7519 (JSON Web Token) and RFC 7518 (JSON Web Algorithms) for HS256 key size requirements (256 bits / 32 bytes)
- MDN: Set-Cookie attributes (HttpOnly, Secure, SameSite, Path, Max-Age)
- OWASP cheat sheets on JWT, password storage, and authentication

## Issues Found
1. **Misleading "constant-time comparison" comment in validateCredentials** — the original comment said "Use constant-time comparison to prevent timing attacks" above an `await bcrypt.hash(...)` call. Hashing is not a comparison; the purpose of that line is to make the not-found path take similar time to the valid path, mitigating user enumeration via timing. Rewrote the comment to accurately describe the intent (preventing user enumeration via consistent response time).

2. **Rate limiter described as "sliding window"** — the prose claimed the implementation "uses a sliding window approach", but the code clearly uses a fixed window with reset (a new entry with `resetTime: now + windowMs` is created when the previous window expires, rather than tracking a moving window of timestamps). Changed the description to "fixed window approach" to match the implementation.

3. **Missing `await` on async expectations in tests** — two test cases used `expect(verifyAccessToken(...)).rejects.toThrow();` without awaiting or returning the promise. In bun:test (and similarly in Jest/Vitest), `.rejects.toThrow()` returns a promise; without awaiting, the test can finish before the assertion completes and the rejection assertion can be lost or trigger an unhandled rejection. Added `await` in front of both calls.

## Review Notes
- The post uses the `bcrypt` package (native bindings). Bun 1.1+ ships with a built-in `Bun.password` API (Argon2id by default, with bcrypt available) that would be more idiomatic for a Bun-specific tutorial and avoids the native-build step, but using `bcrypt` is still correct and widely understood — left as-is per the "only fix technical errors" guideline.
- The `COOKIE_OPTIONS` constant in `src/utils/cookies.ts` is declared but never referenced; the cookie strings are hand-built. Not a technical error, just dead code.
- The "JWT secret must be at least 256 bits (32 characters)" comment is correct for ASCII secrets (which the `TextEncoder` will encode to 1 byte per char). It would be slightly imprecise if the user used multi-byte UTF-8 characters, but the practical guidance is right.
- The rate-limit middleware reads `X-Forwarded-For` / `X-Real-IP` from the request directly; in production these should only be trusted when the app sits behind a known proxy, otherwise clients can spoof their IP. The post does note "in production, get actual client IP" which acknowledges this — no change made.
- The protected-route `authMiddleware` does not consult the access-token blacklist that is later defined in `src/utils/blacklist.ts`. This is shown as a separate module to illustrate the concept rather than fully wired up. Not incorrect, just a future improvement.
- `jose`'s `setExpirationTime` accepts duration strings like `"15m"` and `"7d"` (verified against jose docs), so the config values used throughout are valid.
- `Bun.serve` API usage (`port`, `fetch`, `server.port`) is current and correct for Bun 1.x.
- All Mermaid diagrams parse correctly and accurately describe the flows shown.
