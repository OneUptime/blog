# Validation Summary: How to Configure Fleet HTTP Authentication

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes Secrets
- GitRepo custom resources
- GitHub personal access tokens
- GitLab personal access tokens and deploy tokens
- Azure DevOps personal access tokens

## Sources Consulted
- Fleet GitRepo reference: https://fleet.rancher.io/0.13/reference/ref-gitrepo
- Fleet "Create a GitRepo Resource" docs: https://fleet.rancher.io/0.13/how-tos-for-users/gitrepo-add
- Fleet source (`GitRepoSpec`): https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go
- Fleet chart template for `gitjob` labels: https://github.com/rancher/fleet/blob/main/charts/fleet/templates/deployment_gitjob.yaml
- Kubernetes Secrets concept docs: https://kubernetes.io/docs/concepts/configuration/secret/
- `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- GitHub personal access token docs: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitLab personal access token docs: https://docs.gitlab.com/user/profile/personal_access_tokens/
- GitLab deploy token docs: https://docs.gitlab.com/user/project/deploy_tokens/
- Azure DevOps Git authentication overview: https://learn.microsoft.com/en-us/azure/devops/repos/git/auth-overview?view=azure-devops

## Issues Found
- The `kubectl create secret generic` examples created default `Opaque` secrets, but Fleet requires `clientSecretName` secrets to be `kubernetes.io/basic-auth` or `kubernetes.io/ssh-auth`. I added `--type=kubernetes.io/basic-auth` to each HTTP auth secret example and to the rotation command.
- The self-hosted TLS example created a CA secret that was never referenced, and the `GitRepo.spec.caBundle` example used a raw PEM block. Fleet documents `caBundle` as base64-encoded PEM data and the API defines it as `[]byte` serialized through the `caBundle` field. I replaced the secret example with a base64-encoding command and updated the YAML to show base64-encoded `caBundle` content.
- The GitLab personal access token navigation was outdated. I updated it to the current `Edit profile > Access > Personal access tokens` flow and added the `Legacy token` selection required by current GitLab docs.
- The GitLab deploy token navigation path was inaccurate. I corrected it to `Settings > Repository > Deploy tokens`.
- The GitHub classic PAT section suggested the extra `read:org` scope for organization repositories. I removed it so the example follows the documented minimum `repo` scope for HTTPS repository access.
- The Azure DevOps example implied the username should typically be an email address. Microsoft documents that Git HTTP auth with a PAT accepts any non-empty username, so I updated the example and wording accordingly.

## Review Notes
- Azure DevOps now recommends Microsoft Entra tokens over PATs in general, but PAT-based HTTP Basic authentication remains documented and compatible with a Fleet `kubernetes.io/basic-auth` secret.
- GitLab fine-grained personal access tokens are documented separately and remain beta in the reviewed docs; using the legacy PAT flow here is appropriate for the `read_repository` example.
- `kubectl` was not installed in the local review workspace, so CLI validation relied on the official Kubernetes generated reference rather than local `--help` output.
