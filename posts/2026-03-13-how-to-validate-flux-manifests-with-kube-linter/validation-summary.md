# Validation Summary: How to Validate Flux Manifests with kube-linter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- kube-linter
- Kubernetes manifests
- Flux GitOps resources
- Kustomize
- GitHub Actions
- GitHub code scanning and SARIF
- YAML configuration
- Bash scripting

## Sources Consulted
- KubeLinter README and installation docs: https://github.com/stackrox/kube-linter
- KubeLinter configuration docs: https://raw.githubusercontent.com/stackrox/kube-linter/main/docs/configuring-kubelinter.md
- KubeLinter generated checks reference: https://raw.githubusercontent.com/stackrox/kube-linter/main/docs/generated/checks.md
- KubeLinter generated templates reference: https://raw.githubusercontent.com/stackrox/kube-linter/main/docs/generated/templates.md
- KubeLinter configuration schema: https://raw.githubusercontent.com/stackrox/kube-linter/main/schemas/kube-lint-config.json
- KubeLinter v0.8.3 release metadata and binary help output: https://github.com/stackrox/kube-linter/releases/tag/v0.8.3
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/

## Issues Found
- The post used the non-existent kube-linter check name `no-privileged-containers`. Changed it to the current built-in check name `privileged-container`.
- The descriptions for `unset-cpu-requirements` and `unset-memory-requirements` said both requests and limits should be set. Current kube-linter defaults check CPU requests and memory limits respectively, so the descriptions were corrected.
- The `.kube-linter.yaml` example placed `ignorePaths` at the top level. The official kube-linter schema expects it under `checks`, so the snippet was corrected.
- The custom Flux interval check looked for a `reconcile.fluxcd.io/interval` annotation on `DeploymentLike` objects. Flux uses `spec.interval` on resources such as Kustomization and HelmRelease; the example was changed to a `cel-expression` check for missing `spec.interval` on Flux Kustomization resources.
- The `dangling-service` exclusion comment implied Flux manages Services separately. Reworded it to the technically accurate case that Services may be linted separately from workloads.
- The GitHub code scanning workflow used older action versions and omitted documented SARIF upload permissions. Updated `actions/checkout` to `v6`, `github/codeql-action/upload-sarif` to `v4`, and added `security-events: write`, `actions: read`, and `contents: read` permissions.

## Review Notes
- Verified kube-linter v0.8.3 CLI flags for `lint`, `checks list`, output formats, include/exclude behavior, config loading, and stdin linting.
- Verified the corrected CEL custom check with the kube-linter v0.8.3 Linux binary against a sample Flux Kustomization missing `spec.interval`.
- The post remains focused on linting Kubernetes manifests managed through Flux. kube-linter is not a complete Flux schema validator, so using it alongside schema validation remains a useful caveat already present in the best practices section.
