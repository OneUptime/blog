# Validation Summary: Tune VPA Eviction Tolerance and Rate for Production

## Status

validated

## Post Type

Production operations guide

## Technologies Covered

- Kubernetes
- Vertical Pod Autoscaler (VPA) 1.7.1
- VPA updater configuration and leader election
- PodDisruptionBudgets and the Kubernetes Eviction API
- In-place Pod resize and CPU Startup Boost
- Prometheus metrics and `kubectl`

## Sources Consulted

- [VPA 1.7.1 release](https://github.com/kubernetes/autoscaler/releases/tag/vertical-pod-autoscaler-1.7.1)
- [VPA 1.7.1 updater flags](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/flags.md#what-are-the-parameters-to-vpa-updater)
- [VPA updater defaults and flag definitions](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/config/config.go)
- [VPA updater main loop and leader election](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/main.go)
- [VPA updater rate-limiter and action logic](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/logic/updater.go)
- [VPA replica-group restriction factory](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/restriction/pods_restriction_factory.go)
- [VPA eviction restriction and Eviction API call](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/restriction/pods_eviction_restriction.go)
- [VPA in-place update restriction](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/restriction/pods_inplace_restriction.go)
- [VPA API reference for `PodUpdatePolicy`](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/api.md#podupdatepolicy)
- [VPA eviction-requirement and namespace examples](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/examples.md)
- [VPA updater metric definitions](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/utils/metrics/updater/updater.go)
- [VPA CPU Startup Boost documentation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/features.md#cpu-startup-boost)
- [CPU Startup Boost enablement and rollback AEP](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/enhancements/7862-cpu-startup-boost/README.md#feature-enablement-and-rollback)
- [Kubernetes API-initiated eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/)
- [Kubernetes Pod disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Kubernetes PodDisruptionBudget configuration](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
- [Kubernetes field selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [`kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Go `x/time/rate` limiter implementation used by VPA 1.7.1](https://github.com/golang/time/blob/v0.15.0/rate/rate.go)

## Issues Found

- The rate was described as a single process-wide `0.1 actions/second` cap. VPA 1.7.1 creates two independent token buckets from the same flags: one for eviction and one for in-place resize/unboost. The post now explains that each bucket has its own rate and burst and that the value is not a combined action ceiling.
- Eviction tolerance was described as always using a controller's configured replica count. The implementation uses `spec.replicas` for ReplicaSets, StatefulSets, and ReplicationControllers, actual live Pods for Jobs, and `status.numberReady` for DaemonSets. The post now documents those sources and notes that Deployment Pods are grouped by owning ReplicaSet.
- The updater interval was described as a hard loop timeout. In 1.7.1, `RunOnce` receives a context deadline equal to the interval, and rate-limiter waits honor it, but the eviction and resize API calls do not use that deadline. The wording now accurately describes a per-run context deadline.
- The post said shorter intervals increase API LIST activity. VPA and Pod enumeration is normally served from informer/lister caches, so the post now describes increased cache scans, calculations, and admission-controller status checks instead. The longer-interval claim was also narrowed to reduced evaluation frequency rather than an unconditional reduction in action churn.
- The rate section could be read as saying a Kubernetes PDB protects every rate-limited action. The post now distinguishes the updater's internal replica restriction from PDB admission, which applies to eviction requests rather than ordinary in-place resize requests.
- The namespace-isolation guidance omitted leader-election lock identity. Independently active namespace-scoped HA updater groups using the default lock would contend for the same `vpa-updater` Lease, so the post now requires a distinct `--leader-elect-resource-name` for each such group.
- The CPU Startup Boost rollback order could allow new or replacement Pods to be boosted again, and a manual resize alone would leave boost annotations behind. The post now provides safe graceful and immediate sequences, including stopping new boosts first and removing boost annotations when manually resizing a Pod.
- The five VPA source links used mutable `master` URLs for explicitly version-specific claims. They are now pinned to the `vertical-pod-autoscaler-1.7.1` tag.

## Review Notes

- All three YAML snippets are syntactically valid. The PDB uses the current `policy/v1` API, and the VPA fields and enum values are present in the 1.7.1 CRD/API. The PDB example assumes its selector matches Pods from one associated controller, as required for `maxUnavailable`.
- All four `kubectl` commands are valid. `vpa` and `pdb` are valid resource short names, `reason=EvictedByVPA` uses a supported Event field selector and the exact VPA event reason, and the log command matches the upstream `kube-system/vpa-updater` Deployment. Kubernetes Events are short-lived and should not be treated as a durable audit log; with multiple updater replicas, the Deployment-targeted log command selects one Pod unless an all-Pod option or selector is used.
- The controlled, evictable, and in-place-updatable Pod metrics and all `vpas_with_*` metrics are gauges. The evicted-Pod, in-place-updated-Pod, and failure series are counters. Their stated monitoring purposes are correct.
- CPU Startup Boost remains alpha in VPA 1.7.1 and requires Kubernetes 1.33+ with in-place Pod vertical scaling plus `CPUStartupBoost=true` on the VPA admission controller and updater.
- `minReplicas` counts live Pods rather than Ready Pods; Pending Pods participate separately in the updater's disruption accounting. The post correctly directs readers to PDBs and readiness for application-level availability.
