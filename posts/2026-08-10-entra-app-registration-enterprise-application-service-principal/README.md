# Entra App Registration vs Enterprise Application vs Service Principal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, App Registration, Enterprise Applications, Service Principal, OAuth 2.0, Identity

Description: Understand the application object and service principal model behind App registrations and Enterprise applications, including which settings belong in each portal view.

---

Microsoft Entra ID usually represents one piece of software with two directory objects. The **application object** is the definition created in the application's home tenant. A **service principal** is that application's tenant-local instance. The Entra admin center exposes those objects through **App registrations** and **Enterprise applications**, respectively.

That model explains most portal confusion:

| Term | What it really is | Where you usually manage it |
| --- | --- | --- |
| App registration | The act of creating an application identity configuration, and the portal experience for application objects | Entra ID > App registrations |
| Application object | The application's home-tenant definition or blueprint | App registrations |
| Service principal | A security principal representing an application in one tenant | Enterprise applications |
| Enterprise application | The portal experience used to manage service principals in the current tenant | Entra ID > Enterprise applications |

An enterprise application is therefore not simply a more expensive or production version of an app registration. It is the tenant-local representation used for sign-in, consent, assignment, and access policy.

## The Application Object Is the Definition

Registering an application establishes a trust configuration with Microsoft Entra ID. The application object describes properties such as:

- supported account types;
- redirect URIs;
- credentials owned by the confidential client;
- APIs and the delegated or application permissions the client requests;
- scopes and app roles exposed when the application is an API;
- branding and other protocol settings.

The application object has an **Application (client) ID**, exposed as `appId` by Microsoft Graph. That ID identifies the software across tenants. It also has an **Object ID**, exposed as `id`, that identifies this particular directory object in its home tenant.

There is normally one application object for a piece of software, and it lives only in the tenant where the app was registered. A multitenant application does not copy its application object into every customer tenant.

## The Service Principal Is the Tenant-Local Instance

A tenant needs a security principal before it can apply access policy to an application. The service principal fills that role. It carries its own tenant-local Object ID and references the application object's client ID through `appId`.

The service principal is where administrators normally manage:

- whether users can sign in;
- whether user assignment is required;
- users, groups, and app-role assignments;
- tenant-wide and user-specific permission grants;
- tenant-specific SSO and provisioning configuration;
- Conditional Access targeting supported workload identities;
- sign-in activity and other local governance settings.

The same multitenant SaaS application can therefore have one application object in the publisher tenant and hundreds of service principals, one in each customer tenant that uses it. Each customer controls its own service principal without owning the publisher's application object.

## What Registration and Consent Create

When you register an application through the Entra admin center, Microsoft creates the application object and a corresponding service principal in the home tenant. If you create an application object directly through Microsoft Graph, creating the service principal is a separate API operation.

For a multitenant application, consent in a customer tenant creates or uses a service principal in that customer tenant. The customer's permission grants and assignments attach to that local service principal. They do not modify the publisher's application object.

This distinction is visible in a simple relationship:

```text
Publisher tenant:
  application object (appId = A)
      |
      +-- home service principal (appId = A, objectId = SP-1)

Customer tenant:
  service principal (appId = A, objectId = SP-2)
```

`SP-1` and `SP-2` are different objects. Both represent the same application ID.

## Which Portal Page Should You Change?

Use **App registrations** when changing what the software is or how it participates in identity protocols. Examples include adding a redirect URI, exposing an API scope, defining an app role, changing the sign-in audience, or uploading a certificate credential.

Use **Enterprise applications** when changing how the current tenant uses that software. Examples include assigning Finance users, requiring assignment, disabling sign-in, reviewing consent, configuring a gallery application's SAML SSO, or inspecting sign-in logs.

Some properties appear in both experiences, and the display names can be identical. Do not use the name as proof that you found the right object. Confirm the tenant, Application ID, and Object ID before changing anything.

## Find Both Objects Reliably

The Application ID is the safest join key. With Microsoft Graph:

```http
GET https://graph.microsoft.com/v1.0/applications?$filter=appId eq '00001111-aaaa-2222-bbbb-3333cccc4444'
GET https://graph.microsoft.com/v1.0/servicePrincipals?$filter=appId eq '00001111-aaaa-2222-bbbb-3333cccc4444'
```

The first query returns an application only in its home tenant. The second returns the service principal in the tenant against which the Graph request is authenticated.

The Azure CLI can perform the same practical check:

```bash
az account show --query tenantId -o tsv
az ad app show --id 00001111-aaaa-2222-bbbb-3333cccc4444
az ad sp show --id 00001111-aaaa-2222-bbbb-3333cccc4444
```

If the app query succeeds but the service-principal query does not, the application object exists in that tenant but its local runtime principal might not. This can happen with objects created through Graph or after deletion. If only the service-principal query succeeds, you might be in a consumer tenant, looking at a legacy service principal, or looking at a managed identity.

## Important Exceptions

Microsoft's application-model overview documents three traditional service-principal types:

- **Application** service principals normally reference an application object.
- **Managed identity** service principals are created for Azure managed identities and do not have an associated application object that you manage as an app registration.
- **Legacy** service principals can exist without an associated app registration and work only in their tenant.

Microsoft Graph also exposes `ServiceIdentity` for Microsoft Entra Agent ID agent identities and `SocialIdp` for internal use.

These exceptions are why “every Enterprise application must appear under App registrations” is not a valid rule.

The reverse assumption is also unsafe. An application object created through Microsoft Graph does not automatically receive a service principal unless the caller creates one. Also, deleting an application object deletes its home service principal. Current Microsoft recovery guidance says that restoring the deleted app registration through the Entra admin center also restores that corresponding service principal. If you restore the application with Microsoft Graph or PowerShell instead, restore the deleted service principal separately. Some service-principal policies, including Conditional Access policies, are not recovered automatically.

## Common Operational Mistakes

### Editing the publisher object to fix a customer assignment

Assignments are tenant-local. Change the customer tenant's enterprise application, not the publisher's app registration.

### Supplying an application Object ID where an API expects a principal

Azure RBAC and many assignment APIs expect the service principal's Object ID. The application object's Object ID is a different GUID even in the home tenant.

### Searching only by display name

Display names are not unique. Join on `appId`, then verify the expected tenant and object type.

### Deleting one object as a cleanup shortcut

Deletion has different blast radii. Deleting a customer service principal removes that tenant's local instance and grants. Deleting the home application object also deletes the home service principal and can break the definition used by all customer instances. Inventory relationships before deletion.

## A Practical Mental Model

Think of the application object as a product definition and a service principal as an installed, tenant-governed instance. The analogy is imperfect, but it leads to the right questions:

1. Am I changing the application's protocol definition or this tenant's access policy?
2. Which tenant am I signed into?
3. Is this GUID the Application ID, application-object ID, or service-principal Object ID?
4. Does the service principal exist in the tenant where the token request is being made?

Answer those four questions before editing or troubleshooting. They prevent most App registrations versus Enterprise applications mistakes.

## Official Documentation

- [Application and service principal objects in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals)
- [How and why applications are added to Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/how-applications-are-added)
- [Register an application in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- [Microsoft identity platform glossary](https://learn.microsoft.com/en-us/entra/identity-platform/developer-glossary)
- [Deletion and recovery of applications FAQ](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/delete-recover-faq)
- [Restore a soft-deleted enterprise application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/restore-application)

## Conclusion

App registrations manage application objects; Enterprise applications manage service principals. The application object is the home-tenant blueprint, while each service principal is a tenant-local security principal with its own assignments, grants, policies, and Object ID. Use the Application ID to relate the objects, and always verify which tenant and object type an API expects.
