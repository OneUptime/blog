# How to Troubleshoot Azure VM Boot Failures Using Serial Console

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machines, Serial Console, Troubleshooting, Boot Failures, Cloud Computing

Description: Learn how to use Azure Serial Console to diagnose and fix VM boot failures including GRUB errors, fstab misconfigurations, and kernel panics.

---

Few things are more frustrating than an Azure VM that refuses to boot. You can't SSH in, RDP is dead, and you are staring at a resource that might as well not exist. This is exactly the situation Azure Serial Console was built for. It gives you a text-based console connection to your VM that works even when the network stack is down, the OS has not fully started, or something has gone sideways during the boot process.

In this post, I will walk through how to enable and use Azure Serial Console to troubleshoot common boot failures. Whether you are dealing with a bad fstab entry, a broken GRUB configuration, or a kernel panic, Serial Console is the tool that can get you back on track.

## What Is Azure Serial Console?

Azure Serial Console provides direct access to the serial port of a virtual machine. Think of it like having a physical monitor and keyboard plugged into a server - except it works through the Azure portal. It does not rely on the VM's network connectivity, which makes it invaluable when the VM cannot boot far enough to accept SSH or RDP connections.

Serial Console works for both Linux and Windows VMs. On Linux, it connects to a TTY serial terminal (typically ttyS0). On Windows, it connects to the Special Administrative Console (SAC).

## Prerequisites

Before you can use Serial Console, there are a few things that need to be in place:

1. Boot diagnostics must be enabled on the VM.
2. The VM must have a password-based user account (SSH key-only accounts will not work for console login on Linux).
3. Your Azure account needs at least the Virtual Machine Contributor role.

If boot diagnostics are not already enabled, you can turn them on from the Azure portal.

Navigate to your VM, select "Boot diagnostics" under the "Help" section, and enable it with either a managed storage account or a custom one.

## Enabling Serial Console

Serial Console is available by default for most VMs, but you may need to configure it at the subscription level if it has been disabled.

Here is how to check and enable it using the Azure CLI:

```bash
# Check if Serial Console is enabled for the subscription
az vm diagnostics get-default-config --is-windows-os false

# Enable boot diagnostics on a specific VM (required for Serial Console)
az vm boot-diagnostics enable \
  --resource-group myResourceGroup \
  --name myVM \
  --storage https://mystorageaccount.blob.core.windows.net/
```

Once boot diagnostics are enabled, navigate to your VM in the Azure portal and click "Serial console" under the "Help" section in the left menu. You should see a terminal window appear.

## Common Boot Failure Scenarios

### Scenario 1: Bad fstab Entry

This is probably the most common boot failure I have seen. Someone adds a disk mount to /etc/fstab, gets a UUID wrong, or removes a data disk without cleaning up the fstab entry. On the next reboot, the OS hangs waiting for a filesystem that does not exist.

When you connect via Serial Console, you will typically see the system stuck at a mount point or dropped into an emergency shell. Here is how to fix it:

```bash
# The system may drop you into emergency mode automatically
# If prompted, enter the root password

# Remount the root filesystem as read-write
mount -o remount,rw /

# Edit fstab to fix or remove the bad entry
vi /etc/fstab

# Comment out or fix the problematic line
# For example, change:
# /dev/sdc1 /data ext4 defaults 0 0
# To:
# #/dev/sdc1 /data ext4 defaults 0 0

# After saving, reboot
reboot
```

A good preventive measure is to always use the `nofail` option in fstab entries for non-critical mounts. This way, a missing disk will not block the boot process.

### Scenario 2: GRUB Configuration Issues

GRUB problems can occur after kernel updates or manual grub.cfg edits. The VM might get stuck at the GRUB menu or fail to find a bootable kernel.

Through Serial Console, you can interact with the GRUB bootloader directly. If the VM is stuck at the GRUB prompt, try these steps:

```bash
# List available kernels from the GRUB prompt
ls (hd0,gpt2)/boot/

# Boot manually with a specific kernel
set root=(hd0,gpt2)
linux /boot/vmlinuz-5.15.0-1025-azure root=/dev/sda2
initrd /boot/initrd.img-5.15.0-1025-azure
boot
```

Once the system boots, fix the GRUB configuration permanently:

```bash
# Regenerate GRUB configuration
sudo update-grub

# Or on RHEL/CentOS based systems
sudo grub2-mkconfig -o /boot/grub2/grub.cfg

# Verify the configuration looks correct
cat /boot/grub/grub.cfg | grep menuentry
```

### Scenario 3: Kernel Panic

A kernel panic means the OS has hit an unrecoverable error. This can happen after a bad kernel update, driver issues, or corrupted system files. Serial Console will show you the kernel panic output, which usually includes a stack trace and the offending module.

The fix is typically to boot into a previous kernel version. From the GRUB menu (accessible via Serial Console), select an older kernel from the "Advanced options" submenu. Once booted with the working kernel, you can remove the broken one:

```bash
# List installed kernels
dpkg --list | grep linux-image

# Remove the problematic kernel (example version)
sudo apt remove linux-image-5.15.0-1030-azure

# Update GRUB to reflect the change
sudo update-grub
```

### Scenario 4: Disk Full Preventing Boot

A completely full root partition can prevent services from starting, leading to a VM that appears to hang during boot. Serial Console will let you log in and free up space.

```bash
# Check disk usage
df -h

# Find the largest files
du -sh /var/log/* | sort -rh | head -20

# Clear old logs
journalctl --vacuum-size=100M

# Remove old package caches
apt-get clean

# After freeing space, reboot
reboot
```

## Serial Console for Windows VMs

For Windows VMs, Serial Console connects to the Special Administrative Console (SAC). The workflow is slightly different.

After connecting, you will see a SAC> prompt. Here are the key commands:

```
SAC> cmd
# This creates a new command channel

SAC> ch -si 1
# Switch to the new channel

# Enter your credentials when prompted
# You now have a command prompt
```

From the Windows command prompt through SAC, you can check event logs, restart services, fix boot configuration, and more:

```cmd
:: Check the BCD (Boot Configuration Data)
bcdedit /enum

:: Fix the boot record
bootrec /fixmbr
bootrec /fixboot

:: Check and repair system files
sfc /scannow
```

## Troubleshooting Tips for Serial Console Itself

Sometimes Serial Console does not connect properly. Here are a few things to check:

First, make sure boot diagnostics are enabled. Serial Console will not work without them. Second, verify that your subscription has not had Serial Console disabled at the subscription level - this is sometimes done as a security policy. Third, check that the VM agent is installed and running. While Serial Console does not strictly require the agent for basic functionality, some features depend on it.

If you see a blank screen in the console, try pressing Enter a few times. The VM might be waiting for input at a login prompt that has not rendered yet.

## Automating Boot Diagnostics Monitoring

If you manage a fleet of VMs, you probably want to catch boot issues before they become emergencies. Azure Monitor can watch boot diagnostics and alert you when things go wrong.

You can also use the Azure CLI to pull boot diagnostics screenshots programmatically:

```bash
# Get the boot diagnostics screenshot URL
az vm boot-diagnostics get-boot-log \
  --resource-group myResourceGroup \
  --name myVM
```

This returns the serial log output, which you can parse for known error patterns and feed into your monitoring pipeline. Tools like OneUptime can help you set up alerts on these patterns so you get notified before users start complaining.

## When Serial Console Is Not Enough

There are cases where Serial Console alone will not solve the problem. If the OS disk is severely corrupted, you may need to detach it, attach it to a rescue VM, repair the filesystem from there, and then reattach it. Azure provides a "Repair VM" option through the CLI that automates much of this process.

```bash
# Create a repair VM and attach the broken OS disk
az vm repair create \
  --resource-group myResourceGroup \
  --name myBrokenVM \
  --repair-username azureuser \
  --repair-password 'SecurePassword123!'

# After fixing the disk on the repair VM, restore it
az vm repair restore \
  --resource-group myResourceGroup \
  --name myBrokenVM
```

## Wrapping Up

Azure Serial Console is one of those tools you do not think about until you desperately need it. Make sure boot diagnostics are enabled on your VMs now, not when things are on fire. Test Serial Console access before you have a real emergency so you know the login credentials work and the console is responsive.

The combination of Serial Console for immediate diagnosis and automated boot diagnostics monitoring gives you solid coverage for catching and resolving boot failures quickly. Add that to your incident response runbook, and you will be able to recover from boot failures in minutes instead of hours.
