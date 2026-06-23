# Validation Summary: How to Secure Node.js APIs Against Common Vulnerabilities (OWASP Top 10)

## Status
validated

## Post Type
Guide / Tutorial (security hardening walkthrough with code examples)

## Technologies Covered
- Node.js
- Express
- bcrypt (password hashing)
- Node.js `crypto` (AES-256-GCM authenticated encryption)
- express-validator (input validation)
- `child_process` (`exec` vs `execFile`)
- express-rate-limit
- Helmet (HTTP security headers / CSP)
- cors
- jsonwebtoken (JWT access/refresh tokens)
- npm audit / npm ci, Snyk, GitHub Actions
- winston (structured security logging)
- Node.js `dns` / `URL` (SSRF prevention)
- MongoDB / Mongoose and Sequelize (NoSQL/SQL injection context)

## Sources Consulted
- OWASP Top 10 (2021) — https://owasp.org/Top10/
- OWASP SSRF Prevention in Node.js — https://owasp.org/www-community/pages/controls/SSRF_Prevention_in_Nodejs
- Helmet documentation — https://github.com/helmetjs/helmet and https://www.npmjs.com/package/helmet
- NIST SP 800-38D (GCM, 96-bit IV recommendation) — https://csrc.nist.gov/publications/detail/sp/800-38d/final
- Node.js `crypto` docs (`createCipheriv` / `getAuthTag` / GCM) — https://nodejs.org/api/crypto.html
- Node.js `child_process` docs (`exec` vs `execFile`) — https://nodejs.org/api/child_process.html
- jsonwebtoken docs — https://github.com/auth0/node-jsonwebtoken
- express-rate-limit docs — https://github.com/express-rate-limit/express-rate-limit
- npm CLI docs (lifecycle scripts, `npm ci`) — https://docs.npmjs.com/cli/v10/commands/npm-ci and npm-scripts lifecycle reference

## Issues Found
1. **Incorrect SSRF / DNS rebinding claim (A10).** The original code resolved the hostname once with `dns.resolve4()` to validate it, then issued `fetch(url)`, which re-resolves the hostname at request time. The inline comment claimed "This catches DNS rebinding attacks where hostname resolves to internal IP." This is backwards — the validate-then-fetch pattern is a classic time-of-check/time-of-use (TOCTOU) race and is precisely what DNS rebinding exploits. Fixed by correcting the comment to explain that the IP check alone does **not** stop DNS rebinding, and adding a note (near both the resolution and the `fetch` call) that full protection requires pinning the validated IP and connecting to it directly while preserving the original `Host` header. Verified against OWASP's SSRF Prevention in Node.js guidance.

2. **`"install": "npm ci"` npm script footgun (A08).** `install` is a reserved npm lifecycle script. Defining it means `npm install` triggers the `install` hook (`npm ci`), and `npm ci` itself runs install lifecycle scripts, causing recursion/unexpected behavior. Renamed the script to a non-reserved name (`ci-install`) and added a note explaining why `install` must not be used as a script name. Verified against npm CLI lifecycle-script documentation.

## Review Notes
- **Helmet `xssFilter: false` (A05):** Verified that `xssFilter` is still accepted as a top-level option key in Helmet v7 and that `xssFilter: false` omits the legacy `X-XSS-Protection` header. By default Helmet sets the header to `0` (filter disabled); the surrounding comment is accurate enough. No change made.
- **AES-256-GCM (A02):** Correct — `createCipheriv`/`createDecipheriv`, 12-byte (96-bit) IV per NIST SP 800-38D, and `getAuthTag`/`setAuthTag` usage are all accurate.
- **bcrypt cost factor (A02):** "minimum 10" is presented as a recommendation rather than a hard library constraint (bcrypt accepts cost 4–31); the framing is fine. Note that bcrypt silently truncates passwords beyond 72 bytes — not mentioned, but not incorrect for this post's scope.
- **Duplicate `getUser` function names (A03):** The "GOOD" and "BETTER" SQL examples both define `getUser`; this is illustrative side-by-side code, not meant to coexist in one file. Left as-is.
- **JWT (A07):** `jwt.sign`/`jwt.verify` usage, HS256 default, and the access/refresh token-type guard are all correct. The in-memory `Map` for refresh tokens is appropriately flagged as "use Redis in production."
- **express-rate-limit (A04):** Options (`windowMs`, `max`, `standardHeaders`, `legacyHeaders`, `skipSuccessfulRequests`, `message`) are valid for v6/v7.
- The SRI hash in the CDN example is a placeholder and should be regenerated for any real resource (expected for a documentation example).
