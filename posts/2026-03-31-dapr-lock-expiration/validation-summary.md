# Validation Summary: How to Handle Lock Expiration in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) - Distributed Lock building block
- Dapr Python SDK (`dapr-ext-grpc`)
- Redis (as lock component backend)
- Python threading
- Prometheus client for Python

## Sources Consulted
- Dapr Distributed Lock API documentation: https://docs.dapr.io/developing-applications/building-blocks/distributed-lock/
- Dapr Python SDK source code (`dapr.clients.grpc.client` module) - `try_lock` and `unlock` method signatures
- Dapr Python SDK source code (`dapr.clients.grpc._response` module) - `TryLockResponse`, `UnlockResponse`, and `UnlockResponseStatus` class definitions
- Dapr Redis lock component source code (`components-contrib/lock/redis/standalone.go`) - SetNX-based implementation confirming no same-owner re-acquisition support

## Issues Found

### 1. `UnlockResponse.status` compared to integer instead of enum (all code examples)
**What was wrong:** All code examples compared `result.status != 0` to check for unlock failure. The `unlock()` method returns an `UnlockResponse` whose `.status` property is an `UnlockResponseStatus` enum, not an integer. In Python 3, enum members never compare equal to plain integers, so `result.status != 0` is always `True`, even on a successful unlock. This would cause every unlock to be treated as a failure.
**What was changed:** Replaced all `result.status != 0` comparisons with `result.status != UnlockResponseStatus.success` and added the correct import `from dapr.clients.grpc._response import UnlockResponseStatus`.

### 2. Wrong import for `UnlockResponse` (first code example)
**What was wrong:** The post imported `from dapr.proto.runtime.v1.dapr_pb2 import UnlockResponse`. This imports the raw protobuf-generated class, not the SDK wrapper class that `client.unlock()` actually returns. The import was also unused in the code.
**What was changed:** Replaced with `from dapr.clients.grpc._response import UnlockResponseStatus`, which is the enum actually needed for status comparison.

### 3. Lock renewal via `try_lock` with same owner does not work (Lock Renewal section)
**What was wrong:** The `LockRenewer` class called `try_lock` with the same owner to "renew" the lock. The Dapr Redis lock component uses Redis `SetNX` (SET if Not eXists), which fails if the key already exists regardless of who the owner is. This means renewal attempts would always fail while the lock is still held, causing the renewer to falsely report lock loss.
**What was changed:** Changed the renewal loop to explicitly `unlock` first and then `try_lock` to re-acquire. Added an introductory note explaining that Dapr has no dedicated lock extension API and that this unlock-then-relock approach has a brief race window. Changed renewal interval from 60% to 50% of TTL to account for the extra round-trip.

### 4. `safe_commit` pattern releases lock before committing (Guarding section)
**What was wrong:** The `safe_commit` function called `unlock` to "verify" lock ownership, then called `commit()` if the unlock succeeded. This means the commit always runs after the lock has been released, defeating the purpose of the lock. Between the unlock and commit, another instance could acquire the lock and create a race condition.
**What was changed:** Restructured the pattern to call `commit()` first (while the lock is still held), then `unlock` to release. The unlock response is checked afterward to detect if the lock had expired during the operation, raising an alert to check for duplicate writes.

## Review Notes
- Dapr's distributed lock API is intentionally minimal (only `try_lock` and `unlock`). There is no lock extension/renewal API, no ownership check API, and no fencing token mechanism. This limits what patterns are possible. The lock renewal approach (unlock-then-relock) is the best available workaround but has an inherent race window that cannot be eliminated with the current API.
- The `safe_commit` pattern, even after the fix, cannot guarantee that the lock was held throughout the entire commit. If the lock expires mid-commit, another instance could acquire it and begin conflicting work. Applications requiring stronger guarantees should implement idempotent operations or use fencing tokens at the storage layer.
- The `prometheus_client` usage is syntactically correct and follows standard patterns.
- The `calculate_expiry` utility function is straightforward and correct.
