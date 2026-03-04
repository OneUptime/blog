# How to Resolve 'Kernel Panic - Not Syncing' Boot Errors on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kernel, Boot, Troubleshooting, Recovery

Description: Recover from kernel panic boot failures on RHEL by booting an older kernel, checking the root filesystem, and fixing common causes of kernel panics.

---

A "Kernel panic - not syncing" error means the kernel encountered a fatal error during boot. Common messages include "VFS: Unable to mount root fs" or "Attempted to kill init!". Here is how to recover.

## Boot an Older Kernel

The first step is to boot into a working kernel from the GRUB menu:

```bash
# At the GRUB boot screen, select "Advanced options" or
# press 'e' to edit the default entry

# If GRUB is hidden, press Esc or hold Shift during boot

# Select a previously working kernel from the list
```

## Fix from an Older Kernel

Once booted into a working kernel:

```bash
# Check which kernel caused the panic
uname -r

# List installed kernels
sudo dnf list installed kernel

# Remove the broken kernel
sudo dnf remove kernel-5.14.0-xxx.el9.x86_64

# Set the default kernel to the working one
sudo grubby --set-default /boot/vmlinuz-$(uname -r)

# Verify the default
sudo grubby --default-kernel
```

## Common Cause: Corrupted Root Filesystem

```bash
# If the error is "VFS: Unable to mount root fs"
# Boot from rescue media (RHEL installation ISO)

# In rescue mode, check the root filesystem
fsck /dev/mapper/rhel-root

# For XFS:
xfs_repair /dev/mapper/rhel-root

# If LVM, activate volumes first
vgchange -ay
xfs_repair /dev/mapper/rhel-root
```

## Common Cause: Missing initramfs

```bash
# Rebuild initramfs for the current kernel
sudo dracut --force /boot/initramfs-$(uname -r).img $(uname -r)

# Verify the initramfs exists
ls -la /boot/initramfs-*.img
```

## Common Cause: Wrong Root Device in GRUB

```bash
# Check the GRUB configuration
sudo cat /boot/grub2/grubenv

# Verify the root device
sudo grubby --info=ALL | grep -E "kernel|root"

# If the root device is wrong, update it
sudo grubby --update-kernel=/boot/vmlinuz-$(uname -r) \
  --args="root=/dev/mapper/rhel-root"

# Regenerate the GRUB configuration
sudo grub2-mkconfig -o /boot/grub2/grub.cfg
```

## Common Cause: Bad Kernel Module

```bash
# If a third-party module causes the panic
# Boot with the module blacklisted
# At GRUB, press 'e' and add to the kernel line:
# modprobe.blacklist=bad_module_name

# Make the blacklist permanent
echo "blacklist bad_module_name" | sudo tee /etc/modprobe.d/blacklist-bad.conf
sudo dracut --force
```

## Using Rescue Mode

If you cannot boot any kernel:

```bash
# Boot from RHEL installation media
# Select "Troubleshooting" > "Rescue a Red Hat Enterprise Linux system"

# The rescue environment will mount your system under /mnt/sysimage
chroot /mnt/sysimage

# From here you can fix GRUB, rebuild initramfs, or repair filesystems
```

Always keep at least two working kernels installed so you have a fallback option when kernel issues occur.
