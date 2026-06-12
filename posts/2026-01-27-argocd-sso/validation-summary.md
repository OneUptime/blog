# Validation Summary: How to Configure ArgoCD SSO

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD SSO
- OpenID Connect (OIDC)
- SAML 2.0
- Dex identity connectors
- Kubernetes ConfigMaps and Secrets
- Argo CD RBAC
- Okta
- Microsoft Entra ID / Azure AD
- Google Workspace
- GitHub OAuth through Dex
- LDAP / Active Directory

## Sources Consulted
- Argo CD User Management / SSO documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Microsoft / Entra ID SSO documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/microsoft/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd admin settings rbac validate` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/
- Argo CD `argocd account get-user-info` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_get-user-info/
- Dex SAML connector documentation: https://dexidp.io/docs/connectors/saml/
- Dex GitHub connector documentation: https://dexidp.io/docs/connectors/github/
- Dex LDAP connector documentation: https://dexidp.io/docs/connectors/ldap/

## Issues Found
- The Google Workspace setup implied that enabling the Admin SDK API would make groups available in direct Google OIDC. Updated the instruction to say Dex with the Google connector is needed when Google Workspace group claims are required.
- The SAML section did not mention Dex's current SAML connector status. Added the official caveat that the connector is unmaintained and under consideration for deprecation, with OIDC or LDAP preferred where available.
- The Azure AD SAML example described `ssoURL` as a federation metadata URL and used claim URI names that do not match Argo CD's documented Entra ID SAML example. Updated it to use the Login URL as `ssoURL` and the configured `email` and `Group` claim names.
- The RBAC testing command used `applications` as the `argocd admin settings rbac can` resource argument. Updated it to the documented `application` command syntax.

## Review Notes
The remaining examples are version-neutral and align with current Argo CD and Dex documentation. I could not run a local YAML parser because `ruby` is not installed in the environment, but the reviewed snippets were checked manually against official configuration examples.
