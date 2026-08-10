# Why an Entra App Registration Does Not Appear Under Enterprise Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, App Registration, Enterprise Application, Service Principal, Microsoft Graph, Troubleshooting

Description: Trace an Entra app registration to its tenant-local service principal, fix portal and tenant mismatches, and safely create a missing enterprise application.

---

Microsoft Entra ID shows two related objects in two different portal experiences:

- **App registrations** shows application objects, normally in the application's home tenant.
- **Enterprise applications** shows service principal objects that exist locally in the tenant you are viewing.

An application object is the definition of an app. A service principal is that app's usable identity and policy boundary in one tenant. The same multitenant application can therefore have one application object in its publisher's home tenant and many service principals, one in each customer tenant where the app is used.

When an app registered through the Microsoft Entra admin center appears in App registrations but not Enterprise applications, do not create another app registration immediately. First identify the tenant, client ID, application object ID, and service principal object ID. Most cases are a directory or filter mismatch; some automation-created applications genuinely lack the separate service principal.

## Know Which Object You Are Looking For

| Portal experience | Microsoft Graph object | Identifier to compare | What it controls |
| --- | --- | --- | --- |
| App registrations | `application` | Application (client) ID, plus application object ID | Redirect URIs, credentials, exposed scopes, app roles, supported account types |
| Enterprise applications | `servicePrincipal` | Same application/client ID, but a different service principal object ID | Tenant-local consent, assignments, Conditional Access targeting, provisioning, sign-in settings |

The application/client ID is the join key. Object IDs are not interchangeable:

- the application object has an object ID in its home tenant;
- every service principal has its own object ID in the tenant where it exists; and
- an Azure role assignment expects the principal ID, which is the service principal's object ID, not the client ID.

Filtering Enterprise applications with an application **object ID** from App registrations often returns nothing even when the service principal exists. Filter with the application/client ID or follow **Managed application in local directory** from the app registration overview.

## What Normal Creation Does

Registering an application in the Microsoft Entra admin center automatically creates both an application object and a service principal in the home tenant. The local service principal should be reachable from the registration's overview.

Microsoft Graph behaves differently. A call that creates an `application` object does not also create its `servicePrincipal`. Infrastructure code that uses Graph directly must perform the second operation explicitly. This difference commonly appears when a portal-created test app works but a Terraform, PowerShell, SDK, or custom provisioning path produces only the registration.

For a multitenant application, the app registration remains in the publisher's home tenant. A customer tenant gets an Enterprise application when an authorized user or administrator consents, or when an administrator deliberately creates the service principal. The customer should not expect the publisher's App registrations entry to appear in their tenant.

Since March 2026, Microsoft Entra no longer supports authentication by non-Microsoft multitenant applications that lack a service principal in the tenant where they authenticate. Treat a missing tenant-local service principal as a configuration defect, not as a supported “service-principal-less” operating mode.

## Diagnose the Mismatch in Order

### 1. Confirm the Active Tenant

Record the tenant ID shown on the app registration overview. Then use the directory switcher and confirm that Enterprise applications is open in that exact tenant.

Azure subscriptions do not determine where Entra application objects live. Changing a subscription filter does not move or reveal an app in another directory. If you administer several tenants with similar names, compare tenant GUIDs rather than relying on the display name.

For a multitenant app, decide which view you intend:

- in the **home tenant**, find both the application object and its home service principal;
- in a **consumer tenant**, find only that tenant's service principal after consent or explicit provisioning.

### 2. Remove Enterprise Applications Filters

The Enterprise applications list can retain filters such as **Application Type**, **Application Status**, **Application Visibility**, **Created on**, **Assignment required**, or **Owner**. Set **Application Type** to **All Applications**, clear the other filters, and use **Application ID starts with** to filter by the application/client ID. Display names are mutable and need not be unique.

Also check that you are not filtering only for Microsoft applications or managed identities. A normal app registration is represented by an application-type service principal.

### 3. Compare Both Objects Through Microsoft Graph

The following Microsoft Graph PowerShell commands use the client ID as the stable join key:

```powershell
$clientId = "00000000-0000-0000-0000-000000000000"

Get-MgApplication -Filter "appId eq '$clientId'" |
  Select-Object Id, AppId, DisplayName, SignInAudience

Get-MgServicePrincipal -Filter "appId eq '$clientId'" |
  Select-Object Id, AppId, DisplayName, ServicePrincipalType, AccountEnabled
```

Run them while connected to the intended tenant. Interpret the result:

| Application result | Service principal result | Meaning |
| --- | --- | --- |
| Found | Found | The objects exist; fix the portal tenant, filter, search value, or permissions |
| Found | Missing | Graph-created app, deleted service principal, or incomplete home-tenant provisioning |
| Missing | Found | Consumer-tenant multitenant app, managed identity, legacy service principal, or wrong home tenant |
| Missing | Missing | Wrong tenant/client ID, both objects deleted, or the app was never provisioned there |

Azure CLI can perform the same service-principal check:

```bash
az ad sp show --id 00000000-0000-0000-0000-000000000000
```

Verify Azure CLI's active tenant with `az account show --query tenantId -o tsv`. Changing to a subscription in another tenant also changes the active tenant; if necessary, sign in to the target tenant with `az login --tenant <tenant-id>`.

### 4. Check Deletion and Restoration History

Deleting an application object also soft-deletes its home-tenant service principal. The restoration path matters. Microsoft's current portal recovery guidance says that restoring the deleted app registration in the Microsoft Entra admin center also restores its corresponding soft-deleted service principal. By contrast, restoring only the application object through Microsoft Graph's deleted-items API or the `Restore-EntraDeletedApplication` cmdlet does not restore the service principal; restore that deleted object separately.

Soft-deleted application objects and application-type service principals remain restorable for up to 30 days. After any recovery, query both active objects explicitly. Service-principal policies, including Conditional Access policies, are not restored and must be configured again. An incomplete API or PowerShell recovery can therefore leave the registration visible while **Managed application in local directory** is absent.

Review Entra audit logs for application and service-principal deletion or restoration events. If a service principal was intentionally deleted in a consumer tenant, investigate why before recreating it; deletion may have been an access-revocation action.

### 5. Distinguish Special Service Principal Types

Not every Enterprise application has an App registrations counterpart:

- a managed identity has a service principal but no associated application object that you manage;
- some legacy service principals do not have a modern app registration; and
- Microsoft first-party applications are owned outside your tenant.

This reverse case is normal. It does not explain a portal-created home-tenant app registration with no service principal, but it prevents the incorrect assumption that the two lists must contain identical rows.

## Create a Missing Service Principal Safely

Only create the service principal after confirming all of the following:

1. the client ID identifies the intended application;
2. the app supports use in this tenant;
3. no active service principal exists under that client ID and no soft-deleted service principal should be restored;
4. you understand whether consent and app assignments are also required; and
5. the deletion was not an intentional security response.

Check the deleted-items container before creating a replacement:

```http
GET https://graph.microsoft.com/v1.0/directory/deletedItems/microsoft.graph.servicePrincipal?$filter=appId eq '00000000-0000-0000-0000-000000000000'
```

If the intended service principal is still within its recovery window, restore it by its service-principal object ID instead of creating another object:

```http
POST https://graph.microsoft.com/v1.0/directory/deletedItems/{service-principal-object-id}/restore
```

For an application object already present in the current tenant, Azure CLI can create the missing local principal:

```bash
az ad sp create --id 00000000-0000-0000-0000-000000000000
```

The equivalent Microsoft Graph request supplies the application/client ID:

```http
POST https://graph.microsoft.com/v1.0/servicePrincipals
Content-Type: application/json

{
  "appId": "00000000-0000-0000-0000-000000000000"
}
```

This creates an identity, not authorization. It does not automatically grant API permissions, assign users or groups, create Azure RBAC roles, configure SSO, or satisfy Conditional Access. Apply those controls separately and with least privilege.

For a third-party multitenant application, prefer the publisher's documented admin-consent or onboarding flow. Consent both creates or locates the tenant-local service principal and records the approved permissions. Manually creating a service principal does not manufacture valid consent.

## Avoid the Common “Fixes” That Make It Worse

- **Do not create a second app registration with the same display name.** It gets a new client ID and splits credentials, redirect URIs, consent, and assignments across unrelated objects.
- **Do not paste the application object ID into a principal-ID field.** Retrieve the service principal's `id` for tenant-local role assignments.
- **Do not add a client secret to solve list visibility.** Credentials authenticate an existing application identity; they do not create a missing service principal.
- **Do not grant broad admin consent just to make a row appear.** First prove which object is absent.
- **Do not assume every restoration path recovered both objects or their policies.** Verify the active application and service principal explicitly, then recreate any policies that recovery did not preserve.

## A Repeatable Provisioning Check

Make app provisioning idempotent:

1. create or locate the application object;
2. capture its `appId`;
3. query the target tenant for a service principal with that `appId`;
4. restore a matching soft-deleted service principal, or create one only when no restorable object exists;
5. wait for directory replication before applying assignments;
6. apply consent, app roles, owners, and Azure RBAC deliberately; and
7. record both object IDs and the tenant ID in deployment output.

This prevents display-name collisions and makes later troubleshooting deterministic.

## Official Documentation

- [Microsoft identity platform: Application and service principal objects](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals)
- [Microsoft identity platform: How and why applications are added](https://learn.microsoft.com/en-us/entra/identity-platform/how-applications-are-added)
- [Microsoft Graph: Create servicePrincipal](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-post-serviceprincipals)
- [Microsoft Entra ID: Restore a soft-deleted enterprise application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/restore-application)
- [Microsoft Graph: Restore a deleted directory object](https://learn.microsoft.com/en-us/graph/api/directory-deleteditems-restore)
- [Azure CLI: `az ad sp`](https://learn.microsoft.com/en-us/cli/azure/ad/sp)
- [Microsoft identity platform: Retirement of service-principal-less authentication](https://learn.microsoft.com/en-us/entra/identity-platform/retire-service-principal-less-authentication)

## Conclusion

App registrations and Enterprise applications are not duplicate portal lists. They expose the application definition and a tenant-local service principal. Start with the tenant ID and client ID, clear portal filters, and query both Graph object types. If the application exists but its service principal does not, restore the deleted local principal when possible or create it only when necessary, then apply the required consent, assignments, and policies explicitly.
