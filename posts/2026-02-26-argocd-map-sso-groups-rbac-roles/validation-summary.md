# Validation Summary: How to Map SSO Groups to RBAC Roles in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps
- Argo CD RBAC / Casbin policy syntax
- OpenID Connect (OIDC)
- Okta
- Microsoft Entra ID / Azure AD
- Keycloak

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD User Management and OIDC Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD CLI command reference for `argocd admin settings rbac can`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD CLI command reference for `argocd account get-user-info`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account/
- Okta Developer documentation for OIDC groups claims: https://developer.okta.com/docs/guides/customize-tokens-groups-claim/main/
- Microsoft Learn documentation for group claims and app roles in tokens: https://learn.microsoft.com/en-us/security/zero-trust/develop/configure-tokens-group-claims-app-roles
- Keycloak GroupMembershipMapper API documentation: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/protocol/oidc/mappers/GroupMembershipMapper.html

## Issues Found
- The post implied group membership changes apply immediately when a user is added to an IdP group. Argo CD refreshes group information at authentication time, so I changed the wording to say access applies after the next login or reauthentication.
- The Okta section only covered ID-token groups. Argo CD documentation notes that some providers, including Okta in some configurations, provide groups via the UserInfo endpoint instead, so I added a short note about `enableUserInfoGroups: true`.
- The "Project-Scoped Group Mappings" section used global RBAC roles constrained by `<project>/<application>` object patterns, not AppProject-scoped roles. I renamed the section and wording to "Project-Limited Group Mappings" to accurately describe the example without restructuring it.

## Review Notes
The RBAC policy syntax, `scopes: '[groups]'` configuration, built-in `role:admin` and `role:readonly` mappings, Azure AD group object ID guidance, Keycloak group membership mapper guidance, and `argocd admin settings rbac can` examples are consistent with the official documentation. Microsoft Entra ID has group overage behavior for users in many groups; the post already covers token size limits and recommends app roles as an alternative.
