# How to Fix Azure Disk Encryption Errors on Windows and Linux Virtual Machines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Disk Encryption, Virtual Machine, BitLocker, Dm-crypt, Security, Troubleshooting

Description: Troubleshoot and resolve Azure Disk Encryption failures on Windows and Linux VMs including Key Vault configuration errors and encryption extension issues.

---

Azure Disk Encryption (ADE) uses BitLocker on Windows and DM-Crypt on Linux to provide volume encryption for OS and data disks on Azure Virtual Machines. It integrates with Azure Key Vault to manage encryption keys. When it works, encryption is transparent to the VM and its applications. When it fails, you get cryptic error messages, stuck provisioning states, and VMs that refuse to boot.

Microsoft has announced that Azure Disk Encryption is scheduled for retirement on September 15, 2028. Use encryption at host for new VMs where possible, and treat ADE troubleshooting as a path to stabilize or migrate existing workloads.

I have worked through ADE failures on both Windows and Linux VMs across dozens of environments. The errors follow predictable patterns, and once you understand the Key Vault integration requirements and the encryption extension lifecycle, most issues resolve quickly.

## Prerequisites That Must Be Right

Before troubleshooting specific errors, verify that all ADE prerequisites are met. Missing prerequisites account for the majority of encryption failures.

**Key Vault configuration.** The Key Vault must have soft-delete enabled, and purge protection is recommended to protect encryption material from accidental or malicious deletion. The vault must also have the advanced access policy that enables Azure Disk Encryption for volume encryption, or the required permissions for any user-assigned identity or legacy Microsoft Entra app that you use.

```bash
# Verify Key Vault is configured correctly for ADE

az keyvault show --name myKeyVault \
  --query "{softDeleteEnabled:properties.enableSoftDelete, purgeProtection:properties.enablePurgeProtection, enabledForDiskEncryption:properties.enabledForDiskEncryption}" \
  -o json
```

If `enabledForDiskEncryption` is false, enable it:

```bash
# Enable the Key Vault for disk encryption
az keyvault update --name myKeyVault --enabled-for-disk-encryption true
```

**VM size compatibility.** Not all VM sizes support ADE. Basic-tier VMs, A-series VMs, v6 series VMs, v7 series VMs and newer are not supported. Linux VMs need at least 2 GB of memory for data-volume-only encryption; for OS plus data-volume encryption, they need at least 8 GB when root (`/`) usage is 4 GB or less, and roughly twice the root filesystem usage when root usage is greater than 4 GB.

**OS compatibility.** ADE supports specific OS images. For Linux, the supported list includes selected Azure-endorsed Ubuntu, RHEL, CentOS/OpenLogic, Oracle Linux, CBL-Mariner/Azure Linux, and SUSE images; do not assume every distribution version is supported. For Windows, use versions that support BitLocker and meet BitLocker requirements. Custom images may need additional preparation.

## Error: Key Vault Access Denied

This is the most common ADE error. The encryption extension cannot access the Key Vault to retrieve or store encryption keys.

```text
"Azure Disk Encryption failed with error: Key Vault
https://mykeyvault.vault.azure.net/ is not accessible."
```

Check the access configuration.

```bash
# If using access policies, verify the relevant identity or legacy app has access
az keyvault show --name myKeyVault --query "properties.accessPolicies[?objectId=='your-sp-object-id']" -o json

# If using RBAC, check role assignments on the Key Vault
az role assignment list --scope "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.KeyVault/vaults/myKeyVault" -o table
```

If the Key Vault has network restrictions (firewall rules), make sure the VM's network can reach the Key Vault. If the Key Vault uses private endpoints, the VM must be able to resolve the private endpoint DNS name.

```bash
# Check Key Vault network rules
az keyvault show --name myKeyVault --query "properties.networkAcls" -o json

# If default action is Deny, add the VM's VNet/subnet or enable trusted services
az keyvault network-rule add \
  --name myKeyVault \
  --subnet "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Network/virtualNetworks/myVNet/subnets/mySubnet"
```

## Error: Encryption Extension Stuck in Transitioning State

Sometimes the ADE extension gets stuck during provisioning. The encryption shows as "transitioning" in the portal for hours without completing.

```bash
# Check the extension status on the VM
# Use AzureDiskEncryption on Windows and AzureDiskEncryptionForLinux on Linux
az vm extension show \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --name AzureDiskEncryption \
  --query "{provisioningState:provisioningState, message:instanceView.statuses[0].message}" \
  -o json
```

On Linux, OS disk encryption can take 3 to 16 hours on a stock gallery image, and large data disks can take longer. Check the extension status and logs before taking recovery action. If encryption failed and the OS disk was part of the operation, restore the VM from the snapshot or backup taken before encryption. If only data disks were encrypted, disable encryption first and then remove the extension.

```bash
# Disable encryption for data disks before removing the extension
az vm encryption disable \
  --resource-group myResourceGroup \
  --name myVM \
  --volume-type DATA

# Remove the extension after encryption is disabled
# Use AzureDiskEncryption on Windows and AzureDiskEncryptionForLinux on Linux
az vm extension delete \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --name AzureDiskEncryptionForLinux

# Re-enable encryption
az vm encryption enable \
  --resource-group myResourceGroup \
  --name myVM \
  --disk-encryption-keyvault myKeyVault \
  --volume-type All
```

## Error: Linux VM Fails to Boot After OS Disk Encryption

Linux OS disk encryption is more complex than data disk encryption because it requires modifying the boot process. If something goes wrong, the VM cannot boot.

Common causes:
- Insufficient disk space in /boot or /boot/efi
- The initramfs does not include the dm-crypt modules
- Custom fstab entries that reference devices by path instead of UUID

Before encrypting a Linux OS disk, verify:

```bash
# Check /boot partition has enough free space
df -h /boot

# Check /boot/efi has enough space for EFI-based VMs
df -h /boot/efi

# Verify fstab uses UUIDs, not device paths
# Device paths can change after encryption
cat /etc/fstab
```

If the VM fails to boot after encryption, use the Azure Serial Console or boot diagnostics to view the console output. If you see "Failed to mount /boot" or "dm-crypt not found," the initramfs needs to be regenerated.

To recover, attach the OS disk to a rescue VM:

```bash
# Create a rescue VM and attach the encrypted OS disk as a data disk
az vm repair create \
  --resource-group myResourceGroup \
  --name myVM \
  --repair-username azureuser \
  --repair-password 'TempPassword123!' \
  --unlock-encrypted-vm

# Access the rescue VM and troubleshoot the boot issue
# The encrypted disk is mounted under /rescue
```

## Error: Windows BitLocker PIN Prompt

On Windows VMs, if BitLocker is configured to require a PIN or USB key at boot, the VM will hang waiting for input. Azure VMs cannot interact with the pre-boot BitLocker screen.

ADE uses the BitLocker external key protector for Windows VMs, which does not require a PIN. But if someone manually modifies the BitLocker configuration after ADE is enabled, they can accidentally introduce a PIN requirement.

To fix this, use the Azure Serial Console to access the Special Administration Console (SAC) and remove the PIN protector.

## Error: Encryption of Data Disks Fails with Size Error

ADE can fail if the filesystem cannot be checked, resized, unmounted, or remounted during encryption. Before encrypting data disks, make sure they are formatted, mounted, and listed correctly in `/etc/fstab` on Linux or initialized with drive letters or mount points on Windows.

```bash
# Check disk sizes before encryption
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query "storageProfile.{osDisk:osDisk.diskSizeGb, dataDisks:dataDisks[].{lun:lun, size:diskSizeGb}}" \
  -o json
```

## Using Key Encryption Keys (KEK)

For additional security, wrap the disk encryption key with a Key Encryption Key stored in Key Vault. This adds a layer of protection and is recommended for production workloads.

```bash
# Create a KEK in Key Vault
az keyvault key create --vault-name myKeyVault --name myKEK --kty RSA --size 4096

# Enable encryption with a KEK
az vm encryption enable \
  --resource-group myResourceGroup \
  --name myVM \
  --disk-encryption-keyvault myKeyVault \
  --key-encryption-key myKEK \
  --key-encryption-keyvault myKeyVault \
  --volume-type All
```

## Checking Encryption Status

After enabling encryption, verify it completed successfully.

```bash
# Check encryption status for all disks on the VM
az vm encryption show \
  --resource-group myResourceGroup \
  --name myVM \
  -o json
```

The output shows the encryption status for the VM and disks. You can query `substatus` for the overall extension status, and `disks[*].[name, statuses[*].displayStatus]` to inspect per-disk status. For Linux, also verify inside the guest with tools such as `lsblk`, because Azure can stamp encryption settings before guest-level encryption has fully completed.

## Alternatives to ADE

If ADE is causing too many issues, consider these alternatives:

**Server-Side Encryption (SSE) with customer-managed keys.** This encrypts managed disks at the storage layer using keys you manage in Key Vault. No VM extension needed, no boot issues, and it works with all VM sizes.

**Encryption at host.** Encrypts data on the VM host itself, including temp disks and OS/data disk caches. Also requires no extension.

**Confidential disk encryption.** For confidential VMs using AMD SEV-SNP, the disk encryption key is tied to the VM's hardware attestation.

```bash
# Enable server-side encryption with customer-managed keys
# First create a disk encryption set
az disk-encryption-set create \
  --resource-group myResourceGroup \
  --name myDiskEncryptionSet \
  --key-url "https://mykeyvault.vault.azure.net/keys/myKey/version" \
  --source-vault "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.KeyVault/vaults/myKeyVault"
```

ADE errors are frustrating because they often leave VMs in a broken state. Always take a snapshot of your disks before enabling encryption, verify all prerequisites are met, and test on a non-production VM first. Because ADE is retiring, plan to migrate existing ADE workloads to encryption at host before September 15, 2028. If ADE proves too problematic for your environment, server-side encryption with customer-managed keys provides storage-layer encryption with less operational risk.
