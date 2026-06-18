# Validation Summary: How to Implement Circuit Breaker at Network Level

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Circuit breaker pattern
- HAProxy health checks, server state, runtime statistics, and connection limits
- Envoy circuit breakers, outlier detection, active health checks, and cluster configuration
- Python application-level circuit breaker implementation
- Go with sony/gobreaker
- Istio DestinationRule connection pools and outlier detection
- Prometheus Python client metrics

## Sources Consulted
- HAProxy health checks tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- HAProxy configuration manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy Runtime API `show stat`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-stat/
- Envoy circuit breakers API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto
- Envoy outlier detection overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy outlier detection API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- sony/gobreaker package documentation: https://pkg.go.dev/github.com/sony/gobreaker
- Prometheus Python client Counter documentation: https://prometheus.github.io/client_python/instrumenting/counter/

## Issues Found
- The Envoy example set `consecutive_gateway_failure` equal to `consecutive_5xx` and did not set `enforcing_consecutive_gateway_failure`; Envoy documents gateway-failure enforcement separately and defaults it to 0. Changed the gateway threshold to 3 and added `enforcing_consecutive_gateway_failure: 100` so the example matches the comment.
- The Envoy example used `enforcing_local_origin_success_rate` with a comment saying it counts local-origin errors. That field only applies to local-origin success-rate ejection when `split_external_local_origin_errors` is enabled. Replaced it with `split_external_local_origin_errors`, `consecutive_local_origin_failure`, and `enforcing_consecutive_local_origin_failure`.
- The Envoy success-rate example required 3 hosts while the cluster example only defined 2 endpoints, so success-rate outlier detection would not run for the shown cluster. Changed `success_rate_minimum_hosts` to 2.
- The Python circuit breaker transitioned from open to half-open without counting the first allowed probe against `half_open_max_calls`, allowing one extra half-open request. Updated the transition path to count that request.
- The Istio example set `consecutiveGatewayErrors` equal to `consecutive5xxErrors`, which Istio documents as having no additional effect because gateway errors are included in 5xx errors. Changed `consecutiveGatewayErrors` to 3.
- The Istio comment described `minHealthPercent` as "Min ejection time"; Istio documents it as the healthy-host percentage threshold below which outlier detection is disabled. Updated the comment.

## Review Notes
The Go snippet could not be compiled locally because the `go` toolchain is not installed in this environment. It was reviewed against the current sony/gobreaker package documentation instead. The HAProxy and Envoy snippets are illustrative and omit deployment-specific details such as DNS names, admin listeners, and production TLS policy.
