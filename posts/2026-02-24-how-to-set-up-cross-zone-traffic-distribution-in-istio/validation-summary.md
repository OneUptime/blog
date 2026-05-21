# Validation Summary: How to Set Up Cross-Zone Traffic Distribution in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio DestinationRule and locality load balancing
- Envoy outlier detection and endpoint inspection through Istio
- Kubernetes node topology labels and topology spread constraints
- kubectl, istioctl, jq, Prometheus / PromQL
- AWS cross-Availability Zone data transfer behavior

## Sources Consulted
- Istio Locality Load Balancing: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/
- Istio Locality Failover: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio Locality Weighted Distribution: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/distribute/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/
- AWS Global Network FAQs, data transfer between Availability Zones: https://aws.amazon.com/about-aws/global-infrastructure/global-network/faqs/

## Issues Found
- The default behavior section implied that lack of explicit locality configuration alone means zone-agnostic round-robin. Current Istio docs state that locality load balancing is enabled in the default mesh config, while outlier detection is needed to activate locality-aware failover. Updated the sentence to refer to the absence of both outlier detection and an explicit locality policy.
- The pod distribution command counted node names from `kubectl get pods -o wide`, not zone labels. Replaced it with a command that reads each pod's node name and then retrieves the node's `topology.kubernetes.io/zone` label.
- The Prometheus query grouped by source and destination workload only, so it did not show zone-level distribution. Updated it to include a `destination_zone` dimension and clarified that this dimension may need to be added through telemetry customization or destination pod labels.

## Review Notes
- The Istio `DestinationRule` examples use current `networking.istio.io/v1` fields and valid `localityLbSetting.distribute`, `localityLbSetting.enabled`, `outlierDetection`, and `simple: ROUND_ROBIN` configuration.
- The `distribute` and `failover` explanations align with Istio's locality syntax, including `{region}/{zone}/{sub-zone}` matching and weight totals of 100.
- The topology spread constraint example is valid Kubernetes syntax. In real clusters, scheduling can still depend on node eligibility, taints, resource pressure, and existing pods.
