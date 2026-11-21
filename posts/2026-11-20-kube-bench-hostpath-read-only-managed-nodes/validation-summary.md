# Validation review

Reviewed tagged kube-bench v0.14.0 host mounts and configuration paths, Kubernetes volume semantics, and Google Autopilot host-access restrictions and allowlist workflow.

Three shell blocks passed bash syntax checks. The mount fragment was parsed and tested as a PodSpec against a local Kubernetes1.34 API. Valid Directory/readOnly specs were accepted even for a nonexistent source; an invalid hostPath type was rejected. This validates API behavior only and demonstrates why node-side inspection remains necessary.

No Linux kubelet, container runtime, host mount, managed cluster or kube-bench scan was available. Permission and read-only filesystem recovery were not executed. The diagram was structurally checked, not rendered, and the social image visually reviewed.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
