# How to Disable IPv6 on Linux with GRUB Kernel Parameters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, GRUB, Kernel Parameters, System Configuration

Description: Learn how to permanently disable IPv6 on Linux by adding the ipv6.disable=1 kernel parameter to the GRUB bootloader configuration.

## When to Use GRUB Method vs sysctl

The GRUB method disables IPv6 at the kernel level before the networking stack initializes - it is the most complete way to disable IPv6. The sysctl method can disable it after boot, but some kernel internals may still be IPv6-aware.

Use the GRUB method when:
- You need IPv6 disabled as early as possible during boot
- sysctl changes aren't surviving reboots consistently
- You need to disable IPv6 before any init scripts run

## Method 1: Ubuntu/Debian (update-grub)

```bash
# Edit the GRUB default configuration

vim /etc/default/grub

# Find the line:
# GRUB_CMDLINE_LINUX=""

# Add ipv6.disable=1 to the options:
# GRUB_CMDLINE_LINUX="ipv6.disable=1"

# After editing, update GRUB
update-grub

# Verify the change was written to GRUB config
grep ipv6 /boot/grub/grub.cfg

# Reboot to apply
reboot
```

## Method 2: RHEL/CentOS/Fedora (grub2-mkconfig)

```bash
# Edit the GRUB configuration
vim /etc/default/grub

# Modify GRUB_CMDLINE_LINUX to include ipv6.disable=1
# GRUB_CMDLINE_LINUX="crashkernel=auto rhgb quiet ipv6.disable=1"

# Regenerate GRUB config
grub2-mkconfig -o /boot/grub2/grub.cfg

# On RHEL 9.3+ systems using BLS snippets, use:
grub2-mkconfig -o /boot/grub2/grub.cfg --update-bls-cmdline

# On older UEFI RHEL/CentOS systems, the output path may be:
grub2-mkconfig -o /boot/efi/EFI/redhat/grub.cfg

# Verify
grep ipv6 /boot/grub2/grub.cfg

# Or, on older UEFI RHEL/CentOS systems:
grep ipv6 /boot/efi/EFI/redhat/grub.cfg

# Reboot
reboot
```

## Method 3: Using grubby (RHEL/CentOS)

```bash
# grubby modifies the bootloader directly (RHEL 8+)

# Add ipv6.disable=1 to all boot entries
grubby --update-kernel=ALL --args="ipv6.disable=1"

# Verify the change
grubby --info=ALL | grep ipv6.disable

# To remove the parameter later
grubby --update-kernel=ALL --remove-args="ipv6.disable=1"

# Reboot
reboot
```

## Method 4: Direct GRUB Entry Editing (Advanced)

If you need to edit GRUB entries directly (e.g., for a specific kernel only):

```bash
# View current GRUB entries (Ubuntu/Debian)
grep -E 'menuentry|linux' /boot/grub/grub.cfg | head -20

# Or on RHEL/CentOS/Fedora
grep -E 'menuentry|linux' /boot/grub2/grub.cfg | head -20

# The managed way is through /etc/default/grub
# Direct edits to grub.cfg are overwritten by update-grub or grub2-mkconfig
```

## Verifying IPv6 is Disabled After Reboot

```bash
# After reboot, verify kernel parameter is active
cat /proc/cmdline | grep ipv6.disable
# Expected: ... ipv6.disable=1 ...

# Verify no IPv6 addresses
ip -6 addr show
# Should be empty

# Verify IPv6 module state
lsmod | grep ipv6
# ipv6 module may still be present but disabled

# Check sysctl (useful context, but /proc/cmdline is the authoritative check here)
sysctl net.ipv6.conf.all.disable_ipv6
```

## Difference: ipv6.disable=1 vs ipv6.disable_ipv6=1

```text
ipv6.disable=1:
  - Disables IPv6 functionality in the kernel
  - No IPv6 addresses are added to interfaces
  - IPv6 socket operations fail

ipv6.disable_ipv6=1:
  - Disables IPv6 on all interfaces
  - No IPv6 addresses are added to interfaces
  - More limited than ipv6.disable=1
```

## Ubuntu Automatic Kernel Updates

On Ubuntu, `update-grub` is run automatically when a new kernel is installed. As long as the `GRUB_CMDLINE_LINUX` entry in `/etc/default/grub` is correct, the parameter persists across kernel upgrades.

```bash
# Verify after kernel update
grep CMDLINE /etc/default/grub
# Should still include ipv6.disable=1
```

## Re-enabling IPv6

```bash
# Edit /etc/default/grub and remove ipv6.disable=1
vim /etc/default/grub

# Update GRUB
update-grub  # Ubuntu/Debian
# or
grub2-mkconfig -o /boot/grub2/grub.cfg  # RHEL
# or on RHEL 9.3+
grub2-mkconfig -o /boot/grub2/grub.cfg --update-bls-cmdline
# or on older UEFI RHEL/CentOS systems
grub2-mkconfig -o /boot/efi/EFI/redhat/grub.cfg

# Reboot
reboot
```

## Summary

Disable IPv6 via GRUB by adding `ipv6.disable=1` to `GRUB_CMDLINE_LINUX` in `/etc/default/grub`, then running `update-grub` (Ubuntu) or `grub2-mkconfig` (RHEL). On RHEL, `grubby --update-kernel=ALL --args="ipv6.disable=1"` is a convenient alternative. Verify after reboot with `cat /proc/cmdline` and `ip -6 addr show`. This is the most complete method to disable IPv6 at the kernel level.
