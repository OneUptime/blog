# Validation Summary: How to Implement Adaptive Retry Policies in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Resiliency (retry policies, circuit breakers)
- Dapr Python SDK (`dapr-client`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- YAML resiliency configuration

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Retry Policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Circuit Breaker Policies: https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr Resiliency Targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Resiliency Spec Schema: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Python SDK Client docs: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr Python SDK source (invoke_method signature): https://github.com/dapr/python-sdk
- Dapr JS SDK source (IClientInvoker interface): https://github.com/dapr/js-sdk
- Dapr JS SDK Client docs: https://docs.dapr.io/developing-applications/sdks/js/js-client/

## Issues Found

1. **YAML: `initialInterval` is not an officially documented field for exponential retry policies.** Only `maxRetries` and `maxInterval` are documented. Removed `initialInterval` from both the production and staging retry configurations.

2. **YAML: `trip: errorRatio(0.3)` is not a valid circuit breaker trip expression.** Dapr's trip expressions support `consecutiveFailures`, `totalFailures`, and `requests` — there is no `errorRatio()` function. Changed to `trip: consecutiveFailures > 3` in the production config.

3. **YAML: `trip: errorRatio(0.5)` in the "Integrating with Dapr Resiliency" section has the same issue.** Changed to `trip: consecutiveFailures > 5`.

4. **YAML: Staging resiliency resource had `name: production-resiliency`** which was misleading. Changed to `name: staging-resiliency`.

5. **Python: Sync/async mixing.** The `invoke` method was declared `async` and used `await asyncio.sleep()`, but used the synchronous `DaprClient` (`from dapr.clients`) and synchronous `invoke_method()` call. This would block the event loop during service invocation. Changed the method to be fully synchronous using `time.sleep()` instead of `await asyncio.sleep()`, consistent with the synchronous DaprClient import and threading-based design of the class.

6. **Python: `data` parameter passed as `dict` to `invoke_method()`.** The `invoke_method()` method accepts `Union[bytes, str, GrpcMessage]`, not `dict`. Changed to `json.dumps(data)` and added `content_type="application/json"`.

7. **Python: `import asyncio` and `import random` were inside the retry loop.** Moved `import random` to the top of the code block and removed the unused `import asyncio`.

8. **JavaScript: Wrong parameter order for `invoker.invoke()`.** The blog passed `(appId, method, data, { method: 'POST' })` but the correct Dapr JS SDK signature is `(appId, methodName, httpMethod, data)`. Fixed to `invoke(appId, method, HttpMethod.POST, data)`.

9. **JavaScript: Wrong HTTP method specification.** The blog used `{ method: 'POST' }` (a plain object) but the Dapr JS SDK requires the `HttpMethod` enum. Changed to `HttpMethod.POST` and added the import statement `import { HttpMethod } from "@dapr/dapr"`.

## Review Notes
- The overall architecture and approach described in the post (layering application-level adaptive retry logic on top of Dapr's static resiliency) is sound and well-explained.
- Dapr does not natively support ratio-based circuit breaker tripping via declarative YAML. If ratio-based tripping is needed, it must be implemented in application code using the underlying gobreaker library's `ReadyToTrip` callback, which is not exposed through Dapr's resiliency configuration.
- The `initialInterval` field may work via pass-through decoding in some Dapr versions, but it is not part of the documented API surface and could change without notice.
