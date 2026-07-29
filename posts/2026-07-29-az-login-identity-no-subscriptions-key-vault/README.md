# Why az login --identity Reports No Subscriptions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Managed Identity, Azure CLI, Azure Key Vault

Description: Explain why Key Vault data-plane access does not guarantee Azure subscription discovery during managed identity login, and choose the least-privilege fix.

---

`az login --identity` authenticates the VM's managed identity, then Azure CLI normally tries to discover Azure Resource Manager subscriptions available to that identity. Key Vault secret access is a **data-plane** permission. It does not necessarily grant the Resource Manager control-plane access used for subscription discovery.

That is why both statements can be true:

- the managed identity is allowed to read a Key Vault secret;
- Azure CLI reports that it found no subscriptions.

Do not solve this automatically by assigning Contributor to the whole subscription. Decide whether the process needs Resource Manager access or only a Key Vault token.

## Separate authentication, subscription discovery, and authorization

The flow has three distinct stages:

```text
managed identity authenticates
  -> Azure CLI queries tenant/subscription context
  -> command requests a token for ARM or Key Vault
  -> target service authorizes the operation
```

A failure at subscription discovery does not prove the identity itself is disabled.

Key Vault has two interfaces:

| Plane | Endpoint | Typical operations | Authorization |
|---|---|---|---|
| Control plane | `management.azure.com` | Create vault, change settings, tags, networking | Azure RBAC Actions |
| Data plane | `<vault>.vault.azure.net` | Get secret, use key, retrieve certificate | Key Vault RBAC DataActions or legacy access policy |

`Key Vault Contributor` is a control-plane role and does not grant access to secret values. `Key Vault Secrets User` grants secret-read data actions but is not a general subscription reader. Legacy access policies are also data-plane configuration and do not give the identity an ARM role.

## Confirm which identity Azure CLI uses

For the VM's system-assigned identity:

```bash
az login --identity
```

For a user-assigned identity, select it explicitly:

```bash
az login \
  --identity \
  --client-id 00000000-0000-0000-0000-000000000000
```

Current Azure CLI also supports `--object-id` and `--resource-id`. Use the correct value from the managed identity resource. A common mistake is to pass the principal/object ID as a client ID.

Inspect identities attached to the VM from an operator context:

```bash
az vm identity show \
  --resource-group myResourceGroup \
  --name myVM \
  --output json
```

If several user-assigned identities are attached and none is selected, authentication can fail or choose an unintended context.

## Login without subscription discovery

When the workload needs tenant-level or data-plane access but has no ARM subscription role, Azure CLI supports:

```bash
az login \
  --identity \
  --allow-no-subscriptions
```

With a user-assigned identity:

```bash
az login \
  --identity \
  --client-id 00000000-0000-0000-0000-000000000000 \
  --allow-no-subscriptions
```

`--allow-no-subscriptions` changes CLI login behavior. It does not grant permission and does not create a subscription context. Commands that manage ARM resources will still fail or require a subscription.

For a data-plane Key Vault command, pass the specific vault or object URI rather than asking CLI to enumerate vault resources. The secret command accepts a secret ID:

```bash
az keyvault secret show \
  --id 'https://myvault.vault.azure.net/secrets/mysecret' \
  --query id \
  --output tsv
```

This example outputs only the identifier during a connectivity test. A production application that retrieves the value must keep it out of logs and process output.

Behavior can vary across CLI versions and commands because some convenience commands perform control-plane discovery before their data-plane call. If a command still requires ARM context, use the service SDK or direct Key Vault data-plane API with a managed identity token.

## Bypass Azure CLI for application access

Azure CLI is useful for administration and diagnostics. An application should normally use an Azure Identity credential and the Key Vault SDK:

```text
ManagedIdentityCredential
  -> token audience https://vault.azure.net
  -> SecretClient at https://myvault.vault.azure.net
```

This path does not need `az login` or a default subscription. It needs:

- the correct managed identity assigned to the VM;
- Key Vault data-plane authorization;
- network reachability to the vault endpoint;
- the correct vault tenant and URI.

You can also request a Key Vault token directly from IMDS for diagnostics, but do not print or persist the token.

## Grant ARM access only when the workflow needs it

If automation must list, create, update, or inspect Azure resources through Resource Manager, give the identity the least control-plane role at the narrowest usable scope.

Examples:

- Reader when the process only needs to inspect resources;
- a service-specific built-in role for a narrow management task;
- a custom role containing only required Actions;
- Contributor only when broad resource mutation is truly required.

Subscription discovery may require a role assignment that gives a usable ARM context. If the workflow genuinely needs subscription-wide discovery, Reader at subscription scope is the common read-only option, but it exposes metadata for the full subscription. Prefer a narrower design when possible.

After a valid subscription appears:

```bash
az account list --output table
az account set --subscription 00000000-0000-0000-0000-000000000000
```

Role assignments can take time to propagate. Retry with bounded backoff rather than repeatedly reassigning broader roles.

## Verify Key Vault authorization separately

For a vault using Azure RBAC, a secret-reading identity typically needs a data-plane role such as **Key Vault Secrets User** at the vault or narrower supported scope.

For a vault using legacy access policies, grant the identity only the required secret, key, or certificate permissions. Confirm the correct principal object ID.

Do not confuse:

- **Key Vault Reader**, which reads metadata but not secret contents;
- **Key Vault Contributor**, which manages vault control-plane resources but not secret values;
- **Key Vault Secrets User**, which reads secret contents through the data plane.

The vault's selected permission model determines whether an RBAC role or legacy access policy is effective.

## Network failures can look like authorization failures

After login succeeds, Key Vault access can still fail because of:

- vault firewall rules;
- disabled public network access;
- private endpoint DNS resolving incorrectly;
- missing VNet route;
- proxy or TLS interception;
- wrong Azure cloud suffix;
- token requested for `management.azure.com` instead of `vault.azure.net`.

Interpret responses:

- no-subscriptions message: CLI/ARM context;
- IMDS identity error: identity assignment or selector;
- Key Vault 401: token/audience/authentication;
- Key Vault 403: permission, firewall, or network policy;
- DNS/timeout: connectivity or private endpoint path.

## Least-privilege decision tree

1. Does the process only need a Key Vault secret?
   - Use ManagedIdentityCredential and Key Vault SDK.
   - Grant only the data-plane secret role.
   - No subscription-wide role is required by the application.
2. Does an operator need Azure CLI only for data-plane diagnostics?
   - Try `az login --identity --allow-no-subscriptions`.
   - Address the vault by its full data-plane URI.
3. Does automation manage ARM resources?
   - Grant the narrowest control-plane role and scope.
   - Set the intended subscription explicitly.
4. Does it still fail?
   - Verify identity selector, role propagation, token audience, vault permission model, and network path independently.

The no-subscriptions message describes Azure CLI's management context. It does not override a correctly configured Key Vault data-plane authorization model.

## Official Documentation

- [Sign in to Azure CLI with a managed identity](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-managed-identity)
- [Azure CLI login reference](https://learn.microsoft.com/en-us/cli/azure/reference-index)
- [Key Vault RBAC guide](https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide)
- [Authenticate to Azure Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/authentication)
- [Azure CLI Key Vault secret reference](https://learn.microsoft.com/en-us/cli/azure/keyvault/secret)
- [Acquire a managed identity token from an Azure VM](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-to-use-vm-token)

