# Validation Summary: How to Use State Time-to-Live (TTL) in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr State Management API (HTTP and SDKs)
- Dapr Node.js SDK (`@dapr/dapr`)
- Dapr Python SDK (`dapr-client`)
- Redis, MongoDB, Cosmos DB, DynamoDB, PostgreSQL (as state store backends)

## Sources Consulted
- State Time-to-Live (TTL) - Dapr Docs: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- State Management API Reference - Dapr Docs: https://docs.dapr.io/reference/api/state_api/
- JavaScript Client SDK - Dapr Docs: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- How-To: Save and get state - Dapr Docs: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- PostgreSQL v2 State Store - Dapr Docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Supported State Stores - Dapr Docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/

## Issues Found

### 1. PostgreSQL TTL support incorrectly listed as unsupported
- **What was wrong:** The post listed `state.postgresql` under "Not supported" for TTL, claiming it requires manual cleanup.
- **What was changed:** Moved PostgreSQL to the supported list with a note that TTL is implemented via an expiration column and background garbage collector. Also updated the Summary section to include PostgreSQL in the supported backends list.
- **Why:** Dapr's PostgreSQL state store (both v1 and v2) supports TTL. While PostgreSQL doesn't have native key-level TTL like Redis, Dapr emulates it by storing expiration timestamps in a column and running a periodic garbage collector to remove expired entries. Expired entries are filtered out on read even before garbage collection runs.

### 2. Incorrect claim about retrieving TTL expiration time via GET request
- **What was wrong:** The "Checking Remaining TTL" section claimed you could read `metadata.ttlExpireTime` as a response header from a simple `GET /v1.0/state/<store>/<key>` request. This is not documented in the Dapr State API reference — a simple GET returns only the value body and an ETag header.
- **What was changed:** Rewrote the section to accurately state that Dapr does not return remaining TTL on a simple GET request, and provided an alternative pattern of storing the expiry timestamp as part of the value itself.
- **Why:** The Dapr State API GET endpoint does not return TTL metadata in its response. Presenting undocumented behavior as a feature could mislead readers into writing code that doesn't work.

## Review Notes
- All other code examples (HTTP API, Node.js SDK, Python SDK) are syntactically correct and use current, non-deprecated APIs with proper parameter names.
- The `ttlInSeconds` metadata key is correctly passed as a string value in all examples, which matches the Dapr API requirement.
- The sliding expiration pattern (re-saving with TTL on each access) is a valid and documented approach.
- The common TTL use cases table contains reasonable suggestions, though these are advisory rather than prescriptive.
