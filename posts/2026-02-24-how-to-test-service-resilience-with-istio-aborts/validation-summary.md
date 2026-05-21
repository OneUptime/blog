# Validation Summary: How to Test Service Resilience with Istio Aborts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio fault injection
- Istio retry policies
- Envoy sidecar proxy statistics
- Kubernetes
- kubectl
- Bookinfo sample application

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Fault Injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio Traffic Management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio Traffic Management Best Practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Istio Traffic Management Problems: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Envoy fault injection filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/fault_filter

## Issues Found
- The setup commands referenced Istio `release-1.22`, which is no longer a supported Istio release. Updated the Bookinfo sample URLs to `release-1.30`, the current Istio documentation version at validation time.
- The retry section said fault injection happens on the server side and suggested splitting fault and retry policies across VirtualServices. Istio documents that fault injection cannot be combined with retry or timeout policies on the same VirtualService because the retry policy does not take effect. Updated the text to distinguish application-level retry testing from mesh-level retry testing, where upstream fault injection must be configured separately, such as with an EnvoyFilter.
- The Envoy stats example inspected the ratings pod, but the VirtualService abort is applied by the proxy handling caller traffic. Updated the command to inspect the productpage sidecar for abort counters and adjusted the example stat prefix from inbound to outbound.
- Later examples used new VirtualService names for the same `ratings` host. Updated them to reuse the same `ratings-abort` resource so each example replaces the previous route instead of creating overlapping mesh VirtualServices with the same host.

## Review Notes
- The VirtualService `networking.istio.io/v1` examples, `fault.abort.percentage.value`, `httpStatus`, header matching, routes, and retry fields are valid in current Istio documentation.
- The `kubectl create namespace`, `kubectl label namespace`, `kubectl apply -n`, `kubectl wait --for=condition=ready pod --all`, `kubectl exec`, and JSONPath commands are consistent with current Kubernetes CLI behavior.
