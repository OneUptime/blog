# Validation Summary: How to configure Kustomize load restrictor for security constraints

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- Kubernetes
- Kustomize
- Kustomize CLI load restrictor settings
- GitHub Actions
- Git commit signature verification
- kubectl server-side dry-run validation
- Open Policy Agent / Rego
- Docker
- Prometheus alerting

## Sources Consulted
- Kubernetes `kubectl kustomize` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply
- Kustomize load restriction constants: https://github.com/kubernetes-sigs/kustomize/blob/master/api/types/loadrestrictions.go
- Kustomize build load-restrictor flag implementation: https://github.com/kubernetes-sigs/kustomize/blob/master/kustomize/commands/build/flagloadrestrictor.go
- Kustomize default options: https://github.com/kubernetes-sigs/kustomize/blob/master/api/krusty/options.go
- Kustomize file loader behavior: https://github.com/kubernetes-sigs/kustomize/blob/master/api/internal/loader/fileloader.go
- Kustomize load restrictor implementation: https://github.com/kubernetes-sigs/kustomize/blob/master/api/internal/loader/loadrestrictions.go
- Kustomize v5.8.1 CLI help output from the official release binary: https://github.com/kubernetes-sigs/kustomize/releases
- GitHub Actions checkout documentation: https://github.com/actions/checkout
- Git `verify-commit` documentation: https://git-scm.com/docs/git-verify-commit.html
- Open Policy Agent Rego policy language reference: https://www.openpolicyagent.org/docs/latest/policy-language/

## Issues Found
- The post stated Kustomize supports "several" load restrictor modes and that default behavior falls between `LoadRestrictionsRootOnly` and `LoadRestrictionsNone`. Kustomize currently exposes two valid values for the flag, and the default is `LoadRestrictionsRootOnly`, so this wording was corrected.
- The default behavior section incorrectly claimed a parent-directory file such as `../base/common.yaml` is allowed if it is part of the project. Under root-only restrictions, individual file references must be in or below the kustomization root, so the example was corrected to mark it as blocked.
- The strict mode section implied the flag enables a stricter-than-default mode and that only files in the exact kustomization directory are accessible. The flag explicitly selects the default root-only mode, and files below the root are also allowed, so the wording was corrected.
- The parent-directory and monorepo sections implied changing the current working directory changes the kustomization root. Kustomize roots the build at the target kustomization directory, while separate base directories can be loaded recursively if they do not violate base-loading rules. The examples and explanations were corrected.
- The remote bases section said remote bases bypass local file restrictions. Kustomize fetches remote bases and evaluates them in their own fetched root, so the wording was corrected.
- The GitHub Actions example used `actions/checkout@v3`, which is outdated. It was updated to `actions/checkout@v5`.
- The defense-in-depth script used `kustomize verify kustomization.yaml`, but current Kustomize does not provide a `verify` subcommand. It was replaced with `git verify-commit HEAD` for signed source revision verification.
- The defense-in-depth script used `kubeval --strict`. To avoid relying on an older external validator, it was replaced with `kubectl apply --dry-run=server -f -`, which validates against the Kubernetes API server.
- The OPA policy snippet used pre-Rego-v1 partial set syntax and a string `contains` check for list-style arguments. It was updated to `import rego.v1`, `deny contains msg if { ... }`, and the `in` membership operator.

## Review Notes
The post is now technically accurate for current Kustomize v5.8.1 and current Kubernetes CLI documentation. The sensitive-data `grep` example is intentionally simple and may produce false positives for legitimate Secret resources; a future improvement could replace it with a structured policy check.
