# Validation Summary: How to Configure Flux Git Secret with HTTPS Username and Password

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Source Controller
- Kubernetes Secrets
- Kubernetes kubectl
- GitRepository custom resources
- Git HTTPS authentication
- GitHub personal access tokens
- GitLab personal access tokens
- Bitbucket Cloud API tokens

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux releases and Kubernetes support policy: https://fluxcd.io/flux/releases/
- Flux CLI `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Kubernetes `kubectl create secret generic`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- GitHub personal access token documentation: https://docs.github.com/en/enterprise-cloud@latest/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitLab personal access token documentation: https://docs.gitlab.com/user/profile/personal_access_tokens/
- Bitbucket Cloud API token documentation: https://support.atlassian.com/bitbucket-cloud/docs/using-api-tokens/
- Bitbucket Cloud API token permissions: https://support.atlassian.com/bitbucket-cloud/docs/api-token-permissions/
- Bitbucket Cloud app password deprecation notice: https://support.atlassian.com/bitbucket-cloud/docs/revoke-an-app-password/

## Issues Found
- The prerequisite "Kubernetes cluster (v1.20 or later)" was outdated for current Flux releases. Updated it to require a supported Kubernetes cluster version for the Flux release in use, matching Flux's current support policy.
- The Bitbucket instructions told readers to create a new app password. Bitbucket Cloud no longer allows creating new app passwords as of September 9, 2025, and existing app passwords are scheduled to be disabled on June 9, 2026. Updated the instructions to use scoped Bitbucket API tokens with repository permissions.
- The self-signed certificate section used only `caFile` and said to "reference the CA file" in the `GitRepository`, which could imply a separate field exists. Updated the example to use `ca.crt`, noted that Flux supports `ca.crt` or `caFile`, and clarified that the existing `secretRef` is what makes Source Controller use the CA certificate.

## Review Notes
The Flux `GitRepository` API version, `secretRef` usage, HTTPS Secret keys (`username` and `password`), `kubectl create secret generic` commands, `stringData` Secret examples, and Flux verification/reconciliation commands are consistent with official documentation. GitHub and GitLab token-over-HTTPS behavior is also accurate; both require a non-empty username while the token is supplied as the password.
