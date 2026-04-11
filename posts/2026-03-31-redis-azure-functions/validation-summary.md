# Validation Summary: How to Use Redis with Azure Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Functions (Node.js v4 programming model, `@azure/functions` package)
- Azure Cache for Redis (`az redis` CLI commands)
- node-redis v4+ (`redis` npm package)
- Azure CLI (`az functionapp`, `az redis`)

## Sources Consulted
- Azure Functions HTTP trigger documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger
- Azure Functions Node.js developer reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
- Azure Functions HTTP output bindings: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-output
- `@azure/functions` HttpResponse source: https://github.com/Azure/azure-functions-nodejs-library/blob/v4.x/src/http/HttpResponse.ts
- node-redis GitHub / README: https://github.com/redis/node-redis
- node-redis v3-to-v4 migration guide: https://github.com/redis/node-redis/blob/master/docs/v3-to-v4.md
- Azure CLI `az redis` reference: https://learn.microsoft.com/en-us/cli/azure/redis
- Azure Cache for Redis development FAQ: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-development-faq

## Issues Found

### 1. Missing `route` property in Azure Function caching example
- **What was wrong:** The `app.http()` registration used `request.params.id` to read a route parameter, but did not define a `route` with `{id}`. Without an explicit route containing `{id}`, `request.params.id` would always be `undefined`.
- **What was changed:** Added `route: 'products/{id}'` to the `app.http()` options object.
- **Why:** Azure Functions v4 only populates `request.params` from parameters declared in the `route` template. The default route (function name) has no parameters.

### 2. Inconsistent response Content-Type between cache HIT and MISS
- **What was wrong:** Cache HIT returned `{ body: cached }` (a raw string, no automatic Content-Type header), while cache MISS returned `{ jsonBody: product }` (which automatically sets `Content-Type: application/json`). This meant clients would receive different Content-Types depending on cache state.
- **What was changed:** Changed cache HIT response from `{ body: cached }` to `{ jsonBody: JSON.parse(cached) }` so both paths use `jsonBody` and consistently return `application/json`.
- **Why:** The `body` property does not set a Content-Type header, while `jsonBody` automatically sets `application/json`. Using `jsonBody` for both paths ensures consistent behavior for API consumers.

## Review Notes
- The rate limiting example uses a simple `INCR` + conditional `EXPIRE` pattern which has a known (minor) race condition: if the process crashes between `incr` and `expire` when `count === 1`, the key persists indefinitely. This is acceptable for a tutorial but production code should consider using a Lua script or `MULTI/EXEC` for atomicity.
- The `az redis list-keys` command returns access keys (primaryKey/secondaryKey), not a full connection string. The user must construct the `rediss://` URL manually from the key and hostname. The blog's description ("Retrieve the connection string") is slightly misleading but the command itself is correct.
- All node-redis v4 API usage (createClient, isOpen, connect, setEx, incr, expire, get) is correct and current.
- All Azure CLI commands (az redis create, az redis list-keys, az functionapp config appsettings set) use correct syntax and flags.
- The TLS connection details (rediss:// protocol, port 6380, hostname format) are accurate for Azure Cache for Redis.
