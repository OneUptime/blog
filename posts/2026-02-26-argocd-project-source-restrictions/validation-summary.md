# Validation Summary: How to Configure Project Source Restrictions in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- AppProject source repository restrictions
- Helm repositories and OCI Helm charts
- Argo CD CLI

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD OCI documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/oci/
- Argo CD Multiple Sources documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD CLI command reference for `argocd proj add-source`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_add-source/
- Argo CD CLI command reference for `argocd proj remove-source`: https://argo-cd.readthedocs.io/en/release-2.3/user-guide/commands/argocd_proj_remove-source/
- Argo CD CLI command reference for `argocd app create`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/

## Issues Found
- The OCI examples mixed generic OCI artifact repository URL syntax with Helm OCI repository URL syntax. Argo CD generic OCI sources use an `oci://` repo URL, while Helm OCI chart sources omit the `oci://` prefix and use `chart` separately. Updated the wildcard example to distinguish generic OCI artifact sources from Helm OCI repositories.
- The multi-source Helm OCI example used `repoURL: "ghcr.io/my-org/helm-charts/common"` with `chart: common`, which duplicates the chart path for the documented Helm OCI source format. Updated it to `repoURL: "ghcr.io/my-org/helm-charts"` with `chart: common`, and updated the matching `sourceRepos` example accordingly.

## Review Notes
- The local `argocd` CLI was not installed, so CLI syntax was verified against the official Argo CD command reference instead of local `--help` output.
- Argo CD supports deny rules in `sourceRepos` using a leading `!`; the post focuses on allow-list patterns, which is technically valid but could be expanded in a future article.
