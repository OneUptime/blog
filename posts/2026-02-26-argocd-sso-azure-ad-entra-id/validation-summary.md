# Validation Summary: How to Configure SSO with Azure AD (Entra ID) in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Microsoft Entra ID / Azure AD
- OpenID Connect (OIDC)
- Dex
- Kubernetes ConfigMaps and Secrets
- Argo CD RBAC
- Argo CD CLI

## Sources Consulted
- Argo CD Microsoft SSO documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/microsoft/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD OIDC user management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD CLI login command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD CLI get-user-info command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_get-user-info/
- Dex Microsoft connector documentation: https://dexidp.io/docs/connectors/microsoft/
- Microsoft Entra group claims and app roles documentation: https://learn.microsoft.com/en-us/security/zero-trust/develop/configure-tokens-group-claims-app-roles
- Microsoft Entra token customization documentation: https://learn.microsoft.com/en-us/entra/architecture/customize-tokens
- Microsoft Entra group claims configuration documentation: https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims

## Issues Found
- The app registration steps omitted the additional redirect URI required for Argo CD CLI SSO. Added the `http://localhost:8085/auth/callback` mobile/desktop redirect URI, matching the official Argo CD Microsoft SSO documentation and CLI default SSO callback port.
- The group-name option described "Display Name" too generally. Updated the wording to distinguish `sAMAccountName` for Active Directory-synchronized groups from cloud-only group display names for cloud-only groups.
- The Dex Microsoft connector example used `useGroupDisplayName: true`, which is not a documented Dex Microsoft connector option. Replaced it with the current Dex behavior: group names are returned by default, and `groupNameFormat: id` is used when group IDs are desired.

## Review Notes
The direct OIDC Argo CD configuration, RBAC mapping syntax, `kubectl rollout restart`, `argocd login --sso`, and `argocd account get-user-info` examples align with current official documentation. Microsoft Entra group overage behavior remains version- and flow-dependent, but the guide correctly notes the 200-group JWT limit and the need to reduce emitted groups or use Microsoft Graph-backed resolution.
