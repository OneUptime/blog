# Azure Key Vault Scopes or Unity Catalog Service Credentials?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Databricks, Azure Key Vault, Unity Catalog, Data Governance, Security

Description: Compare Key Vault-backed secret scopes with Unity Catalog service credentials for secret retrieval, managed identity, governance, and private endpoints.

---

An Azure Key Vault-backed Databricks secret scope and a Unity Catalog service credential can both participate in access to Azure services, but they expose different security models.

A secret scope returns a secret value to code. A service credential gives supported code an Azure credential provider. In the recommended Azure configuration, it references an access connector backed by a managed identity, so the Azure SDK obtains tokens without exposing a stored client secret. Identity and network connectivity are separate in both designs.

## The core difference

| Capability | Key Vault-backed secret scope | Unity Catalog service credential |
| --- | --- | --- |
| Primary purpose | Read secret values stored in one Key Vault | Authenticate code to an external Azure service |
| Scope | One Databricks workspace | Unity Catalog metastore securable |
| Azure identity | Azure Databricks service application reads the vault | Recommended: Azure Databricks access connector uses a managed identity |
| Code receives | Secret string through `dbutils.secrets` | Azure SDK credential provider through `dbutils.credentials` |
| Databricks governance | Secret scope ACLs | Unity Catalog ownership and `ACCESS` privilege |
| Azure authorization | Key Vault access policy for the Databricks service | Target-service permissions assigned to the managed identity, typically with Azure RBAC |
| Network path | Restricted vaults rely on the Azure Databricks trusted-service bypass, not a workspace private endpoint | The calling compute must reach the service, publicly or privately |
| Cloud storage in Unity Catalog | Not recommended | Use a storage credential instead |

Use the secret scope when the application genuinely needs a static secret, such as a legacy password or third-party API key. Use a service credential when an Azure SDK can authenticate with Microsoft Entra tokens and the workload should not handle a long-lived secret.

## How a Key Vault-backed scope works

An Azure Key Vault-backed scope is a read-only Databricks interface to a Key Vault. Secrets are created, rotated, and deleted in Key Vault. A notebook or job reads a named value:

```python
api_key = dbutils.secrets.get(
    scope="payments-prod",
    key="provider-api-key",
)
```

Creating the scope grants the Azure Databricks service application `Get` and `List` through the Key Vault access policy model. Current Azure Databricks documentation states that Key Vault-backed scopes support the Vault access policy permission model, not Azure RBAC.

This has several governance consequences:

- Scope ACLs are workspace-local, even if several workspaces reference the same vault.
- A principal with read access to the scope can request secrets available through that vault-backed scope.
- The Databricks service identity, not the individual notebook user's Azure identity, reads Key Vault.
- The application receives the secret value and can pass it to a client library.
- Databricks output redaction is a defense against accidental display, not a guarantee that an authorized user cannot reveal a secret.

Align a vault and scope with one trust boundary. Do not put unrelated teams' secrets in one vault and expect secret-scope ACLs to provide per-secret Azure isolation.

## Key Vault firewall and private endpoint limits

The Azure Databricks setup page instructs you to allow public access from specific networks and enable the trusted Microsoft services firewall exception, or to allow public access from all networks. Current Key Vault networking documentation also states that the trusted-services bypass continues to apply when public network access is disabled.

Disabling public network access therefore does not, by itself, block the scope integration if the trusted-services bypass remains enabled. However, the scope request still uses the Azure Databricks trusted-service path, not your private endpoint. A vault policy that permits only private-endpoint traffic and does not permit the trusted-service bypass does not support this path. Adding a private endpoint to the workspace VNet does not redirect the Databricks service application's scope integration through that endpoint.

This is often the deciding tradeoff:

```text
Key Vault-backed scope
  -> convenient workspace secret interface
  -> restricted vaults require the Azure Databricks trusted-service bypass

Direct Azure SDK access from compute
  -> can use a service credential and a private compute-to-vault path
  -> requires private DNS, routing, and compute networking configuration
```

Do not weaken a private-only Key Vault firewall only to preserve a legacy scope pattern without a security review.

## How a Unity Catalog service credential works

On Azure, the recommended service credential configuration references an Azure Databricks access connector backed by an Azure managed identity. Assign the managed identity least-privilege permissions on the external service, create the service credential in Unity Catalog, and grant users or groups `ACCESS` on that securable. Databricks also supports a Microsoft Entra service principal, but strongly recommends managed identities because they avoid client-secret rotation and support services protected by network rules.

Supported notebook code requests the credential provider by name and passes it to an Azure SDK client:

```python
from azure.keyvault.secrets import SecretClient

credential = dbutils.credentials.getServiceCredentialsProvider(
    "payments-key-vault-reader"
)

client = SecretClient(
    vault_url="https://payments-prod.vault.azure.net/",
    credential=credential,
)

secret = client.get_secret("provider-api-key").value
```

The service credential does not store that Key Vault secret in Unity Catalog. It supplies an identity that can request an Entra token, and the Azure SDK calls Key Vault directly.

Current requirements matter:

- The workspace must use Unity Catalog.
- The caller needs `ACCESS` or ownership of the service credential.
- The current generally available code interface requires Databricks Runtime 16.2 or above.
- The Public Preview interface is available on 15.4 LTS and above with Python but without Scala.
- SQL warehouses do not support the shown notebook interface. Batch Unity Catalog Python UDFs on SQL warehouses use a separate UDF-specific API.
- SQL commands for managing service credentials require 15.4 LTS or above, while Catalog Explorer and REST management do not have that runtime requirement.

Check the current support status before standardizing on a runtime. Preview behavior and language support can change.

Useful governance commands include:

```sql
SHOW SERVICE CREDENTIALS;

DESCRIBE SERVICE CREDENTIAL `payments-key-vault-reader`;

GRANT ACCESS
ON SERVICE CREDENTIAL `payments-key-vault-reader`
TO `payments-production`;
```

The managed identity's permissions on the target service define what the credential can do in Azure. The Unity Catalog grant defines who can exercise those permissions from Databricks. Both layers must be least privilege.

## Service credentials are not storage credentials

Do not use a service credential to govern Azure storage used by Unity Catalog managed or external locations. Databricks explicitly directs those use cases to Unity Catalog storage credentials and external locations.

Use this separation:

| Resource | Unity Catalog object |
| --- | --- |
| ADLS container behind a managed or external location | Storage credential plus external location |
| Azure service called from notebook code | Service credential |
| Static password or API key that code must receive | Secret in a supported secret system |

This preserves table and path governance instead of bypassing Unity Catalog with a generic SDK identity.

## Private connectivity with a service credential

A service credential grants identity but does not create a route, private endpoint, DNS record, or firewall rule.

For classic compute, a private Azure service path typically requires:

- VNet-injected or otherwise connected compute
- A private endpoint for the service
- Private DNS that resolves the service hostname to the private address
- Network security and route rules permitting the connection
- Public access disabled or restricted according to policy

For Azure Databricks serverless compute, account administrators use a network connectivity configuration when the target service and region support private endpoints. After the Azure resource owner approves the request, traffic from authorized workspaces uses the account-dedicated endpoint.

Test from the exact compute product. A classic cluster and serverless job have different egress paths. A successful DNS lookup from a laptop or workspace web UI proves neither path.

Private endpoints improve network isolation but add endpoint cost, DNS dependencies, approval workflow, regional constraints, and another operational object. Azure Databricks also documents network charges for some serverless connectivity. Include those costs in the architecture decision.

## Governance comparison

### Secret scope controls

- Grant scope access to groups aligned with one application or role.
- Keep `MANAGE` tightly restricted because it controls ACLs and may allow secret access.
- Audit Key Vault data-plane access and Databricks secret operations.
- Rotate secrets in Key Vault and test whether long-running clients cache the old value.
- Never print or persist retrieved values.

### Service credential controls

- Grant `CREATE SERVICE CREDENTIAL` only to a small platform group.
- Create separate access connectors and managed identities for distinct privilege sets.
- Grant `ACCESS` to account-level groups, not broad workspace populations.
- Scope target-service permissions, typically Azure RBAC, to the narrowest resource and actions.
- Audit Unity Catalog grants and Azure managed-identity activity.
- Prefer naming the service credential explicitly in code.

Databricks supports setting a default service credential through a classic compute environment variable, but the documentation does not recommend it because it makes code less portable. Serverless compute and SQL warehouses do not support that environment-variable default.

## Migration from a client secret

A safe migration from a secret scope to a service credential is:

1. Confirm that the target Azure SDK accepts a `TokenCredential` and that the service supports managed identity.
2. Create a dedicated access connector and managed identity.
3. Grant minimum target-service permissions, preferably with Azure RBAC where supported, on a non-production resource.
4. Create the Unity Catalog service credential and grant a test group `ACCESS`.
5. Configure public or private network reachability independently.
6. Run the old secret-based and new identity-based clients against equivalent test operations.
7. Verify Azure and Databricks audit events.
8. Roll out by workload and revoke the old client secret only after all consumers migrate.

Do not delete the old secret first. A rollback should require changing configuration, not recreating a credential during an incident.

## Decision guide

Choose a Key Vault-backed scope when all of the following are true:

- The application must receive a secret value.
- The vault can use the documented access-policy and firewall configuration.
- Workspace-local ACLs match the governance boundary.
- The runtime or client cannot use a supported service credential.

Choose a Unity Catalog service credential when:

- The Azure service supports managed identity or Entra token authentication.
- Metastore-level governance is preferred.
- The workload runs on a supported runtime and compute type.
- You want to remove client secrets from application code.
- A compute-originated private endpoint path is required and supported.

Choose neither for Unity Catalog data storage. Use a storage credential and external location.

## Official Documentation

- [Azure Databricks secret management](https://learn.microsoft.com/en-us/azure/databricks/security/secrets/)
- [Create Unity Catalog service credentials](https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-services/service-credentials)
- [Manage Unity Catalog service credentials](https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-services/manage-service-credentials)
- [Use Unity Catalog service credentials](https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-services/use-service-credentials)
- [Configure private connectivity for serverless compute](https://learn.microsoft.com/en-us/azure/databricks/security/network/serverless-network-security/serverless-private-link)
- [Azure Private Link for Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/private-link-service)

## Conclusion

Key Vault-backed scopes and Unity Catalog service credentials are not interchangeable. A scope exposes secret values through a workspace ACL and, for a restricted vault, relies on the Azure Databricks trusted-service bypass rather than a workspace private endpoint. A managed-identity-backed service credential exposes that identity through Unity Catalog and lets supported compute call Azure services directly, including over a separately configured private path. Prefer identity over secrets when the service and runtime support it, and treat network reachability as an independent control.
