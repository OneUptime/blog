# Validation Summary: How to Build REST APIs with Deno and Oak

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno (runtime)
- Oak web framework (v12.6.1)
- TypeScript
- REST API design patterns
- JWT (illustrative decode only)
- CORS

## Sources Consulted
- Deno official install documentation: https://deno.land/manual/getting_started/installation
- Deno permissions documentation: https://deno.land/manual/getting_started/permissions
- Deno runtime APIs (`Deno.env`, `crypto.randomUUID`): https://deno.land/api
- Oak framework documentation and source: https://deno.land/x/oak@v12.6.1
- Oak v12 `Request.body()` API (returns `{ type, value }`): https://deno.land/x/oak@v12.6.1/request.ts
- Oak `Status` enum and `isHttpError`: https://deno.land/x/oak@v12.6.1/mod.ts
- MDN: `atob`, base64url encoding for JWT
- RFC 7519 (JWT)

## Issues Found
No technical issues found.

The post correctly pins `oak@v12.6.1` and uses the v12-style `ctx.request.body()` method that returns an object with `type` and `value` properties — this matches the v12 API (the API changed significantly in v13+, where `ctx.request.body` became a property with `.json()`, `.text()` methods). The Deno install URLs, permission flags (`--allow-net`, `--allow-env`, `--watch`), `Deno.env.get()`, `crypto.randomUUID()`, `Status` enum members, `isHttpError`, `RouterContext` generics, and `Router({ prefix })` usage are all correct for the pinned version.

## Review Notes
- **Oak version is older.** Oak v12.6.1 is correct for the code shown, but Oak v13+ uses a substantially different request body API. Future readers porting to a newer Oak will need to update body parsing (`ctx.request.body.json()` instead of `ctx.request.body()` with `.type`/`.value`).
- **`X-XSS-Protection` is deprecated.** Modern browsers (Chrome, Firefox, Safari recent versions) no longer support this header, and OWASP now recommends omitting it in favor of a strong Content-Security-Policy. It is not incorrect to set, but readers should prefer CSP.
- **JWT decode is illustrative only.** The `decodeToken` helper uses `atob` directly, which does not handle base64url's `-`/`_` characters and does not verify the signature. The post explicitly calls this out and recommends `djwt` for production — acceptable as a teaching simplification.
- **`parseInt` without radix.** A few `parseInt(value)` calls omit the radix argument. Not incorrect (radix is inferred from the string in current engines), but some style guides prefer explicit `parseInt(value, 10)`.
- **`ctx.params` typing for `RouterContext<"/:id">`.** The generic correctly drives parameter typing in Oak v12; no changes needed.
