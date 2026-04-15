# Validation Summary: How to Use the Dapr Distributed Lock API Reference

## Status
validated

## Post Type
API Reference / Guide

## Technologies Covered
- Dapr Distributed Lock API (v1.0-alpha1)
- Redis lock store component (lock.redis)
- Dapr Go SDK (github.com/dapr/go-sdk/client)
- Go programming language

## Sources Consulted
- Dapr Distributed Lock API HTTP reference — https://docs.dapr.io/reference/api/distributed_lock_api/
- Dapr Distributed Lock overview — https://docs.dapr.io/developing-applications/building-blocks/distributed-lock/distributed-lock-api-overview/
- Dapr Go SDK lock implementation source — https://github.com/dapr/go-sdk/blob/main/client/lock.go
- Dapr runtime HTTP lock handler source — https://github.com/dapr/dapr/blob/master/pkg/api/http/lock.go
- Dapr lock proto definition — https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/dapr.proto

## Issues Found

### 1. Unlock HTTP response showed string status instead of numeric code
- **What was wrong:** The unlock response example showed `"status": "SUCCESS"` (a string). The Dapr HTTP API explicitly marshals unlock responses with `UseEnumNumbers: true` in protojson, meaning the HTTP API returns numeric status codes (e.g., `"status": 0`), not string values.
- **What was changed:** Updated the response example from `"status": "SUCCESS"` to `"status": 0`. Updated the status code table to include the numeric code column (0 = SUCCESS, 1 = LOCK_DOES_NOT_EXIST, 2 = LOCK_BELONGS_TO_OTHERS, 3 = INTERNAL_ERROR).
- **Why:** The Dapr HTTP handler at `pkg/api/http/lock.go` explicitly sets `UseEnumNumbers: true` with the comment "we want to report the status as a number and not a string." Readers following the blog's example would get unexpected numeric responses.

### 2. Lock TTL best practice text was self-contradictory
- **What was wrong:** The text said "Always set an expiry time shorter than your operation's expected duration" — this is incorrect. If the TTL is shorter than the operation, the lock expires before work completes, allowing concurrent access and defeating the purpose of the lock. The example below the text (30s expiry for a 5s operation) was correct but contradicted the text.
- **What was changed:** Corrected "shorter than" to "longer than" and clarified that the TTL is a safety net for crash recovery.
- **Why:** A lock TTL must outlast the critical section. The TTL exists so that if the holder crashes, the lock is eventually released — not as a timer for the operation itself.

## Review Notes
- The Distributed Lock API is still in alpha (`v1.0-alpha1`). The blog correctly reflects this, but readers should be aware the API may change in future Dapr releases.
- The Go SDK methods (`TryLockAlpha1`, `UnlockAlpha1`) also carry the `Alpha1` suffix, which is correctly shown in the blog.
- Note that while the HTTP API returns numeric status codes, the Go SDK's `UnlockResponse` struct provides both `StatusCode int32` and `Status string` fields, so SDK users can check the string value. The blog's Go code example does not check the unlock response (it uses `defer`), which is acceptable for the pattern shown.
- The `processOrder` function is referenced but not defined — this is fine for a code snippet demonstrating the lock pattern.
