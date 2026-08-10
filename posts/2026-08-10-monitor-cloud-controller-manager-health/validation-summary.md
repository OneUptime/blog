# Validation Summary: Monitoring cloud-controller-manager Health and Reconcile Errors

## Status

validated

## Post Type

Monitoring and operations guide

## Technologies Covered

- Kubernetes v1.36
- Kubernetes cloud-controller-manager and cloud-provider controllers
- Kubernetes Lease API and leader election
- client-go REST clients and coordinated leader election
- kubectl
- jq
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor and PodMonitor resources
- Kubernetes API Priority and Fairness

## Sources Consulted

- [Kubernetes Metrics Reference (v1.36)](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [Kubernetes component SLI metrics](https://kubernetes.io/docs/reference/instrumentation/slis/)
- [Metrics for Kubernetes system components](https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/)
- [Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes Leases](https://kubernetes.io/docs/concepts/architecture/leases/)
- [Lease v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/coordination/lease-v1/)
- [Kubernetes Pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes liveness, readiness, and startup probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl events reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [Kubernetes deprecated API migration guide: Event](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#event-v125)
- [Kubernetes Service v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/)
- [Kubernetes API Priority and Fairness](https://kubernetes.io/docs/concepts/cluster-administration/flow-control/)
- [Kubernetes v1.36: New Metric for Route Sync in the Cloud Controller Manager](https://kubernetes.io/blog/2026/05/15/ccm-new-metric-route-sync-total/)
- [client-go v0.36.0 leader-election implementation](https://github.com/kubernetes/client-go/blob/v0.36.0/tools/leaderelection/leaderelection.go)
- [Kubernetes v1.36.0 leader-election Prometheus metrics](https://github.com/kubernetes/kubernetes/blob/v1.36.0/staging/src/k8s.io/component-base/metrics/prometheus/clientgo/leaderelection/metrics.go)
- [cloud-provider v0.36.0 Node controller implementation](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/node/node_controller.go)
- [Kubernetes v1.36.0 REST client metric definitions](https://github.com/kubernetes/kubernetes/blob/v1.36.0/staging/src/k8s.io/component-base/metrics/prometheus/restclient/metrics.go)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [jq 1.6 manual](https://jqlang.org/manual/v1.6/)
- [Prometheus Operator getting started guide](https://prometheus-operator.dev/docs/developer/getting-started/)

## Issues Found

- A Pod in `Running` phase does not prove that the CCM process is currently healthy. Changed the opening sentence so it no longer treats the Pod phase as proof that the CCM process is currently executing.
- The discovery section said not to assume a namespace or Lease name but later hard-coded `kube-system` and filtered Lease names for the word `cloud`. Replaced the namespace with the discovered `CCM_NAMESPACE` placeholder and made Lease discovery list all namespaces without a name heuristic.
- `ServiceMonitor` and `PodMonitor` are optional Prometheus Operator CRDs. Split their lookup from the core `Service` lookup and marked the CRD command as conditional so clusters without Prometheus Operator are not presented as having those resource types.
- Pod readiness does not gate participation in client-go leader election. Reworded the standby guidance to require a healthy, running process without claiming readiness is required to acquire the Lease.
- The health-check metrics were described as collectively having status-related labels. Corrected the exact contract: both metrics have `name` and `type`, while only `kubernetes_healthchecks_total` also has `status`.
- The Lease alert guidance could confuse normal standby contention with API failures and did not account for clock offset in an external freshness check. Restricted the log symptom to retrieval, creation, or update API errors and added a clock-skew allowance.
- `leader_election_slowpath_total` increases during every normal renewal when client-go v0.36 coordinated leader election is enabled, so the original `increase(...) > 0` alert would remain active in that mode. Restricted the alert to classic, non-coordinated election, grouped the query by `name`, and directed coordinated-election users to Lease freshness, transition, and API request signals.
- An empty Node `.spec.providerID` is permitted when a legacy provider does not implement ProviderID lookup. Qualified that diagnostic so it applies only when the provider contract requires ProviderID.
- The LoadBalancer command claimed to show pending Services but printed every `LoadBalancer` Service. It now selects Services with no `.status.loadBalancer.ingress` entries, shows `loadBalancerClass` for controller ownership, and limits the age alert to Services managed by the CCM.
- `kubectl get events --sort-by=.lastTimestamp` relied on a deprecated Event timestamp that can be empty. Replaced it with the current `kubectl events -A` command, which lists recent Events.
- The client-go metric description conflated label contracts. Corrected it to match v1.36: `rest_client_requests_total` uses status code, HTTP method, and host, while `rest_client_request_duration_seconds` and `rest_client_rate_limiter_duration_seconds` use verb and host; the two duration metric names are now explicit.

## Review Notes

All original documentation links resolve to the intended official Kubernetes pages. The v1.36 `route_controller_route_sync_total` name and alpha stability are correct; it counts reconciliation attempts rather than successful route convergence, and the post appropriately uses it as a liveness signal alongside logs and object state. The Node delay, route, leader-election, and REST client metrics discussed here are alpha in Kubernetes v1.36, and provider-built CCMs can register or omit metrics differently, so the post's provider/version caveats remain important. The jq filters were also exercised with jq 1.6 sample data.
