# Validation Summary: How to Generate JWT Tokens for Project Roles in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD project roles
- Argo CD CLI
- Argo CD JWT automation tokens
- Kubernetes AppProject manifests
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- curl / HTTP API usage

## Sources Consulted
- Argo CD project roles documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD `argocd proj role create-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_create-token/
- Argo CD `argocd proj role list-tokens` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_list-tokens/
- Argo CD `argocd proj role delete-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_delete-token/
- Argo CD `argocd proj role add-policy` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_add-policy/
- Argo CD security documentation for automation tokens: https://argo-cd.readthedocs.io/en/release-2.7/operator-manual/security/
- Argo CD CLI source for project role token commands: https://github.com/argoproj/argo-cd/blob/master/cmd/argocd/commands/project_role.go

## Issues Found
- Token generation examples captured the full human-readable CLI output instead of only the JWT. Added `--token-only` to script-style `argocd proj role create-token` examples so environment variables and CI secrets receive a usable token.
- The custom token ID examples used `--token-id`, which is not the current Argo CD CLI flag. Replaced it with `--id`.
- The lifecycle section used `argocd proj role get` as the token listing command. Replaced it with `argocd proj role list-tokens --unixtime`, which is the dedicated token listing command and exposes issued-at values useful for revocation.
- The revocation examples referred to token IDs, but the current CLI parses the positional argument as the issued-at timestamp. Updated the placeholders and comments to use issued-at values.
- The short-lived token generation example described a generic token-generator credential. Clarified that the credential must have permission to update the project, which is required to create project role tokens.

## Review Notes
The local environment did not have the `argocd` CLI installed, so command validation was performed against the official Argo CD documentation and current upstream CLI source. The remaining examples are technically plausible, but real deployments may need additional flags such as `--insecure`, `--plaintext`, or a configured Argo CD context depending on server TLS and proxy setup.
