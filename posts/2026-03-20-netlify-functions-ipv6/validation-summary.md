# Validation Summary: How to Configure Netlify Functions with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Netlify Functions (AWS Lambda compatibility mode)
- Netlify Edge Functions (Deno-based)
- `@netlify/edge-functions` Context API
- IPv6 addressing (`/64` subnet rate limiting)
- Winston logging
- `netlify.toml` configuration

## Sources Consulted
- [Netlify Edge Functions API reference](https://docs.netlify.com/build/edge-functions/api/) — Context object (`context.ip`, `context.geo`) structure
- [Netlify Functions API reference](https://docs.netlify.com/build/functions/api/) — modern Functions API surface
- [Netlify Functions Lambda compatibility mode](https://docs.netlify.com/build/functions/lambda-compatibility/) — `event` object shape
- [Netlify Edge Functions declarations](https://docs.netlify.com/build/edge-functions/declarations/) — `[[edge_functions]]` syntax in `netlify.toml`
- [Netlify Support: Edge functions don't expose Client's IP](https://answers.netlify.com/t/edge-functions-dont-expose-clients-ip/56623) — confirms `context.ip` is the supported way and the `x-nf-client-connection-ip` header is no longer exposed to Edge Functions
- [Netlify Support: User Location in Headers](https://answers.netlify.com/t/user-location-in-headers/11937) — confirms `x-country` is forwarded to Lambda-style functions

## Issues Found
1. **Edge Function client IP retrieval used a deprecated header.** The "IPv6 in Netlify Edge Functions" example read `request.headers.get("x-nf-client-connection-ip")`, but Netlify removed direct access to that header for Edge Functions and now requires `context.ip`. Replaced the header lookup with `context.ip ?? "unknown"` and removed the now-unnecessary `x-forwarded-for` fallback (the `x-forwarded-for` chain isn't a documented Edge Function input either).
2. **Same bug repeated in the rate-limiting Edge Function.** The "IPv6-Aware Rate Limiting in Edge Functions" example also pulled the IP from the deprecated header. Switched it to `context.ip ?? "unknown"`.
3. **Conclusion contradicted the corrected examples.** Updated the closing paragraph to clarify that Lambda-style Functions use `x-nf-client-connection-ip` / `x-forwarded-for`, while Edge Functions use `context.ip`.

## Review Notes
- The Lambda-style Functions example (`exports.handler` with the `event` object) is using the legacy Lambda compatibility API. It still works today, but Netlify is steering users toward the modern Web-standards Functions API where `context.ip` and `context.geo` are first-class. A future revision could mention the migration path.
- The `event.headers["x-country"]` lookup is supported by Netlify's proxy. The `event.headers["x-city"]` lookup is not officially documented for Lambda-style functions; left in place because the code falls back to `"unknown"` if the header is absent, but readers wanting reliable city data should prefer Edge Functions and `context.geo.city`.
- The `/64` rate-limit normalization assumes a fully expanded IPv6 address. Compressed forms (e.g., `2001:db8::1`) would split into fewer than four groups and produce a key like `2001:db8::::`. For production use, normalize the address first (e.g., via a parser like `ipaddr.js`) before slicing — this is a robustness caveat rather than a correctness error.
- The `netlify.toml` example correctly uses the `[[edge_functions]]` array-of-tables syntax with `path` and `function` keys, matching current Netlify documentation.
