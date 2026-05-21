# Validation Summary: How to Create API Tokens for Service Accounts in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD local accounts and API tokens
- Argo CD CLI
- Argo CD RBAC
- Argo CD AppProject roles and project tokens
- Kubernetes ConfigMaps and Secrets
- GitHub Actions
- GitLab CI
- Jenkins
- REST API usage with curl

## Sources Consulted
- Argo CD local users/accounts documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD CLI environment variables: https://argo-cd.readthedocs.io/en/latest/user-guide/environment-variables/
- `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- `argocd account get` command reference: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/commands/argocd_account_get/
- `argocd account delete-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_delete-token/
- `argocd proj role add-policy` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_add-policy/
- `argocd proj role create-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_create-token/
- `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/

## Issues Found
- The token revocation examples used `argocd account delete-token --account <account> --id <token-id>`. The official command reference shows the token ID is a positional argument, not a `--id` flag. Updated the single-token revoke example, revoke-all examples, and rotation script to use `argocd account delete-token --account <account> <token-id>`.

## Review Notes
- The `apiKey` and `login` account capabilities, RBAC policy format, `generate-token --account`, `generate-token --expires-in`, `generate-token --id`, CLI token environment variables, and project role token commands match the current Argo CD documentation.
- The `--grpc-web` examples are valid for Argo CD servers behind proxies that do not support HTTP/2.
