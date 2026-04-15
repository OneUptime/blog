# Validation Summary: How to Handle Errors in Dapr Java SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Java SDK (`io.dapr`)
- Java
- Project Reactor (reactive Mono/Flux operators)
- Dapr Resiliency configuration (YAML)

## Sources Consulted
- Dapr Java SDK GitHub repository: https://github.com/dapr/java-sdk
- Dapr Java SDK `DaprException` source: https://github.com/dapr/java-sdk/blob/master/sdk/src/main/java/io/dapr/exceptions/DaprException.java
- Dapr Java SDK `DaprClient` interface: https://github.com/dapr/java-sdk/blob/master/sdk/src/main/java/io/dapr/client/DaprClient.java
- Dapr Java SDK `State` class: https://github.com/dapr/java-sdk/blob/master/sdk/src/main/java/io/dapr/client/domain/State.java
- Dapr Resiliency documentation: https://docs.dapr.io/operations/resiliency/
- Dapr Resiliency policies (retries): https://docs.dapr.io/operations/resiliency/policies/retries/
- Dapr Resiliency policies (circuit breakers): https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr runtime error codes: https://github.com/dapr/dapr/blob/master/pkg/messages/errorcodes/errorcodes.go

## Issues Found

### 1. Incorrect method name `getStatusCode()` on DaprException
- **What was wrong:** The blog used `e.getStatusCode()` and labeled it "gRPC status". The actual method on `DaprException` is `getHttpStatusCode()`, which returns an HTTP status code (int), not a gRPC status.
- **What was changed:** Replaced `e.getStatusCode()` with `e.getHttpStatusCode()` and changed the label from "gRPC status" to "HTTP status code".

### 2. Incorrect `getConfiguration()` method signature
- **What was wrong:** The blog used `daprClient.getConfiguration("configstore", List.of(key))`. There is no 2-argument overload that accepts `(String, List<String>)`. The available overloads are: `getConfiguration(String storeName, String... keys)` (varargs) or `getConfiguration(String storeName, List<String> keys, Map<String, String> metadata)` (requires a metadata parameter).
- **What was changed:** Replaced `getConfiguration("configstore", List.of(key))` with `getConfiguration("configstore", key)` to use the varargs overload.

### 3. Incorrect Kubernetes `kind` for Dapr Resiliency spec
- **What was wrong:** The blog used `kind: ResiliencyPolicy`. The correct Dapr resource kind is `Resiliency`.
- **What was changed:** Replaced `kind: ResiliencyPolicy` with `kind: Resiliency`.

## Review Notes
- The circuit breaker configuration omits the `trip` field (e.g., `trip: consecutiveFailures > 5`), which defines the condition for the breaker to open. Without it, the circuit breaker may not function as expected. This is acceptable for a simplified example but could be noted in a future update.
- The `State` constructor `new State<>(orderId, null, null, null)` in the timeout handling section is technically valid (`State(String key, T value, String etag, StateOptions options)`) but unusual. A simpler alternative would be to use a dedicated fallback pattern rather than constructing a State with all-null fields.
- `getMessage()` on `DaprException` works via inheritance from `RuntimeException`/`Throwable` and is not a Dapr-specific method. This is fine for the blog's purposes.
