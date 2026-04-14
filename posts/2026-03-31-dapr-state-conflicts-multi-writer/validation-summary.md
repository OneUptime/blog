# Validation Summary: How to Handle State Conflicts in Dapr Multi-Writer Scenarios

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state management HTTP API and concurrency model)
- @dapr/dapr JavaScript/Node.js SDK
- JavaScript (Node.js) with Fetch API
- ETag-based optimistic concurrency control

## Sources Consulted
- Dapr State Management API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State Management Overview: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-management-overview/
- Dapr JavaScript SDK Documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JavaScript SDK source (StateConcurrencyEnum, IClientState): https://github.com/dapr/js-sdk
- Dapr runtime source (HTTP API ETag handling): https://github.com/dapr/dapr/blob/master/pkg/api/http/http.go

## Issues Found

### 1. SDK concurrency option used raw string instead of enum (Strategy 2)
**What was wrong:** The `updateHeartbeat` example passed `options: { concurrency: 'last-write' }` as a raw string to the `@dapr/dapr` SDK's `client.state.save()` method. The SDK defines concurrency options as numeric enum values in `StateConcurrencyEnum`, not as raw strings. Passing a string would be a type error and may not map correctly at runtime.

**What was changed:** Updated the import to include `StateConcurrencyEnum` and changed the concurrency value from `'last-write'` to `StateConcurrencyEnum.CONCURRENCY_LAST_WRITE`.

**Why:** The HTTP API accepts string values like `"first-write"` and `"last-write"` directly (used correctly in Strategies 1 and 4 which use `fetch`), but the SDK abstracts this through enum types. The SDK's internal conversion function maps enum numbers to the correct HTTP API string values.

### 2. Missing error throw after retry exhaustion (Strategy 4)
**What was wrong:** The `mergeCounters` function silently returned `undefined` if all 10 retries were exhausted without a successful write. This is inconsistent with Strategy 1's `addItemToList` which correctly throws after retry exhaustion, and would cause subtle bugs in calling code that expects a return value.

**What was changed:** Added `throw new Error('Conflict resolution failed after retries');` after the retry loop.

**Why:** A function that silently fails by returning `undefined` when it should have returned `{ count: N }` would cause downstream errors that are much harder to debug than an explicit exception.

## Review Notes
- The HTTP API examples (Strategies 1 and 4) correctly use raw string values `"first-write"` for the concurrency option in the JSON payload. This is the correct format for the Dapr HTTP API. The distinction is that the SDK uses enums while the HTTP API uses strings.
- HTTP 409 for ETag conflicts is confirmed in the Dapr runtime source code (`pkg/api/http/http.go`), though it is not explicitly listed in the official API reference documentation's status code tables. The blog's claims about 409 behavior are accurate.
- Strategy 4 is labeled "CRDT-Style Merge" but is more accurately an optimistic concurrency control pattern with a commutative merge function. True CRDTs (e.g., G-Counters) use per-replica state to achieve conflict-free convergence. The "style" qualifier makes this acceptable but readers should note the distinction.
- The `Date.now()` component in Strategy 3's key generation could produce duplicate keys if two events are logged in the same millisecond, though the appended random string mitigates this. For production use, a UUID would be more robust.
