# Validation summary

## Review

Reviewed side-effect declarations and dry-run dispatch checks against Kubernetes v1.35.0 source, and CLI/API semantics against official documentation. The article keeps patch computation active and makes external-write obligations explicit.

## Checks

- Python 3.11 planner executed for 20 combinations of absent/null/false/true dryRun and five annotation shapes; identical mode outputs, actual jsonpatch 1.33 application, repeat no-op and input preservation passed
- Six invalid flag types and three malformed annotation inputs rejected
- Two YAML blocks parsed with PyYAML 6.0.2; ConfigMap validated against official v1.35.0 OpenAPI shape using jsonschema 4.25.1
- Two command blocks passed bash -n; kubectl command options source-reviewed, not executed
- Mermaid structure checked: five nodes and four edges; not rendered
- Generated social image visually reviewed, full title fits

## Limitations

- No Kubernetes dry run, API server, external-system audit or non-persistence check performed
- Planner assumes an outer validated and scoped ConfigMap CREATE handler; it is not an HTTP server
- Planner contains no external clients; test-double write blocking is advice for real integrations, not a performed external-client test
- OpenAPI shape validation does not exercise Kubernetes custom validation or webhook admission

## Sources

- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/
- https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run
- https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/apis/admissionregistration/validation/validation.go
- https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/apiserver/pkg/admission/plugin/webhook/mutating/dispatcher.go
- https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/api/admission/v1/types.go
- https://www.rfc-editor.org/rfc/rfc6901
- https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#side-effects
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- https://raw.githubusercontent.com/stefankoegl/python-json-patch/v1.33/jsonpatch.py
- https://raw.githubusercontent.com/kubernetes/kubernetes/v1.35.0/api/openapi-spec/swagger.json

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
