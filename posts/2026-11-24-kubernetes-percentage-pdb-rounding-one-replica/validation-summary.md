# Technical validation

The comparison uses complementary75%/25% budgets and explicitly separates rounded minimum health from rounded permitted unavailability. The single-replica result is treated as an availability decision.

## Checks performed

- Reviewed PDB percentage rules, controller subtraction, integer/string fields, API mutual exclusion and distinct Deployment rollout rounding in official documentation/source
- Executed official k8s.io/apimachinery v0.34.1 upward-rounding helper with Go1.25.0 for101 percentages across32 positive replica counts; article Python calculation matched all3232 results
- Executed exact article Python snippet and checked all8 printed rows against its Markdown table; tested3 invalid inputs, partially unhealthy example, and complement identity across3232 combinations
- Original and replacement-field PDB alternatives passed Kubernetes1.34.1 OpenAPI checks with IntOrString support; shell syntax passed
- Eight-node/seven-edge Mermaid structure checked; generated1280x720 social image visually inspected, no clipping

## Sources checked

- https://v1-34.docs.kubernetes.io/docs/tasks/run-application/configure-pdb/
- https://github.com/kubernetes/kubernetes/blob/v1.34.1/pkg/controller/disruption/disruption.go
- https://github.com/kubernetes/apimachinery/blob/v0.34.1/pkg/util/intstr/intstr.go
- https://github.com/kubernetes/kubernetes/blob/v1.34.1/pkg/apis/policy/validation/validation.go
- https://github.com/kubernetes/kubernetes/blob/v1.34.1/staging/src/k8s.io/api/policy/v1/types.go
- https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- https://github.com/kubernetes/kubernetes/blob/v1.34.1/api/openapi-spec/swagger.json

## Limitations

- No Kubernetes API requests, live PDB reconciliation, Pod evictions, node drains or Deployment rollout performed
- Actual rounding helper was executed; the complete Kubernetes disruption controller and eviction server were not run
- Table assumes healthy expected replicas and no outstanding reservations; schema validation does not establish cluster policy acceptance; Mermaid not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
