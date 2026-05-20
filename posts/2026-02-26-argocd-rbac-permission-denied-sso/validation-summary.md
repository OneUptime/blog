# Validation Summary: How to Fix ArgoCD RBAC Permission Denied for SSO Users

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps
- Argo CD RBAC / Casbin policies
- OIDC and SAML single sign-on
- Microsoft Entra ID / Azure AD
- Okta, Google Workspace, Keycloak, and Auth0 identity provider claims

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD argocd-rbac-cm example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-rbac-cm-yaml/
- Argo CD Microsoft / Entra ID SSO documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/microsoft/
- Argo CD account get-user-info command reference: https://argo-cd.readthedocs.io/en/release-2.1/user-guide/commands/argocd_account_get-user-info/
- Argo CD admin settings rbac validate command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/
- Argo CD admin settings rbac can command reference: https://raw.githubusercontent.com/argoproj/argo-cd/master/docs/user-guide/commands/argocd_admin_settings_rbac_can.md
- Argo CD API documentation and swagger source for `/api/v1/session/userinfo`: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/ and https://github.com/argoproj/argo-cd
- Argo CD command parameters example for `server.log.level`: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Microsoft Entra ID access token claims reference: https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference
- Microsoft Entra ID group claims and app roles guidance: https://learn.microsoft.com/en-us/security/zero-trust/develop/configure-tokens-group-claims-app-roles

## Issues Found
- The RBAC flow implied that `policy.default` only applies when no policy matches. Updated the text to clarify that authenticated users receive the default role as a baseline and are denied only when neither matching policies nor the default role grants access.
- The `policy.default` comment said it applied only to users with no matching group. Updated it to "Baseline policy granted to authenticated users" to match Argo CD's documented behavior.
- The Microsoft Entra ID guidance suggested simply configuring Azure AD to send group names instead of IDs for OIDC. Updated it to recommend Object IDs for the documented Argo CD OIDC path and mention app roles or alternate claim sources only where appropriate.
- The custom claim guidance implied Argo CD OIDC settings can directly map Auth0 namespaced claims to standard claims. Updated it to say either include the exact readable claim in `scopes` or map it in Auth0.
- The debug log statement was too absolute. Updated it to say debug logs can help show RBAC subjects and policy rules, used together with user info output.
- The SSO caching note incorrectly tied login refreshes to RBAC policy changes. Updated it to apply to identity-provider group membership or token-claim changes, where old tokens can remain stale.

## Review Notes
The command examples and core RBAC ConfigMap structure match current Argo CD documentation. The local environment did not have the `argocd` CLI installed, so CLI validation was performed against official command references and upstream documentation rather than local `--help` output.
