# Validation Summary: How to Allow CI Service Accounts to Sync Without UI Access in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD local accounts
- Argo CD RBAC
- Argo CD CLI
- Argo CD REST API
- Kubernetes ConfigMaps
- GitHub Actions
- GitLab CI
- Jenkins Pipeline

## Sources Consulted
- Argo CD local user/account management documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD `argocd account delete-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_account_delete-token/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD applications in any namespace documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/

## Issues Found
- The CLI examples used RBAC object strings such as `frontend/web-app` and `backend/api-service` as `argocd app` arguments. Argo CD RBAC application objects use `<project>/<application>`, while standard CLI application arguments are application names. I changed those examples to `web-app` and `api-service` while leaving the RBAC rules as `frontend/web-app` and `backend/*`.
- The token rotation example said to remove an old token by noting its `iat`, but the documented command deletes account tokens by token ID. I changed the wording to use the token ID and added `argocd account delete-token --account frontend-ci <token-id>`.

## Review Notes
- The local account configuration with `apiKey` and without `login` matches the official Argo CD local accounts documentation.
- The RBAC policy format and `applications, get/sync, <project>/<application>` object values match the official Argo CD RBAC documentation.
- The CLI flags `--account`, `--expires-in`, `--server`, `--auth-token`, `--grpc-web`, `--force`, `--timeout`, and `--health` are documented in the current Argo CD command references.
- The REST API examples use the documented `/api/v1/applications/{name}` and `/api/v1/applications/{name}/sync` application endpoints.
