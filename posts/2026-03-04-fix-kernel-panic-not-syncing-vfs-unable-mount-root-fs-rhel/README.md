# How to Fix Kernel Panic 'Not Syncing: VFS Unable to Mount Root FS' on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kernel Panic, Boot, Troubleshooting, GRUB, initramfs

Description: Fix the 'VFS: Unable to mount root fs' kernel panic on RHEL, which prevents the system from booting by failing to locate or mount the root filesystem.

---

This kernel panic occurs when the kernel cannot find or mount the root filesystem during boot. Common causes include incorrect GRUB configuration, missing initramfs, or changed disk device names.

## Boot Into Rescue Mode

```bash
# Boot from RHEL installation media
# Select: Troubleshooting > Rescue a Red Hat Enterprise Linux system

# The rescue environment will try to find your installation
# and mount it under /mnt/sysroot

# If it finds the installation:
chroot /mnt/sysroot
```

## Check the GRUB Configuration

```bash
# View the current GRUB configuration
cat /boot/grub2/grub.cfg | grep "root="

# Check the kernel command line for the root parameter
# It should point to the correct root device
# Example: root=/dev/mapper/rhel-root
# Or: root=UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Verify the device exists
ls -la /dev/mapper/rhel-root
# Or
blkid | grep <UUID-from-grub>
```

## Fix 1: Correct the Root Device

```bash
# List available block devices and their UUIDs
blkid

# List LVM logical volumes
lvs

# If the root device name changed, update GRUB defaults
vi /etc/default/grub
# Fix the GRUB_CMDLINE_LINUX line with the correct root device

# Regenerate GRUB configuration
grub2-mkconfig -o /boot/grub2/grub.cfg
```

## Fix 2: Rebuild the initramfs

If the initramfs is missing or corrupted, the kernel cannot load the storage drivers needed to mount root.

```bash
# Check if initramfs exists for the current kernel
ls -la /boot/initramfs-$(uname -r).img

# Rebuild the initramfs
dracut -f /boot/initramfs-$(uname -r).img $(uname -r)

# If you are in rescue mode and the kernel version differs
ls /boot/vmlinuz-*
# Use the version you see
dracut -f /boot/initramfs-5.14.0-362.el9.x86_64.img 5.14.0-362.el9.x86_64
```

## Fix 3: Activate LVM Volumes

If root is on LVM and the volumes are not activated:

```bash
# Scan for volume groups
vgscan

# Activate all volume groups
vgchange -ay

# Verify the root logical volume is available
lvs
```

## Fix 4: Check /etc/fstab

```bash
# Verify the root entry in fstab matches the actual device
cat /etc/fstab

# Ensure the device, mount point, and filesystem type are correct
# /dev/mapper/rhel-root  /  xfs  defaults  0 0
```

After making fixes, exit the chroot, unmount, and reboot:

```bash
exit           # exit chroot
reboot
```

The most common cause is a missing or corrupt initramfs after a kernel update. Rebuilding it with `dracut -f` resolves the issue in most cases.
