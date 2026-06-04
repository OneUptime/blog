# Validation Summary: How to use HPA with StatefulSet for scaling stateful workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StatefulSet
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes PodDisruptionBudget
- Kubernetes lifecycle hooks
- Kubernetes custom metrics
- Prometheus alerting
- Go client-go

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Pod disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget configuration documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes Pod lifecycle / preStop documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Prometheus query language documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The post described ordered StatefulSet creation and deletion as unconditional. Updated the wording to clarify that this behavior applies to the default `OrderedReady` pod management policy; StatefulSets can also use `Parallel`.
- The post said each StatefulSet pod gets a persistent volume unconditionally. Updated the wording to clarify this applies when `volumeClaimTemplates` are used.
- The StatefulSet example used `serviceName: cache-cluster` but did not define the required headless Service for stable pod DNS. Added a matching headless Service to the YAML example.
- The Go snippet imported `os` but did not use it, which would prevent compilation. Removed the unused import.
- The Go snippet was described as using consistent hashing, but the code used simple hash modulo ownership. Updated the description to "hash-based ownership."
- The custom metric example used cache hit rate as a scale-up signal when hit rate drops. HPA scales upward when current metric values exceed the target, so the example was changed to cache miss rate.
- The PodDisruptionBudget section claimed PDBs protect HPA scale-down. Kubernetes PDBs constrain eviction-based voluntary disruptions, not replica reductions by HPA or workload controllers. Updated the text accordingly.
- The Prometheus alert used `rate()` on the `kube_statefulset_replicas` gauge. Replaced it with `changes()` to detect frequent replica-count changes more appropriately.
- The per-pod metrics section implied HPA can identify and fix specific overloaded pods. Updated it to clarify HPA averages per-pod metrics and scales the whole StatefulSet; application-level rebalancing is still required for individual hot shards.

## Review Notes
Local `kubectl`, `yq`, `go`, and `promtool` binaries were not available in the workspace, so executable validation with those tools could not be run. All YAML snippets were parsed successfully with PyYAML, and Kubernetes field/API correctness was checked against official Kubernetes documentation.
