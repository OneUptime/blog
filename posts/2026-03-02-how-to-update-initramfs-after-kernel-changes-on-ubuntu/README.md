# How to Update initramfs After Kernel Changes on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kernel, Boot, Initramfs, System Administration

Description: Learn when and how to properly update the initramfs on Ubuntu after kernel upgrades, module changes, and configuration updates to keep your system bootable.

---

The initramfs is rebuilt automatically when you install or upgrade a kernel via `apt`, but there are many other situations where you need to manually trigger a rebuild. Knowing when to update initramfs and how to do it correctly prevents boot failures and ensures your system picks up the right drivers and configuration.

## When initramfs Needs to Be Updated

initramfs must be rebuilt whenever something it depends on changes:

- After adding or removing kernel modules from `/etc/initramfs-tools/modules`
- After modifying `/etc/initramfs-tools/initramfs.conf` or files in `/etc/initramfs-tools/conf.d/`
- After adding or modifying hooks in `/etc/initramfs-tools/hooks/`
- After adding or modifying boot scripts in `/etc/initramfs-tools/scripts/`
- After changing the resume device for hibernation (`/etc/initramfs-tools/conf.d/resume`)
- After modifying `/etc/crypttab` for LUKS encryption
- After installing out-of-tree kernel modules (like DKMS modules)
- After modifying `/etc/mdadm/mdadm.conf` for software RAID
- After modifying `/etc/lvm/lvm.conf`
- After blacklisting modules that were previously included in initramfs

## The update-initramfs Command

The primary tool for managing initramfs images is `update-initramfs`:

```bash
# Update initramfs for the currently running kernel
sudo update-initramfs -u

# Update for a specific kernel version
sudo update-initramfs -u -k 6.8.0-51-generic

# Update for all installed kernels (important after config changes)
sudo update-initramfs -u -k all

# Create a new initramfs (typically done automatically during kernel install)
sudo update-initramfs -c -k 6.8.0-51-generic

# Delete an initramfs for a kernel that's been removed
sudo update-initramfs -d -k 6.5.0-44-generic
```

### Verbose Output

The `-v` flag shows exactly what's being included:

```bash
# Verbose output helps diagnose why something is/isn't included
sudo update-initramfs -u -v 2>&1 | tee /tmp/initramfs-update.log

# Review what modules got added
grep "Adding module" /tmp/initramfs-update.log

# See what scripts and hooks ran
grep "Running hook" /tmp/initramfs-update.log
```

## After a Manual Kernel Upgrade

When you compile and install a custom kernel manually (not via apt), you need to create the initramfs yourself:

```bash
# After copying a custom kernel to /boot
sudo cp arch/x86/boot/bzImage /boot/vmlinuz-6.8.0-custom

# Create the initramfs for the new kernel
sudo update-initramfs -c -k 6.8.0-custom

# Update GRUB to pick up the new kernel
sudo update-grub

# Verify GRUB config includes the new kernel
grep -A 5 "6.8.0-custom" /boot/grub/grub.cfg
```

## After Installing DKMS Modules

DKMS (Dynamic Kernel Module Support) modules are out-of-tree kernel modules that compile automatically when kernel headers are present. After a DKMS module install, initramfs needs updating:

```bash
# Example: after installing a DKMS-based driver
sudo apt install some-dkms-driver

# DKMS typically triggers update-initramfs automatically, but verify:
dkms status

# If needed, manually trigger update
sudo update-initramfs -u

# Verify the module is in the initramfs
lsinitramfs /boot/initrd.img-$(uname -r) | grep module_name
```

## After Adding Modules to /etc/initramfs-tools/modules

When you add modules that need to be available at early boot:

```bash
# Edit the modules file
sudo nano /etc/initramfs-tools/modules
```

```bash
# Added for NVMe support on this system
nvme
nvme_core

# Added for software RAID
md_mod
raid1
raid5
```

Then rebuild:

```bash
# Apply the changes
sudo update-initramfs -u

# Confirm the modules appear in the new initramfs
lsinitramfs /boot/initrd.img-$(uname -r) | grep nvme
```

## After Changing Encryption Configuration

If you add or modify `/etc/crypttab` entries, the initramfs must be updated to include the correct mapping:

```bash
# View current crypttab
cat /etc/crypttab

# After editing crypttab
sudo nano /etc/crypttab
```

```bash
# Format: mapping-name  source-device          keyfile  options
data_crypt   UUID=abc123-def456-ghi789  none     luks,discard
```

```bash
# Rebuild to include updated LUKS configuration
sudo update-initramfs -u

# Verify cryptsetup scripts are present in initramfs
lsinitramfs /boot/initrd.img-$(uname -r) | grep cryptsetup
```

## After Modifying Software RAID Configuration

mdadm configuration changes require an initramfs update:

```bash
# Check mdadm config
cat /etc/mdadm/mdadm.conf

# After making changes, rebuild
sudo update-initramfs -u

# Verify mdadm.conf was included
lsinitramfs /boot/initrd.img-$(uname -r) | grep mdadm.conf
```

## After Modifying Hibernation/Resume Settings

The resume device for hibernation must be configured in initramfs:

```bash
# Check current resume configuration
cat /etc/initramfs-tools/conf.d/resume

# Or check in the main config
grep RESUME /etc/initramfs-tools/initramfs.conf

# Set the resume device (use your swap partition or file)
echo "RESUME=UUID=$(blkid -s UUID -o value /dev/sda3)" | sudo tee /etc/initramfs-tools/conf.d/resume

# Rebuild initramfs with new resume configuration
sudo update-initramfs -u

# Verify resume is configured
lsinitramfs /boot/initrd.img-$(uname -r) | grep resume
```

## Keeping All Kernels Updated

If you have multiple kernels installed, you may need to update initramfs for all of them:

```bash
# List all installed kernels
dpkg --list | grep linux-image | grep -v meta

# List corresponding initramfs files
ls /boot/initrd.img-*

# Update all at once
sudo update-initramfs -u -k all

# Verify all were updated (check timestamps)
ls -lt /boot/initrd.img-*
```

## Verifying the Updated initramfs

After any update, verify the changes took effect:

```bash
# Check the timestamp changed
ls -lh /boot/initrd.img-$(uname -r)

# Check the size (should reflect your changes)
du -sh /boot/initrd.img-$(uname -r)

# Verify specific content is present
lsinitramfs /boot/initrd.img-$(uname -r) | grep your_module_or_file

# Extract and examine if needed
mkdir /tmp/initrd-check
unmkinitramfs /boot/initrd.img-$(uname -r) /tmp/initrd-check
ls /tmp/initrd-check/

# Check the init script
cat /tmp/initrd-check/init | head -30
```

## Automating initramfs Updates with apt Hooks

If you frequently install packages that require initramfs updates, you can create an apt hook:

```bash
sudo nano /etc/apt/apt.conf.d/99-update-initramfs
```

```bash
# This runs update-initramfs after any apt operation
# Useful if you often install drivers or kernel-related packages
DPkg::Post-Invoke {
    "if [ -d /boot ]; then update-initramfs -u -k all; fi";
};
```

This is heavy-handed and will slow down every apt install. Use it only if you have a specific need.

## Troubleshooting Failed Updates

If `update-initramfs` fails or produces errors:

```bash
# Run with verbose output to see errors
sudo update-initramfs -u -v 2>&1

# Common error: missing hook dependencies
# Check hook scripts are executable
ls -la /etc/initramfs-tools/hooks/

# Fix permissions
sudo chmod +x /etc/initramfs-tools/hooks/*

# Common error: broken symlinks
find /etc/initramfs-tools/ -type l -! -exec test -e {} \; -print

# Run mkinitramfs directly for more detail
sudo mkinitramfs -o /boot/initrd.img-$(uname -r) $(uname -r)
```

## Backup Before Making Changes

Before updating initramfs for significant configuration changes, back up the working version:

```bash
# Backup current working initramfs
sudo cp /boot/initrd.img-$(uname -r) /boot/initrd.img-$(uname -r).backup

# After making changes and rebuilding
sudo update-initramfs -u

# If the new initramfs causes boot issues, you can restore from GRUB's command line
# or a recovery environment with:
sudo cp /boot/initrd.img-$(uname -r).backup /boot/initrd.img-$(uname -r)
```

Keeping initramfs current with your system configuration is critical for reliability. When in doubt after any kernel-related change - drivers, storage configuration, encryption setup - run `sudo update-initramfs -u -k all` to make sure all kernels have current initramfs images.
