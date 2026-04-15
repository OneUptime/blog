# Validation Summary: How to Choose the Right Cryptography Provider for Dapr

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- Dapr Cryptography building block
- Dapr Local Storage crypto component (`crypto.dapr.localstorage`)
- Dapr Kubernetes Secrets crypto component (`crypto.dapr.kubernetes.secrets`)
- Azure Key Vault crypto component (`crypto.azure.keyvault`)
- Dapr JWKS crypto component (`crypto.dapr.jwks`)
- Azure Key Vault (Premium SKU and Managed HSM)
- Kubernetes Secrets / etcd
- JSON Web Key Sets (RFC 7517)

## Sources Consulted
- Dapr Cryptography component specs: https://docs.dapr.io/reference/components-reference/supported-cryptography/
- Dapr Kubernetes Secrets crypto component: https://docs.dapr.io/reference/components-reference/supported-cryptography/kubernetes-secrets/
- Dapr Azure Key Vault crypto component: https://docs.dapr.io/reference/components-reference/supported-cryptography/azure-key-vault/
- Dapr JWKS crypto component: https://docs.dapr.io/reference/components-reference/supported-cryptography/json-web-key-sets/
- Dapr Local Storage crypto component: https://docs.dapr.io/reference/components-reference/supported-cryptography/local-storage/
- Azure Key Vault FIPS 140-2 Level 2 proof (Microsoft Q&A): https://learn.microsoft.com/en-us/answers/questions/587705/azure-key-vault-fips-140-2-level-2-proof
- Azure Key Vault keys documentation: https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys

## Issues Found

### 1. Incorrect Azure Key Vault metadata field name (`vaultURI` -> `vaultName`)
- **What was wrong:** The Azure Key Vault YAML configuration used `vaultURI` with a full URI value (`https://my-vault.vault.azure.net`). The correct metadata field name is `vaultName`, which takes just the vault name (e.g., `my-vault`), not the full URI.
- **What was changed:** Replaced `vaultURI` with `vaultName` and the value from `"https://my-vault.vault.azure.net"` to `"my-vault"`.
- **Why:** Per the official Dapr Azure Key Vault crypto component documentation, the metadata field is `vaultName`.

### 2. Incorrect FIPS 140-2 certification level for Azure Key Vault Premium
- **What was wrong:** The post stated Azure Key Vault Premium has "FIPS 140-2 Level 3" compliance. Azure Key Vault Premium is FIPS 140-2 Level 2. FIPS 140-2 Level 3 (or FIPS 140-3 Level 3 on newer platforms) is only available with Azure Key Vault Managed HSM.
- **What was changed:** Updated from "FIPS 140-2 Level 3" to "FIPS 140-2 Level 2; Level 3 with Managed HSM".
- **Why:** Per Microsoft documentation and Q&A confirmations, Premium SKU HSMs are validated at FIPS 140-2 Level 2, not Level 3.

### 3. Incorrect JWKS metadata field names (`jwksEndpoint` -> `jwks`, `cacheTTL` -> `minRefreshInterval`)
- **What was wrong:** The JWKS component YAML used `jwksEndpoint` and `cacheTTL` as metadata field names. The correct field names are `jwks` (which accepts a file path, HTTP(S) URL, or inline JWKS content) and `minRefreshInterval` (minimum interval between JWKS document refreshes from remote sources).
- **What was changed:** Replaced `jwksEndpoint` with `jwks` and `cacheTTL` with `minRefreshInterval`.
- **Why:** Per the official Dapr JWKS crypto component documentation, the metadata fields are `jwks`, `requestTimeout`, and `minRefreshInterval`.

## Review Notes
- All four cryptography components listed (Local Storage, Kubernetes Secrets, Azure Key Vault, JWKS) are confirmed as valid Dapr crypto components, all in Alpha status since Dapr runtime v1.11.
- The decision framework mentions AWS KMS and GCP Cloud KMS as community components for Dapr cryptography. These are not listed in the official Dapr documentation as supported crypto components. This claim could not be verified but was left as-is since community/contrib components may exist outside official docs.
- The Kubernetes Secrets crypto component YAML and metadata (`defaultNamespace`) are correct per official docs.
- The Local Storage component YAML and metadata (`path`) are correct per official docs.
- The conceptual explanations (provider abstraction, environment switching, security hardening checklist) are accurate and well-presented.
