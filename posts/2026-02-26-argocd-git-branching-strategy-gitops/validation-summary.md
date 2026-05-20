# Validation Summary: How to Implement Git Branching Strategy for GitOps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kustomize
- Git and GitHub branch protection
- GitHub Actions
- kubeconform

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Kubernetes SIGs Kustomize repository and install script: https://github.com/kubernetes-sigs/kustomize
- kubeconform README and CLI usage: https://github.com/yannh/kubeconform
- kubeconform releases: https://github.com/yannh/kubeconform/releases
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub branch protection documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches

## Issues Found
- The Argo CD `Application` examples omitted `spec.project` and `spec.destination`, so the examples were incomplete for a usable Application. Added `project: default` and in-cluster destination namespaces to each Application snippet.
- The GitHub Actions validation workflow installed `kustomize` into the workspace but invoked `kustomize` as though it were on `PATH`. Changed the validation command to call `./kustomize build`.
- The workflow used older pinned refs for `actions/checkout` and kubeconform. Updated `actions/checkout@v4` to `actions/checkout@v6` and kubeconform `v0.6.4` to `v0.7.0` based on current official/project references.
- The tag release section said "tag pattern" while the example pins a specific tag. Changed the wording to "specific tag" and clarified that rollback means changing `targetRevision` to an earlier tag.

## Review Notes
kubeconform validates manifests against Kubernetes OpenAPI schemas and does not cover all server-side Kubernetes validations. The post's CI example is still technically valid for schema validation, but teams with CRDs or admission policies may need additional schema locations or server-side dry-run checks.
