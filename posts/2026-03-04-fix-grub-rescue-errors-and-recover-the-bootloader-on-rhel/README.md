# How to Fix 'GRUB Rescue' Errors and Recover the Bootloader on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GRUB, Bootloader, Recovery, Troubleshooting

Description: Recover from GRUB rescue mode on RHEL when the bootloader is corrupted or misconfigured, restoring normal boot functionality.

---

The GRUB rescue prompt appears when GRUB cannot find its configuration or modules. This typically happens after disk changes, partition resizing, or accidental deletion of boot files.

## Recovering from the GRUB Rescue Prompt

At the `grub rescue>` prompt:

```bash
# List available partitions
grub rescue> ls

# Try each partition to find the one with /boot
grub rescue> ls (hd0,msdos1)/
grub rescue> ls (hd0,msdos1)/grub2/

# Once you find the right partition, set the prefix
grub rescue> set prefix=(hd0,msdos1)/grub2
grub rescue> set root=(hd0,msdos1)

# Load the normal module and boot
grub rescue> insmod normal
grub rescue> normal
```

This should bring up the normal GRUB menu. Select your kernel and boot into RHEL.

## Reinstall GRUB from a Running System

Once booted (either normally or from rescue mode):

```bash
# For BIOS/MBR systems
sudo grub2-install /dev/sda

# For UEFI systems
sudo dnf reinstall grub2-efi-x64 shim-x64

# Regenerate the GRUB configuration
sudo grub2-mkconfig -o /boot/grub2/grub.cfg

# For UEFI systems, the config goes to a different location
sudo grub2-mkconfig -o /boot/efi/EFI/redhat/grub.cfg
```

## Using the RHEL Rescue Environment

If you cannot boot at all:

```bash
# Boot from the RHEL installation ISO
# Select "Troubleshooting" > "Rescue a Red Hat Enterprise Linux system"

# The rescue environment will try to find and mount your installation
# It should mount under /mnt/sysimage

# Chroot into your installation
chroot /mnt/sysimage

# Reinstall GRUB (BIOS)
grub2-install /dev/sda

# Regenerate config
grub2-mkconfig -o /boot/grub2/grub.cfg

# Exit chroot and reboot
exit
reboot
```

## Fix Missing /boot Files

```bash
# If the kernel or initramfs is missing
# From rescue mode or chroot:

# Reinstall the kernel package
dnf reinstall kernel

# Or rebuild the initramfs manually
dracut --force /boot/initramfs-$(uname -r).img $(uname -r)
```

## Fix the GRUB Environment Block

```bash
# If the grubenv file is corrupted
sudo grub2-editenv /boot/grub2/grubenv create

# Set the default kernel
sudo grubby --set-default /boot/vmlinuz-$(uname -r)

# Verify
sudo grubby --default-kernel
```

## UEFI-Specific Recovery

```bash
# Check the EFI boot entries
efibootmgr -v

# If the RHEL entry is missing, re-add it
sudo efibootmgr -c -d /dev/sda -p 1 \
  -L "Red Hat Enterprise Linux" \
  -l '\EFI\redhat\shimx64.efi'
```

Always keep a RHEL installation ISO available as a rescue disk. Many boot issues that seem catastrophic can be fixed in minutes from the rescue environment.
