# Validation Summary: How to Use argocd account Commands for User Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Kubernetes ConfigMaps
- Argo CD RBAC
- Bash scripting
- GitHub Actions

## Sources Consulted
- Argo CD user management documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/user-management/
- Argo CD `argocd account get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_get/
- Argo CD `argocd account list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_list/
- Argo CD `argocd account update-password` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_update-password/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD `argocd account delete-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_delete-token/
- Argo CD `argocd account can-i` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_can-i/
- Argo CD RBAC configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD CI automation documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/ci_automation/

## Issues Found
- The introduction implied that `argocd account` creates local accounts. Argo CD local accounts are defined in the `argocd-cm` ConfigMap, while the CLI manages passwords, tokens, and account details. Updated the wording to avoid implying CLI-based account creation.
- The `argocd account get` examples used positional account names. The documented syntax uses `--account <account-name>`. Updated the examples and audit script.
- The initial password note said the current admin password is always requested. The CLI asks for the currently logged-in user's password, which is often but not necessarily admin. Updated the note.
- The GitHub Actions example mixed token authentication with `argocd login`. Argo CD's CI documentation uses `ARGOCD_SERVER` and `ARGOCD_AUTH_TOKEN` directly for CLI commands. Updated the example to set both environment variables and run `argocd app sync`.
- The token rotation script said old tokens remain valid until they expire. Non-expiring tokens remain valid until deleted, and Argo CD provides `argocd account delete-token` for revocation. Updated the message.
- The `can-i` example for a specific application used only `my-app`. Argo CD RBAC application objects are normally project/application, so the example now uses `default/my-app`.

## Review Notes
The local environment did not have the `argocd` CLI installed, so validation was performed against official Argo CD documentation and command references. The RBAC examples are valid for the standard project/application object format; installations with "applications in any namespace" enabled use project/namespace/application object values.
