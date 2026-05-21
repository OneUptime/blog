# Validation Summary: How to Handle Istiod Leader Election

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio / istiod
- Kubernetes leader election
- Kubernetes Lease and ConfigMap resources
- Kubernetes RBAC
- Prometheus and kube-state-metrics

## Sources Consulted
- Istio `pilot-discovery` command reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio 1.29.2 leader election source: https://github.com/istio/istio/blob/1.29.2/pilot/pkg/leaderelection/leaderelection.go
- Istio 1.29.2 controller bootstrap source: https://github.com/istio/istio/blob/1.29.2/pilot/pkg/bootstrap/configcontroller.go
- Istio 1.29.2 multicluster controller source: https://github.com/istio/istio/blob/1.29.2/pilot/pkg/serviceregistry/kube/controller/multicluster.go
- Istio 1.29.2 RBAC manifests: https://github.com/istio/istio/blob/1.29.2/manifests/charts/istio-control/istio-discovery/templates/role.yaml
- Kubernetes Lease documentation: https://kubernetes.io/docs/concepts/architecture/leases/
- Kubernetes client-go leader election source: https://github.com/kubernetes/client-go/blob/v0.34.1/tools/leaderelection/leaderelection.go
- kube-state-metrics Lease metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/lease-metrics.md

## Issues Found
- The post claimed istiod leader election uses only Kubernetes Lease objects and used non-current lock names such as `istiod-election`. Updated the explanation and examples to reflect current Istio behavior: some locks use Leases, while legacy controller locks use ConfigMaps with the `control-plane.alpha.kubernetes.io/leader` annotation.
- The list of leader-gated duties included endpoint cleanup and config validation webhook execution, which did not match current Istio leader-election usage. Replaced it with status updates, namespace root certificate distribution, Gateway controllers, and in-cluster analysis.
- The timing section used Kubernetes core client defaults of 15s/10s/2s and claimed custom `LEADER_ELECTION_*` istiod environment variables. Updated it to Istio's current 30s TTL with renew deadline and retry period derived internally, and documented the supported `ENABLE_LEADER_ELECTION` variable.
- The troubleshooting commands referenced the wrong Lease name and checked the wrong RBAC object. Updated commands to use `istio-status-leader` and the namespaced `istiod` Role with the current Lease verbs.
- The log examples did not match Istio's current leader-election log messages. Updated them to `leader election lock obtained` and `leader election lock lost`.
- The split-brain explanation overstated clock-skew behavior. Updated it to match Kubernetes client-go behavior, which does not depend on timestamps written by other clients being accurate but can still be affected by severe clock-rate skew or API latency.
- The monitoring section referenced `pilot_leader` and `leader_election_master_status_changes_total`, which are not exported in the current Istio `pilot-discovery` metrics reference. Replaced these with kube-state-metrics Lease metrics and PromQL based on `kube_lease_owner` and `kube_lease_renew_time`.

## Review Notes
The corrected examples are aligned with Istio 1.29.2, the latest release identified during review. Some lock names can vary by revision and enabled features, so the post now frames the examples as Lease-based leaders rather than a complete list of all istiod election locks.
