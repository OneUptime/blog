# How to Backup and Restore the GRUB Bootloader Configuration on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GRUB, Bootloader, Backups, System Administration, Linux

Description: Back up and restore the GRUB2 bootloader configuration on RHEL to protect against boot failures caused by misconfiguration or corruption.

---

GRUB2 is the default bootloader on RHEL. A corrupted or misconfigured GRUB can prevent your system from booting. Backing up the GRUB configuration regularly protects against these scenarios.

## Backing Up GRUB Configuration Files

Save copies of all critical GRUB files:

```bash
# Create a backup directory
sudo mkdir -p /backup/grub

# Backup the main GRUB configuration
sudo cp /boot/grub2/grub.cfg /backup/grub/grub.cfg.bak

# Backup the GRUB defaults (where kernel parameters are set)
sudo cp /etc/default/grub /backup/grub/default-grub.bak

# Backup custom GRUB menu entries
sudo cp -r /etc/grub.d/ /backup/grub/grub.d.bak/

# For UEFI systems, also backup the EFI GRUB config
if [ -d /boot/efi/EFI/redhat ]; then
  sudo cp /boot/efi/EFI/redhat/grub.cfg /backup/grub/efi-grub.cfg.bak
fi
```

## Backing Up the MBR (BIOS Systems)

For BIOS-based systems, back up the Master Boot Record:

```bash
# Backup the first 512 bytes of the boot disk (MBR)
sudo dd if=/dev/sda of=/backup/grub/mbr-sda.bak bs=512 count=1

# Backup the MBR plus the GRUB embedding area (first 1 MB)
sudo dd if=/dev/sda of=/backup/grub/grub-embed-sda.bak bs=1M count=1
```

## Restoring GRUB Configuration

If your GRUB configuration becomes corrupted:

```bash
# Restore the GRUB defaults file
sudo cp /backup/grub/default-grub.bak /etc/default/grub

# Restore custom menu entries
sudo cp -r /backup/grub/grub.d.bak/* /etc/grub.d/

# Regenerate grub.cfg from the restored files
sudo grub2-mkconfig -o /boot/grub2/grub.cfg

# For UEFI systems
sudo grub2-mkconfig -o /boot/efi/EFI/redhat/grub.cfg
```

## Restoring from Rescue Mode

If the system will not boot, use RHEL rescue media:

```bash
# Boot from RHEL installation media, choose Troubleshooting > Rescue
# The rescue system mounts your root at /mnt/sysimage

# Chroot into the installed system
chroot /mnt/sysimage

# Reinstall GRUB to the boot disk (BIOS)
grub2-install /dev/sda

# Regenerate the configuration
grub2-mkconfig -o /boot/grub2/grub.cfg

# Exit chroot and reboot
exit
reboot
```

## Automating GRUB Backups

Add a cron job to back up GRUB configuration weekly:

```bash
# Add to root's crontab
echo '0 3 * * 0 cp /boot/grub2/grub.cfg /backup/grub/grub.cfg.$(date +\%Y\%m\%d)' | sudo tee -a /var/spool/cron/root
```
