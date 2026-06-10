# Validation Summary: How to Implement JWT Authentication in Deno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno runtime
- TypeScript
- Oak HTTP framework (v12.6.1)
- djwt JWT library (v3.0.1)
- bcrypt for Deno (v0.4.1)
- Deno standard library `dotenv` (std@0.208.0)
- Web Crypto API (`crypto.subtle.importKey`, HMAC-SHA256)
- JSON Web Tokens (RFC 7519)
- HTTP-only cookies, Bearer authentication

## Sources Consulted
- djwt v3.0.1 module source: https://deno.land/x/djwt@v3.0.1/mod.ts (verified `create`, `verify`, `getNumericDate`, `Header`, `Payload` exports and signatures)
- Oak v12.6.1 module source: https://deno.land/x/oak@v12.6.1/mod.ts and `request.ts`/`body.ts` (verified `Application`, `Router`, `Context`, `Middleware`, `RouterContext` exports and the `body().value` Promise-based pattern)
- bcrypt v0.4.1 source: https://deno.land/x/bcrypt@v0.4.1/src/main.ts (verified `hash(plaintext, salt?)` and `compare(plaintext, hash)` signatures)
- Deno std@0.208.0 dotenv: https://deno.land/std@0.208.0/dotenv/mod.ts (verified `load()` returns `Promise<Record<string, string>>` and does not populate `Deno.env` by default)
- RFC 7519 (JSON Web Token) for standard claim names (`iss`, `sub`, `iat`, `exp`, `jti`)
- MDN Web Crypto API reference for `crypto.subtle.importKey` parameters

## Issues Found
No technical issues found.

The code samples, import URLs, API signatures, JWT structure, claim semantics, and Deno permission flags (`--allow-net --allow-env --allow-read`) are all accurate for the specified library versions. `getNumericDate(0)` correctly produces the current UNIX timestamp and `getNumericDate(N)` correctly produces a timestamp N seconds in the future, matching the post's usage. The `body().value` Promise pattern is correct for Oak v12 (it was replaced in Oak v14+, but the post pins v12.6.1). The HMAC-SHA256 key import for HS256 signing is correct.

## Review Notes
- The post pins specific versions (Oak v12.6.1, djwt v3.0.1, bcrypt v0.4.1, std@0.208.0). These are valid existing versions, but newer Oak releases (v14+) introduced a different request body API (`ctx.request.body.json()` etc.). Readers upgrading dependencies will need to adjust the body-parsing code accordingly.
- bcrypt v0.4.1 uses a Worker under the hood and requires `--allow-net`; this is correctly included in the run command.
- The TypeScript code accesses `error.message` in catch blocks without narrowing `error` from `unknown`. Under `strict: true` (Deno's default), this would require either disabling `useUnknownInCatchVariables` or adding a type guard. Functionally correct at runtime, but readers using strict TypeScript may see compile warnings.
- The refresh-token rotation flow generates a fresh `family` UUID inside `createRefreshToken` for every new token, but `rotateRefreshToken` stores the new token under the *original* family from the database. As a result, the `family` claim embedded inside the new JWT is unused by the server (which always trusts the stored family). This is a code-quality / design observation rather than a correctness bug — reuse detection still works correctly because it consults the stored family, not the JWT claim.
- The in-memory `Map` token store and `users` map are explicitly flagged as demo-only in the post, which is appropriate.
