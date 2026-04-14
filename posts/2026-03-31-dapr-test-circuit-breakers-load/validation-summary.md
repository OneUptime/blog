# Validation Summary: How to Test Dapr Circuit Breakers Under Load

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar-based resiliency, service invocation API)
- Dapr Resiliency spec (circuit breaker policies)
- sony/gobreaker (underlying circuit breaker library)
- Go (net/http, sync/atomic)
- k6 (load testing)
- hey (HTTP load generator)
- Prometheus (metrics querying)
- Bash scripting (curl, watch, jq)

## Sources Consulted
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Resiliency spec: https://docs.dapr.io/operations/resiliency/policies/#circuit-breakers
- Dapr How-To: Invoke services using HTTP: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- sony/gobreaker source code (State constants): https://github.com/sony/gobreaker/blob/master/gobreaker.go
- gobreaker Go package docs: https://pkg.go.dev/github.com/sony/gobreaker
- k6 documentation: https://k6.io/docs/
- hey GitHub repository: https://github.com/rakyll/hey

## Issues Found

1. **Go handler path was incorrect** (`/method/check` → `/check`): The Go test service registered its handler at `/method/check`, but Dapr's service invocation API strips the `/v1.0/invoke/<appId>/method/` prefix and forwards only the method name as the path to the target app. So a call to `http://localhost:3500/v1.0/invoke/flaky-service/method/check` results in Dapr calling `http://localhost:8080/check` on the target. The handler was changed to `http.HandleFunc("/check", handler)`.

2. **Misleading comment in Go code** ("Fail for first 100ms after every 10 seconds" → "Fail 5 out of every 10 requests"): The failure logic is count-based (`count%10 < 5`), not time-based. The original comment referenced 100ms and 10-second intervals that have no relation to the actual code. Updated to accurately describe the alternating-groups-of-5 failure pattern.

3. **Circuit breaker state values were swapped** (`1`=open, `2`=half-open → `1`=half-open, `2`=open): The gobreaker library defines states using Go's `iota`: `StateClosed=0`, `StateHalfOpen=1`, `StateOpen=2`. The blog had open and half-open reversed. Corrected to match gobreaker's actual constant ordering.

## Review Notes
- The k6 script checks `res.status === 503` to detect circuit breaker open events, but Dapr may return HTTP 500 (not 503) when the circuit breaker rejects a request. A 503 from the upstream flaky service (passed through by Dapr) is distinct from a circuit breaker rejection. The script would still detect failures but might not correctly categorize CB-open fast-fails versus upstream 503 errors. This is a minor accuracy concern in the test logic.
- The Prometheus metric name `dapr_resiliency_cb_state` could not be independently verified against Dapr's current metrics documentation. Dapr's documented resiliency metrics are primarily counters (`dapr_resiliency_count`), and a gauge for CB state may or may not exist depending on the Dapr version. Users should verify the metric name against their Dapr version's `/metrics` endpoint.
- The resiliency YAML configuration, k6 script structure, hey command syntax, curl recovery verification loop, and overall testing approach are all technically sound.
