# Validation Summary: How to Bootstrap Flux CD with Gitea

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Gitea
- Forgejo / Codeberg
- Kubernetes
- Helm
- Kustomize
- GitOps

## Sources Consulted
- Flux bootstrap for Gitea documentation: https://fluxcd.io/flux/installation/bootstrap/gitea/
- Flux CLI reference for `flux bootstrap gitea`: https://fluxcd.io/flux/cmd/flux_bootstrap_gitea/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Gitea API token usage documentation: https://docs.gitea.com/next/development/api-usage
- Gitea Helm chart package documentation: https://artifacthub.io/packages/helm/gitea/gitea
- Codeberg FAQ: https://docs.codeberg.org/getting-started/faq/
- Codeberg Forgejo migration announcement: https://blog.codeberg.org/codeberg-launches-forgejo.html
- Podinfo Helm chart package: https://artifacthub.io/packages/helm/podinfo/podinfo

## Issues Found
- The prerequisites listed Kubernetes v1.26 or later. Current Flux documentation supports Kubernetes v1.33 or later for current releases, and Kubernetes v1.26 is EOL. Updated the prerequisite to say the cluster must be supported by the Flux release, with the current v1.33-or-later requirement.
- The prerequisites listed `kubectl` access without mentioning the cluster-admin permission required by Flux bootstrap. Updated the prerequisite to specify cluster-admin access.
- The prerequisites listed Flux CLI v2.0 or later, but the tutorial uses `helm.toolkit.fluxcd.io/v2`, which was promoted to GA in Flux v2.3. Updated the prerequisite to Flux CLI v2.3 or later for the API used in the post.
- The prerequisites described Codeberg as a cloud-hosted Gitea instance. Codeberg is Forgejo-based, while Flux documents Forgejo as backward-compatible with the Gitea bootstrap flow. Updated the wording to "Gitea-compatible Forgejo host."

## Review Notes
The Flux bootstrap flags, Gitea PAT scopes, Helm chart values, Flux `Kustomization`, `HelmRepository`, and `HelmRelease` examples are consistent with the current official documentation. The post correctly notes that `--token-auth` uses HTTPS token authentication and that the default bootstrap flow uses SSH deploy keys.
