# Validation Summary: How to Use Dapr Distributed Lock with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr distributed lock building block
- Redis (as lock store backend)
- Dapr HTTP API (v1.0-alpha1)
- Dapr Node.js SDK (`@dapr/dapr`)
- Dapr Python SDK (`dapr-client`)
- JavaScript / Node.js
- Python

## Sources Consulted
- Dapr distributed lock API reference (https://docs.dapr.io/reference/api/distributed_lock_api/)
- Dapr distributed lock overview (https://docs.dapr.io/developing-applications/building-blocks/distributed-lock/)
- Dapr Redis lock component spec (https://docs.dapr.io/reference/components-reference/supported-lock/)
- Dapr Node.js SDK source — `DaprClient.ts`, `IClientLock` interface, `LockResponse` type (https://github.com/dapr/js-sdk)
- Dapr Python SDK source — `DaprGrpcClient`, `try_lock()`, `TryLockResponse` (https://github.com/dapr/python-sdk)
- Dapr runtime source — lock API route registration confirming `v1.0-alpha1` (https://github.com/dapr/dapr)

## Issues Found

### 1. Python SDK: `client.lock()` should be `client.try_lock()`
- **What was wrong:** The Python code called `client.lock()` to acquire a distributed lock, but the correct method name in the Dapr Python SDK (`DaprGrpcClient`) is `try_lock()`.
- **What was changed:** Replaced `client.lock(...)` with `client.try_lock(...)` on line 157.
- **Why:** The method does not exist as `lock()` on `DaprClient`; calling it would raise an `AttributeError` at runtime.

### 2. Python code: async/sync mismatch
- **What was wrong:** The Python example used `@asynccontextmanager` (from `contextlib`) and `async def` for the context manager, but `DaprClient` from `dapr.clients` exposes synchronous methods (`try_lock()`, `unlock()`). The usage example also used `async with` and `await` with what would be synchronous calls.
- **What was changed:** Changed `asynccontextmanager` to `contextmanager`, `async def distributed_lock` to `def distributed_lock`, `async with` to `with`, `async def process_payment` to `def process_payment`, and removed `await` from `execute_payment()`.
- **Why:** The standard `DaprClient` (gRPC-based) in the Python SDK uses synchronous methods. Using `@asynccontextmanager` with sync calls is architecturally incorrect and misleading. For true async support, one would need `from dapr.aio.clients import DaprClient`.

## Review Notes
- The distributed lock API remains in alpha status (`v1.0-alpha1`). This is correctly reflected in the blog post's HTTP API examples.
- The blog does not show the unlock HTTP API response, which returns `{"status": 0}` on success (with status codes: 0=Success, 1=Lock doesn't exist, 2=Lock belongs to another owner, 3=Internal error). This is a minor omission but not an error.
- The Node.js SDK code is correct: `client.lock.lock()` and `client.lock.unlock()` match the SDK's `IClientLock` interface, and the `LockResponse.success` boolean check is valid.
- The YAML component definition, HTTP API endpoints, request/response bodies, and overall technical explanations are all accurate.
- The TTL guidance and lock contention retry pattern are reasonable and technically sound.
