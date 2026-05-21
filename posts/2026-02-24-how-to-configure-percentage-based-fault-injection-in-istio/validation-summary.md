# Validation Summary: How to Configure Percentage-Based Fault Injection in Istio

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Istio VirtualService
- Istio HTTP fault injection
- Kubernetes kubectl
- Prometheus HTTP API and PromQL
- Bash

## Sources Consulted
- Istio VirtualService API reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio fault injection task documentation: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio traffic management problems: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Istio v1 API announcement: https://istio.io/latest/blog/2024/v1-apis/
- Envoy HTTP fault injection filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/fault_filter
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
- The VirtualService examples used `apiVersion: networking.istio.io/v1beta1`. Istio promoted VirtualService to the stable `networking.istio.io/v1` API in Istio 1.22. Updated all VirtualService examples to `networking.istio.io/v1`.
- The combined delay and abort section described abort and delay as sequential checks, with delay applied only to requests that were not aborted. Istio documents delay and abort faults as independent. Updated the explanation and percentage breakdown to show independent matching and overlap.
- The retry and circuit breaker testing notes implied that retries and circuit breakers would naturally respond to the same client-side VirtualService fault injection. Istio documents that retry/timeout policies are not enabled when faults are enabled on the client side, and the common-problems documentation specifically warns about combining fault injection with retry/timeout policies on the same VirtualService. Updated the language to clarify that retries must be configured outside the same fault-injection VirtualService, and circuit breakers need to observe upstream failures rather than only client-side injected faults.

## Review Notes
- The remaining YAML structure, `fault.abort.httpStatus`, `fault.delay.fixedDelay`, and `percentage.value` fields match the current Istio VirtualService API.
- The `kubectl exec`, `kubectl apply -f -`, and `kubectl delete virtualservice ... -n ...` command forms are valid.
- The Prometheus query uses the standard `/api/v1/query` endpoint and Istio's standard `istio_requests_total` metric name, but real clusters may need label adjustments depending on telemetry configuration and Prometheus deployment layout.
