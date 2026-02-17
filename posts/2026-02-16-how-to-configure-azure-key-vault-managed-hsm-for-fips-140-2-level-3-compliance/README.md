# How to Configure Azure Key Vault Managed HSM for FIPS 140-2 Level 3 Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Key Vault, Managed HSM, FIPS 140-2, Compliance, Cryptography, Key Management, Security

Description: A complete guide to setting up Azure Key Vault Managed HSM for organizations that require FIPS 140-2 Level 3 validated hardware security modules.

---

Standard Azure Key Vault uses software-protected keys or keys backed by FIPS 140-2 Level 2 validated HSMs. For many organizations, that is sufficient. But if you work in financial services, government, healthcare, or any industry with strict cryptographic requirements, you may need FIPS 140-2 Level 3 validation. That is where Azure Key Vault Managed HSM comes in.

Managed HSM gives you a dedicated, single-tenant HSM pool that meets FIPS 140-2 Level 3 standards. You get full administrative control over the cryptographic keys, and the HSMs are managed by Azure infrastructure so you do not have to deal with hardware maintenance. This guide covers the full setup process, from provisioning to key operations.

## What Makes FIPS 140-2 Level 3 Different

FIPS 140-2 is a US government standard for cryptographic modules. Level 3 adds physical tamper-resistance and tamper-evidence requirements on top of the Level 2 baseline. Specifically:

- **Level 2**: Requires role-based authentication and physical tamper-evidence (like seals or coatings)
- **Level 3**: Adds tamper-resistance mechanisms that actively destroy keys if physical tampering is detected, plus identity-based authentication

For practical purposes, Level 3 means the HSM hardware will zeroize (permanently erase) its keys if someone tries to physically access the internal components. This matters when your compliance framework requires it, and several do - PCI DSS, FedRAMP High, and various banking regulations.

## Prerequisites

Before you begin:

- Azure subscription with sufficient permissions (Contributor at the subscription or resource group level)
- Azure CLI version 2.45 or later
- At least 3 RSA key pairs for the security domain (I will explain this below)
- Understanding that Managed HSM has different pricing than standard Key Vault - you pay per HSM pool per hour plus per-operation charges

## Step 1: Provision the Managed HSM Pool

Create the Managed HSM pool with the Azure CLI. You need to specify at least one administrator who will have initial access.

```bash
# Create a resource group for the Managed HSM
az group create \
  --name hsm-resource-group \
  --location eastus2

# Provision the Managed HSM pool
# The --administrators flag takes the object IDs of users or service principals
az keyvault create \
  --hsm-name contoso-managed-hsm \
  --resource-group hsm-resource-group \
  --location eastus2 \
  --administrators "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" \
  --sku Standard_B1 \
  --retention-days 90
```

Provisioning takes about 20-30 minutes. The HSM pool is not usable until you complete the security domain activation, which is the next step.

Check the provisioning status with this command.

```bash
# Check the provisioning state of the Managed HSM
az keyvault show --hsm-name contoso-managed-hsm --query 'properties.provisioningState'
```

Wait until the state changes from `Provisioning` to `Succeeded`.

## Step 2: Download the Security Domain

The security domain is what makes Managed HSM unique. It contains the encrypted master keys for your HSM pool, and only you hold the decryption keys. Microsoft cannot access your HSM data without the security domain, which provides true customer-controlled key sovereignty.

First, generate RSA key pairs that will be used to encrypt the security domain. You need at least 3 key pairs and must set a quorum (minimum number of keys required to restore the security domain).

```bash
# Generate 3 RSA key pairs for security domain encryption
openssl req -newkey rsa:2048 -nodes -keyout sd-key1.pem -x509 -days 365 -out sd-cert1.pem -subj "/CN=SD Key 1"
openssl req -newkey rsa:2048 -nodes -keyout sd-key2.pem -x509 -days 365 -out sd-cert2.pem -subj "/CN=SD Key 2"
openssl req -newkey rsa:2048 -nodes -keyout sd-key3.pem -x509 -days 365 -out sd-cert3.pem -subj "/CN=SD Key 3"
```

Now download the security domain, encrypting it with your certificates. The quorum here is set to 2, meaning any 2 of the 3 key pairs can restore the security domain.

```bash
# Download and encrypt the security domain with a quorum of 2
az keyvault security-domain download \
  --hsm-name contoso-managed-hsm \
  --sd-wrapping-keys sd-cert1.pem sd-cert2.pem sd-cert3.pem \
  --sd-quorum 2 \
  --security-domain-file contoso-security-domain.json
```

This step activates the HSM pool. After this completes, your Managed HSM is fully operational.

**Store these files securely.** The security domain file and the private keys are critical for disaster recovery. If you lose them and the HSM pool is deleted, your keys are gone permanently. Store copies in multiple secure locations - a safe deposit box, a separate secured storage account, or your organization's key ceremony vault.

## Step 3: Configure Role-Based Access Control

Managed HSM uses its own local RBAC system, separate from Azure RBAC. The built-in roles are:

- **Managed HSM Administrator** - full control over the HSM, including role assignments
- **Managed HSM Crypto Officer** - can manage keys (create, delete, rotate) but not role assignments
- **Managed HSM Crypto User** - can use keys for cryptographic operations but not manage them
- **Managed HSM Crypto Service Encryption User** - can wrap and unwrap keys, designed for service-level encryption
- **Managed HSM Policy** - can manage role assignments

Assign roles based on the principle of least privilege.

```bash
# Assign the Crypto Officer role to a user for key management
az keyvault role assignment create \
  --hsm-name contoso-managed-hsm \
  --role "Managed HSM Crypto Officer" \
  --assignee "user@contoso.com" \
  --scope "/"

# Assign the Crypto User role to an application for key operations
az keyvault role assignment create \
  --hsm-name contoso-managed-hsm \
  --role "Managed HSM Crypto User" \
  --assignee "bbbbbbbb-cccc-dddd-eeee-ffffffffffff" \
  --scope "/keys/encryption-key"
```

Notice the `--scope` parameter. You can scope role assignments to the entire HSM (`/`) or to specific keys (`/keys/{key-name}`). Scoping to individual keys is a powerful way to limit which applications can access which keys.

## Step 4: Create Cryptographic Keys

Now that the HSM is active and roles are assigned, create your first key.

```bash
# Create an RSA 3072-bit key for encryption
az keyvault key create \
  --hsm-name contoso-managed-hsm \
  --name encryption-key \
  --kty RSA-HSM \
  --size 3072 \
  --ops encrypt decrypt wrapKey unwrapKey

# Create an EC P-256 key for signing
az keyvault key create \
  --hsm-name contoso-managed-hsm \
  --name signing-key \
  --kty EC-HSM \
  --curve P-256 \
  --ops sign verify
```

The `--kty` values ending in `-HSM` indicate that the keys are generated and stored inside the HSM hardware. They never leave the HSM boundary in plaintext. The `--ops` flag restricts which operations the key can perform, adding another layer of defense.

## Step 5: Perform Key Operations

Here is how to use the keys for common cryptographic operations.

```bash
# Encrypt data with the RSA key
az keyvault key encrypt \
  --hsm-name contoso-managed-hsm \
  --name encryption-key \
  --algorithm RSA-OAEP-256 \
  --value "SGVsbG8gV29ybGQ=" \
  --data-type plaintext

# Sign data with the EC key
az keyvault key sign \
  --hsm-name contoso-managed-hsm \
  --name signing-key \
  --algorithm ES256 \
  --digest "dGVzdCBkaWdlc3Q="
```

In real applications, you would use the Azure SDK rather than the CLI for key operations. Here is a Python example.

```python
# Python example using the Azure SDK for Managed HSM key operations
from azure.identity import DefaultAzureCredential
from azure.keyvault.keys.crypto import CryptographyClient, EncryptionAlgorithm

credential = DefaultAzureCredential()

# Create a cryptography client for the specific key
crypto_client = CryptographyClient(
    key_id="https://contoso-managed-hsm.managedhsm.azure.net/keys/encryption-key",
    credential=credential
)

# Encrypt plaintext data
plaintext = b"Sensitive financial data"
result = crypto_client.encrypt(EncryptionAlgorithm.rsa_oaep_256, plaintext)
print(f"Encrypted {len(result.ciphertext)} bytes")

# Decrypt the ciphertext
decrypted = crypto_client.decrypt(EncryptionAlgorithm.rsa_oaep_256, result.ciphertext)
print(f"Decrypted: {decrypted.plaintext.decode()}")
```

## Step 6: Enable Logging and Monitoring

For compliance, you need to log all access to the HSM. Managed HSM integrates with Azure Monitor diagnostic settings.

```bash
# Enable diagnostic logging to a Log Analytics workspace
az monitor diagnostic-settings create \
  --name hsm-audit-logs \
  --resource "/subscriptions/YOUR_SUB/resourceGroups/hsm-resource-group/providers/Microsoft.KeyVault/managedHSMs/contoso-managed-hsm" \
  --workspace "/subscriptions/YOUR_SUB/resourceGroups/hsm-resource-group/providers/Microsoft.OperationalInsights/workspaces/your-workspace" \
  --logs '[{"category":"AuditEvent","enabled":true,"retentionPolicy":{"enabled":true,"days":365}}]'
```

Once logging is enabled, you can query the audit logs with KQL.

```kql
// Query HSM audit logs for key operations in the last 24 hours
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where Resource == "CONTOSO-MANAGED-HSM"
| where TimeGenerated > ago(24h)
| project TimeGenerated, OperationName, CallerIPAddress, Identity = identity_claim_upn_s, ResultType
| order by TimeGenerated desc
```

## Step 7: Configure Backup and Disaster Recovery

Managed HSM supports full backup and restore, which is critical for business continuity.

```bash
# Create a full backup of the Managed HSM to a storage container
az keyvault backup start \
  --hsm-name contoso-managed-hsm \
  --storage-container-SAS-token "YOUR_SAS_TOKEN" \
  --blob-container-url "https://backupstorage.blob.core.windows.net/hsm-backups"
```

To restore from a backup, you need the security domain keys (from Step 2) and a new Managed HSM pool in the target region. This is why protecting those security domain keys is so critical.

## Network Security

By default, Managed HSM is accessible from the public internet (with authentication). For production, restrict network access.

```bash
# Restrict access to specific virtual networks and IP addresses
az keyvault update-hsm \
  --hsm-name contoso-managed-hsm \
  --default-action Deny \
  --bypass AzureServices

# Add a virtual network rule
az keyvault network-rule add \
  --hsm-name contoso-managed-hsm \
  --vnet-name production-vnet \
  --subnet app-subnet
```

You can also use Azure Private Link to access Managed HSM entirely through private IP addresses, eliminating public internet exposure.

## Wrapping Up

Azure Key Vault Managed HSM fills an important gap for organizations that need FIPS 140-2 Level 3 validated key management in the cloud. The setup process involves more steps than standard Key Vault, particularly around the security domain ceremony, but the result is a fully managed HSM that gives you cryptographic sovereignty without the burden of managing physical hardware. Take the security domain protection seriously, implement proper RBAC, enable audit logging from day one, and you will have a solid foundation for compliance-grade key management.
