# Validation Summary: How to configure HTTPRoute timeout policies

## Status
validated

## Post Type
Technical guide / Kubernetes Gateway API tutorial

## Technologies Covered
- Kubernetes Gateway API HTTPRoute
- HTTPRoute request and backendRequest timeouts
- HTTPRoute retry policy
- Kong Ingress Controller Service annotations
- Envoy Gateway BackendTrafficPolicy
- Prometheus Operator ServiceMonitor and PrometheusRule
- PromQL histogram queries
- Go net/http timeout handling
- Python Flask timeout handling
- kubectl troubleshooting commands

## Sources Consulted
- Gateway API HTTPRoute documentation - https://gateway-api.sigs.k8s.io/reference/api-types/httproute/
- Gateway API HTTP timeouts guide - https://gateway-api.sigs.k8s.io/guides/user-guides/http-timeouts/
- Gateway API standard API reference - https://gateway-api.sigs.k8s.io/reference/spec/
- Envoy Gateway HTTP timeouts task - https://gateway.envoyproxy.io/v1.7/tasks/traffic/http-timeouts/
- Envoy Gateway extension API reference - https://gateway.envoyproxy.io/latest/api/extension_types/
- Kong Ingress Controller annotation reference - https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/
- Prometheus histogram best practices - https://prometheus.io/docs/practices/histograms/
- Prometheus query operators documentation - https://prometheus.io/docs/prometheus/latest/querying/operators/
- Python signal module documentation - https://docs.python.org/3.11/library/signal.html

## Issues Found
- The `backendRequest` guidance said it should always be shorter than `request`. Gateway API requires `backendRequest` to be no greater than `request`, with shorter values useful when leaving room for retries or other gateway processing.
- The Go timeout example checked the request context only before doing work. Updated it so the simulated work races against context cancellation.
- The streaming timeout text said timeouts could be disabled without explaining the Gateway API value. Clarified that `request: "0s"` disables the request timeout when supported by the gateway.
- The HTTPRoute retry example did not mention that `retry` is currently an experimental Gateway API field. Added a compatibility caveat for installed CRDs and gateway support.
- The monitoring section used generic gateway metric names without stating that metrics vary by implementation. Added an implementation-specific metric caveat.
- The PromQL "Requests approaching timeout" query subtracted histogram buckets with different `le` labels directly, which would not match series correctly. Rewrote it as a subtraction between per-route bucket rates.
- The Python Flask example used `signal.alarm`, which is Unix-only and only safe to configure from Python's main thread. Replaced it with a portable monotonic-deadline example.

## Review Notes
HTTPRoute `timeouts.request` and `timeouts.backendRequest` are Extended support fields and have been part of the Gateway API Standard channel since v1.2.0. Actual behavior for timeout errors, metrics, retry handling, and disabling timeouts still depends on the selected gateway implementation.
