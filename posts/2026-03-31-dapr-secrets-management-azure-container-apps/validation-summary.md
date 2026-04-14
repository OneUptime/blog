# Validation Summary: How to Use Dapr Secrets Management on Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secrets management building block)
- Azure Container Apps
- Azure Key Vault
- Azure Managed Identity (system-assigned)
- Azure RBAC
- Python (requests library)
- .NET (Dapr SDK)
- Azure CLI

## Sources Consulted
- Dapr Secrets API Reference — https://docs.dapr.io/reference/api/secrets_api/
- Dapr Azure Key Vault Secret Store Component — https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/
- Dapr How To: Retrieve a Secret — https://docs.dapr.io/developing-applications/building-blocks/secrets/howto-secrets/
- Dapr .NET SDK Client — https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Azure Container Apps Dapr Components — https://learn.microsoft.com/en-us/azure/container-apps/dapr-components
- Azure CLI: az keyvault — https://learn.microsoft.com/en-us/cli/azure/keyvault
- Azure CLI: az containerapp — https://learn.microsoft.com/en-us/cli/azure/containerapp
- Azure Key Vault RBAC vs Access Policies — https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide

## Issues Found

### Issue 1: State store component YAML used standard Dapr syntax instead of ACA syntax
**What was wrong:** The `statestore.yaml` in Step 5 used `secretKeyRef` with nested `name`/`key` fields and `auth.secretStore` — this is the standard Dapr/Kubernetes component YAML syntax. Azure Container Apps uses a different simplified YAML schema where secrets are referenced with the flat `secretRef` field and the secret store is specified via the top-level `secretStoreComponent` field.

**What was changed:** Replaced `secretKeyRef: { name: cosmos-primary-key, key: cosmos-primary-key }` with `secretRef: cosmos-primary-key`, and replaced `auth: secretStore: secretstore` with top-level `secretStoreComponent: "secretstore"`.

**Why:** The original YAML would not work when deployed via `az containerapp env dapr-component set` because ACA does not parse the standard Dapr component schema fields `secretKeyRef` and `auth`.

### Issue 2: Used legacy access policy model instead of RBAC for Key Vault
**What was wrong:** Step 1 created the Key Vault without RBAC authorization, and Step 2 used `az keyvault set-policy` to grant access via the legacy access policy model. Microsoft now recommends RBAC-based authorization for all new Key Vault deployments.

**What was changed:** Added `--enable-rbac-authorization true` to the `az keyvault create` command, and replaced `az keyvault set-policy` with `az role assignment create --role "Key Vault Secrets User"` using the proper scope.

**Why:** RBAC is the recommended authorization model for Azure Key Vault. It provides per-secret granularity, eliminates the 1024-policy-per-vault limit, supports Conditional Access, and aligns with unified Azure RBAC management. While the access policy model still functions, teaching it for new deployments is not aligned with current best practices.

## Review Notes
- All Dapr API endpoints (`/v1.0/secrets/{store}/{key}`, `/v1.0/secrets/{store}/bulk`) are correct.
- The Dapr secrets API response format and the Python code accessing `resp.json()[secret_name]` are correct for Azure Key Vault (name/value secret stores return the secret name as the JSON key).
- The .NET SDK usage (`DaprClientBuilder`, `GetSecretAsync`, dictionary access pattern) is correct.
- The Dapr component type `secretstores.azure.keyvault` and metadata fields (`vaultName`, `azureEnvironment`, `azureClientId`) are all valid.
- The secret store component YAML in Step 3 correctly uses the ACA-specific format (no `apiVersion`/`kind`/`spec` wrapper).
- The `az containerapp identity show --query principalId` command works but `az containerapp show --query "identity.principalId"` is a more commonly documented alternative. Left as-is since the current form is functional.
