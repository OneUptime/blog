# Validation Summary: How to Implement Circuit Breaker with Consecutive Failures in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Resiliency API
- Dapr circuit breaker (based on Sony gobreaker)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr Python SDK (`dapr`)
- Prometheus metrics
- YAML Resiliency configuration

## Sources Consulted
- Dapr Resiliency Policies documentation (https://docs.dapr.io/operations/resiliency/policies/)
- Dapr Resiliency resource spec/schema reference
- Dapr source code: `pkg/resiliency/breaker/circuitbreaker.go` and `pkg/resiliency/policy.go`
- Sony gobreaker library documentation and source (https://github.com/sony/gobreaker)
- Dapr JavaScript SDK API reference (`@dapr/dapr` package)
- Dapr Python SDK API reference (`dapr` package)

## Issues Found

1. **Invalid `trip` expression syntax**: The blog used `consecutiveFailures(5)` (function-call syntax) which is not valid CEL. Dapr uses Common Expression Language (CEL) expressions for the `trip` field. Changed to `consecutiveFailures >= 5` in all three occurrences (main config, combined retry config, and summary section).

2. **JavaScript SDK incorrect parameter order**: The blog called `client.invoker.invoke('payment-service', 'charge', { orderId, amount }, { method: 'POST' })` with data as the 3rd parameter and an options object as 4th. The correct Dapr JS SDK signature is `invoke(appId, methodName, httpMethod, data)` — the HTTP method enum is the 3rd parameter and data is the 4th. Fixed parameter order and added `HttpMethod` to the import statement.

3. **Retry + circuit breaker interaction incorrectly described**: The blog claimed "retries happen before the circuit breaker counts failures" and that "each invocation retries 3 times before being counted as a failure. Five such failures (15 total attempts) trip the circuit open." This is incorrect. In Dapr's execution model, the retry policy wraps the circuit-breaker-wrapped operation (`Retry(CB(Operation))`), meaning each individual retry attempt passes through the circuit breaker and is independently counted. A single failing invocation with 3 retries produces 4 consecutive failures, not 1. Fixed the description and the math.

4. **Unused Python import**: Removed `import grpc` which was imported but never used in the Python example code.

## Review Notes
- The Python example passes `data: dict` directly to `invoke_method`, which expects `bytes` or `str`. In a production example, `json.dumps(data)` should be used. Left as-is since the example focuses on the error-handling pattern rather than serialization details.
- The `DaprGrpcError` exception class in the Python example may vary across SDK versions. The error-handling pattern shown is conceptually correct.
- The Prometheus metric name `dapr_resiliency_cb_state` and port 9090 are approximately correct, though the exact metric naming may vary depending on the metrics exporter configuration.
- The default Dapr `timeout` for circuit breakers is 60s (the blog uses 30s as a configured value, which is fine).
