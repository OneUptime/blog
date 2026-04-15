# Validation Summary: How to Use Dapr Cryptography with Azure Key Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Cryptography building block
- Azure Key Vault (HSM-backed key storage)
- Dapr Python SDK (encrypt/decrypt APIs)
- Azure CLI (`az keyvault`, `az identity`, `az monitor`)
- AKS Workload Identity
- Kubernetes (Deployments, ServiceAccounts)
- Dapr HTTP API (crypto endpoints)

## Sources Consulted
- Dapr Azure Key Vault Cryptography Component reference — https://docs.dapr.io/reference/components-reference/supported-cryptography/azure-key-vault/
- Dapr Cryptography API Reference — https://docs.dapr.io/reference/api/cryptography_api/
- Dapr Python SDK crypto examples — https://github.com/dapr/python-sdk/tree/main/examples/crypto
- Dapr Python SDK client source (grpc/_crypto.py) — https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/client.py
- Azure CLI `az keyvault key` reference — https://learn.microsoft.com/en-us/cli/azure/keyvault/key
- AKS Workload Identity documentation — https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- AKS Pod Identity deprecation notice — https://learn.microsoft.com/en-us/azure/aks/use-azure-ad-pod-identity
- Azure Key Vault SKU overview — https://learn.microsoft.com/en-us/azure/key-vault/general/overview

## Issues Found

1. **Incorrect metadata field name in Dapr component configuration** (`vaultURI` → `vaultName`): Both component YAML snippets used `vaultURI` with a full URL value (`https://my-app-keyvault.vault.azure.net`). The official Dapr docs specify the field name is `vaultName` and it takes just the vault name (e.g., `my-app-keyvault`), not the full URI. Fixed both occurrences.

2. **Incorrect Python SDK encrypt API usage**: The `encrypt()` call passed `options` as a plain Python dict with camelCase keys (`componentName`, `keyName`, `keyWrapAlgorithm`) and wrapped `data` in `io.BytesIO()`. The Dapr Python SDK requires an `EncryptOptions` object (from `dapr.clients.grpc._crypto`) with snake_case fields (`component_name`, `key_name`, `key_wrap_algorithm`), and `data` accepts `bytes` directly. Fixed to use `EncryptOptions` and pass raw bytes.

3. **Incorrect Python SDK decrypt API usage**: Same issues as encrypt — used a plain dict instead of `DecryptOptions` and wrapped data in `io.BytesIO()`. Fixed to use `DecryptOptions` and pass raw bytes.

4. **Wrong HTTP method for Dapr crypto API** (`POST` → `PUT`): The verification curl command used `POST` but the Dapr cryptography HTTP API uses `PUT` for both encrypt and decrypt endpoints. Fixed to `PUT`.

5. **Deprecated AKS Pod Identity CLI commands mixed with Workload Identity setup**: The section title said "AKS Pod Identity Setup" and used the deprecated `az aks pod-identity add` command, while the text and Kubernetes manifest correctly referenced Workload Identity. AAD Pod-Managed Identity was deprecated in October 2022. Fixed the section title to "AKS Workload Identity Setup" and replaced the CLI commands with the correct Workload Identity setup flow (`az identity create`, `az identity federated-credential create`, and `kubectl` service account annotation).

## Review Notes
- The Dapr cryptography HTTP API (`v1.0-alpha1`) is still in alpha status. The blog correctly uses this version prefix, but readers should be aware the API may change.
- The blog correctly recommends Managed Identity over Service Principal authentication for production AKS deployments.
- Azure Key Vault `--sku premium` is correctly used for HSM-backed key storage, which aligns with the post's stated goals.
- The `az keyvault key create` operations (`encrypt decrypt wrapKey unwrapKey`) and `az keyvault set-policy` key permissions are all correct.
- The `az monitor diagnostic-settings create` command for audit logging is correct.
