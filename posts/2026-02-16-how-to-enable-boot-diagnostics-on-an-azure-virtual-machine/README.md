# How to Enable Boot Diagnostics on an Azure Virtual Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machine, Boot Diagnostics, Troubleshooting, Azure CLI, Monitoring, Cloud Infrastructure

Description: How to enable and use boot diagnostics on Azure VMs to troubleshoot boot failures, capture serial console output, and view screenshots.

---

When an Azure VM fails to boot or gets stuck during startup, you are flying blind without boot diagnostics. Unlike a physical server where you can plug in a monitor and watch the boot sequence, cloud VMs need boot diagnostics enabled to capture the serial console output and a screenshot of the VM screen. This information is invaluable when your VM is not responding and you cannot SSH or RDP into it.

In this guide, I will show you how to enable boot diagnostics, where to find the output, and how to use it for troubleshooting.

## What Boot Diagnostics Captures

Boot diagnostics provides two things:

1. **Serial console log**: A text log of everything the VM outputs to the serial port during boot. On Linux, this includes kernel messages, init system output, and any boot errors. On Windows, it includes the Special Administration Console (SAC) output.

2. **Screenshot**: A screenshot of the VM's display. This is essentially what you would see if you had a monitor connected. On Windows, this shows you the login screen, a blue screen of death, or whatever state the VM is stuck in. On Linux, the screenshot is less useful since most Linux VMs run headless, but it can still show GRUB menu issues or kernel panics.

## Enabling Boot Diagnostics on a New VM

When creating a new VM, boot diagnostics can be enabled with a single flag:

```bash
# Create a VM with boot diagnostics enabled using managed storage
az vm create \
  --resource-group myResourceGroup \
  --name myVM \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --boot-diagnostics-storage ""
```

The `--boot-diagnostics-storage ""` flag with an empty string tells Azure to use a managed storage account for the diagnostics data. This is the simplest approach - Azure handles the storage automatically.

If you want to use a specific storage account:

```bash
# Create a VM with boot diagnostics stored in a specific storage account
az vm create \
  --resource-group myResourceGroup \
  --name myVM \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --boot-diagnostics-storage mystorageaccount
```

## Enabling Boot Diagnostics on an Existing VM

If you have an existing VM without boot diagnostics, you can enable it without restarting the VM:

```bash
# Enable boot diagnostics with managed storage on an existing VM
az vm boot-diagnostics enable \
  --resource-group myResourceGroup \
  --name myVM
```

This uses managed storage by default. To specify a storage account:

```bash
# Enable boot diagnostics with a specific storage account
az vm boot-diagnostics enable \
  --resource-group myResourceGroup \
  --name myVM \
  --storage mystorageaccount
```

Or with the full storage account URI:

```bash
# Enable boot diagnostics with the storage account URI
az vm boot-diagnostics enable \
  --resource-group myResourceGroup \
  --name myVM \
  --storage https://mystorageaccount.blob.core.windows.net/
```

## Checking Boot Diagnostics Status

To verify whether boot diagnostics is enabled on a VM:

```bash
# Check if boot diagnostics is currently enabled
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query diagnosticsProfile.bootDiagnostics \
  --output json
```

This returns something like:

```json
{
  "enabled": true,
  "storageUri": null
}
```

A `null` storageUri with `enabled: true` means managed storage is being used.

## Viewing the Serial Console Log

The serial console log is the first thing to check when a VM is not booting properly:

```bash
# Get the serial console log output
az vm boot-diagnostics get-boot-log \
  --resource-group myResourceGroup \
  --name myVM
```

This dumps the serial output to your terminal. It can be quite long, so you might want to pipe it to a file:

```bash
# Save the serial console log to a file for easier analysis
az vm boot-diagnostics get-boot-log \
  --resource-group myResourceGroup \
  --name myVM > boot-log.txt
```

On Linux VMs, look for these common issues in the log:

- **Kernel panic**: The kernel encountered an unrecoverable error. Look for "Kernel panic" in the output.
- **Filesystem errors**: Messages like "EXT4-fs error" or "fsck" indicate disk corruption.
- **Out of memory**: OOM killer messages mean the VM ran out of RAM during boot.
- **Network configuration failures**: DHCP failures or cloud-init errors that prevent the network from coming up.
- **Service startup failures**: Systemd units that fail during boot can prevent the VM from becoming reachable.

## Viewing the Screenshot

To get the screenshot of the VM's current display:

```bash
# Get the boot diagnostics screenshot URL
az vm boot-diagnostics get-boot-log-uris \
  --resource-group myResourceGroup \
  --name myVM
```

This returns URLs for both the serial log and the screenshot. The screenshot URL is a SAS-signed URL that you can open in a browser.

In the Azure portal, the screenshot is displayed directly:

1. Navigate to your VM.
2. Click "Boot diagnostics" under the Help section in the left menu.
3. The "Screenshot" tab shows the current display capture.
4. The "Serial log" tab shows the text output.

## Using the Serial Console

Beyond just reading logs, Azure offers an interactive serial console that lets you connect to the VM's serial port in real-time. This is like having a direct console connection to the machine.

To use the serial console:

```bash
# Connect to the interactive serial console
az serial-console connect \
  --resource-group myResourceGroup \
  --name myVM
```

Or in the portal, go to your VM and click "Serial console" under the Help section.

The serial console is especially useful for:

- Resetting network configurations when you have locked yourself out
- Fixing boot issues interactively
- Accessing GRUB on Linux VMs
- Using the Special Administration Console (SAC) on Windows VMs

Note: The serial console requires boot diagnostics to be enabled. It also requires a password-based user account on Linux VMs (SSH key-only accounts cannot authenticate through the serial console).

## Enabling Boot Diagnostics for All VMs with a Script

If you want to enable boot diagnostics across all VMs in a resource group:

```bash
#!/bin/bash
# Enable boot diagnostics on all VMs in a resource group

RESOURCE_GROUP="myResourceGroup"

# Get all VM names in the resource group
VM_NAMES=$(az vm list \
  --resource-group $RESOURCE_GROUP \
  --query "[].name" \
  --output tsv)

# Enable boot diagnostics on each VM
for VM_NAME in $VM_NAMES; do
  echo "Enabling boot diagnostics on $VM_NAME..."
  az vm boot-diagnostics enable \
    --resource-group $RESOURCE_GROUP \
    --name $VM_NAME
  echo "Done: $VM_NAME"
done
```

## Common Boot Issues and What to Look For

Here are some real-world scenarios where boot diagnostics saved the day:

**Scenario 1: VM stuck after kernel update**

The serial log shows the VM booting into an old kernel version or failing to boot the new one. The fix is to use the serial console to edit the GRUB configuration and boot into the previous kernel.

**Scenario 2: Full OS disk**

The serial log shows filesystem mount failures or read-only filesystem warnings. The VM cannot complete boot because there is no space for temporary files. The fix is to expand the OS disk from outside the VM, then resize the partition.

**Scenario 3: Broken fstab entry**

A bad entry in `/etc/fstab` (like a missing data disk or wrong UUID) can prevent the VM from booting. The serial log shows mount timeouts. The fix is to use the serial console or a recovery VM to edit fstab.

**Scenario 4: Windows update loop**

The screenshot shows the VM stuck in a "Configuring Windows Updates" loop. The serial log through SAC shows the update process failing repeatedly. The fix typically involves booting into safe mode through the serial console.

**Scenario 5: Firewall blocking all traffic**

The VM booted successfully (serial log looks clean, screenshot shows login prompt) but is unreachable over the network. This is not a boot issue - check your NSG rules and the OS-level firewall instead.

## Disabling Boot Diagnostics

If you need to disable boot diagnostics for some reason:

```bash
# Disable boot diagnostics on a VM
az vm boot-diagnostics disable \
  --resource-group myResourceGroup \
  --name myVM
```

I would not recommend disabling it unless you have a specific reason. The storage cost is minimal, and the diagnostic data is invaluable when something goes wrong.

## Azure Policy for Enforcement

To ensure boot diagnostics is always enabled across your organization, you can use Azure Policy:

```json
{
  "if": {
    "allOf": [
      {
        "field": "type",
        "equals": "Microsoft.Compute/virtualMachines"
      },
      {
        "field": "Microsoft.Compute/virtualMachines/diagnosticsProfile.bootDiagnostics.enabled",
        "notEquals": "true"
      }
    ]
  },
  "then": {
    "effect": "audit"
  }
}
```

This policy audits VMs that do not have boot diagnostics enabled. You can change the effect to "deny" to prevent the creation of VMs without boot diagnostics, or use "deployIfNotExists" to automatically enable it.

## Wrapping Up

Boot diagnostics is one of those features that costs almost nothing to enable but is priceless when you need it. Enable it on every VM by default. When a VM stops responding, the serial log and screenshot are often the fastest way to identify the problem without needing to attach the disk to a recovery VM. Make it a standard part of your VM provisioning process, and enforce it with Azure Policy if you manage a fleet of VMs.
