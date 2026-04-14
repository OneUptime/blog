# Validation Summary: How to Test Resiliency Policies in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (resiliency policies: retries, timeouts, circuit breakers)
- Kubernetes (kubectl for log inspection)
- Node.js / Express (flaky test service)
- Python / requests (automated test scripts)
- Prometheus (resiliency metrics monitoring)

## Sources Consulted
- Dapr Resiliency Schema Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Retry Policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Circuit Breaker Policies: https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr Timeout Policies: https://docs.dapr.io/operations/resiliency/policies/timeouts/
- Dapr Service Invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Metrics Reference (GitHub): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md

## Issues Found

1. **Invalid retry field `initialInterval`**: The retry policy used `initialInterval: 1s`, which is not a valid Dapr retry field. Changed to `duration: 1s`, which is the correct field name for the initial backoff interval in Dapr retry policies.

2. **Incorrect timeout format**: The timeout was configured as a nested object with a `duration` sub-field (`test-timeout: { duration: 5s }`). Dapr timeouts are simple named durations — the correct format is `test-timeout: 5s` directly.

3. **Incorrect Prometheus metric name**: The metric `dapr_resiliency_count_total` does not exist. The correct metric name per Dapr's metrics reference is `dapr_resiliency_count`. Updated the Prometheus query accordingly.

## Review Notes
- The expected daprd log output shown in the "Test Retry Behavior" section is illustrative/approximate. Actual Dapr sidecar log messages may differ in format and wording depending on the Dapr version.
- The `dapr_resiliency_cb_state` metric name is confirmed correct per Dapr's metrics documentation. However, the exact Prometheus label names (e.g., `policy_name`, `name`) used in the query examples could not be fully verified and may vary by Dapr version.
- The circuit breaker test description simplifies the interaction between retry and circuit breaker policies. In practice, retries from the retry policy each count as separate failures toward the circuit breaker trip threshold, so the circuit breaker may trip during the retries of the very first caller request rather than after 3 separate caller requests.
