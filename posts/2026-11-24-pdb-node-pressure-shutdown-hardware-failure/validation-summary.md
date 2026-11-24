# Technical validation

The article distinguishes API admission from kubelet termination and infrastructure loss, including the difference between Pod shutdown status and shutdown-time admission rejection. Diagnostic examples retain identities and lifecycle evidence without changing the cluster.

## Checks performed

- Reviewed Kubernetes1.34 node-pressure eviction documentation and eviction-manager direct termination source, shutdown-manager direct termination/status reasons, graceful-shutdown configuration, node heartbeats and container lifecycle
- Executed exact jq1.6 projection on eight fixtures: memory/storage eviction, shutdown, current/previous OOM termination, absent status, init-only status and disruption/readiness conditions
- Verified captured UID/node retained, absent fields handled, restartCount0 preserved and unrelated conditions filtered; failed kubectl capture exits before jq processing
- Two shell blocks passed syntax; eight-node/eight-edge Mermaid structurally checked; post-failure allowance arithmetic verified
- Generated1280x720 social image and visually inspected three-line title and branding without clipping

## Sources checked

- https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- https://v1-34.docs.kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/kubelet/eviction/eviction_manager.go
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/kubelet/nodeshutdown/nodeshutdown_manager.go
- https://v1-34.docs.kubernetes.io/docs/concepts/cluster-administration/node-shutdown/
- https://kubernetes.io/docs/concepts/architecture/nodes/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- https://jqlang.org/manual/v1.6/
- https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Limitations

- No live cluster inspection, node-pressure experiment, kubelet process, operating-system shutdown, hardware failure or workload recovery executed
- Runtime checks were local JSON fixtures and a mocked failed capture; they validate inspection behavior, not actual lifecycle transitions
- Diagnostics require correlation with real node/provider evidence; Mermaid structurally checked but not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
