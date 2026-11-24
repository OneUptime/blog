# Technical validation

The article separates the DELETE and eviction request paths and preserves explicit server dry-run controls in every removal comparison. Drain force and eviction-disable flags are explained independently.

## Checks performed

- Reviewed direct deletion, API eviction, drain fallback, force/filter distinctions, raw create and server dry-run behavior in official docs and Kubernetes v1.34.0 source
- Started isolated envtest v1.34.0 API server/etcd with controller-runtime0.22.1, Go1.25.0 and matching kubectl; fixture status set one Ready Pod and zero PDB allowance
- Actual kubectl server dry-run eviction returned TooManyRequests with PDB reason; actual server dry-run DELETE succeeded; verified same Pod UID, no deletion timestamp, zero allowance and empty disruptedPods map afterward
- Four shell blocks passed syntax checks; exact heredoc payload/UID guard executed with mock UID retrieval, including failed retrieval producing no file
- Eight-node/eight-edge Mermaid structure checked; final regenerated1280x720 image visually inspected, legible two-line title

## Sources checked

- https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/staging/src/k8s.io/kubectl/pkg/drain/drain.go
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/staging/src/k8s.io/kubectl/pkg/drain/filters.go
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- https://v1-34.docs.kubernetes.io/docs/tasks/run-application/configure-pdb/
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/staging/src/k8s.io/api/policy/v1/types.go
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/staging/src/k8s.io/apimachinery/pkg/apis/meta/v1/types.go
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/
- https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run
- https://book.kubebuilder.io/reference/envtest.html

## Limitations

- envtest has no kubelet, scheduler or disruption controller; Pod readiness and PDB status were injected fixtures rather than observed workload health
- No containers ran, no actual Pod removal or node drain occurred, and graceful shutdown, storage safety, replacement readiness and service availability were not tested
- No organizational RBAC/admission policy was reproduced; Mermaid structure checked but not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
