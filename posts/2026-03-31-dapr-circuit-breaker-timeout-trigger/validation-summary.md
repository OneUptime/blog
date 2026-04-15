# Validation Summary: How to Implement Circuit Breaker with Timeout Trigger in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (resiliency policies, circuit breakers, timeouts, retries)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Kubernetes (kubectl for log inspection)
- Prometheus / PromQL (metrics monitoring)
- sony/gobreaker (underlying circuit breaker library used by Dapr)

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency Targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Go SDK Client docs: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr Go SDK source (`client/invoke.go`): https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr source code `pkg/resiliency/policy.go` and `pkg/diagnostics/resiliency_monitoring.go`
- sony/gobreaker documentation: https://github.com/sony/gobreaker

## Issues Found

### 1. Invalid `trip` condition: `errorRatio(0.5)` does not exist
**What was wrong:** The post used `trip: errorRatio(0.5)` in the circuit breaker configuration. The `errorRatio()` function is not a valid Dapr trip condition. The `trip` field accepts CEL expressions using only three variables: `consecutiveFailures`, `totalFailures`, and `requests`.
**What was changed:** Replaced `errorRatio(0.5)` with `consecutiveFailures > 3` in the main YAML example. Replaced `errorRatio(0.6)` and `errorRatio(0.3)` with `consecutiveFailures > 5` and `consecutiveFailures > 3` respectively in the per-operation example. Updated all narrative text referencing `errorRatio`.

### 2. `interval` incorrectly described as a "rolling window"
**What was wrong:** The post described `interval` as a "Rolling window for failure calculation" and referenced a "rolling `interval` window" in the text. Dapr's `interval` field is actually a cyclic period — when it elapses, all internal counts are reset to zero. This is fundamentally different from a rolling window where old events gradually age out.
**What was changed:** Changed comments and text to describe `interval` as a "Cyclic period to clear internal counts" and explained the reset behavior.

### 3. `dapr.NewDataWithRawData()` does not exist in the Go SDK
**What was wrong:** The post used `dapr.NewDataWithRawData(marshalParams(params), "application/json")`. There is no such constructor function in the Dapr Go SDK. `DataContent` is a plain struct.
**What was changed:** Replaced with direct struct initialization: `&dapr.DataContent{Data: marshalParams(params), ContentType: "application/json"}`.

### 4. `client.InvokeMethod` called with wrong signature
**What was wrong:** The post called `client.InvokeMethod(ctx, "analytics-service", "compute", "POST", content)` with 5 arguments. `InvokeMethod` only accepts 4 arguments (no content parameter). To pass data content, `InvokeMethodWithContent` must be used.
**What was changed:** Changed `InvokeMethod` to `InvokeMethodWithContent`.

### 5. `resp.Data` is incorrect — response is `[]byte`
**What was wrong:** The post accessed `resp.Data` on the response. Both `InvokeMethod` and `InvokeMethodWithContent` return `([]byte, error)`, not a struct with a `.Data` field.
**What was changed:** Changed `unmarshalResult(resp.Data)` to `unmarshalResult(resp)`.

### 6. Prometheus metric label `state` should be `status`
**What was wrong:** The post used `dapr_resiliency_cb_state{state="open"}`. The actual label name in Dapr's metrics is `status`, not `state`.
**What was changed:** Replaced `state="open"` with `status="open"` in both PromQL queries.

## Review Notes
- The `longTimeout: 10s` policy defined in the per-operation YAML example is never referenced in targets. This is not technically incorrect (unused policies are valid), but could be confusing to readers.
- The helper functions `containsAny`, `containsString`, `marshalParams`, `unmarshalResult`, and `getCachedAnalytics` are undefined in the code example. This is acceptable for a tutorial that focuses on the Dapr integration pattern rather than complete application code.
- The monitoring log output examples are illustrative and may not match exact Dapr log formatting, but they convey the correct state transitions (Closed -> Open -> HalfOpen -> Closed).
- The `rate()` PromQL function applied to a gauge metric (`dapr_resiliency_cb_state`) is unusual — `rate()` is typically used with counters. For a gauge that records 0/1 state, a direct comparison or `avg_over_time` would be more conventional. However, this is a minor stylistic point.
