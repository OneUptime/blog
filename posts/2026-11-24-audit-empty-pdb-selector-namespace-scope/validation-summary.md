# Technical validation

The audit explicitly requests policy/v1 objects and detects empty nested selector forms. The review includes aggregate protection risks and preserves intended coverage when proposing repairs.

## Checks performed

- Reviewed policy/v1 empty versus null selectors, historical v1beta1 migration semantics, namespace scope, overlap and expected-scale behavior against official documentation and tagged source
- Executed version-qualified kubectl1.34.0 collection against isolated API server1.34.0; policy/v1 PDB returned in actual list output
- Executed jq1.6 article filter across12 selector fixtures, missing per-item type metadata, empty inventory, and actual API output; all expected empty forms detected without null/nonempty false positives
- Executed official apimachinery0.34.0 selector matcher across five equivalent empty forms and null with three label sets
- Diagnostic YAML passed tagged1.34.0 OpenAPI schema; three shell blocks passed syntax; six-node/seven-edge Mermaid structurally checked
- Generated1280x720 social image and visually inspected title, spacing and branding; no clipping

## Sources checked

- https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- https://github.com/kubernetes/apimachinery/blob/v0.34.0/pkg/apis/meta/v1/helpers.go
- https://kubernetes.io/docs/reference/using-api/deprecation-guide/#poddisruptionbudget-v125
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- https://jqlang.org/manual/v1.6/
- https://github.com/kubernetes/kubernetes/blob/v1.34.1/pkg/controller/disruption/disruption.go
- https://v1-34.docs.kubernetes.io/docs/tasks/run-application/configure-pdb/
- https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/api/openapi-spec/swagger.json
- https://book.kubebuilder.io/reference/envtest.html

## Limitations

- Isolated API lab used controller-runtime0.22.1 and Go1.25.0; no kubelet, scheduler or disruption controller ran
- No production cluster query, workload eviction, selector mutation, cross-namespace authorization audit or application traffic tested
- Structural filter is not a complete PDB coverage audit; Mermaid structurally checked but not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
