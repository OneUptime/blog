# Validation Summary: How to Implement Synchronous Request-Reply with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, pub/sub, state management, resiliency policies)
- JavaScript / Node.js with `@dapr/dapr` SDK
- Python with Flask and `dapr` Python SDK
- Go with `github.com/dapr/go-sdk`
- gRPC
- Kubernetes (mentioned for service discovery)

## Sources Consulted
- Dapr JavaScript SDK source code on GitHub (`dapr/js-sdk`), including `src/interfaces/Client/IClientInvoker.ts` and `src/enum/HttpMethod.enum.ts`
- Dapr Go SDK documentation on pkg.go.dev (https://pkg.go.dev/github.com/dapr/go-sdk/client) — `InvokeMethod` and `InvokeMethodWithContent` signatures
- Dapr Go SDK source on GitHub (`dapr/go-sdk`, `client/client.go`)
- Dapr Python SDK source on GitHub (`dapr/python-sdk`) — `save_state`, `publish_event`, `get_state` signatures
- Dapr official documentation on Resiliency policies (https://docs.dapr.io/operations/resiliency/resiliency-overview/)
- Dapr Resiliency spec reference (https://docs.dapr.io/reference/resource-specs/resiliency-schema/)
- Dapr circuit breaker documentation (https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/)

## Issues Found

### 1. JavaScript SDK: Raw string HTTP methods instead of HttpMethod enum
- **What was wrong:** The `client.invoker.invoke()` calls used raw string literals `'GET'` and `'POST'` for the HTTP method parameter. The Dapr JS SDK defines an `HttpMethod` enum with lowercase values (`"get"`, `"post"`) and expects that enum to be used.
- **What was changed:** Imported `HttpMethod` from `@dapr/dapr` and replaced `'GET'` with `HttpMethod.GET` and `'POST'` with `HttpMethod.POST`.
- **Why:** While raw uppercase strings may work at runtime in plain JS, using the SDK's enum is the correct and documented approach. TypeScript users would get a compile error with raw strings.

### 2. Go SDK: Wrong 4th parameter to InvokeMethod
- **What was wrong:** `client.InvokeMethod()` was called with `"application/json"` as the 4th parameter. The 4th parameter is the HTTP verb (e.g., `"GET"`, `"POST"`), not a content type. This would cause incorrect runtime behavior.
- **What was changed:** Replaced `InvokeMethod` with `InvokeMethodWithContent`, which correctly accepts a `*DataContent` struct containing both the content type and request body. The `productId` parameter is now properly included in the request payload.
- **Why:** `InvokeMethod(ctx, appID, method, verb)` expects an HTTP verb as the 4th arg. To send a content type and body, `InvokeMethodWithContent` is the correct API.

### 3. Go SDK: Unused import causing compile error
- **What was wrong:** `"google.golang.org/protobuf/types/known/anypb"` was imported but never used. In Go, unused imports are compile errors.
- **What was changed:** Removed the unused `anypb` import.
- **Why:** Go does not compile with unused imports.

### 4. Go SDK: Missing encoding/json import
- **What was wrong:** `json.Unmarshal` was called but `"encoding/json"` was not in the import block. This is a compile error.
- **What was changed:** Added `"encoding/json"` to the imports.
- **Why:** Go does not compile without the necessary import.

### 5. Python SDK: Wrong keyword argument for state metadata
- **What was wrong:** `save_state()` was called with `metadata={"ttlInSeconds": ...}`. The `metadata` parameter is for gRPC call-level metadata (a tuple of tuples), not per-state-item metadata. The TTL would have been silently ignored.
- **What was changed:** Changed `metadata=` to `state_metadata=`.
- **Why:** The `state_metadata` parameter is the correct one for passing per-state-item metadata such as TTL to the Dapr state store.

## Review Notes
- The Resiliency YAML configuration is fully correct, including the CEL expression for circuit breaker trip conditions.
- The Flask service implementation is straightforward and correct.
- The Python pub/sub request-reply bridge uses an unconventional import style (`import dapr.clients as dapr` then `dapr.DaprClient()`) — this works but the idiomatic import is `from dapr.clients import DaprClient`. Not changed since it is functionally correct.
- The exponential retry policy omits the optional `duration` (initial interval) field; Dapr uses a sensible default, so this is fine.
