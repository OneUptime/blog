# Technical validation

The guide provides a locally executed manifest coverage checker, with explicit scope for excluded workloads and autoscaling. Coverage is distinguished from budget adequacy and runtime availability.

## Checks performed

- Compiled the complete linked Go checker with Go1.25.0 and apimachinery0.34.0; repeated module initialization, dependency setup and build in a fresh directory
- Executed30 CLI fixtures covering replicated Deployment/StatefulSet, missing/default/zero/one replicas, HPA ranges and namespace scope, excluded Jobs/CronJobs/DaemonSets, selector expressions, null/empty selectors, overlaps, duplicate resources, List rejection and unrelated Service input
- Validated example PDB against tagged Kubernetes1.34.0 OpenAPI schema; two shell blocks passed syntax; eight-node/seven-edge Mermaid structurally checked
- Generated1280x720 social image and visually reviewed two-line title and branding without clipping

## Sources checked

- https://v1-34.docs.kubernetes.io/docs/tasks/run-application/configure-pdb/
- https://v1-34.docs.kubernetes.io/docs/concepts/workloads/controllers/job/
- https://v1-34.docs.kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- https://github.com/kubernetes/apimachinery/blob/v0.34.0/pkg/apis/meta/v1/helpers.go
- https://go.dev/doc/modules/managing-dependencies
- https://github.com/kubernetes/apimachinery/blob/v0.34.0/pkg/util/yaml/decoder.go
- https://release-1-11-0.kyverno.io/policies/other/require-pdb/require-pdb/

## Limitations

- No live Kubernetes cluster, admission webhook, CI service, scheduler, drain or workload availability test was performed
- Checker requires a complete schema-validated intended bundle; it does not discover live dependencies, verify budget sizing or prevent direct API changes
- Mermaid checked structurally, not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
