# Validation Summary: How to Handle Sticky Sessions with Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio DestinationRule
- Istio VirtualService
- Istio consistent hash load balancing
- Envoy load balancing and WebSocket upgrades
- Kubernetes Services and PodDisruptionBudgets
- Prometheus / Istio standard metrics
- istioctl

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Querying Metrics from Prometheus task: https://istio.io/latest/docs/tasks/observability/metrics/querying-metrics/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Envoy HTTP upgrades documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/upgrades
- Envoy HTTP connection manager UpgradeConfig reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Kubernetes Service session affinity documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/#session-affinity
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- Updated Istio examples from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API version promoted in Istio 1.22.
- Softened absolute sticky-session claims. Istio's consistent hash load balancing is soft affinity, and affinity can change when endpoints are added or removed.
- Clarified that source-IP affinity problems behind proxies should use `x-forwarded-for` or another header only for HTTP traffic.
- Added the required subset caveat: subset-level traffic policies only apply when a route explicitly sends traffic to that subset.
- Removed `h2UpgradePolicy: UPGRADE` from the WebSocket DestinationRule. That setting controls HTTP/1.1-to-HTTP/2 upstream upgrades and is not required for WebSocket sticky-session routing.
- Changed the WebSocket VirtualService guidance from "allow WebSocket upgrades" to route-timeout guidance. Envoy handles configured HTTP upgrades; the important Istio route setting is disabling route timeout when one is otherwise configured.
- Replaced `istioctl proxy-config stats`, which is not in the current command reference, with `istioctl experimental envoy-stats --type clusters`.
- Replaced the non-standard Prometheus label `destination_workload_instance` with a destination-reported query grouped by a preserved scrape `pod` label.

## Review Notes
- The post is now accurate for current Istio documentation. The Prometheus per-pod query depends on the Prometheus scrape configuration preserving a pod label; otherwise use per-pod Envoy stats or add a custom telemetry dimension.
