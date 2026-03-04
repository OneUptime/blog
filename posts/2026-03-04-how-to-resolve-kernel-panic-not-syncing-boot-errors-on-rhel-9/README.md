# How to Resolve 'Kernel Panic - Not Syncing' Boot Errors on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting, Boot

Description: Step-by-step guide on resolve 'kernel panic - not syncing' boot errors on rhel 9 with practical examples and commands.

---

A "Kernel panic - not syncing" error on RHEL 9 indicates a critical kernel failure during boot. Here is how to diagnose and recover.

## Boot into Rescue Mode

When the GRUB menu appears, select the rescue kernel or:

1. Press `e` to edit the boot entry
2. Add `systemd.unit=rescue.target` to the linux line
3. Press Ctrl+X to boot

## Check Recent Kernel Updates

```bash
sudo rpm -qa kernel --last
```

## Boot with a Previous Kernel

In the GRUB menu, select "Advanced options" and choose an older kernel version.

## Common Causes and Fixes

### Corrupted Initramfs

```bash
# Rebuild initramfs for the current kernel
sudo dracut --force /boot/initramfs-$(uname -r).img $(uname -r)

# Rebuild for all kernels
sudo dracut --regenerate-all --force
```

### Missing Kernel Modules

```bash
# Check for missing modules
sudo lsinitrd /boot/initramfs-$(uname -r).img | grep -i module

# Add missing module to dracut
echo 'add_drivers+=" module_name "' | sudo tee /etc/dracut.conf.d/custom.conf
sudo dracut --force
```

### Bad fstab Entry

```bash
# Check fstab for errors
cat /etc/fstab

# Comment out problematic entries
sudo vi /etc/fstab
```

### Hardware Issues

```bash
# Run memory test from GRUB menu
memtest86+

# Check disk health
sudo smartctl -a /dev/sda
```

### SELinux Relabeling Required

```bash
sudo touch /.autorelabel
sudo reboot
```

## Analyze the Panic Message

The kernel panic message contains clues:

```bash
# Check kernel logs from previous boot
sudo journalctl -b -1 -p err
```

## Reinstall the Kernel

If the kernel is corrupted:

```bash
sudo dnf reinstall kernel-core
sudo grub2-mkconfig -o /boot/grub2/grub.cfg
```

## Conclusion

Kernel panics on RHEL 9 require booting into rescue mode or using a previous kernel for diagnosis. Rebuild the initramfs, check fstab, and verify hardware health to resolve the underlying issue.

