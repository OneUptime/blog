# Validation Summary: Why az login --identity Reports No Subscriptions

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Microsoft Azure
- Azure Virtual Machines
- Managed identities for Azure resources
- Azure CLI
- Azure Resource Manager
- Azure Key Vault
- Azure RBAC and legacy Key Vault access policies
- Azure Identity and Key Vault SDKs
- Azure Instance Metadata Service (IMDS)
- Azure Private Link and Key Vault network controls

## Sources Consulted

- [Sign into Azure with a managed identity using Azure CLI](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-managed-identity)
- [Azure CLI `az login` reference](https://learn.microsoft.com/en-us/cli/azure/reference-index#az-login)
- [Azure CLI `az vm identity` reference](https://learn.microsoft.com/en-us/cli/azure/vm/identity)
- [Azure CLI `az keyvault secret` reference](https://learn.microsoft.com/en-us/cli/azure/keyvault/secret)
- [Manage Azure subscriptions with Azure CLI](https://learn.microsoft.com/en-us/cli/azure/manage-azure-subscriptions-azure-cli)
- [Key Vault RBAC guide](https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide)
- [Azure built-in roles for security](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/security)
- [Authenticate to Azure Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/authentication)
- [Key Vault authentication, requests, and responses](https://learn.microsoft.com/en-us/azure/key-vault/general/authentication-requests-and-responses)
- [Azure Key Vault Python client library quickstart](https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-python)
- [Use managed identities on an Azure VM to acquire an access token](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-to-use-vm-token)
- [Managed identity developer guidelines](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview-for-developers)
- [Configure network security for Azure Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/network-security)
- [Diagnose Key Vault private-link configuration issues](https://learn.microsoft.com/en-us/azure/key-vault/general/private-link-diagnostics)
- [Troubleshoot Azure RBAC](https://learn.microsoft.com/en-us/azure/role-based-access-control/troubleshooting)

## Issues Found

- The heading “Login without subscription discovery” incorrectly implied that `--allow-no-subscriptions` skips Azure CLI's discovery request. The option instead allows login to complete with a tenant-level account when discovery finds no subscriptions. Changed the heading to “Login when no subscriptions are found.”
- The post described legacy Key Vault access policies as “data-plane configuration.” Access policies authorize data-plane operations, but changing an access policy is a control-plane operation. Changed the wording to distinguish authorization from configuration.
- The response guide treated every Key Vault 401 as a token or authentication failure. Key Vault SDK clients intentionally make an initial unauthenticated request and receive a 401 challenge containing tenant and resource information. Changed the guide to classify a persistent 401 as the failure signal and note the expected initial challenge.

## Review Notes

- Verified that current Azure CLI supports `--identity`, `--client-id`, `--object-id`, `--resource-id`, and `--allow-no-subscriptions`.
- Verified that `az vm identity show --resource-group ... --name ...` and `az keyvault secret show --id ... --query id --output tsv` use valid, current syntax.
- Verified that `--allow-no-subscriptions` grants no permissions and produces no usable Azure subscription context by itself.
- Verified the separation between Key Vault control-plane and data-plane authorization, including the permissions of Key Vault Contributor, Key Vault Reader, and Key Vault Secrets User.
- Verified that direct SDK or data-plane access can use a managed identity without `az login` or a default subscription, provided identity assignment, Key Vault authorization, tenant, URI, and network access are correct.
- Verified the IMDS identity-selector guidance, Key Vault token audience, role-propagation caveat, and the described firewall, private-endpoint DNS, 401, and 403 failure modes.
