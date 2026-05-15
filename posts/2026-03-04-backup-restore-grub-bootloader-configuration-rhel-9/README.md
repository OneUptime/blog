# How to Backup and Restore the GRUB Bootloader Configuration on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GRUB, Bootloader, Backup

Description: Back up and restore the GRUB bootloader configuration on RHEL 9.

---

## Overview

Back up and restore the GRUB bootloader configuration on RHEL 9. A solid backup strategy protects against data loss from hardware failures, human errors, and security incidents.

## Prerequisites

- A RHEL 9 system with root or sudo access
- Sufficient storage for backup files (local or remote)
- For remote backups: SSH access to the backup destination

## Step 1 - Identify the GRUB Files to Back Up

On RHEL 9, GRUB configuration is stored in several locations:

- **/etc/default/grub** - default GRUB settings
- **/etc/grub.d/** - scripts used to generate the GRUB configuration
- **/boot/grub2/grub.cfg** - generated GRUB configuration
- **/boot/loader/entries/** - Boot Loader Specification entries for installed kernels

Back up these files before making bootloader changes.

## Step 2 - Create the Backup

Using tar for a GRUB configuration backup:

```bash
sudo mkdir -p /backups/grub
sudo tar --acls --xattrs --selinux -czf /backups/grub/grub-backup-$(date +%Y%m%d).tar.gz \
  /etc/default/grub \
  /etc/sysconfig/grub \
  /etc/grub.d \
  /boot/grub2 \
  /boot/loader/entries
```

Using rsync for a directory backup:

```bash
sudo mkdir -p /backups/grub/latest
sudo rsync -aAXvR --delete /etc/default/grub /etc/sysconfig/grub /etc/grub.d /boot/grub2 /boot/loader/entries /backups/grub/latest/
```

## Step 3 - Automate with Cron

```bash
echo "0 2 * * * root /usr/local/bin/grub-backup.sh" | sudo tee /etc/cron.d/grub-backup
```

## Step 4 - Verify the Backup

Always verify that backups are readable:

```bash
# For tar

sudo tar tzf /backups/grub/grub-backup-*.tar.gz | head -20

# For rsync
ls -la /backups/grub/latest/
```

## Step 5 - Test Restoration

Periodically restore backups to a test environment to confirm they work:

```bash
# Restore the GRUB files from tar
sudo tar --acls --xattrs --selinux -xzf /backups/grub/grub-backup-20260304.tar.gz -C /

# Rebuild the generated GRUB configuration
sudo grub2-mkconfig -o /boot/grub2/grub.cfg
```

On RHEL 9, use `/boot/grub2/grub.cfg` with `grub2-mkconfig` for both BIOS and UEFI systems. Do not regenerate `/boot/efi/EFI/redhat/grub.cfg`; on UEFI systems it is a stub file.

## Summary

You have learned how to backup and restore the grub bootloader configuration. Remember the 3-2-1 rule: keep three copies of your data, on two different media types, with one copy stored off-site.
