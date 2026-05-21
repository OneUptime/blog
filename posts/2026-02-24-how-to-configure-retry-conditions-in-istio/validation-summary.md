# Validation Summary: How to Configure Retry Conditions in Istio (5xx, gateway-error, etc.)

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio VirtualService
- Envoy retry policies
- Kubernetes
- kubectl
- YAML

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Envoy router filter retry policy reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio application requirements / sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- Updated all VirtualService examples from `networking.istio.io/v1beta1` to `networking.istio.io/v1`, matching the current stable Istio documentation examples.
- Corrected the specific status-code retry example. The post previously used `retryOn: "retriable-status-codes"` plus `x-envoy-retriable-status-codes` as a request header. Istio's HTTPRetry reference supports listing HTTP status codes directly in `retryOn`, so the example now uses `retryOn: "503,429"`.
- Clarified that `attempts: 3` means up to 3 retries, not 3 total attempts. Istio documents the maximum number of requests as `1 + attempts`.
- Clarified Envoy semantics for `5xx` and `gateway-error`: both include cases where the upstream does not respond because of disconnect/reset/read timeout, not only HTTP response codes.

## Review Notes
The `kubectl` examples are structurally valid, but `kubectl` was not installed in the local review environment, so command syntax was checked against Kubernetes reference documentation instead of local `--help` output.
