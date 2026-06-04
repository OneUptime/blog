# Validation Summary: Use Istio Locality-Weighted Load Balancing Across Kubernetes Availability Zones

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio DestinationRule and locality load balancing
- Istio MeshConfig / IstioOperator
- Kubernetes Deployments, Services, Pods, node affinity, and topology spread constraints
- kubectl
- Prometheus / PromQL

## Sources Consulted
- Istio Locality Load Balancing documentation: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/
- Istio Locality Failover task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API and metric customization docs: https://istio.io/latest/docs/reference/config/telemetry/ and https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Kubernetes Pod Topology Spread Constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl cordon reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/

## Issues Found
- The DestinationRule examples used `apiVersion: networking.istio.io/v1beta1`. Updated them to `networking.istio.io/v1`, which is the current API version shown in Istio 1.30 documentation.
- The outlier detection examples used `consecutiveErrors`, which is not the current Istio field. Changed it to `consecutive5xxErrors`.
- The first `distribute` example described failover behavior but omitted the source zone from each `to` map. Istio's `distribute` is steady-state locality weighting, and localities not listed receive no traffic. Updated the weights to include the local zone at 80% and the two remote zones at 10% each.
- The failover explanation incorrectly treated weighted distribution as a failover policy. Updated the text to distinguish default locality failover from explicit weighted distribution.
- The advanced failover section used `failover` with availability zone names. Istio's `failover` policy is for regions; zone/sub-zone failover is handled by locality priorities. Replaced the invalid zone-level `failover` example with `failoverPriority` using Kubernetes region and zone labels.
- The mesh-level locality example also used zone-level `failover`. Replaced it with `failoverPriority` and noted that services still need outlier detection for health-based failover.
- The monitoring section assumed `source_zone` and `destination_zone` are default Istio metric labels. Istio standard metrics do not include those labels by default. Added a caveat that these queries require custom zone dimensions configured with the Telemetry API.
- The zone failure simulation cordoned nodes and scaled the Deployment down, but cordoning does not evict existing pods and scaling down does not reliably remove the intended zone's pods. Updated the steps to delete `product-service` pods from the cordoned nodes so replacement pods schedule in other zones.

## Review Notes
The Kubernetes topology spread constraint, Service, Pod node affinity, kubectl commands, and PromQL syntax are structurally valid. The example application still assumes the `/health` endpoint returns host-identifying content, which is application-specific and should be adapted to the real service.
