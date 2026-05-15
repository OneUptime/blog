# How to Configure ReaR with Network Backup for Automated RHEL Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ReaR, Disaster Recovery, NFS, Network Backup, Linux

Description: Configure ReaR on RHEL to store rescue images and system backups on a network share using NFS or CIFS for centralized disaster recovery.

---

ReaR supports storing both rescue images and backup archives on network shares. This centralizes your disaster recovery assets and makes it possible to restore any RHEL server from the network.

## Configuring ReaR with NFS

Set up ReaR to use an NFS server for both the rescue ISO and the backup data:

```bash
# /etc/rear/local.conf - NFS-based configuration

# Create a bootable ISO rescue image

OUTPUT=ISO

# Store the ISO on the NFS server
OUTPUT_URL=nfs://nfs-server.example.com/exports/rear

# Use NETFS (tar over network) for the backup
BACKUP=NETFS
BACKUP_URL=nfs://nfs-server.example.com/exports/rear

# NFS mount options
BACKUP_OPTIONS="nfsvers=4,nolock"
OUTPUT_OPTIONS="$BACKUP_OPTIONS"

# Keep the previous backup copy
NETFS_KEEP_OLD_BACKUP_COPY=y

# Exclude unnecessary mount points
EXCLUDE_MOUNTPOINTS=( /tmp /run/media /data )

# Exclude large data volumes that have their own backup
# Also exclude the corresponding mount points above
EXCLUDE_VG=( data_vg )
```

## Configuring ReaR with CIFS (Samba)

For Windows-compatible network shares:

```bash
# /etc/rear/local.conf - CIFS-based configuration
OUTPUT=ISO
OUTPUT_URL=cifs://smb-server.example.com/backup
BACKUP=NETFS
BACKUP_URL=cifs://smb-server.example.com/backup

# CIFS credentials
BACKUP_OPTIONS="cred=/etc/rear/cifs_credentials"
OUTPUT_OPTIONS="$BACKUP_OPTIONS"
```

Create the credentials file:

```bash
sudo tee /etc/rear/cifs_credentials > /dev/null << 'CRED'
username=backup_user
password=SecurePass123
domain=EXAMPLE
CRED
sudo chmod 600 /etc/rear/cifs_credentials
```

## Creating the Backup

Run ReaR to generate the rescue image and backup:

```bash
# Perform a full backup and create rescue media
sudo rear -v mkbackup

# Check the NFS server for the output
# You should see the ISO and the backup tar archive
```

## Automating with Cron

Schedule regular ReaR backups:

```bash
# Weekly ReaR backup every Sunday at 3 AM
echo '0 3 * * 0 root /usr/sbin/rear mkbackup' | sudo tee /etc/cron.d/rear-backup

# Daily rescue image update (no backup data, much faster)
echo '0 4 * * * root /usr/sbin/rear mkrescue' | sudo tee -a /etc/cron.d/rear-backup
```

## PXE Boot Recovery

Configure ReaR to output PXE boot files for network recovery:

```bash
# /etc/rear/local.conf - PXE output
OUTPUT=PXE
OUTPUT_PREFIX_PXE=rear-$HOSTNAME
PXE_TFTP_UPLOAD_URL=nfs://pxe-server.example.com/tftpboot
PXE_CONFIG_URL=nfs://pxe-server.example.com/tftpboot/pxelinux.cfg
```

With PXE output, you can boot any server on the network into the ReaR rescue environment without needing physical media.
