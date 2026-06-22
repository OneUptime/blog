# Validation Summary: How to Configure Kubernetes Service Topology for Locality-Aware Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes EndpointSlices
- Kubernetes Topology Aware Routing
- Kubernetes topology spread constraints
- Kubernetes PodDisruptionBudgets
- Istio DestinationRule locality load balancing
- Prometheus / PromQL
- Grafana dashboard queries

## Sources Consulted
- Kubernetes Topology Aware Routing documentation: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes Service traffic distribution documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Virtual IPs and Service Proxies traffic distribution documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod Topology Spread Constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Locality Load Balancing documentation: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/
- Istio Locality Failover documentation: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The PodDisruptionBudget example claimed `minAvailable: 6` ensured at least two pods per zone. A PDB only constrains total voluntary disruptions, so the comments were corrected to describe the total availability guarantee and note that topology spread constraints provide zone balancing.
- The Istio examples used `networking.istio.io/v1beta1`. Current Istio documentation uses `networking.istio.io/v1`, so the examples were updated to the current API version.
- The Istio failover example used zone-level `from` and `to` values under `localityLbSetting.failover`. Istio documents this field for regional failover; the example was changed to region-level failover and the comment now notes that zone failover is handled by locality priorities.
- The cross-region Kubernetes example implied generic multi-region Service routing and had an invalid `apps/v1` Deployment missing `spec.selector`, template labels, and containers. The section was clarified as a single-cluster multi-region example, and the Deployment manifest was completed with the required selector, matching labels, and container spec.
- The PromQL examples used selectors such as `source_zone=destination_zone` and `source_zone!=destination_zone`, which compare a label to the literal string `destination_zone` rather than comparing label values. The queries were rewritten to use `label_replace` and vector matching so local and cross-zone traffic are separated correctly.

## Review Notes
- Kubernetes 1.36 also documents `.spec.trafficDistribution` with `PreferSameZone` and `PreferSameNode`. The post's annotation-based `service.kubernetes.io/topology-mode: Auto` examples remain valid, but Kubernetes documentation notes that the annotation may be deprecated in the future in favor of `trafficDistribution`.
