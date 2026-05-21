# Validation Summary: How to Set Up Traffic Mirroring (Shadowing) in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio traffic mirroring / shadowing
- Istio VirtualService
- Istio DestinationRule
- Envoy sidecar proxy statistics
- Kubernetes Services and Deployments
- kubectl
- Prometheus / PromQL

## Sources Consulted
- Istio Mirroring task documentation: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- Updated Istio `VirtualService` and `DestinationRule` examples from `networking.istio.io/v1beta1` to the current documented `networking.istio.io/v1` API version.
- Added the missing Kubernetes `Service` manifest for `product-service`. The VirtualService and DestinationRule hosts need a service-registry entry, and the curl example depends on Kubernetes DNS resolving `product-service`.
- Replaced the Envoy stats check from direct `curl localhost:15000/stats` with `pilot-agent request GET stats`, matching Istio's documented sidecar stats command.
- Corrected PromQL examples to use `destination_service_name="product-service"` instead of `destination_service="product-service"`. Istio documents `destination_service` as the full service host, while `destination_service_name` is the short service name.
- Softened "without any risk" / "zero-risk" wording. Mirrored responses are discarded and do not affect the primary response, but mirrored traffic can still consume resources or trigger side effects if the mirror is not isolated.

## Review Notes
The post uses short service names such as `product-service`, which Istio supports when the resources are in the same namespace. Istio recommends fully qualified service names to avoid namespace ambiguity, but the examples are technically valid as written.
