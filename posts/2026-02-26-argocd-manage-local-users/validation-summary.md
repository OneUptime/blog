# Validation Summary: How to Manage Local Users in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD local users and account capabilities
- Argo CD CLI account management
- Argo CD RBAC policy configuration
- Kubernetes ConfigMaps and Secrets
- OIDC SSO configuration for Argo CD

## Sources Consulted
- Argo CD User Management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD RBAC Configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd account update-password` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_update-password/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD `argocd account delete-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_account_delete-token/
- Argo CD OIDC configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/#existing-oidc-provider

## Issues Found
- The examples for setting another user's password omitted `--current-password`. The Argo CD CLI supports `--current-password` as the password of the currently logged-in user, and the official user management example includes it when an admin sets another local user's password. Updated the `alice` and `bob` password examples to include `--current-password '<admin-password>'`.
- The token revocation example used `argocd account delete-token --account ci-bot --id <token-id>`, but the current Argo CD CLI accepts the token ID as a positional argument for `delete-token`; `--id` is used by `generate-token`. Updated the example to `argocd account delete-token --account ci-bot <token-id>`.

## Review Notes
The rest of the local account definitions, `login` and `apiKey` capabilities, RBAC policy syntax, OIDC configuration shape, initial admin password secret, admin disablement setting, and token generation flags match current Argo CD documentation. The post correctly recommends SSO for production human users and limiting local accounts to service or break-glass use cases.
