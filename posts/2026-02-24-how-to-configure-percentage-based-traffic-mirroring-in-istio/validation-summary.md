# Validation Summary: How to Configure Percentage-Based Traffic Mirroring in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio traffic mirroring / shadowing
- Kubernetes Deployments and Services
- Prometheus / PromQL
- kubectl
- Envoy request mirroring behavior

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus promtool reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Envoy route mirror policy reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html

## Issues Found
- The Istio networking examples used `networking.istio.io/v1beta1`. Istio promoted VirtualService and DestinationRule to `networking.istio.io/v1` in Istio 1.22, and the current official examples use `v1`. Updated all Istio networking manifests to `apiVersion: networking.istio.io/v1`.
- The prerequisites defined two Deployments and a DestinationRule for host `api`, but did not define a Kubernetes Service named `api`. Added the missing Service so the VirtualService and DestinationRule host resolves to a real service and selects both versioned workloads.
- The PromQL examples omitted the `reporter` label. Since Istio can report metrics from both source and destination proxies, this can double-count traffic. Added `reporter="destination"` to compare inbound requests to `v1` and `v2`.
- The verification commands used broad Envoy `rq_total` stats from individual sidecars, which would not reliably show the exact production-vs-mirror request counts described. Replaced them with Prometheus `promtool query instant` commands using the same Istio request metric and labels used earlier in the post.
- The overload section stated that no retry attempts are made for failed mirror requests. The official Istio and Envoy documentation guarantees best-effort, fire-and-forget mirroring and ignored mirror responses, but does not make that retry claim in the cited docs. Reworded the bullet to the documented behavior: the original client never receives mirror responses or mirror failures.

## Review Notes
The core `mirrorPercentage.value` syntax and range `[0.0, 100.0]` are correct. Istio also documents that mirrored requests have the Host/Authority header suffixed with `-shadow`; the post does not mention that caveat, but it is not required for the percentage-based examples to work.
