# How to Troubleshoot Azure Virtual Machine Boot Diagnostics and Serial Console Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machines, Boot Diagnostics, Serial Console, Troubleshooting, VM Recovery, Azure Compute

Description: Use Azure Boot Diagnostics and Serial Console to diagnose and fix virtual machine boot failures, OS corruption, and configuration errors.

---

Your Azure VM is not responding. SSH times out, RDP will not connect, and the application is offline. You cannot log into the VM because, well, the VM is not booting properly. This is where Azure Boot Diagnostics and Serial Console become essential. They give you visibility into what is happening during the boot process and, in some cases, a way to fix problems without needing to detach the disk and mount it on a rescue VM.

These tools have saved me countless hours of troubleshooting and avoided many disk-swap procedures that used to be the only option when a VM would not boot.

## Enabling Boot Diagnostics

Boot diagnostics captures a screenshot of the VM console and the serial log output during boot. This is the equivalent of connecting a monitor and keyboard to a physical server to see what the boot screen shows.

```bash
# Enable boot diagnostics with managed storage (recommended)
az vm boot-diagnostics enable \
  --resource-group myResourceGroup \
  --name myVM

# Or enable with a specific storage account
az vm boot-diagnostics enable \
  --resource-group myResourceGroup \
  --name myVM \
  --storage "https://mystorageaccount.blob.core.windows.net/"
```

Once enabled, you can view the boot screenshot and serial log from the Azure portal or CLI.

```bash
# Get the boot diagnostics screenshot URL
az vm boot-diagnostics get-boot-log-uris \
  --resource-group myResourceGroup \
  --name myVM

# Get the serial console log
az vm boot-diagnostics get-boot-log \
  --resource-group myResourceGroup \
  --name myVM
```

The screenshot shows exactly what you would see on a physical monitor. For Windows VMs, this might show a blue screen of death, a BitLocker recovery screen, or the login prompt. For Linux VMs, it shows kernel boot messages, error messages, or the login prompt.

## Common Boot Failures on Linux VMs

### Kernel Panic

If the boot screenshot shows a kernel panic, the VM crashed during boot. Common causes include:

- Corrupt kernel or initramfs after a failed update
- Incompatible kernel modules
- Filesystem corruption on the root partition

The serial log will show the exact kernel panic message and stack trace. Look for the "Kernel panic" line and the few lines above it for context.

### Filesystem Check (fsck) Required

If Linux detects filesystem inconsistencies, it may drop into an emergency shell waiting for manual fsck. The serial log will show messages like "filesystem needs to be repaired" or "unexpected inconsistency."

Use Serial Console to connect and run fsck manually.

```bash
# From the Serial Console, run filesystem check
# You may need to remount the filesystem as read-only first
mount -o remount,ro /
fsck -y /dev/sda1
reboot
```

### Fstab Errors

A misconfigured /etc/fstab is one of the most common causes of Linux boot failures. If fstab references a device that does not exist or has incorrect mount options, the boot process hangs or drops to emergency mode.

```bash
# From Serial Console in emergency mode, fix fstab
# First remount root as read-write
mount -o remount,rw /

# Edit fstab to fix the bad entry
vi /etc/fstab

# Or comment out the problematic line
# Then reboot
reboot
```

### Disk Full

If the root filesystem is 100% full, the VM may fail to boot because services cannot write to disk. The serial log might show "No space left on device" errors.

From the Serial Console:

```bash
# Find and remove large files to free space
du -sh /var/log/* | sort -h | tail -20

# Clear old log files
journalctl --vacuum-size=50M

# Remove old package caches
apt-get clean    # Debian/Ubuntu
yum clean all    # RHEL/CentOS
```

## Common Boot Failures on Windows VMs

### Blue Screen of Death (BSOD)

The boot diagnostics screenshot will show the blue screen with a stop code. Common stop codes include:

- **INACCESSIBLE_BOOT_DEVICE** - driver issue or disk configuration change
- **CRITICAL_PROCESS_DIED** - system process crashed during boot
- **BAD_SYSTEM_CONFIG_INFO** - registry corruption

For BSOD issues, you typically need to use the Serial Console with Special Administrative Console (SAC) or boot into safe mode.

```
# From Serial Console on Windows, access SAC
# Type these commands in the SAC prompt
cmd
ch -si 1

# Now you have a command prompt
# Check disk health
chkdsk C: /f

# If the issue is a recently installed driver, try
bcdedit /set {current} safeboot minimal
shutdown /r /t 0
```

### BitLocker Recovery Screen

If the VM shows a BitLocker recovery screen, the TPM state has changed (common after VM resize or move). You need the BitLocker recovery key.

```bash
# Find BitLocker recovery keys in Azure
az vm encryption show \
  --resource-group myResourceGroup \
  --name myVM

# The recovery key is stored in Key Vault if you used ADE
az keyvault secret list --vault-name myKeyVault --query "[?contains(name, 'bitlocker')]" -o table
```

### Windows Update Stuck

Windows VMs sometimes get stuck in a "Configuring Windows Updates" loop. The boot screenshot shows "Reverting changes" repeatedly.

From Serial Console, disable the problematic update:

```
# Access the command prompt via SAC
cmd
ch -si 1

# List installed updates and remove the problematic one
dism /image:C:\ /get-packages | findstr "Package_for"
dism /image:C:\ /remove-package /packagename:<package-name>
```

## Using Serial Console Effectively

Serial Console provides interactive access to a VM's serial port. For Linux, this gives you a terminal. For Windows, this gives you access to SAC (Special Administrative Console) and CMD.

Prerequisites for Serial Console:
- Boot diagnostics must be enabled
- The VM must have a password-based user account (SSH key-only is not enough for Serial Console on Linux)
- The VM must have the serial console agent installed (included by default in most marketplace images)

```bash
# Connect to Serial Console via Azure CLI
# This opens an interactive terminal session
az serial-console connect \
  --resource-group myResourceGroup \
  --name myVM
```

For Linux VMs, if you see a login prompt in Serial Console, the VM is actually booting fine and the problem is likely network-related (NSG rules, firewall, or route table) rather than a boot issue.

## Boot Diagnostics Without Serial Console

If Serial Console is not available (for example, on VMs without password-based accounts), you can still use boot diagnostics screenshots and serial logs for diagnosis. But to fix issues, you need to use the disk-swap approach:

1. Stop and deallocate the problematic VM
2. Detach the OS disk
3. Attach it as a data disk to a rescue VM
4. Fix the issue from the rescue VM
5. Reattach the disk to the original VM

```bash
# Create a rescue VM and swap the disk
az vm repair create \
  --resource-group myResourceGroup \
  --name myVM \
  --repair-username rescueuser \
  --repair-password 'TempP@ss123!'

# After fixing the issue on the rescue VM
az vm repair restore \
  --resource-group myResourceGroup \
  --name myVM
```

## Proactive Boot Diagnostics Monitoring

Do not wait for a boot failure to look at boot diagnostics. Set up monitoring to alert you when a VM stops reporting heartbeat or when boot diagnostics shows error patterns.

Azure Monitor can detect VM availability issues through the VM heartbeat signal. If the heartbeat stops, the VM is either deallocated or has a boot issue.

```bash
# Create an alert for missing VM heartbeat
az monitor metrics alert create \
  --name "vm-heartbeat-missing" \
  --resource-group myResourceGroup \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/virtualMachines/myVM" \
  --condition "count Heartbeat < 1" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 1 \
  --action "/subscriptions/{sub-id}/resourceGroups/rg-monitoring/providers/microsoft.insights/actionGroups/ag-oncall"
```

Boot diagnostics and Serial Console are the first tools you should reach for when a VM is unresponsive. Enable boot diagnostics on every VM before you need it. The few minutes of setup time pays off enormously when you are troubleshooting a production outage at 2 AM and need to see exactly what the VM console shows.
