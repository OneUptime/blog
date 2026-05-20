# Validation Summary: How to Integrate ArgoCD with Dex OIDC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Dex
- OpenID Connect (OIDC)
- Kubernetes ConfigMaps and Secrets
- Keycloak
- Google Workspace
- GitHub OAuth connector
- Argo CD RBAC

## Sources Consulted
- Argo CD User Management and SSO documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD command parameters ConfigMap documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cmd-params-cm-yaml/
- Dex OIDC connector documentation: https://dexidp.io/docs/connectors/oidc/
- Dex Google connector documentation: https://dexidp.io/docs/connectors/google/
- Dex GitHub connector documentation: https://dexidp.io/docs/connectors/github/
- Dex token expiry documentation: https://dexidp.io/docs/configuration/tokens/
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- Dex OIDC connector examples used unsupported top-level `emailKey` and `groupsKey` fields. Updated the examples to use current Dex behavior: `userIDKey` and `userNameKey` remain top-level fields, while non-standard email and group claim names are configured through `claimMapping`.
- The Google Workspace section implied the generic OIDC connector could handle Workspace group membership and domain filtering. Updated the text and generic OIDC example to clarify that these are handled by Dex's dedicated Google connector.
- The Google connector example used `adminEmail`. Updated it to `domainToAdminEmail`, which is the current documented configuration for mapping Workspace domains to the delegated admin user.
- The Keycloak setup used the older "Access Type" wording and mentioned "Include Client Roles" for a groups-based example. Updated it to current Keycloak client authentication wording and clarified that the group membership mapper should be included in the ID token.
- The troubleshooting checklist referred to `groupsKey`. Updated it to refer to `claimMapping.groups` for non-standard group claim names.

## Review Notes
Argo CD's documentation notes that Argo CD can automatically set connector redirect URIs for Dex OAuth2 connectors, so the repeated `redirectURI` values are not strictly required in Argo CD-managed Dex configuration. They are still consistent with Dex connector configuration and were left unchanged because they are useful for showing the IdP callback URL to register.
