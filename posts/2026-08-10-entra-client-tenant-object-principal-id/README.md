# Client ID, Tenant ID, Object ID, and Principal ID in Entra ID: Which One Does Each API Need?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, Client ID, Tenant ID, Object ID, Principal ID, Service Principals, Azure RBAC

Description: Choose the correct Entra identifier for token requests, Microsoft Graph lookups, managed identities, and Azure role assignments without swapping unrelated GUIDs.

---

Microsoft Entra ID and Azure expose several GUIDs for the same application or managed identity. They are not interchangeable. For an app registration, a client ID identifies the application definition; for a user-assigned managed identity, it identifies the identity used for token acquisition. A tenant ID identifies a directory, and an Object ID identifies one object inside one directory. “Principal ID” normally means the Object ID of the security principal that receives access.

Use this short mapping first:

| Identifier | Meaning | Typical use |
| --- | --- | --- |
| Application (client) ID | An app registration's global `appId`; for a user-assigned managed identity, the `clientId` used to select it | OAuth `client_id`; finding an app's service-principal instance in a tenant; selecting a user-assigned managed identity |
| Directory (tenant) ID | The directory's object identifier | Selecting a tenant-specific authority or recording token tenant |
| Object ID | The `id` of one directory object | Microsoft Graph object operations |
| Principal ID | Usually the Object ID of a user, group, service principal, or managed identity service principal | Azure RBAC and access-policy assignments |
| Azure resource ID | An ARM path such as `/subscriptions/...` or `/providers/Microsoft.Management/managementGroups/...` | Azure Resource Manager operations, not Entra object lookup |

The API documentation wins if it defines a parameter differently, but this table is the right default.

## Application or Client ID

When you register an application, Microsoft Entra assigns it an **Application (client) ID**. Microsoft Graph calls this property `appId`. It identifies the application across tenants.

For OAuth, it is normally sent as `client_id`:

```http
POST https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id=00001111-aaaa-2222-bbbb-3333cccc4444&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default&client_secret=<encoded-secret-value>&grant_type=client_credentials
```

A multitenant application's service principals in the publisher and customer tenants share this `appId`. It is therefore a useful join key, but it is not the identifier Azure RBAC uses to assign a role to a particular tenant-local principal.

For a user-assigned managed identity, the client ID is also commonly used by SDKs or token endpoints to select one identity when a resource has several identities attached.

## Directory or Tenant ID

The **Directory (tenant) ID** identifies a Microsoft Entra tenant. It selects the authority at which authentication occurs:

```text
https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token
```

It is not:

- an Azure subscription ID;
- an application ID;
- the Object ID of the application;
- the tenant's verified domain name, although some endpoints accept a verified domain as a tenant selector.

Use a tenant-specific authority for noninteractive workloads unless the flow explicitly requires a tenant-independent endpoint. In an ID token issued to your app, or in an access token being validated by its intended API, the `tid` claim identifies the tenant in which the subject was authenticated. Client applications should treat access tokens as opaque, including tokens for Microsoft Graph. An API still needs to validate the issuer and audience; checking `tid` alone is not token validation.

You can confirm the Azure CLI's active tenant with:

```bash
az account show --query tenantId -o tsv
```

Always check this before concluding that an application is missing. Many “wrong client ID” investigations are actually queries against the wrong tenant.

## Object ID

Every directory object has an **Object ID**, represented as `id` in Microsoft Graph. The important detail is that each object has its own ID.

Registering an application through the portal normally creates:

1. an application object with Object ID `APP-OBJECT-ID`; and
2. a service principal with Object ID `SERVICE-PRINCIPAL-ID`.

Those GUIDs differ even in the same tenant. In a customer tenant, the service principal has yet another Object ID while retaining the same Application ID.

That means “the Object ID for this app” is incomplete. Ask:

- the application object's ID?
- the service principal's ID in which tenant?
- an app-role assignment's ID?
- a managed identity service principal's ID?

Microsoft Graph paths of the form `/applications/{id}` and `/servicePrincipals/{id}` use the Object ID of the resource being addressed:

```http
GET https://graph.microsoft.com/v1.0/applications/<application-object-id>
GET https://graph.microsoft.com/v1.0/servicePrincipals/<service-principal-object-id>
```

If you only know the client ID, the same get APIs also support the `appId` alternate key:

```http
GET https://graph.microsoft.com/v1.0/applications(appId='00001111-aaaa-2222-bbbb-3333cccc4444')
GET https://graph.microsoft.com/v1.0/servicePrincipals(appId='00001111-aaaa-2222-bbbb-3333cccc4444')
```

## Principal ID

A **principal** is an identity to which access can be granted: a user, group, service principal, or managed identity. In Azure resource responses and infrastructure tools, `principalId` generally contains that principal's Microsoft Entra Object ID.

For a user-assigned managed identity, Microsoft documents the practical split:

- use `clientId` in application code to select or request a token for the identity;
- use `principalId` when granting the identity permission.

An Azure RBAC role assignment therefore needs the service principal Object ID:

```bash
az role assignment create \
  --assignee-object-id <principal-id> \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Reader" \
  --scope <azure-resource-id>
```

The `--scope` value is an Azure resource ID. The `--assignee-object-id` value is an Entra principal/Object ID. Supplying the client ID or application-object ID in the latter position can cause `PrincipalNotFound` or leave the role assignment referring to an unresolved principal.

Some tools accept a client ID and perform a lookup for convenience. That does not change what the underlying role assignment stores. For deterministic automation, resolve and pass the expected principal Object ID, specify the principal type where supported, and verify the tenant.

## A Cross-Tenant Example

Assume a SaaS application is registered in the publisher tenant and consented to in a customer tenant:

| Value | Publisher tenant | Customer tenant |
| --- | --- | --- |
| Tenant ID | `TENANT-PUBLISHER` | `TENANT-CUSTOMER` |
| Application client ID | `CLIENT-A` | `CLIENT-A` |
| Application-object ID | `APP-OBJECT-P` | No application object |
| Service-principal Object/Principal ID | `SP-P` | `SP-C` |

To send the customer through authentication, the app uses `CLIENT-A` and an authority allowed by its supported account model. To manage the customer's enterprise application through Graph, the customer admin uses `SP-C`. To grant that customer service principal Azure RBAC in a customer subscription, the assignment uses `SP-C`, not `SP-P` and not `APP-OBJECT-P`.

## How to Identify What an API Expects

Read the parameter name and its resource type, not just the UI label:

- OAuth `client_id` means Application ID.
- A Graph path such as `/servicePrincipals/{id}` means that service principal's Object ID.
- A Graph filter `appId eq ...` means Application ID.
- Azure RBAC `principalId` or `assignee-object-id` means the principal's Object ID.
- Managed identity SDK option `clientId` selects a user-assigned identity by client ID.
- An ARM `resourceId` means the full Azure resource path.
- An authority `{tenant}` means a tenant ID, verified domain, or a documented tenant-independent alias.

If a product says only “application ID,” check its example. Some older documentation casually uses application, client, and principal terminology. The wire-level field or Graph schema is more precise.

## A Safe Troubleshooting Workflow

1. Record the active tenant ID.
2. Record the client ID from the actual runtime configuration, not a screenshot.
3. Query the application object by `appId` in the expected home tenant.
4. Query the service principal by `appId` in the tenant where access is being granted.
5. Record both returned Object IDs with explicit names such as `applicationObjectId` and `servicePrincipalObjectId`.
6. Read the target API's schema to determine which one it accepts.
7. For Azure access, confirm the role-assignment scope is the intended Azure resource ID.

Avoid variables simply named `id`. Precise variable names prevent a correct GUID from reaching the wrong API.

## Common Mix-Ups

### Client ID used as a Graph object path

`/servicePrincipals/{id}` expects an Object ID. If all you have is the client ID, filter on `appId`.

### Application Object ID used for Azure RBAC

The application object is a definition, not the runtime principal receiving the role. Use the service principal Object ID.

### Principal ID copied from the wrong tenant

Service-principal Object IDs are tenant-local. For Azure RBAC, resolve the principal in the Entra tenant associated with the assignment's scope; for subscription, resource-group, and resource scopes, this is the tenant trusted by the subscription. For a directory permission, resolve it in that directory.

### Tenant ID confused with subscription ID

A subscription is an Azure billing/resource container and trusts one Entra tenant at a time. Its GUID is not the directory GUID.

### Managed identity client ID used for permission assignment

Use the managed identity's Principal ID for Azure RBAC. Use its client ID when selecting it for authentication.

## Official Documentation

- [Application and service principal objects in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals)
- [Microsoft identity platform glossary](https://learn.microsoft.com/en-us/entra/identity-platform/developer-glossary)
- [Connecting from your application to resources without handling credentials](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview-for-developers)
- [Understand Azure role assignments](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments)
- [Securing service principals in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/architecture/service-accounts-principal)

## Conclusion

Use the client ID to identify an application in OAuth, the tenant ID to select a directory, an Object ID to address one Graph object, and the principal ID to grant access to the tenant-local security principal. When an application and service principal both exist, label and preserve both Object IDs. That small discipline prevents most identifier-related Entra and Azure RBAC failures.
