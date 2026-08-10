# How to Fix AADSTS700016: Wrong Tenant, Client ID, or Missing Service Principal?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, AADSTS700016, Service Principal, Client ID, Tenant ID, OAuth 2.0, Troubleshooting

Description: Diagnose AADSTS700016 by verifying the runtime client ID, authority tenant, application object, service principal, supported account type, and consent state.

---

`AADSTS700016` means Microsoft Entra ID could not find the **client application** identified by the request in the directory handling that request. Microsoft's error reference describes three main causes: the application was not installed or consented in the tenant, the application identifier is wrong, or the request was sent to the wrong tenant.

Do not respond by creating a random new secret. Entra has not reached secret validation if it cannot resolve the client. Work in this order:

1. capture the tenant and client ID from the failing request;
2. confirm the runtime is using the Application (client) ID;
3. confirm the authority selects the intended tenant;
4. locate the application object or service principal by `appId`;
5. verify the app's supported account type; and
6. create or consent the tenant-local service principal only when the design calls for one.

## Read the Error Literally

A typical response includes:

```text
AADSTS700016: Application with identifier '<client-id>'
was not found in the directory '<tenant>'.
Trace ID: ...
Correlation ID: ...
Timestamp: ...
```

Record the following without copying credentials or raw tokens into a ticket:

- numeric AADSTS code;
- application identifier shown;
- tenant ID or tenant name shown;
- UTC timestamp;
- correlation ID and trace/request ID;
- the authority URL and deployment environment; and
- whether this was interactive, client credentials, OBO, or another flow.

The identifier in this error is normally the OAuth `client_id`. It should be the **Application (client) ID**, also called `appId`, not the application object's Object ID, the service principal's Object ID, a client-secret ID, or an Azure subscription ID.

## Step 1: Prove What the Workload Sent

Inspect the effective runtime configuration. Do not rely on the app registration screenshot or the deployment manifest in source control; a stale secret store, slot setting, Helm value, or pipeline variable may override it.

For a raw client-credentials request, the relevant fields look like this (line breaks are for readability):

```http
POST https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id=00001111-aaaa-2222-bbbb-3333cccc4444
&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default
&client_secret=<redacted>
&grant_type=client_credentials
```

Form-encode every value, including the client secret, before sending the request.

Log only a safe fingerprint such as the client ID, tenant ID, credential key ID, and configuration version. Never log the secret value.

Watch for:

- leading or trailing whitespace;
- a variable populated with the Object ID rather than client ID;
- a development client ID deployed to production;
- an empty value replaced by a library default;
- multiple configuration providers with unexpected precedence; and
- a client ID copied from a managed identity that is not available to this workload.

## Step 2: Verify the Authority Tenant

The tenant is selected by the authority path:

```text
https://login.microsoftonline.com/<tenant-id>/...
```

Confirm the active directory:

```bash
az account show --query tenantId -o tsv
```

For a single-tenant application, use the home tenant's GUID or verified domain. Sending its client ID to another tenant normally cannot work because that tenant has no service principal for a single-tenant client.

For interactive multitenant applications, `organizations` or `common` can be appropriate according to the supported account model. For daemon/client-credentials workloads, use the concrete resource tenant where the service principal and permission grants exist. A tenant-independent alias is not a substitute for knowing which organization grants the workload access.

If an authorization code was obtained against one tenant, redeem it against the matching tenant context. Switching authority during the transaction can produce a different AADSTS error and should not be used as a recovery strategy.

## Step 3: Find the Application and Service Principal

The application object and service principal have different Object IDs but share an Application ID. Query by `appId`:

```http
GET https://graph.microsoft.com/v1.0/applications?$filter=appId eq '00001111-aaaa-2222-bbbb-3333cccc4444'
GET https://graph.microsoft.com/v1.0/servicePrincipals?$filter=appId eq '00001111-aaaa-2222-bbbb-3333cccc4444'
```

Or use the Azure CLI while signed into the expected tenant:

```bash
az ad app show --id 00001111-aaaa-2222-bbbb-3333cccc4444
az ad sp show --id 00001111-aaaa-2222-bbbb-3333cccc4444
```

Interpret the result carefully:

| Application object | Service principal | Likely interpretation |
| --- | --- | --- |
| Present | Present | Verify runtime tenant/client ID and whether the SP is enabled |
| Present | Missing | Object may have been created through Graph without creating the home SP, or SP was deleted |
| Missing | Present | Consumer tenant, managed identity, or legacy service principal |
| Missing | Missing | Wrong tenant/client ID, or the multitenant app has not been installed/consented |

The app registration portal normally creates both objects in the home tenant. Creating an application object through Microsoft Graph requires a separate service-principal creation operation.

## Step 4: Check Supported Account Types

The application object's `signInAudience` determines which accounts can use it:

- `AzureADMyOrg`: accounts in the home tenant only;
- `AzureADMultipleOrgs`: organizational accounts across Entra tenants;
- broader values can also include personal Microsoft accounts.

Do not “fix” a single-tenant business application by making it multitenant unless external organizations are a real requirement and token validation, consent onboarding, tenant authorization, and data isolation are ready.

If the request targets another organization but `signInAudience` is `AzureADMyOrg`, use the home tenant or redesign and explicitly approve multitenancy.

## Step 5: Install or Consent the Multitenant App

A multitenant application has one application object in its publisher tenant and a service principal in each customer tenant that uses it. Customer consent normally creates the local service principal.

Effective March 31, 2026, Microsoft Entra blocks remaining non-Microsoft multitenant app-only authentication scenarios that lack a service principal in the tenant. Service-principal-less authentication should not be treated as a compatibility option.

For an authorized customer tenant:

- complete the documented user or admin consent flow (application permissions used by client-credentials workloads require administrator consent); or
- have an administrator create the enterprise application/service principal from the multitenant application's client ID where appropriate.

Do not create a duplicate application registration in the customer tenant merely to make the error disappear. That creates a different client ID and separates the customer from the publisher's intended configuration.

## Do Not Confuse AADSTS700016 with AADSTS500011

These errors point at different sides of the token request:

- `AADSTS700016`: the **client application** was not found in the directory handling the request.
- `AADSTS500011`: the requested **resource service principal** was not found in the tenant.

If the error is 500011, inspect the requested scope/resource and the target API's service principal. Changing `client_id` might be irrelevant.

Also distinguish:

- `AADSTS7000215`: the client was found, but the supplied secret is invalid;
- `AADSTS7000222`: supplied client-secret credentials are expired; and
- `AADSTS7000112`: the service principal is disabled in the resource tenant, or its backing application was disabled globally.

Preserve the exact numeric code in incident notes.

## A Decision Tree

```text
Does runtime client_id equal the App registration's Application ID?
  No -> correct configuration and redeploy.
  Yes
   |
Does the authority select the intended tenant?
  No -> correct the authority.
  Yes
   |
Does a service principal with appId=client_id exist there?
  No
   |-- single-tenant app -> use its home tenant
   |-- multitenant app -> complete authorized installation/consent
   |-- Graph-created home app -> create the intended service principal
  Yes
   |
Check signInAudience, enabled state, actual flow, and sign-in logs.
```

After a correction, restart or redeploy the affected instance, acquire a fresh token, and verify every replica. A partial rollout can make the error look intermittent.

## Prevention

- Store client ID and tenant ID as separate, explicitly named settings.
- Include the expected tenant and client ID in nonsecret startup diagnostics.
- Use deployment tests that query the service principal before enabling traffic.
- Treat customer-tenant service-principal provisioning and any required consent as onboarding prerequisites for multitenant workloads.
- Inventory app/service-principal relationships by `appId`.
- Monitor service-principal sign-in logs and alert on unexpected tenant/client combinations.
- Prefer managed identity for suitable Azure-hosted workloads, avoiding a manually managed client secret and, with a system-assigned identity, a client ID setting.

## Official Documentation

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Application and service principal objects in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals)
- [Create an enterprise application from a multitenant application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/create-service-principal-cross-tenant)
- [Service principal-less authentication mitigation](https://learn.microsoft.com/en-us/entra/identity-platform/retire-service-principal-less-authentication)
- [Register an application in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)

## Conclusion

Fix AADSTS700016 by aligning the runtime Application ID, authority tenant, supported account type, and tenant-local service principal. Query both application and service-principal objects by `appId` instead of guessing from display names. For multitenant apps, complete explicit customer installation or consent; for single-tenant apps, target the home tenant. Only troubleshoot credentials after Entra can resolve the client.
