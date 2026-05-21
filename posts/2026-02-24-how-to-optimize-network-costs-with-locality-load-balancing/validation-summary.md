# Validation Summary: How to Optimize Network Costs with Locality Load Balancing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio DestinationRule and locality load balancing
- Istio standard metrics and Envoy access logging
- Prometheus queries
- Kubernetes topology spread constraints
- Kubernetes PodDisruptionBudget
- AWS data transfer pricing and VPC Flow Logs

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Locality Load Balancing task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/
- Istio Locality Weighted Distribution task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/distribute/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy Access Logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Kubernetes Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes PodDisruptionBudget task: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- AWS EC2 On-Demand Pricing, Data Transfer: https://aws.amazon.com/ec2/pricing/on-demand/
- AWS VPC Flow Logs documentation: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html

## Issues Found
- The first Istio metric query was described as total cross-zone bytes, but it used `rate()`, which returns a per-second rate, and Istio standard metrics do not include zone labels by default. Changed it to `increase()` for total bytes over 24 hours and clarified that exact zone-to-zone totals require flow logs or network metrics with locality information.
- The `kubectl top nodes` command was presented as a way to check node-to-node traffic patterns, but `kubectl top nodes` reports CPU and memory usage. Replaced that guidance with cloud flow logs or CNI/network metrics.
- The access logging command omitted the existing install flags that should be preserved when re-running `istioctl install`. Added `<flags-you-used-to-install-Istio>`.
- The HPA guidance implied per-zone HPA behavior. Changed it to focus on replica counts and topology spread constraints, which are the relevant controls for maintaining local capacity across zones.
- The wildcard DestinationRule was described as Istio mesh config. Reworded it as a wildcard DestinationRule for a namespace and clarified that it applies to services matching the wildcard host.
- The monitoring query was labeled as a percentage of same-zone traffic, but it only returned request rates by workload pair. Updated the label and surrounding text to state that locality percentages require access logs, cloud flow logs, or CNI metrics.
- The PDB guidance said "per-zone PodDisruptionBudgets", but the provided PDB was a standard selector-based PDB, not zone-specific. Reworded it as a standard PodDisruptionBudget for voluntary disruption protection.

## Review Notes
The Istio `DestinationRule` snippets use the current `networking.istio.io/v1` API and valid `localityLbSetting`, `distribute`, and `outlierDetection` fields. The Kubernetes topology spread constraint and `policy/v1` PodDisruptionBudget examples are syntactically current. AWS prices vary by region and service path, so the pricing figures should continue to be checked against the AWS pricing page when the post is updated.
