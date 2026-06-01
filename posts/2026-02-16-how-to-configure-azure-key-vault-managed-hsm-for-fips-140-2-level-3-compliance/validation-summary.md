# Validation Summary: How to Configure Azure Key Vault Managed HSM for FIPS 140-2 Level 3 Compliance

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Key Vault Managed HSM
- Azure Key Vault Premium HSM-protected keys
- FIPS 140-3 and FIPS 140-2 cryptographic module validation
- Azure CLI
- Managed HSM security domains
- Managed HSM local RBAC
- Azure Key Vault key operations
- Azure SDK for Python
- Azure Monitor diagnostic settings and KQL
- Managed HSM backup and network rules

## Sources Consulted
- Microsoft Learn: What is Azure Key Vault Managed HSM? https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/overview
- Microsoft Learn: HSM firmware update for Azure Key Vault Managed HSM and Azure Key Vault Premium. https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/firmware-update
- Microsoft Learn: About keys in Azure Key Vault. https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys
- Microsoft Learn: Quickstart - Provision and activate a Managed HSM using Azure CLI. https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/quick-create-cli
- Microsoft Learn: Security domain in Managed HSM overview. https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/security-domain
- Microsoft Learn: Managed HSM local RBAC built-in roles. https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/built-in-roles
- Microsoft Learn: Managed HSM role management. https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/role-management
- Microsoft Learn: Key types, algorithms, and operations. https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys-details
- Microsoft Learn: Azure CLI az keyvault reference. https://learn.microsoft.com/en-us/cli/azure/keyvault
- Microsoft Learn: Azure CLI az keyvault key reference. https://learn.microsoft.com/en-us/cli/azure/keyvault/key
- Microsoft Learn: Azure CLI az keyvault security-domain reference. https://learn.microsoft.com/en-us/cli/azure/keyvault/security-domain
- Microsoft Learn: Azure CLI az keyvault backup reference. https://learn.microsoft.com/en-us/cli/azure/keyvault/backup
- Microsoft Learn: Azure CLI az keyvault role assignment reference. https://learn.microsoft.com/en-us/cli/azure/keyvault/role/assignment
- Microsoft Learn: Azure CLI az keyvault network-rule reference. https://learn.microsoft.com/en-us/cli/azure/keyvault/network-rule
- Microsoft Learn: Managed HSM logging and Azure Monitor queries. https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/logging and https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/logging-azure-monitor
- Microsoft Learn: Python Azure Key Vault CryptographyClient. https://learn.microsoft.com/en-us/python/api/azure-keyvault-keys/azure.keyvault.keys.crypto.cryptographyclient

## Issues Found
- The post described Azure Key Vault Managed HSM as FIPS 140-2 Level 3. Current Microsoft documentation states Managed HSM uses FIPS 140-3 Level 3 validated HSM modules. Updated the title, metadata, overview, FIPS explanation, and conclusion accordingly.
- The comparison with standard Azure Key Vault was outdated. Updated it to distinguish standard software-protected keys, Premium HSM-protected keys, current FIPS 140-3 Level 3 HSM platform behavior, and older FIPS 140-2 Level 2 key versions.
- The FIPS Level 3 description was too absolute about zeroization. Reworded it to describe tamper detection, response, and protection or zeroization of sensitive security parameters more accurately.
- Managed HSM local RBAC role descriptions were incorrect. Updated Administrator, Crypto Officer, Crypto User, Crypto Service Encryption User, and Policy Administrator descriptions to match Microsoft documentation.
- The role assignment example assigned Managed HSM Crypto Officer for general key management. Updated it to Managed HSM Crypto User, which is the role that grants key management and cryptographic operations except privileged deleted-key/export actions.
- The RSA encryption CLI example passed a base64 string while declaring `--data-type plaintext`. Changed the value to literal plaintext.
- The ECDSA signing CLI example used an invalid short digest for ES256. Replaced it with a base64-encoded SHA-256 digest.
- The KQL example projected `identity_claim_upn_s`, which is not the documented Managed HSM diagnostic field shape. Updated it to parse the UPN from `identity_s`.
- The Managed HSM backup command used `--blob-container-url`, which is not an Azure CLI option. Replaced it with `--storage-resource-uri`.

## Review Notes
Azure CLI was not installed in the local workspace, so CLI validation was performed against current Microsoft Learn Azure CLI reference pages rather than by executing `az --help` locally.
