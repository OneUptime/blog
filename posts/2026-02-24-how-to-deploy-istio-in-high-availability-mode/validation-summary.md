# Validation Summary: How to Deploy Istio in High Availability Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- IstioOperator
- istioctl
- Kubernetes Deployments
- Kubernetes pod anti-affinity
- Kubernetes topology spread constraints
- Kubernetes PodDisruptionBudget
- Kubernetes HorizontalPodAutoscaler
- PrometheusRule and PromQL

## Sources Consulted
- Istio Deployment Best Practices: https://istio.io/latest/docs/ops/best-practices/deployment/
- IstioOperator Options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Dynamic Admission Webhooks Overview: https://istio.io/latest/docs/ops/configuration/mesh/webhook/
- Istio pilot-discovery environment variables reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Kubernetes Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes PodDisruptionBudget guide: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Prometheus PromQL operators reference: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The topology spread constraints example placed `topologySpreadConstraints` directly under `components.pilot.k8s`, but the current IstioOperator Kubernetes resource spec does not expose that field directly. Changed the example to use `k8s.overlays` to patch `spec.template.spec.topologySpreadConstraints` on the `istiod` Deployment.
- The leader election section said webhook serving was an example of a leader-only task. Istio serves admission webhooks through istiod, but leader election is documented for controller execution. Reworded the sentence to avoid the inaccurate webhook-serving example.
- The node failure test only cordoned a node, which does not evict existing istiod pods. Changed the test to simulate node maintenance by cordoning and draining the node.
- The `IstiodLowReplicaCount` alert used `count()` over `kube_pod_status_ready`, which would count time series even when their sample value is 0. Changed it to `sum()` so it counts ready pods by gauge value.
- The `IstiodPodsNotSpread` alert used `distinct(...)`, which is not a PromQL aggregation operator. Replaced it with `count(count by (node) (...))`.

## Review Notes
The post's recommendation of three replicas is more conservative than Istio's documented minimum Helm example of two replicas and is reasonable for production HA across zones. The IstioOperator API is still `install.istio.io/v1alpha1`; examples should continue to be checked against the IstioOperator reference when upgrading Istio.
