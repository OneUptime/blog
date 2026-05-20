# Validation Summary: How to Map OIDC Groups to ArgoCD Roles

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- OpenID Connect (OIDC)
- Role-based access control (RBAC)
- Casbin policy syntax
- Kubernetes ConfigMaps
- Argo CD CLI

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd account get-user-info` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_get-user-info/

## Issues Found
- The post stated that `scopes: '[groups]'` is required for Argo CD to know where groups are. Current Argo CD documentation says omitted `scopes` defaults to checking `groups` in addition to the token subject. Updated the section to explain that `scopes` should be configured explicitly when using a non-default claim or matching additional claims such as `email`.
- The RBAC resource/action reference omitted the current `extensions` resource. Added `extensions` with the `invoke` action and `<extension-name>` object format.
- The subject description was too broad about email matching. Updated it to clarify that `g` rule subjects can match local users, SSO users, or values from configured OIDC scopes such as groups or email.

## Review Notes
The examples are generally accurate for the current Argo CD RBAC model. The object format for application-specific resources remains `project/application` unless Argo CD's "applications in any namespace" feature is enabled, in which case current documentation uses `project/namespace/application`.
