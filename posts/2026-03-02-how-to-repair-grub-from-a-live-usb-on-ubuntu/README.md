# How to Repair GRUB from a Live USB on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GRUB, Boot, System Recovery

Description: A complete walkthrough for repairing or reinstalling GRUB on Ubuntu using a live USB, covering both UEFI and legacy BIOS systems.

---

When GRUB breaks, the machine either shows a `grub rescue>` prompt, gives a "no bootable device" error, or just sits at a blank screen. This usually happens after installing Windows alongside Ubuntu (Windows overwrites the bootloader), after a failed kernel update, or after disk changes that shifted partition numbers.

Fixing GRUB from a live USB is a reliable approach because you're working on the installed system from outside, which avoids complications with the broken bootloader itself.

## What You'll Need

- A bootable Ubuntu live USB (same version or close to the installed one)
- Knowledge of which disk Ubuntu is installed on
- About 10-15 minutes

## Boot from the Live USB

Insert the USB and boot from it. On UEFI systems, access the boot menu with F12, F10, or Del depending on your hardware. Choose to try Ubuntu without installing.

Once the desktop loads, open a terminal.

## Identify Your Partitions

Before chrooting, you need to know your partition layout:

```bash
# List all block devices and their mount points
lsblk -f

# Or get more detail including UUIDs
sudo fdisk -l

# Check filesystem types
sudo blkid
```

On a typical Ubuntu installation you're looking for:
- The root partition (ext4, usually the largest)
- The EFI partition (if UEFI system - FAT32, usually 100-512MB, marked as EFI)
- The boot partition if separate (ext4, around 512MB-1GB)

Note the device names. A common layout is:
- `/dev/sda1` - EFI partition
- `/dev/sda2` - root partition

Or on NVMe:
- `/dev/nvme0n1p1` - EFI partition
- `/dev/nvme0n1p2` - root partition

## Mount the Installed System

```bash
# Mount the root partition
sudo mount /dev/sda2 /mnt

# If you have a separate /boot partition, mount it
sudo mount /dev/sda3 /mnt/boot

# For UEFI systems, mount the EFI partition
sudo mount /dev/sda1 /mnt/boot/efi
```

Then bind-mount the virtual filesystems that GRUB needs:

```bash
# Bind mount essential system directories
sudo mount --bind /dev /mnt/dev
sudo mount --bind /dev/pts /mnt/dev/pts
sudo mount --bind /proc /mnt/proc
sudo mount --bind /sys /mnt/sys

# For UEFI systems, mount the EFI variables filesystem
sudo mount --bind /sys/firmware/efi/efivars /mnt/sys/firmware/efi/efivars
```

## Chroot into the Installed System

```bash
sudo chroot /mnt
```

Your prompt will change. You're now running commands as if you were booted into the installed Ubuntu. The shell may look minimal - that's normal.

## Reinstall GRUB

The command differs depending on whether you're on UEFI or BIOS.

### For UEFI Systems

```bash
# Verify EFI variables are accessible
ls /sys/firmware/efi/efivars

# Install GRUB for UEFI (note: target is the disk, not the EFI partition)
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu

# If grub-efi package isn't installed
apt update
apt install grub-efi-amd64

# Then install
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu
```

### For Legacy BIOS Systems

```bash
# Install GRUB to the MBR of the disk (not a partition)
# Replace /dev/sda with your actual disk
grub-install /dev/sda

# If that fails with missing modules
grub-install --recheck /dev/sda
```

## Update GRUB Configuration

After reinstalling GRUB, regenerate its configuration file:

```bash
# Update grub config to detect all OS entries
update-grub
```

This scans for kernels and other operating systems, generating `/boot/grub/grub.cfg`. Check the output - it should list your Ubuntu kernels and any other OS like Windows.

## Regenerate initramfs (If Needed)

If the kernel or initramfs was also corrupted:

```bash
# Regenerate for the current kernel
update-initramfs -u

# Regenerate for all kernels
update-initramfs -u -k all
```

## Exit chroot and Reboot

```bash
# Exit the chroot
exit

# Unmount everything cleanly
sudo umount /mnt/sys/firmware/efi/efivars   # UEFI only
sudo umount /mnt/sys
sudo umount /mnt/proc
sudo umount /mnt/dev/pts
sudo umount /mnt/dev
sudo umount /mnt/boot/efi   # UEFI only
sudo umount /mnt/boot       # if separate boot partition
sudo umount /mnt

# Reboot
sudo reboot
```

Remove the USB when prompted.

## Troubleshooting Common Issues

### "Cannot find a device for /boot/efi"

The EFI partition isn't mounted. Double-check the mount point:

```bash
# Outside chroot
ls /mnt/boot/efi
# Should not be empty - should contain EFI directory

# If empty, check you mounted the right partition
mount | grep efi
```

### GRUB Install Says No EFI Variables

This means the chroot doesn't see the EFI firmware, often because the efivars bind mount was skipped or failed:

```bash
# Outside chroot, check if efivars filesystem is present on the live system
ls /sys/firmware/efi/efivars

# If it exists, bind mount it
sudo mount --bind /sys/firmware/efi/efivars /mnt/sys/firmware/efi/efivars
```

### Windows No Longer Appears in GRUB Menu

After reinstalling GRUB, run:

```bash
# Install os-prober to detect other operating systems
apt install os-prober

# Enable it in GRUB config
echo 'GRUB_DISABLE_OS_PROBER=false' >> /etc/default/grub

# Regenerate config
update-grub
```

### Secure Boot Issues

If Secure Boot is enabled and GRUB won't load after reinstall:

```bash
# Install shim for Secure Boot compatibility
apt install shim-signed grub-efi-amd64-signed

# Reinstall with shim
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu
```

## After Successful Boot

Once the system boots normally, verify GRUB is healthy:

```bash
# Check GRUB version
grub-install --version

# Verify EFI boot entry (UEFI systems)
efibootmgr -v

# Check GRUB config was generated correctly
cat /boot/grub/grub.cfg | grep menuentry
```

Keeping a bootable live USB around is genuinely useful. GRUB repairs are straightforward once you've done one, and the whole process takes under 15 minutes with a working live USB.
