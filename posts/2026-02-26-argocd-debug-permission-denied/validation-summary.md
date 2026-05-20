# Validation Summary: How to Debug 'permission denied' Errors in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- Kubernetes ConfigMaps
- OIDC / SSO token claims
- Argo CD CLI
- JWT inspection

## Sources Consulted
- Argo CD RBAC configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD user management and OIDC documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD command parameters ConfigMap example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/

## Issues Found
- The JWT payload decode command used plain `base64 -d`, which can fail for JWT payloads because JWTs use base64url encoding and may omit padding. Updated the command to use Python's `urlsafe_b64decode` with calculated padding.
- The OIDC example stated that the `groups` scope "must be present." Argo CD's default `requestedScopes` already include `groups` when the field is omitted, and some providers also require explicit ID-token claims or user-info lookup. Updated the wording to apply when `requestedScopes` is overridden and added a `requestedIDTokenClaims` example for groups.
- The local account fix only showed `accounts.ci-bot: apiKey`. Added `accounts.ci-bot.enabled: "true"` so the example covers the disabled-account case described by the section.

## Review Notes
The `argocd admin settings rbac can`, `argocd account get-user-info`, `argocd account generate-token --expires-in`, RBAC policy syntax, deny precedence, application object pattern format, `policy.default`, OIDC group-claim discussion, and `server.log.level` configuration were checked against current official Argo CD documentation and are technically sound after the edits above.
