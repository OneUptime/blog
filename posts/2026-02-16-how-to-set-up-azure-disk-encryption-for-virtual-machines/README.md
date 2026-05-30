# How to Set Up Azure Disk Encryption for Virtual Machines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Disk Encryption, Virtual Machine, Security, Key Vault, BitLocker, Dm-crypt

Description: A complete guide to enabling Azure Disk Encryption on virtual machines using BitLocker for Windows and dm-crypt for Linux with Azure Key Vault.

---

Data at rest encryption is a fundamental security requirement for most organizations, whether driven by compliance regulations like HIPAA, PCI DSS, or GDPR, or simply by good security practices. Azure Disk Encryption (ADE) encrypts your VM's OS and data disks using industry-standard encryption - BitLocker on Windows and dm-crypt on Linux. The encryption keys are stored in Azure Key Vault, giving you centralized key management and access control.

In this guide, I will walk through the setup process for both Linux and Windows VMs, including Key Vault configuration, encryption enablement, and monitoring.

Note: Azure Disk Encryption is scheduled for retirement on September 15, 2028. Microsoft recommends using encryption at host for new VMs and migrating ADE-enabled workloads before that date.

## How Azure Disk Encryption Works

Azure Disk Encryption integrates with Azure Key Vault to manage encryption keys. Here is the flow:

1. You create a Key Vault and generate (or import) encryption keys.
2. When you enable encryption on a VM, Azure installs the ADE extension.
3. The extension retrieves the encryption key from Key Vault.
4. On Windows, BitLocker encrypts the volumes. On Linux, dm-crypt encrypts the volumes.
5. The encryption key is wrapped by a Key Encryption Key (KEK) in Key Vault for additional security.
6. The encrypted data is transparent to the OS and applications - they read and write normally while the encryption layer handles everything.

```mermaid
flowchart LR
    VM[Azure VM] --> ADE[ADE Extension]
    ADE --> KV[Azure Key Vault]
    KV --> BEK[BitLocker/dm-crypt Key]
    KV --> KEK[Key Encryption Key]
    ADE --> Disks[Encrypted Disks]
```

## ADE vs. Server-Side Encryption

Azure provides several disk encryption options, including Server-Side Encryption (SSE), encryption at host, confidential disk encryption, and Azure Disk Encryption (ADE). It is worth understanding the difference between the two options you will most often compare with ADE:

**Server-Side Encryption (SSE)**: Enabled by default on all managed disks. Encrypts data at the storage layer using platform-managed keys by default, or customer-managed keys when configured with a Disk Encryption Set. The encryption happens automatically and transparently, but SSE alone does not encrypt temporary disks or disk caches.

**Azure Disk Encryption (ADE)**: Encrypts data inside the VM using BitLocker or dm-crypt. You control the keys through Key Vault. This provides encryption at the guest OS level.

For many compliance requirements, SSE (which is already enabled by default) is sufficient. ADE provides guest-level encryption and satisfies requirements that mandate BitLocker or dm-crypt encryption inside the VM.

## Prerequisites

Before enabling ADE:

- Back up or snapshot the VM before enabling encryption. Managed disk VMs require a backup before encryption.
- The VM size and OS image must support encryption (basic-tier VMs, v6 series, v7 series and newer, and several specialized disk scenarios are not supported).
- You need a Key Vault in the same region and tenant as the VM.
- The Key Vault must have the "enabledForDiskEncryption" property set to true.

## Step 1: Create a Key Vault

Create a Key Vault configured for disk encryption:

```bash
# Create a Key Vault enabled for disk encryption

az keyvault create \
  --resource-group myResourceGroup \
  --name myEncryptionVault \
  --location eastus \
  --enabled-for-disk-encryption true \
  --sku standard
```

The `--enabled-for-disk-encryption` flag is critical. Without it, ADE cannot access the vault.

If you already have a Key Vault, enable the property:

```bash
# Enable disk encryption access on an existing Key Vault
az keyvault update \
  --resource-group myResourceGroup \
  --name myExistingVault \
  --enabled-for-disk-encryption true
```

## Step 2: Create a Key Encryption Key (Recommended)

While not strictly required, using a Key Encryption Key (KEK) adds an additional layer of security. The KEK wraps the BitLocker or dm-crypt encryption key, so even if someone gets the volume encryption key, they cannot use it without the KEK.

```bash
# Create a Key Encryption Key in the Key Vault
az keyvault key create \
  --vault-name myEncryptionVault \
  --name myKEK \
  --kty RSA \
  --size 4096 \
  --protection software
```

For higher security, use `--protection hsm` to store the key in a hardware security module (requires a Premium SKU Key Vault).

## Step 3: Enable Encryption on a Linux VM

Enable encryption on all volumes (OS disk and data disks):

```bash
# Enable Azure Disk Encryption on a Linux VM with a KEK
az vm encryption enable \
  --resource-group myResourceGroup \
  --name myLinuxVM \
  --disk-encryption-keyvault myEncryptionVault \
  --key-encryption-key myKEK \
  --volume-type All
```

The `--volume-type` parameter accepts:
- `All`: Encrypt both OS and data disks.
- `OS`: Encrypt only the OS disk.
- `Data`: Encrypt only data disks.

For Linux VMs, there are some important notes:
- Encrypting or disabling encryption may cause the VM to reboot.
- Data disk encryption can happen while the VM is running, but mounted data disks are not usable while encryption is in progress.
- Supported Linux distributions are limited to specific Azure-endorsed images and versions. Check the current Azure Disk Encryption supported operating systems list before enabling ADE.
- The root partition must be on a standard filesystem (ext4, XFS).

## Step 4: Enable Encryption on a Windows VM

The process for Windows is similar:

```bash
# Enable Azure Disk Encryption on a Windows VM with a KEK
az vm encryption enable \
  --resource-group myResourceGroup \
  --name myWindowsVM \
  --disk-encryption-keyvault myEncryptionVault \
  --key-encryption-key myKEK \
  --volume-type All
```

On Windows, BitLocker handles the encryption. The process typically takes 30-60 minutes depending on disk size. The VM may restart during the encryption process.

## Monitoring Encryption Progress

Check the encryption status:

```bash
# Check the encryption status of a VM
az vm encryption show \
  --resource-group myResourceGroup \
  --name myLinuxVM \
  --output json
```

The output shows the encryption status for each disk:

```json
{
  "disks": [
    {
      "encryptionSettings": null,
      "name": "myLinuxVM_OsDisk",
      "statuses": [
        {
          "code": "EncryptionState/encrypted",
          "displayStatus": "Encryption is enabled on disk",
          "level": "Info"
        }
      ]
    }
  ],
  "status": [
    {
      "code": "ProvisioningState/succeeded",
      "displayStatus": "Provisioning succeeded",
      "level": "Info"
    }
  ]
}
```

If encryption is in progress, you will see a status of `EncryptionState/EncryptionInProgress`.

## Encrypting Only Data Disks

For VMs where OS disk encryption is not required or not supported:

```bash
# Encrypt only data disks
az vm encryption enable \
  --resource-group myResourceGroup \
  --name myLinuxVM \
  --disk-encryption-keyvault myEncryptionVault \
  --key-encryption-key myKEK \
  --volume-type Data
```

This is useful when you have sensitive data on separate disks but do not need to encrypt the OS disk.

On Windows VMs, Azure Disk Encryption can encrypt the OS disk alone or all disks together. Encrypting only data disks is not supported for Windows VMs.

## Enabling Encryption at Scale

For multiple VMs, script the process:

```bash
#!/bin/bash
# Enable disk encryption on all VMs in a resource group

RESOURCE_GROUP="myResourceGroup"
KEYVAULT="myEncryptionVault"
KEK="myKEK"

# Get all VM names
VM_NAMES=$(az vm list \
  --resource-group $RESOURCE_GROUP \
  --query "[].name" \
  --output tsv)

for VM_NAME in $VM_NAMES; do
  # Check if already encrypted
  STATUS=$(az vm encryption show \
    --resource-group $RESOURCE_GROUP \
    --name $VM_NAME \
    --query "disks[0].statuses[0].code" \
    --output tsv 2>/dev/null)

  if [[ "$STATUS" == *"encrypted"* ]]; then
    echo "$VM_NAME is already encrypted. Skipping."
  else
    echo "Encrypting $VM_NAME..."
    az vm encryption enable \
      --resource-group $RESOURCE_GROUP \
      --name $VM_NAME \
      --disk-encryption-keyvault $KEYVAULT \
      --key-encryption-key $KEK \
      --volume-type All
    echo "$VM_NAME encryption initiated."
  fi
done
```

## Verifying Encryption from Inside the VM

You can verify encryption is active from within the VM.

On Linux:

```bash
# Check dm-crypt status
sudo lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,FSTYPE
sudo cryptsetup status /dev/mapper/*

# Check if dm-crypt is in use
sudo dmsetup status
```

On Windows:

```powershell
# Check BitLocker status
manage-bde -status

# Or use PowerShell
Get-BitLockerVolume
```

## Key Rotation

Regularly rotating encryption keys is a security best practice:

```bash
# Create a new KEK version
az keyvault key create \
  --vault-name myEncryptionVault \
  --name myKEK \
  --kty RSA \
  --size 4096

# Re-encrypt the VM with the new key version
KEK_URI=$(az keyvault key show \
  --vault-name myEncryptionVault \
  --name myKEK \
  --query key.kid \
  --output tsv)

az vm encryption enable \
  --resource-group myResourceGroup \
  --name myLinuxVM \
  --disk-encryption-keyvault myEncryptionVault \
  --key-encryption-key "$KEK_URI" \
  --volume-type All
```

Azure Disk Encryption does not automatically follow Azure Key Vault key auto-rotation. Re-run the encryption command with the new versioned KEK URL when you rotate the KEK. Encrypting or disabling encryption may cause the VM to reboot.

## Disabling Encryption

If you need to remove encryption (not recommended for production):

```bash
# Disable encryption on data volumes
az vm encryption disable \
  --resource-group myResourceGroup \
  --name myLinuxVM \
  --volume-type Data
```

Note: On Linux VMs, you can only disable encryption on data volumes, not the OS volume. On Windows, you can disable encryption on all volumes.

## Enforcing Encryption with Azure Policy

Ensure all VMs in your organization are encrypted:

```bash
# Assign the built-in policies to audit Linux and Windows VMs that do not use ADE or encryption at host
az policy assignment create \
  --name "audit-linux-vm-encryption" \
  --scope "/subscriptions/{sub-id}" \
  --policy "ca88aadc-6e2b-416c-9de2-5a0f01d1693f"

az policy assignment create \
  --name "audit-windows-vm-encryption" \
  --scope "/subscriptions/{sub-id}" \
  --policy "3dc5edcd-002d-444c-b216-e123bbfa37c0"
```

These policies audit VMs that do not have Azure Disk Encryption or encryption at host enabled and report them as non-compliant.

## Troubleshooting Common Issues

**Encryption fails with permission error**: Make sure the Key Vault has `enabledForDiskEncryption` set to true. If the vault firewall is enabled, allow Microsoft trusted services. Also verify that the account enabling encryption has the required permissions.

**Linux encryption fails on OS disk**: Check that the OS disk has enough free space (at least 5% free). dm-crypt needs space to set up the encryption layer.

**Windows encryption takes very long**: BitLocker encryption time depends on disk size. A 1 TB disk can take several hours. Check the status periodically rather than waiting.

**VM does not boot after encryption**: Check boot diagnostics for errors. In rare cases, you may need to disable encryption from the platform level and re-enable it.

**Encryption not supported on VM size**: Basic-tier VMs, v6 series, v7 series and newer, and some specialized disk scenarios do not support ADE. Resize to a supported size before enabling encryption.

## Best Practices

1. **Always use a KEK.** The additional layer of encryption makes key management more secure.
2. **Back up encryption keys.** Enable Key Vault soft delete and purge protection to prevent accidental key loss.
3. **Test encryption in dev/test first.** Verify that your application works correctly with encrypted disks before enabling in production.
4. **Monitor encryption status.** Use Azure Policy to continuously audit for VMs that do not use ADE or encryption at host.
5. **Plan for encryption time.** Initial encryption takes time, especially for large disks. Schedule it during a maintenance window.
6. **Use Premium SKU Key Vault for HSM-backed keys** if your compliance requirements mandate hardware key protection.

## Wrapping Up

Azure Disk Encryption provides guest-level encryption that satisfies compliance requirements and adds defense in depth to your security posture. The setup involves creating a Key Vault, generating a KEK, and running a single CLI command per VM. The encryption is transparent to applications and users - the most visible impacts are encryption time and possible reboots during the initial encryption process. For existing organizations handling sensitive data, ADE can still be part of the deployment checklist until its retirement date, but new VMs should use encryption at host instead.
