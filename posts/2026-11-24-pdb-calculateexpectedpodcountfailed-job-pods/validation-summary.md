# Technical validation

The article distinguishes source-reviewed controller calculation behavior from API-tested discovery, ownership inspection and selector changes.

## Checks performed

- Reviewed Kubernetes1.34.0 disruption-controller expected-count paths, scale fallback, CalculateExpectedPodCountFailed event and fail-safe status behavior
- Executed exact kubectl1.34.0/jq inspection commands against disposable API fixtures with three ReplicaSet-owned service Pods and one Job-owned migration Pod
- Verified batch/v1 discovery contains jobs but no jobs/scale, Job scale request returns404, and Deployment scale returns desired replicas3
- Executed exact JSON Patch server preview; stored PDB resourceVersion and broad selector unchanged; Kubernetes selector library matched4 broad Pods versus3 service Pods for proposed selector
- Changed existing selector with an additional expression and verified patch test operation rejects the assumption; four shell blocks passed syntax; seven-node/seven-edge Mermaid structurally checked
- Generated1280x720 social image and visually inspected two-line title and branding without clipping

## Sources checked

- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/controller/disruption/disruption.go
- https://v1-34.docs.kubernetes.io/docs/concepts/workloads/controllers/job/
- https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/
- https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- https://github.com/kubernetes/kubernetes/issues/129625
- https://github.com/kubernetes/apimachinery/blob/v0.34.0/pkg/apis/meta/v1/helpers.go

## Limitations

- No disruption controller ran and no CalculateExpectedPodCountFailed event was produced by the local API fixture; those behaviors are based on tagged source review
- Pod/controller ownership fixtures were created directly; no real Job work, Deployment rollout, scheduling, readiness recovery or node drain was performed
- Selector narrowing must be coordinated with actual Pod-template labels and resource ownership; Mermaid structurally checked but not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
