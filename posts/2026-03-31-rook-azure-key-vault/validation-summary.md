# Validation Summary: How to Set Up Azure Key Vault with Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Key Vault
- Rook-Ceph (ceph-csi)
- Azure CLI (`az`)
- Kubernetes (kubectl, StorageClass, ConfigMap, Secret)
- Azure Kubernetes Service (AKS) Workload Identity

## Sources Consulted
- ceph-csi KMS configuration examples (https://github.com/ceph/ceph-csi/blob/devel/examples/kms/vault/kms-config.yaml)
- Rook Key Management System documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/)
- ceph-csi Azure Key Vault feature (https://github.com/ceph/ceph-csi/issues/4421, https://github.com/ceph/ceph-csi/pull/4455)
- Rook v1.14.0 release notes (Azure Key Vault KMS support announcement)
- Azure CLI `az ad sp create-for-rbac` documentation (deprecation of `--skip-assignment`)
- Azure CLI `az keyvault set-policy` documentation

## Issues Found

1. **Incorrect Rook-Ceph version requirement**: Prerequisites listed "Rook-Ceph 1.12 or later" but Azure Key Vault KMS was added in ceph-csi v3.11 and first shipped with Rook v1.14. Changed to "Rook-Ceph 1.14 or later".

2. **Deprecated `--skip-assignment` flag**: The `az ad sp create-for-rbac --skip-assignment true` flag was deprecated in Azure CLI 2.36.0 and removed in later versions. Service principals are now created without role assignments by default. Removed the flag.

3. **Wrong authentication method**: The post described client secret-based authentication (`CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`), but ceph-csi's Azure Key Vault integration uses certificate-based authentication only. Changed Steps 2-4 to use `--create-cert` for service principal creation and store the certificate PEM file in the Kubernetes secret.

4. **Wrong KMS config key**: The post used `"encryptionKMSType": "azure-kv"` but ceph-csi uses `"KMS_PROVIDER": "azure-kv"` for Azure Key Vault. Fixed the config key name.

5. **Incorrect KMS config fields**: The post included `AZURE_VAULT_KEY_NAME`, `AZURE_VAULT_KEY_VERSION`, and `AZURE_CLIENT_SECRET` which do not exist in the ceph-csi Azure KV config. The correct fields are `AZURE_CLIENT_ID` (literal value), `AZURE_TENANT_ID` (literal value), and `AZURE_CERT_SECRET_NAME` (Kubernetes secret reference). Fixed the ConfigMap accordingly.

6. **Wrong KMS mechanism**: The post described envelope encryption where per-volume keys are "wrapped" using Azure Key Vault keys. In reality, ceph-csi stores per-volume encryption passphrases as secrets in Azure Key Vault (no key wrapping). Removed the unnecessary Step 2 (creating a Key Vault key) and corrected the Overview and Summary descriptions.

7. **Wrong Key Vault permissions**: The post granted key permissions (`get`, `wrapKey`, `unwrapKey`, `create`) but ceph-csi needs secret permissions (`get`, `set`, `delete`) since it stores passphrases as Key Vault secrets. Fixed both the service principal and Workload Identity permission grants.

## Review Notes
- The `--sku premium` on the Key Vault is no longer necessary since ceph-csi stores secrets (not HSM-backed keys), but it is not incorrect — a Premium SKU vault works fine for secret storage. Left as-is since it does not cause errors.
- The Workload Identity section is a high-level pointer and does not show the full federation setup (creating a federated identity credential). This is acceptable for a tutorial that focuses on the service principal path, but readers using Workload Identity will need additional steps from the Azure documentation.
- The StorageClass configuration (Step 6) is correct and matches the Rook documentation.
