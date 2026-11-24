# Technical validation

The guide compares intended and selected Pod populations, including namespace scope and complete selector expressions. It distinguishes stable workload labels from revision-specific labels and Deployment metadata from Pod-template metadata.

## Checks performed

- Reviewed structured selectors, namespace scope, standard instance/component labels, Deployment template labels, rollout hashes and expected-scale behavior in official docs/source
- Executed official apimachinery v0.34.1 LabelSelectorAsSelector and label-query parser/matcher with Go1.25.0 on six inventory fixtures; exact YAML and shell selector produced identical label matches
- Verified intended two-Pod selection versus five-Pod broad selection after namespace filtering, differing rollout hashes, absent labels, other namespace/instance/component exclusion, null versus empty, NotIn missing-key behavior, Exists guard and invalid-operator rejection
- Article YAML passed v1.34.1 OpenAPI validation; three shell blocks passed syntax checks; six-node/five-edge Mermaid structure checked
- Generated1280x720 social image visually inspected, title legible without clipping

## Sources checked

- https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- https://github.com/kubernetes/kubernetes/blob/v1.34.1/pkg/controller/disruption/disruption.go
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/staging/src/k8s.io/kubectl/pkg/describe/describe.go
- https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- https://github.com/kubernetes/apimachinery/blob/v0.34.1/pkg/apis/meta/v1/helpers.go
- https://github.com/kubernetes/kubernetes/blob/v1.34.1/api/openapi-spec/swagger.json

## Limitations

- No live Kubernetes API requests, label mutation, PDB update, Deployment rollout or eviction performed
- Official matcher checks cover local fixtures; actual workload ownership, label drift, readiness and disruption status still require cluster inspection
- Schema checks do not establish server admission approval; Mermaid structure checked but not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
