# Validation Summary: How to Fix 'authentication required' Error in Flux CD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD source-controller
- Flux GitRepository and HelmRepository APIs
- Kubernetes Secrets
- kubectl
- Flux CLI
- GitHub personal access tokens and GitHub Apps
- GitLab access tokens
- SSH deploy keys
- Helm HTTP and OCI repositories

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI documentation: https://fluxcd.io/flux/cmd/flux/
- Kubernetes kubectl `create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- GitHub fine-grained personal access token permissions documentation: https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens
- GitHub deploy key documentation: https://docs.github.com/authentication/connecting-to-github-with-ssh/managing-deploy-keys
- GitLab personal access token documentation: https://docs.gitlab.com/user/profile/personal_access_tokens/
- GitLab deploy token documentation: https://docs.gitlab.com/user/project/deploy_tokens/

## Issues Found
- The GitHub App `GitRepository` example omitted `spec.provider: github`. Flux documents GitHub App authentication under the `github` provider, while the default provider is `generic`. Added `provider: github` to the GitHub App example so Flux uses the GitHub App authentication path.

## Review Notes
- The Helm OCI `HelmRepository` example remains technically valid, but Flux documentation notes that `HelmRepository` with `spec.type: oci` is in maintenance mode and recommends the `OCIRepository` API for improved OCI Helm chart support.
