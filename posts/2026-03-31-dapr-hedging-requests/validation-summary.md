# Validation Summary: How to Implement Hedging Requests with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation)
- Go (goroutines, channels, context cancellation)
- JavaScript / Node.js (Promise.any, setTimeout, async/await)
- Python (asyncio, async/await)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr Python SDK (`dapr.aio.clients`)

## Sources Consulted
- Dapr Go SDK source code and interface definitions (`github.com/dapr/go-sdk` — `client.go`, `invoke.go`)
- Dapr JavaScript SDK source code (`github.com/dapr/js-sdk` — `IClientInvoker.ts`, `HttpMethod.enum.ts`, examples)
- Dapr Python SDK source code (`github.com/dapr/python-sdk` — `dapr/clients/__init__.py`, `dapr/aio/clients/`, `_response.py`)

## Issues Found

1. **Unused `sync` import in Go code (Pattern 1):** The `"sync"` package was imported but never used. Go treats unused imports as compilation errors. Removed the unused import.

2. **Incorrect JS SDK `invoke` parameter order (Pattern 2):** The call `client.invoker.invoke(appId, method, data, { method: 'POST' })` had the wrong parameter order. The Dapr JS SDK signature is `invoke(appId, methodName, httpMethod, data)` — the HTTP method is the 3rd parameter and data is the 4th. Fixed to `client.invoker.invoke(appId, method, "POST", data)`.

3. **Synchronous client used in async context (Pattern 3):** The code imported `DaprGrpcClient` (synchronous) and called `client.invoke_method()` without `await` inside an `async def`. This would block the asyncio event loop. Fixed by switching to the async client (`from dapr.aio.clients import DaprClient`), using `async with` for the client context manager, and adding `await` to `invoke_method`.

4. **Dict passed directly to `data` parameter (Pattern 3):** The `invoke_method` `data` parameter expects `Union[bytes, str, GrpcMessage]`, not `dict`. Added `json.dumps(data)` serialization and explicit `content_type="application/json"`.

5. **Intro text referenced `Promise.race` but code uses `Promise.any`:** The introduction mentioned JavaScript's `Promise.race` as the hedging mechanism, but the actual code correctly uses `Promise.any` (which ignores rejections until all promises fail). Updated text to say `Promise.any`. Also changed `asyncio.gather` to `asyncio` since the code uses `asyncio.wait`, not `asyncio.gather`.

## Review Notes
- The Python `asyncio.wait(FIRST_COMPLETED)` pattern returns the first task to complete, whether it succeeded or failed. If the fastest-completing task raises an exception, `task.result()` will re-raise it rather than waiting for a successful response. For production use, the code would benefit from a loop that skips failed tasks, but this is a robustness concern rather than a correctness error in the tutorial context.
- The JavaScript delayed hedging pattern wraps async work inside `setTimeout` + `Promise` constructor, which is a known anti-pattern ("promise constructor anti-pattern"). It works but could be simplified with a helper that returns a delayed promise. Left as-is since it functions correctly.
- The Go code's `defer cancel()` is called alongside an explicit `cancel()` on success. The double-cancel is harmless (context cancellation is idempotent) and is the idiomatic Go pattern.
