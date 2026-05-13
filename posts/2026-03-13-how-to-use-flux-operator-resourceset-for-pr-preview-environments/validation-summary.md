# Validation Summary: How to Use Flux Operator ResourceSet for PR Preview Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Operator ResourceSet
- Flux Operator ResourceSetInputProvider
- Flux source-controller GitRepository
- Flux kustomize-controller Kustomization
- GitHub pull requests and personal access tokens
- Kubernetes namespaces, Secrets, Ingress, and ResourceQuota
- Kustomize overlays and patches
- cert-manager Certificates

## Sources Consulted
- Flux Operator ResourceSet API reference: https://fluxoperator.dev/docs/crd/resourceset/
- Flux Operator ResourceSetInputProvider API reference: https://fluxoperator.dev/docs/crd/resourcesetinputprovider/
- Flux Operator GitHub PR integration guide: https://fluxoperator.dev/docs/resourcesets/github-pull-requests/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

## Issues Found
- The GitHub Secret example used a single `token` key. Flux Operator Git providers and Flux GitRepository HTTPS basic authentication expect `username` and `password` keys, with the token as the password. Updated the prerequisite wording, Secret name, Secret creation command, and `secretRef` values.
- The generated `GitRepository` resources were created in per-PR namespaces without access to the GitHub authentication Secret in `flux-system`. Added a generated per-PR Secret using the Flux Operator `fluxcd.controlplane.io/copyFrom` annotation and added `secretRef` to the `GitRepository`.
- The `GitRepository` example checked out `inputs.branch`. The official GitHub PR integration uses `inputs.sha` as the PR HEAD commit. Updated the example to use `ref.commit: "<< inputs.sha >>"` and added `PR_SHA` to post-build substitution.
- The `inputsFrom` reference omitted `apiVersion`. This field is optional, but the official examples include it and adding it makes the manifest explicit.
- The Kustomization `path` value was unquoted around a template expression. Quoted it to keep the YAML valid after templating.
- The available template variables list omitted `inputs.title`, which the official ResourceSetInputProvider documentation lists for change requests. Added it.
- The application overlay used a JSON6902 patch that appends to `/env/-`, which fails when the base container does not already define an `env` array. Replaced it with an inline strategic merge patch that sets `replicas` and merges the `PREVIEW_HOST` env var by container name.

## Review Notes
- The guide remains a simplified Kustomize-based variant of Flux Operator's official GitHub PR integration, which uses HelmRelease in its primary example.
- The per-PR namespace pattern requires the ResourceSet service account to have permission to create namespaces and to read the source Secret for `copyFrom`.
