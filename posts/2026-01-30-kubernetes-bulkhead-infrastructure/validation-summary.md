# Validation Summary: How to Implement Bulkhead Pattern in Microservices with Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Deployments, resource requests and limits
- Kubernetes ResourceQuota and LimitRange
- Kubernetes NetworkPolicy
- Istio DestinationRule and VirtualService
- Kubernetes PodDisruptionBudget
- Kubernetes PriorityClass and preemption
- Kubernetes topology spread constraints and pod anti-affinity
- Prometheus Operator PrometheusRule
- Prometheus / PromQL and kube-state-metrics

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Pod Disruptions and PodDisruptionBudgets: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- kube-state-metrics ResourceQuota metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- kube-state-metrics Pod metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Corrected the explanation and table entry for pods that set limits without requests. Kubernetes copies a limit to the request for that resource when no admission-time default request is applied, so "no guaranteed resources" was inaccurate.
- Corrected the "neither set" table entry. Kubernetes does not use generic node defaults for requests and limits; pods have no request or limit unless something such as a LimitRange injects defaults.
- Corrected the quota flow diagram to show LimitRange and ResourceQuota as admission-controller checks, not work done by the quota controller.
- Added the required NetworkPolicy caveat that enforcement depends on a CNI plugin that supports NetworkPolicy.
- Updated Istio examples from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API used by the official Istio reference.
- Corrected Istio `http2MaxRequests` and `maxRequestsPerConnection` comments so each field describes the right limit.
- Changed `consecutiveGatewayErrors` from `5` to `3` in the Istio outlier detection example. When it is greater than or equal to `consecutive5xxErrors`, Istio documents that it has no effect.
- Corrected a VirtualService comment that described `x-envoy-max-retries` as route rate limiting. The snippet is retry-related, not rate limiting.
- Fixed the `NamespaceQuotaNearLimit` PromQL expression to use `ignoring(type)` so the `used` and `hard` `kube_resourcequota` vectors can match despite different `type` label values.

## Review Notes
The examples are otherwise consistent with current Kubernetes and Istio APIs. The Prometheus examples assume kube-state-metrics, cAdvisor/container metrics, Istio proxy metrics, and the Prometheus Operator CRDs are installed and scraped.
