# Validation Summary: How to Handle Locality Load Balancing with Uneven Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio DestinationRule locality load balancing
- Istio outlier detection
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes topology spread constraints
- Prometheus, PromQL, and PrometheusRule
- kube-state-metrics

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio locality failover task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio locality weighted distribution task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/distribute/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Pod topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics node metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The failover example said us-east-1b could handle the overflow from us-east-1a even though the example capacities show total remaining capacity is lower than the failed zone's traffic. Updated the text to say both remaining zones may exceed capacity.
- The HPA section said each zone can scale independently. A single Kubernetes HPA scales the target workload's replica count, not each zone independently. Updated the wording to pair HPA with scheduling constraints for spreading new pods.
- The small-zone exclusion section said zone C receives its own local traffic, but the shown `from: us-east-1/us-east-1c/*` rule sends zone C client traffic to zones A and B. Updated the explanation to match the configuration.
- The monitoring PromQL grouped Istio requests by workload and pod counts by node, which does not produce per-zone request-per-pod data. Replaced the examples with PromQL that joins pod-level series to `kube_pod_info` and `kube_node_labels` to group by `label_topology_kubernetes_io_zone`.
- The CPU query grouped by `topology_kubernetes_io_zone`, which is not a standard cAdvisor label. Updated it to join container CPU metrics through kube-state-metrics node labels.
- The alert expression compared workloads rather than zones. Updated it to compare per-zone per-pod request rates using the same pod-to-node-zone join.

## Review Notes
The Istio `DestinationRule` examples use current `networking.istio.io/v1` fields, and the HPA uses the current stable `autoscaling/v2` API. The PromQL examples assume Prometheus keeps `namespace` and `pod` labels on Istio and container metrics and that kube-state-metrics exposes node labels via its metric labels allowlist.
