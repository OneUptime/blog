# Validation Summary: How to Set Up Failover Load Balancing Across Regions in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio DestinationRule and VirtualService
- Istio locality load balancing and failover
- Istio outlier detection
- Istio multi-cluster service discovery
- Kubernetes Deployments, Services, topology labels, and topology spread constraints
- Prometheus and PrometheusRule alerting

## Sources Consulted
- Istio locality failover task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio locality load balancing overview: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes assigning pods to nodes and topology labels: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

## Issues Found
- The deployment example did not include a Kubernetes Service, but the DestinationRule targets a service host and the later `istioctl` command references service port 80. Added a `Service` manifest exposing port 80 to target port 8080.
- The Istio examples used short service names. Istio supports short names, but its API reference recommends fully qualified service names to avoid namespace-dependent misconfiguration. Updated the DestinationRule and VirtualService examples to use `search-api.default.svc.cluster.local`.
- The priority table skipped Istio's sub-zone priority level and numbered same-region, different-zone failover as priority 1. Updated the table and diagram to match Istio's documented priority behavior.
- The `maxEjectionPercent` explanation described the limit as per-locality. Istio documents it as applying to the upstream load balancing pool. Updated the wording and inline comment.
- The scale-down test used an ambiguous zone namespace. Clarified that this assumes a separate deployment or namespace for the locality and that scaling down removes endpoints through service discovery.
- The VirtualService `sourceLabels` test assumed topology labels are always present on source workloads. Added a note that the selector matches calling workload labels and that users may need to label workloads explicitly.
- The Prometheus query and alert did not actually identify cross-region or cross-cluster traffic. Replaced them with queries based on Istio's documented `source_cluster` and `destination_cluster` metric labels.

## Review Notes
- Istio's standard metrics expose source and destination clusters, not generic source and destination locality labels. For single-cluster, multi-region deployments, users may need custom telemetry labels or another signal to alert on region-to-region traffic.
- The examples are current for Istio 1.30 documentation and current Kubernetes documentation as of 2026-05-21.
