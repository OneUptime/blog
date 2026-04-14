# Validation Summary: How to Test Dapr Resiliency Under Failure Conditions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (resiliency building block)
- Kubernetes
- Python (Flask)
- Go
- Prometheus (metrics querying)
- Bash scripting
- curl

## Sources Consulted
- Dapr Resiliency documentation: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency policy spec: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency targets spec: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Metrics documentation: https://docs.dapr.io/operations/observability/metrics/
- Dapr Resiliency component configuration examples from official docs

## Issues Found

1. **Component targets missing `outbound:` wrapper (High severity)**: The resiliency YAML placed `timeout`, `retry`, and `circuitBreaker` directly under the component name (`statestore`). Dapr requires an `outbound:` nesting level for component targets. Fixed by adding the `outbound:` wrapper.

2. **Circuit breaker metric description incorrect (Medium severity)**: The blog described `dapr_resiliency_cb_state` as returning numeric values `(0=closed, 1=open, 2=half-open)`. In reality, Dapr emits 4 separate time series tagged with a `status` label (`unknown`, `closed`, `half-open`, `open`), where the currently active state has value 1 and all others have value 0. Fixed the comment and updated the query to filter by `status="open"`.

3. **Incorrect HTTP 503 claim for circuit breaker (Medium severity)**: The blog stated that open circuit breakers return `503` responses. Dapr returns `500` for circuit breaker errors. Fixed the status code reference.

4. **Incorrect HTTP 504 claim for timeout (Medium severity)**: The blog stated that timeouts return `504`. Dapr returns `500` for timeout errors on service invocation. Fixed the status code reference.

## Review Notes
- The `trip: consecutiveFailures >= 5` expression is valid CEL but deviates from the Dapr documentation convention which uses `consecutiveFailures > 5` (strict greater-than). The blog's `>= 5` trips on the 5th failure while the documented `> 5` trips on the 6th. The blog text is internally consistent with its expression, so this was left as-is, but readers comparing with official docs may notice the difference.
- The Python test server uses `threading.local()` for the call counter, which works correctly with Flask's default single-threaded development server but would not track calls correctly across threads if threaded mode were enabled. This is acceptable for a test/demo scenario.
- The automated test script's assertion checks for HTTP 500 during outage, which is consistent with the corrected status codes.
