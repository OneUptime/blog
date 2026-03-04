# How to Fix 'GRUB Rescue' Errors and Recover the Bootloader on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting, Boot

Description: Step-by-step guide on fix 'grub rescue' errors and recover the bootloader on rhel 9 with practical examples and commands.

---

The "GRUB rescue" prompt appears when GRUB cannot find its configuration or modules. Here is how to recover the bootloader on RHEL 9.

## At the GRUB Rescue Prompt

List available partitions:

```bash
grub rescue> ls
grub rescue> ls (hd0,gpt2)/
```

Find the partition with GRUB files:

```bash
grub rescue> ls (hd0,gpt2)/grub2/
```

Set the root and prefix:

```bash
grub rescue> set root=(hd0,gpt2)
grub rescue> set prefix=(hd0,gpt2)/grub2
grub rescue> insmod normal
grub rescue> normal
```

## Boot from Rescue Media

If the GRUB rescue prompt does not work, boot from a RHEL 9 installation USB and select "Troubleshooting" then "Rescue a Red Hat Enterprise Linux system."

## Reinstall GRUB from Rescue Mode

Mount the system filesystems:

```bash
chroot /mnt/sysroot
mount /boot
mount /boot/efi  # For UEFI systems
```

For BIOS systems:

```bash
grub2-install /dev/sda
grub2-mkconfig -o /boot/grub2/grub.cfg
```

For UEFI systems:

```bash
dnf reinstall grub2-efi-x64 shim-x64
grub2-mkconfig -o /boot/efi/EFI/redhat/grub.cfg
```

## Rebuild the GRUB Configuration

```bash
grub2-mkconfig -o /boot/grub2/grub.cfg
```

## Fix Missing Boot Partition

If the boot partition is corrupted:

```bash
# Identify the boot partition
lsblk
blkid

# Repair the filesystem
fsck /dev/sda1

# Remount and rebuild GRUB
mount /dev/sda1 /boot
grub2-install /dev/sda
grub2-mkconfig -o /boot/grub2/grub.cfg
```

## Rebuild initramfs

```bash
dracut --force --regenerate-all
```

## Exit and Reboot

```bash
exit
reboot
```

## Conclusion

GRUB rescue situations on RHEL 9 require booting from rescue media to reinstall the bootloader and rebuild its configuration. Maintain a rescue USB and know your partition layout for quick recovery.

