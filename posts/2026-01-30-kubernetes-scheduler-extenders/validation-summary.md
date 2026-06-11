# Validation Summary: How to Build Kubernetes Scheduler Extenders

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes scheduler extenders
- KubeSchedulerConfiguration v1
- Go HTTP handlers
- Kubernetes Deployments, Services, ServiceAccounts, and RBAC
- Prometheus Go client metrics

## Sources Consulted
- Kubernetes scheduler extender Go API documentation: https://pkg.go.dev/k8s.io/kube-scheduler/extender/v1
- Kubernetes kube-scheduler configuration v1 API reference: https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/
- Kubernetes scheduler configuration documentation: https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes scheduling framework documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/scheduling-framework/
- Kubernetes release information: https://kubernetes.io/releases/

## Issues Found
- The `pkg/extender/types.go` snippet imported two packages as `v1`, left `k8s.io/api/core/v1` unused, and referenced `extenderv1` without defining that alias. I changed the import to `extenderv1 "k8s.io/kube-scheduler/extender/v1"` so the type aliases compile.
- The post described only filter, prioritize, and preempt as extender functions. The scheduler extender API also supports an optional bind verb, so I updated the wording and architecture diagram to include optional binding.
- The scheduling flow diagrams implied preemption happens after scoring and node selection. In Kubernetes, extender preemption is used after filtering leaves no feasible nodes, before a later scheduling retry. I corrected both diagrams to show preemption on the no-feasible-nodes path.
- The request/response diagram showed the scheduler fetching nodes directly from the API server for each scheduling cycle. The scheduler normally works from its cache, so I updated the diagram wording.
- The scheduler configuration example re-enabled default scheduler plugins such as `NodeResourcesFit` and `NodeAffinity` without first disabling them. Kubernetes scheduler configuration keeps default plugins unless disabled, and re-adding default plugins can produce duplicate plugin registration problems. I removed that unnecessary plugin block.
- The secondary scheduler example pinned `registry.k8s.io/kube-scheduler:v1.29.0`, which is outdated as of 2026-06-11. I updated the example to `registry.k8s.io/kube-scheduler:v1.36.1`, a currently supported Kubernetes release listed by the official release page.
- The Prometheus metrics import snippet included `promhttp` but did not use it. I removed the unused import so the snippet remains syntactically valid.

## Review Notes
The secondary scheduler manifest is still a compact example and does not include the full RBAC normally required by a production kube-scheduler deployment. I could not run local Go compilation because the `go` binary is not installed in this environment.
