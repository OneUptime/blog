# Validation Summary: How to Use Flux Operator ResourceSet for GitLab MR Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Operator
- Flux ResourceSet
- Flux ResourceSetInputProvider
- Flux source-controller GitRepository
- GitLab merge requests
- GitLab personal and project access tokens
- Kubernetes Secrets, Namespaces, Ingresses, ResourceQuotas, and LimitRanges
- Kustomize overlays
- GitLab CLI

## Sources Consulted
- Flux Operator GitLab merge requests integration: https://fluxoperator.dev/docs/resourcesets/gitlab-merge-requests/
- Flux Operator ResourceSet API reference: https://fluxoperator.dev/docs/crd/resourceset/
- Flux Operator ResourceSetInputProvider API reference: https://fluxoperator.dev/docs/crd/resourcesetinputprovider/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- GitLab clone with token documentation: https://docs.gitlab.com/topics/git/clone/
- GitLab personal access token documentation: https://docs.gitlab.com/user/profile/personal_access_tokens/
- GitLab CLI `glab mr update` documentation: https://docs.gitlab.com/cli/mr/update/

## Issues Found
- The `ResourceSetInputProvider` Secret example used a single `token` key. Flux Operator documents Git provider secrets as `username` and `password`, with the token stored in `password`, so I changed the command to create those keys.
- The prerequisites only mentioned `read_api`. That is sufficient for polling the GitLab API, but private repository clones over HTTPS also require repository-read access, so I added `read_repository` for tokens reused by the GitRepository source.
- The repository credential section created `gitlab-credentials` in `flux-system`, but the generated `GitRepository` objects live in each `mr-*` namespace and Flux requires `secretRef` secrets to be in the same namespace as the source. I changed the text to create the Secret as a ResourceSet template in the MR namespace.
- The repository Secret template referenced `<< inputs.provider.token >>`, but Flux Operator only documents provider metadata such as API version, kind, name, and namespace; it does not expose the provider Secret token as an input field. I replaced it with an explicit placeholder token value and left the ExternalSecret alternative intact.

## Review Notes
The ResourceSet and ResourceSetInputProvider APIs, `GitLabMergeRequest` provider type, label filtering, exported MR fields, Flux `GitRepository` and `Kustomization` API versions, Kubernetes resource examples, and `glab mr update --label` command were consistent with the consulted documentation. The examples remain illustrative and assume the Flux Operator service account has permissions to create namespaces and namespaced resources.
