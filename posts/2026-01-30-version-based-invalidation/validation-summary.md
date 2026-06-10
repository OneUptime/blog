# Validation Summary: How to Build Version-Based Invalidation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HTTP ETags (RFC 7232)
- Node.js `crypto` module (MD5, SHA-256)
- Express.js middleware
- PostgreSQL (PL/pgSQL triggers)
- Fetch API (client-side)
- Node.js `EventEmitter`
- Mermaid diagrams (flowchart, sequenceDiagram)

## Sources Consulted
- RFC 7232 (HTTP/1.1 Conditional Requests, ETag and If-None-Match): https://datatracker.ietf.org/doc/html/rfc7232
- Express.js docs (response.setHeader, res.json, middleware): https://expressjs.com/en/4x/api.html
- Node.js crypto module documentation: https://nodejs.org/api/crypto.html
- PostgreSQL PL/pgSQL Trigger Procedures docs: https://www.postgresql.org/docs/current/plpgsql-trigger.html
- MDN Fetch API reference: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- MDN Headers.get() documentation: https://developer.mozilla.org/en-US/docs/Web/API/Headers/get
- Mermaid flowchart and sequenceDiagram syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

## Review Notes
- The Express ETag middleware overrides `res.json` and computes a strong ETag from the response payload. Express has built-in ETag support enabled by default (it uses weak ETags), so in a real app this custom middleware would replace the default behavior — that's a stylistic/architectural choice, not an error.
- The ETag comparison uses strict string equality. RFC 7232 allows `If-None-Match` to contain multiple ETags separated by commas or `*`, and supports weak comparison for weak ETags (`W/"..."`). The simplified comparison shown is fine for the tutorial scope; real-world implementations should consider these cases.
- The introduction states version-based invalidation "eliminates this tradeoff entirely." In practice, conditional revalidation (ETag + `If-None-Match`) still requires a network roundtrip to the origin; what it eliminates is the bandwidth cost of re-transferring unchanged payloads and the staleness risk of long TTLs. This is a mild rhetorical flourish, not a factual error.
- MD5 in `crypto.createHash('md5')` works on current Node.js with default OpenSSL 3 providers (MD5 is not in the legacy provider). The use here is non-cryptographic (content fingerprinting), which is appropriate.
- `JSON.stringify(content)` as ETag input is order-sensitive: two semantically identical objects with different key insertion orders will produce different ETags. For typical handler code paths that always serialize objects the same way, this is not a problem, but worth noting if content originates from sources with non-deterministic key ordering.
- In `getVersionedPath`, the `originalPath.replace(`.${ext}`, '')` call replaces only the first occurrence of `.ext`. For typical paths this is fine; pathological cases (e.g. a directory segment matching `.css`) could misbehave. Not worth fixing for an illustrative snippet.
- The `CacheInvalidator.setVersion` guard `if (oldVersion && oldVersion !== version)` skips emitting on the initial `setVersion` call (when `oldVersion` is `undefined`). This is the intended behavior (no invalidation event when first registering a version) and matches typical conventions; just be aware it also skips when `oldVersion` is `0`, which isn't an issue given the schema starts versions at 1.
- The Mermaid `subgraph Write Path` / `subgraph Read Path` syntax with a space-containing identifier renders correctly in current Mermaid versions (treated as a label).
