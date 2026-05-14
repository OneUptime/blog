# Validation Summary: How to Configure GitRepository with HTTPS Authentication in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux Source Controller
- Flux GitRepository API
- Kubernetes Secrets
- kubectl
- Flux CLI
- GitHub personal access tokens
- GitLab access tokens
- Bitbucket Cloud API tokens
- HTTPS and custom CA certificates

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux `flux create secret git` CLI documentation: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitLab clone with HTTPS/token documentation: https://docs.gitlab.com/topics/git/clone/
- GitLab personal access token documentation: https://docs.gitlab.com/user/profile/personal_access_tokens/
- GitLab project access token documentation: https://docs.gitlab.com/user/project/settings/project_access_tokens/
- Bitbucket Cloud API token documentation: https://support.atlassian.com/bitbucket-cloud/docs/using-api-tokens/
- Bitbucket Cloud API token permissions: https://support.atlassian.com/bitbucket-cloud/docs/api-token-permissions/
- Bitbucket Cloud app password deprecation notice: https://support.atlassian.com/bitbucket-cloud/docs/revoke-an-app-password/

## Issues Found
- The self-signed TLS example used the `caFile` Secret key. Flux still documents `caFile`, but current guidance prefers `ca.crt`, which takes precedence over `caFile`; updated the command and explanation to use `ca.crt`.
- The self-signed TLS section said the CA certificate could be provided through the same Secret or a separate one. For this GitRepository setup, Flux reads the CA from the referenced Secret, so the wording was corrected.
- The GitLab guidance said to use `oauth2` as the username for project or personal access tokens. GitLab documents that personal and project access tokens can use any non-empty username, so the prose and GitLab Secret example were corrected.
- The Bitbucket guidance used app passwords. Bitbucket Cloud stopped allowing new app passwords on September 9, 2025 and will disable existing app passwords on June 9, 2026; the post now uses API tokens with repository read permission.

## Review Notes
The Flux `GitRepository` API version, `secretRef` usage, HTTPS `username`/`password` Secret keys, Flux CLI command shape, `kubectl create secret generic` examples, `kubectl events --for`, and `flux reconcile source git` usage are consistent with current official documentation. The local environment did not have `kubectl` or `flux` installed, so CLI verification was performed against official command references instead of local `--help` output.
