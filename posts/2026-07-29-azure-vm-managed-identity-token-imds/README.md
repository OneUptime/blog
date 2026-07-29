# Get a Managed Identity Token from Azure VM IMDS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Managed Identity, IMDS, Security

Description: Request an Azure VM managed identity token from IMDS without a client secret, select a user-assigned identity, and handle tokens safely.

---

Code running on an Azure VM can request an OAuth access token for an assigned managed identity from Azure Instance Metadata Service, or IMDS. The application does not store a client secret or certificate. Azure manages the identity credential and returns a short-lived token for the requested resource.

The endpoint is available only from inside the VM:

```text
http://169.254.169.254/metadata/identity/oauth2/token
```

Use the required `Metadata: true` header, specify an IMDS API version, and bypass HTTP proxies.

## Enable and authorize the identity first

A token request requires a system-assigned or user-assigned managed identity on the VM. Identity assignment and target authorization are separate:

1. assign the identity to the VM;
2. grant that identity the least-privilege role or access policy on the target service;
3. request a token for that service's resource identifier;
4. call the service's data-plane or control-plane endpoint.

Receiving a token proves authentication. It does not prove that the token has permission for a particular resource or that network policy allows the call.

Inspect the VM's identity model:

```bash
az vm identity show \
  --resource-group myResourceGroup \
  --name myVM \
  --output json
```

Do not confuse a user-assigned identity's client ID, object/principal ID, and Azure resource ID. IMDS accepts different selector parameters for these values.

## Request a system-assigned identity token

For Azure Resource Manager:

```bash
curl --silent --show-error --fail \
  --noproxy '*' \
  --header 'Metadata: true' \
  'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fmanagement.azure.com%2F'
```

The response resembles:

```json
{
  "access_token": "redacted",
  "client_id": "00000000-0000-0000-0000-000000000000",
  "expires_in": "3599",
  "expires_on": "1780000000",
  "ext_expires_in": "86399",
  "not_before": "1779996400",
  "resource": "https://management.azure.com/",
  "token_type": "Bearer"
}
```

Never print a real token to a shared terminal, application log, CI output, or incident ticket. The raw example is useful only for a protected diagnostic session.

In an application, parse `access_token`, cache it in memory, and refresh before `expires_on`. Do not request a token for every API call.

## Request a token for the correct audience

The `resource` parameter is the intended service audience. Common Azure public-cloud values include:

| Service | Resource value |
|---|---|
| Azure Resource Manager | `https://management.azure.com/` |
| Azure Key Vault | `https://vault.azure.net` |
| Azure Storage | `https://storage.azure.com/` |

Use the service's current official documentation for sovereign clouds and other resources. A token for Resource Manager cannot be presented to Key Vault, and vice versa.

URL-encode the resource parameter. For Key Vault:

```bash
curl --silent --show-error --fail \
  --noproxy '*' \
  --header 'Metadata: true' \
  'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fvault.azure.net'
```

An `invalid_resource` error often means the audience is misspelled, belongs to another cloud, or is not registered in the VM's tenant.

## Select a user-assigned identity

When multiple user-assigned identities are available, specify one explicitly. With its client ID:

```bash
curl --silent --show-error --fail \
  --noproxy '*' \
  --header 'Metadata: true' \
  'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fmanagement.azure.com%2F&client_id=00000000-0000-0000-0000-000000000000'
```

IMDS also supports selectors based on object ID or the managed identity Azure resource ID. URL-encode a resource ID before placing it in `mi_res_id`.

Choose the identity by configuration, not by assuming the first returned identity. This avoids an application silently acquiring a broader or wrong identity after another identity is attached to the VM.

## IMDS must bypass proxies

IMDS is a link-local endpoint. Microsoft states that using it behind a proxy is unsupported. Explicitly exclude `169.254.169.254`:

- `curl --noproxy '*'` for a direct diagnostic;
- application HTTP-client no-proxy configuration;
- `NO_PROXY=169.254.169.254` where the runtime honors it;
- proxy and security-agent bypass policy.

Do not confuse IMDS with Azure WireServer at `168.63.129.16`. The Azure VM Agent uses WireServer; managed identity token acquisition uses IMDS at `169.254.169.254`.

The request must originate from the VM and use the primary network path. Forwarding IMDS through a reverse proxy or exposing it to untrusted workloads is unsafe.

## Prefer an Azure Identity SDK

Direct HTTP is useful for troubleshooting and minimal environments. Production applications should normally use the Azure Identity library for their language.

An SDK credential can:

- select system-assigned or a configured user-assigned identity;
- cache and refresh tokens;
- handle endpoint errors and retries;
- integrate with the target service client;
- avoid manual bearer-token handling.

Use `ManagedIdentityCredential` when the application must use managed identity specifically. `DefaultAzureCredential` is convenient across development and Azure, but understand its credential chain and pin the managed identity client ID when several identities exist.

## Handle errors and throttling

Typical outcomes:

- **400 missing metadata header**: send exactly `Metadata: true`;
- **400 invalid resource**: correct the service audience;
- **401 unauthorized client**: enable or correctly select the VM identity;
- **404 or connection failure**: confirm the request is on an Azure VM and bypasses proxies;
- **429**: respect `Retry-After` and use exponential backoff;
- **5xx**: retry with bounded exponential backoff and jitter.

Do not retry permanent 400 errors indefinitely. Cache tokens so normal traffic does not pressure IMDS or Microsoft Entra ID.

After token acquisition, a target **403** usually indicates missing authorization, target firewall/private-endpoint restrictions, or a tenant/resource mismatch.

## Treat the VM as the identity security boundary

Microsoft's managed identity documentation states that all code running on the VM can request tokens for identities available to that VM. A process does not need access to a secret file.

Therefore:

- assign only identities every trusted workload on the VM may use;
- give each identity least-privilege target roles;
- avoid mixing mutually untrusted applications on one VM;
- prevent server-side request forgery from reaching IMDS;
- do not expose a local token-broker endpoint without authentication;
- never persist tokens to a world-readable file.

Managed identity removes credential storage. It does not remove the need for process isolation, authorization, network controls, auditing, and safe logging.

## Official Documentation

- [Acquire a managed identity token from an Azure VM](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-to-use-vm-token)
- [Azure Instance Metadata Service](https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service)
- [How managed identities work with Azure VMs](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-managed-identities-work-vm)
- [Configure managed identities on Azure VMs](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-to-configure-managed-identities)

