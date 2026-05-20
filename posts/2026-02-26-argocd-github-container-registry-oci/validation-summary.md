# Validation Summary: How to Use GitHub Container Registry with ArgoCD OCI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Helm OCI registries
- GitHub Container Registry
- GitHub Actions
- Kubernetes Secrets
- Argo CD Application and ApplicationSet manifests

## Sources Consulted
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD private repository documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD OCI documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- Helm registry documentation: https://helm.sh/docs/topics/registries/
- GitHub Packages container registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Packages permissions documentation: https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages
- GitHub Actions automatic token authentication documentation: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication
- GitHub REST API packages documentation: https://docs.github.com/en/rest/packages/packages
- Azure setup-helm action documentation: https://github.com/Azure/setup-helm

## Issues Found
- The post claimed fine-grained PATs could be used for GHCR registry authentication. GitHub's GHCR documentation documents classic PATs for registry login outside GitHub Actions, so the prerequisites and token creation steps were corrected to use classic PATs.
- The post claimed GitHub App installation tokens could be used as ArgoCD GHCR registry credentials. GitHub's GHCR registry authentication documentation does not document GitHub App installation tokens for `helm registry login` or ArgoCD repository Secrets, so the section was corrected to recommend classic PATs for ArgoCD and `GITHUB_TOKEN` for GitHub Actions publishing.
- The GitHub Actions example used `azure/setup-helm@v3`; the official action currently documents `azure/setup-helm@v4`, so the workflow was updated.
- The Helm push comment incorrectly suggested pushing to `oci://ghcr.io/<owner>/<chart-name>`. Helm's OCI push documentation requires omitting the chart basename and tag because they are inferred from the packaged chart, so the comment was corrected to `oci://ghcr.io/<owner>`.
- The Argo CD Application examples used `repoURL: ghcr.io` with chart names containing the owner path. Argo CD's Helm OCI examples use the registry repository path in `repoURL` and the chart basename in `chart`, so the examples were corrected to `repoURL: ghcr.io/my-org` and chart names such as `my-chart`.
- The package visibility section included an invalid GitHub REST API example for changing package visibility. GitHub documents changing package visibility from package settings, so the invalid command was removed.
- The troubleshooting section mentioned fine-grained token package access; this was corrected to classic PAT scope and package accessibility.
- The troubleshooting section made undocumented claims about unauthenticated GHCR rate limits and fine-grained PAT expiration. These were corrected to documented behavior around anonymous public pulls and optional classic PAT expiration.
- The manual login example used `$GITHUB_TOKEN` immediately after instructing readers to create a classic PAT. This was changed to `$CR_PAT`, matching GitHub's documented pattern for manual registry authentication.

## Review Notes
The Argo CD Helm OCI repository, Application, ApplicationSet, Kubernetes Secret, and `argocd repo add --enable-oci` examples are now aligned with Argo CD's Helm OCI support. Helm's OCI commands and GitHub Actions `GITHUB_TOKEN` package publishing pattern are also consistent with official documentation.
