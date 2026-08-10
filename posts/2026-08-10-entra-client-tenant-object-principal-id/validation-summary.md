# Validation Summary: Which Entra ID Should an API Use: Client, Tenant, Object, or Principal?

## Status

validated

## Post Type

Technical reference and troubleshooting guide

## Technologies Covered

- Microsoft Entra ID
- Microsoft identity platform and OAuth 2.0 client credentials flow
- Microsoft Graph REST API
- Managed identities for Azure resources
- Azure role-based access control (Azure RBAC)
- Azure Resource Manager resource IDs and scopes
- Azure CLI

## Sources Consulted

- [Application and service principal objects in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals)
- [Microsoft identity platform glossary](https://learn.microsoft.com/en-us/entra/identity-platform/developer-glossary)
- [OAuth 2.0 client credentials flow on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Configure a daemon app that calls web APIs](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-daemon-app-configuration)
- [Access tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [ID token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference)
- [Get application - Microsoft Graph v1.0](https://learn.microsoft.com/en-us/graph/api/application-get?view=graph-rest-1.0)
- [Get servicePrincipal - Microsoft Graph v1.0](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-get?view=graph-rest-1.0)
- [List servicePrincipals - Microsoft Graph v1.0](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list?view=graph-rest-1.0)
- [Connecting from your application to resources without handling credentials](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview-for-developers)
- [Understand Azure role assignments](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments)
- [Understand scope for Azure RBAC](https://learn.microsoft.com/en-us/azure/role-based-access-control/scope-overview)
- [Assign Azure roles using Azure CLI](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli)
- [Azure CLI `az role assignment` reference](https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest)
- [Azure CLI `az account` reference](https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest)
- [Associate or add an Azure subscription to a Microsoft Entra tenant](https://learn.microsoft.com/en-us/entra/fundamentals/how-subscriptions-associated-directory)
- [What are Azure management groups?](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
- [RFC 6749: The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html)
- Local Azure CLI 2.71.0 help for `az role assignment create` and `az account show`

## Issues Found

- The introduction said a client ID always identifies an application definition. Managed-identity service principals have a client ID but no associated application object. The introduction and mapping table now distinguish app registrations from user-assigned managed identities.
- The mapping table said a client ID is used for “finding every tenant instance” of an app, which could imply a single Graph query can enumerate service principals across customer tenants. Graph list operations are tenant-scoped, so the table now describes finding the app's service-principal instance in a tenant.
- The client-credentials request displayed a form-encoded body with literal line breaks between parameters. It is now a single `application/x-www-form-urlencoded` line so the example is valid as shown.
- The `tid` explanation could encourage a client to inspect an access token issued for Microsoft Graph. It now separates ID-token consumption by the client from access-token validation by the intended API and explicitly says client applications must treat access tokens as opaque.
- The Graph section broadly implied that Graph URLs require Object IDs. The `application` and `servicePrincipal` get APIs also support `appId` alternate keys, so the Object ID statement is now limited to `{id}` paths and the client-ID examples use the documented alternate-key syntax.
- The Azure RBAC failure wording said a wrong identifier could assign the role to the wrong identity. Passing a client ID or application-object ID as `--assignee-object-id` instead commonly produces `PrincipalNotFound` or an unresolved principal reference; the text now states those documented outcomes.
- The post described a tenant as owning an Azure role assignment. Azure role assignments are ARM resources at an Azure scope, so the troubleshooting text now directs readers to the Entra tenant associated with that scope and clarifies the subscription relationship for subscription, resource-group, and resource scopes.

## Review Notes

The remaining identifier mappings, cross-tenant example, Microsoft Graph filters, managed-identity guidance, Azure resource ID examples, and Azure CLI commands are current and technically correct. The post does not pin product versions, and no reviewed API or CLI option is deprecated. All five links in the post's Official Documentation section resolved to the intended Microsoft Learn resources during validation.
