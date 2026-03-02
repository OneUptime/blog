# How to Set GRUB Boot Options and Default Kernel on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GRUB, Boot, System Administration, Linux Kernel

Description: Learn how to configure GRUB boot options on Ubuntu, set the default kernel, add kernel parameters, adjust boot timeout, and manage boot behavior for servers and desktops.

---

GRUB (Grand Unified Bootloader) is the first piece of software that runs when an Ubuntu system powers on. It selects which kernel to load, passes parameters to it, and handles multi-boot configurations. Knowing how to configure GRUB correctly is essential for server management - especially for adding kernel tuning parameters, configuring boot-time disk encryption, or recovering from failed updates.

## The Configuration Files

There are two important locations:

1. `/etc/default/grub` - Your configuration file. Edit this.
2. `/boot/grub/grub.cfg` - The generated boot menu. Never edit this directly.

The `update-grub` command generates `grub.cfg` from your settings and the scripts in `/etc/grub.d/`.

```bash
# After any change to /etc/default/grub, always run:
sudo update-grub
```

## Viewing the Current Configuration

```bash
# Your configuration (what you edit)
cat /etc/default/grub

# Generated boot menu (read-only)
cat /boot/grub/grub.cfg | head -100

# List GRUB menu entries
awk -F\' '/^menuentry |^submenu / {print NR-1, $2}' /boot/grub/grub.cfg
```

## Setting the Default Boot Entry

```bash
sudo nano /etc/default/grub
```

The `GRUB_DEFAULT` setting controls which entry boots:

```bash
# Boot the first menu entry (index 0) - default
GRUB_DEFAULT=0

# Boot a specific named entry (must match exactly what's in grub.cfg)
GRUB_DEFAULT="Advanced options for Ubuntu>Ubuntu, with Linux 5.15.0-91-generic"

# Use "saved" to allow grub-set-default to control the default
GRUB_DEFAULT=saved
GRUB_SAVEDEFAULT=true
```

When using `saved`:

```bash
# Set which entry should boot by default
sudo grub-set-default 0

# Boot a different entry on the next reboot only, then return to default
sudo grub-reboot 2
```

After changes:

```bash
sudo update-grub
```

## Adjusting Boot Timeout

```bash
sudo nano /etc/default/grub
```

```bash
# Show GRUB menu for 5 seconds, then boot default
GRUB_TIMEOUT=5

# Boot immediately (no menu shown)
GRUB_TIMEOUT=0

# Wait indefinitely for user selection
GRUB_TIMEOUT=-1

# How the menu appears
GRUB_TIMEOUT_STYLE=menu      # Always show menu
GRUB_TIMEOUT_STYLE=countdown # Show countdown, ESC to show menu
GRUB_TIMEOUT_STYLE=hidden    # Hide menu, boot immediately (show on SHIFT)
```

For servers, `GRUB_TIMEOUT=5` with `GRUB_TIMEOUT_STYLE=menu` is reasonable - fast enough normally, but accessible when needed.

## Adding Kernel Boot Parameters

Kernel parameters are passed via `GRUB_CMDLINE_LINUX` and `GRUB_CMDLINE_LINUX_DEFAULT`:

```bash
sudo nano /etc/default/grub
```

- `GRUB_CMDLINE_LINUX_DEFAULT` - Parameters for normal boot only
- `GRUB_CMDLINE_LINUX` - Parameters for all boot modes (including recovery)

```bash
# Default configuration
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"
GRUB_CMDLINE_LINUX=""
```

Common kernel parameters to add:

### Disabling speculative execution mitigations (for performance-critical environments where security trade-off is acceptable)

```bash
GRUB_CMDLINE_LINUX="mitigations=off"
```

### Disabling Transparent Huge Pages

```bash
GRUB_CMDLINE_LINUX="transparent_hugepage=never"
```

### CPU isolation for real-time workloads

```bash
GRUB_CMDLINE_LINUX="isolcpus=2,3 nohz_full=2,3 rcu_nocbs=2,3"
```

### Disabling Intel P-state driver

```bash
GRUB_CMDLINE_LINUX="intel_pstate=disable"
```

### Enabling IOMMU for PCI passthrough (KVM virtualization)

```bash
GRUB_CMDLINE_LINUX="intel_iommu=on iommu=pt"
```

### Increasing console verbosity (troubleshooting)

```bash
# Remove "quiet splash" and set loglevel=7 (debug)
GRUB_CMDLINE_LINUX_DEFAULT="loglevel=7"
```

### Setting a specific console for serial output

```bash
GRUB_CMDLINE_LINUX="console=tty0 console=ttyS0,115200n8"
```

### Multiple parameters combined

```bash
GRUB_CMDLINE_LINUX="transparent_hugepage=never isolcpus=4-7 intel_iommu=on"
```

After editing:

```bash
sudo update-grub
```

## Verifying Parameters After Boot

After rebooting, confirm kernel parameters took effect:

```bash
# Show kernel command line
cat /proc/cmdline
```

Example output:

```
BOOT_IMAGE=/vmlinuz-5.15.0-91-generic root=/dev/mapper/ubuntu--vg-ubuntu--lv ro transparent_hugepage=never quiet splash
```

## Enabling Serial Console (for Headless Servers)

For servers accessed via serial console or IPMI/iLO:

```bash
sudo nano /etc/default/grub
```

```bash
# Enable serial and VGA console output
GRUB_TERMINAL="console serial"
GRUB_SERIAL_COMMAND="serial --speed=115200 --unit=0 --word=8 --parity=no --stop=1"
GRUB_CMDLINE_LINUX="console=tty0 console=ttyS0,115200n8"
```

```bash
sudo update-grub
```

## Disabling the Splash Screen

For servers where you want to see boot messages:

```bash
# Remove 'quiet splash' from this line:
GRUB_CMDLINE_LINUX_DEFAULT=""

# Or keep quiet but show text instead of plymouth
GRUB_CMDLINE_LINUX_DEFAULT="quiet"
GRUB_TERMINAL=console
```

## Setting GRUB Resolution

```bash
# Set GRUB display resolution
GRUB_GFXMODE=1024x768
GRUB_GFXPAYLOAD_LINUX=keep
```

## Password-Protecting GRUB

On multi-user or physically accessible systems:

```bash
# Generate a GRUB password hash
sudo grub-mkpasswd-pbkdf2
# Enter password when prompted, copy the hash

sudo nano /etc/grub.d/40_custom
```

Add:

```bash
set superusers="admin"
password_pbkdf2 admin grub.pbkdf2.sha512.10000.<your-hash-here>
```

```bash
sudo update-grub
```

After this, editing GRUB entries requires the password.

## Checking grub.cfg After Update

Always verify the generated configuration looks correct:

```bash
# Check that your parameters are in the generated file
grep "linux " /boot/grub/grub.cfg | head -5

# Verify the default entry
grep "^set default" /boot/grub/grub.cfg
```

## Safe Testing with grub-reboot

Before permanently changing the default:

```bash
# Test a specific kernel or entry on next boot only
sudo grub-reboot "Advanced options for Ubuntu>Ubuntu, with Linux 5.15.0-89-generic"
sudo reboot
```

If the test boot works, make it permanent. If it fails, the next reboot returns to the previous default.

## Emergency Recovery

If GRUB configuration is broken:

1. Boot from Ubuntu live USB
2. Mount the system partition:

```bash
sudo mount /dev/sda1 /mnt
sudo mount --bind /dev /mnt/dev
sudo mount --bind /proc /mnt/proc
sudo mount --bind /sys /mnt/sys

# Chroot into the broken system
sudo chroot /mnt
```

3. Fix the configuration and reinstall GRUB:

```bash
# Fix /etc/default/grub
nano /etc/default/grub

# Reinstall GRUB to the disk
grub-install /dev/sda

# Regenerate grub.cfg
update-grub

exit
```

4. Reboot

Understanding GRUB configuration gives you fine-grained control over how Ubuntu starts and what parameters get passed to the kernel. For server operators, the most common changes are kernel parameters for performance tuning and setting consistent default boot entries - both of which are straightforward once you understand the `/etc/default/grub` file and the `update-grub` workflow.
