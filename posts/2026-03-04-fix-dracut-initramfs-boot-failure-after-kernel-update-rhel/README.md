# How to Fix dracut Initramfs Boot Failure After Kernel Update on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Dracut, Initramfs, Kernel, Boot, Troubleshooting

Description: Fix boot failures caused by a corrupted or incomplete initramfs after a kernel update on RHEL using dracut to regenerate the initial RAM filesystem.

---

After a kernel update, the system may fail to boot if the initramfs (initial RAM filesystem) was not properly generated. Symptoms include dropping into a dracut emergency shell or failing to mount the root filesystem.

## Symptoms

The boot process shows messages like:
- "dracut-initqueue: Warning: dracut-initqueue timeout"
- "Warning: /dev/mapper/rhel-root does not exist"
- You are dropped into the dracut emergency shell: `dracut:/#`

## Quick Fix from the dracut Emergency Shell

```bash
# At the dracut:/# prompt, check available devices
dracut:/# lvm vgscan
dracut:/# lvm vgchange -ay

# If the root device is now available, try continuing boot
dracut:/# exit
```

## Fix from GRUB: Boot an Older Kernel

```bash
# At the GRUB menu, select a previous kernel version
# This boots with the known-good initramfs from the previous kernel

# After booting, rebuild the initramfs for the new kernel
sudo dracut -f /boot/initramfs-$(uname -r).img $(uname -r)
```

## Fix from Rescue Mode

```bash
# Boot from RHEL installation media
# Select: Troubleshooting > Rescue a Red Hat Enterprise Linux system
chroot /mnt/sysroot

# List available kernels
ls /boot/vmlinuz-*

# Rebuild initramfs for the problematic kernel
KVER="5.14.0-362.el9.x86_64"  # replace with actual version
dracut -f /boot/initramfs-${KVER}.img ${KVER}

# Verify the file was created
ls -la /boot/initramfs-${KVER}.img
```

## Including Required Modules

If the initramfs is missing storage drivers:

```bash
# Rebuild with verbose output to see what is included
dracut -f -v /boot/initramfs-$(uname -r).img $(uname -r) 2>&1 | tee /tmp/dracut.log

# Force inclusion of specific modules
dracut -f --add "lvm dm" /boot/initramfs-$(uname -r).img $(uname -r)

# List modules in the current initramfs
lsinitrd /boot/initramfs-$(uname -r).img | head -30

# Check if the storage driver is included
lsinitrd /boot/initramfs-$(uname -r).img | grep -E "virtio|scsi|nvme"
```

## Configuring dracut for Future Updates

```bash
# Add required drivers to dracut configuration
sudo tee /etc/dracut.conf.d/storage.conf << 'CONF'
# Ensure LVM and storage drivers are always included
add_dracutmodules+=" lvm dm "
add_drivers+=" virtio_blk virtio_scsi "
CONF

# Rebuild all initramfs images
sudo dracut -f --regenerate-all
```

## Verifying the Fix

```bash
# Check the initramfs integrity
lsinitrd /boot/initramfs-$(uname -r).img > /dev/null && echo "OK" || echo "CORRUPT"

# Reboot to test
sudo reboot
```

Always check that the initramfs exists and is not zero-size after a kernel update. A missing or truncated initramfs is the most common cause of post-update boot failures.
