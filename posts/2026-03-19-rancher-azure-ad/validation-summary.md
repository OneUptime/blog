# Validation Summary: How to Configure Azure AD Authentication in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Microsoft Entra ID (Azure AD)
- Microsoft Graph
- Azure CLI
- Single sign-on (SSO)
- Role-based access control (RBAC)

## Sources Consulted
- Rancher documentation: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-azure-ad
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- Azure CLI `az ad app permission` reference: https://learn.microsoft.com/en-us/cli/azure/ad/app/permission?view=azure-cli-latest
- Azure CLI `az ad app credential` reference: https://learn.microsoft.com/en-us/cli/azure/ad/app/credential?view=azure-cli-latest
- Configure group claims and app roles in tokens: https://learn.microsoft.com/en-us/security/zero-trust/develop/configure-tokens-group-claims-app-roles
- Configure group claims for applications by using Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims
- Microsoft Entra built-in roles: https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference
- Register a Microsoft Entra app and create a service principal: https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal

## Issues Found
- The prerequisites claimed the guide applied to Rancher `v2.6 or later`. Rancher's Microsoft Graph-based Azure AD setup is documented for `v2.7+`, so the minimum version was corrected to `v2.7`.
- The API permissions section incorrectly told readers to add delegated Microsoft Graph permissions (`openid`, `profile`, and `User.Read`) alongside application permissions. Rancher documents application permissions, not delegated permissions, for Azure AD authentication. The section was corrected to use `Directory.Read.All`, and the Azure CLI example was updated to match.
- The Rancher configuration step told readers to populate `Graph Endpoint`, `Token Endpoint`, and `Auth Endpoint` for standard setups and included an unsupported government-cloud example. The post was corrected so standard setups use the standard endpoint field, while custom endpoint fields are only shown for Rancher custom-endpoint configurations.
- The group claims section combined mutually exclusive token-configuration options and enabled `Emit groups as role claims` by default. It was corrected to use `Security groups` with `Group ID` for typical Rancher group-based access, while keeping `Groups assigned to the application` as the large-tenant option.
- The secret-rotation section used an unverified Rancher API `curl` example. It was replaced with the supported UI workflow for updating the application secret in Rancher, and the Azure CLI credential-list example was simplified to a current command.

## Review Notes
- Rancher also documents an extra Microsoft Entra setting for Rancher CLI use: enable `Allow public client flows` if you want Azure AD login to work with the Rancher CLI.
- Rancher officially documents Standard and China endpoint options. Custom endpoints require manual values and are not fully supported.
- Rancher documents narrower Microsoft Graph application-permission combinations such as `User.Read.All` + `Group.Read.All` or `User.Read.All` + `GroupMember.Read.All`, but `Directory.Read.All` remains an officially documented single-permission option for this integration.
