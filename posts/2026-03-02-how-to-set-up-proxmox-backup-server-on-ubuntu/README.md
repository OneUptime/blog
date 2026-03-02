# How to Set Up Proxmox Backup Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Proxmox, Backup, Disaster Recovery, Server Administration

Description: Set up Proxmox Backup Server (PBS) on Ubuntu-compatible hardware to provide efficient, deduplicated backups for your Proxmox VE virtual machines and containers.

---

Proxmox Backup Server (PBS) is a dedicated backup solution designed specifically for Proxmox VE environments. It provides incremental, deduplicated backups with chunk-based storage - meaning only changed data blocks are transferred and stored after the initial backup. On typical workloads, this reduces both backup time and storage consumption by 60-80% compared to full image backups.

PBS is a separate product from Proxmox VE and runs on its own installation (based on Debian), either on dedicated hardware or as a VM.

## Understanding PBS Architecture

PBS stores backups in **datastores** - directories on disk where backup data lives. Each datastore uses content-addressable storage with SHA-256 checksums, providing:

- **Deduplication**: Identical data chunks across different VMs or time points are stored once
- **Integrity verification**: Every restore is verified against stored checksums
- **Encryption**: Backups can be encrypted client-side before transmission
- **Garbage collection**: Old backup chunks are cleaned up after retention policies expire old snapshots

## Hardware and Installation

PBS has modest hardware requirements:
- 2+ CPU cores
- 2GB RAM minimum (4GB+ recommended for large datastores)
- Fast storage for the datastore (SSDs for the index, HDDs acceptable for the chunk store)

### Downloading and Installing PBS

Download the PBS ISO from `https://www.proxmox.com/en/downloads`.

The installation process mirrors Proxmox VE:

1. Boot from the PBS ISO
2. Select target disk and filesystem
3. Set hostname (e.g., `pbs.yourdomain.com`)
4. Configure a static IP address
5. Set root password

After installation, access the web interface at:

```
https://<pbs-ip>:8007
```

### Configuring the Free Community Repository

```bash
# Disable enterprise repository (requires subscription)
echo "# Enterprise repo disabled" > /etc/apt/sources.list.d/pbs-enterprise.list

# Add community repository
echo "deb http://download.proxmox.com/debian/pbs bookworm pbs-no-subscription" \
    > /etc/apt/sources.list.d/pbs-community.list

# Update and upgrade
apt-get update && apt-get dist-upgrade -y
```

## Creating and Configuring Datastores

A datastore is where PBS stores backup data. You can have multiple datastores for different retention policies or storage tiers.

### Creating a Datastore via Web Interface

1. Navigate to `Configuration > Storage > Datastores > Add`
2. Set an ID (name) for the datastore
3. Set the backing directory path
4. Configure garbage collection schedule

### Creating a Datastore via CLI

```bash
# Create the directory for the datastore
mkdir -p /backup/vm-backups

# Add the datastore to PBS
proxmox-backup-manager datastore create vm-backups /backup/vm-backups \
    --comment "Primary VM backup store"

# Verify it was created
proxmox-backup-manager datastore list
```

### Adding an External Disk for Backup Storage

For large backup sets, use a dedicated disk:

```bash
# Partition and format the backup disk
parted /dev/sdb mklabel gpt
parted /dev/sdb mkpart primary 0% 100%
mkfs.ext4 -L backup-store /dev/sdb1

# Add to /etc/fstab for persistent mounting
echo "LABEL=backup-store /mnt/backup-store ext4 defaults,nofail 0 2" >> /etc/fstab

# Mount it
mount -a

# Create PBS datastore on the mounted drive
proxmox-backup-manager datastore create large-backups /mnt/backup-store
```

## Configuring Retention Policies

Retention policies control how many backup snapshots PBS keeps. Configure them per datastore:

```bash
# Set retention policy on the datastore
# Keep 7 daily, 4 weekly, 3 monthly backups
proxmox-backup-manager datastore update vm-backups \
    --keep-last 3 \
    --keep-daily 7 \
    --keep-weekly 4 \
    --keep-monthly 3 \
    --keep-yearly 1

# View current datastore configuration
proxmox-backup-manager datastore config vm-backups
```

Garbage collection prunes expired chunks after the retention policy removes old snapshots. Schedule it:

```bash
# Schedule GC to run weekly on Sunday at 2 AM
proxmox-backup-manager datastore update vm-backups \
    --gc-schedule "sun 02:00"
```

## Creating PBS Users and Tokens

Rather than using root credentials, create API tokens for Proxmox VE to authenticate with PBS:

```bash
# Create a dedicated user for PVE backups
proxmox-backup-manager user create pve-backup@pbs --comment "Proxmox VE backup user"

# Set a password
proxmox-backup-manager user update pve-backup@pbs --password "secure_password_here"

# Create an API token (preferred over passwords for automation)
proxmox-backup-manager user generate-token pve-backup@pbs backup-token

# Save the returned token ID and secret - you'll need them in Proxmox VE
```

### Assigning Permissions

```bash
# Grant the user DatastoreBackup role on the specific datastore
proxmox-backup-manager acl update /datastore/vm-backups \
    --auth-id 'pve-backup@pbs' \
    --role DatastoreBackup

# If you also need restore capability from PBS interface, add DatastoreAudit
proxmox-backup-manager acl update /datastore/vm-backups \
    --auth-id 'pve-backup@pbs' \
    --role DatastoreAudit
```

## Adding PBS to Proxmox VE

### Via the Proxmox VE Web Interface

1. Go to `Datacenter > Storage > Add > Proxmox Backup Server`
2. Fill in:
   - **ID**: A name for this storage backend (e.g., `pbs-store`)
   - **Server**: PBS IP or hostname
   - **Username**: `pve-backup@pbs`
   - **Password** or **Token**: The credentials created above
   - **Datastore**: The datastore name (e.g., `vm-backups`)
   - **Fingerprint**: The PBS server certificate fingerprint

Get the PBS fingerprint:

```bash
# Run on the PBS server
proxmox-backup-manager cert info | grep Fingerprint
```

### Via CLI on Proxmox VE

```bash
# On the PVE node, add PBS as storage
pvesm add pbs my-pbs \
    --server <pbs-ip> \
    --datastore vm-backups \
    --username pve-backup@pbs \
    --password "secure_password_here" \
    --fingerprint "XX:XX:XX:..." \
    --content backup
```

## Running Backups

### Manual Backup via Proxmox VE

```bash
# Back up VM 201 to PBS storage
vzdump 201 --storage my-pbs --mode snapshot --compress zstd

# Back up all VMs
vzdump --all --storage my-pbs --mode snapshot --compress zstd
```

### Scheduled Backups via Proxmox VE

In the Proxmox VE web interface: `Datacenter > Backup > Add`

Configure:
- Schedule (e.g., daily at 2:00 AM)
- Storage: select `my-pbs`
- Mode: `snapshot` (VMs keep running)
- Compression: `zstd`
- Select which VMs to include

### Monitoring Backup Jobs

```bash
# On PBS, view all stored backups
proxmox-backup-client list --repository pve-backup@pbs@<pbs-ip>:vm-backups

# View backup details for a specific VM
proxmox-backup-manager snapshots vm/201/ubuntu-web-server

# Check datastore statistics
proxmox-backup-manager status vm-backups
```

## Restoring Backups

### Full VM Restore via Proxmox VE

In the Proxmox VE web interface:
1. Navigate to the PBS storage in the left panel
2. Find the backup snapshot
3. Click `Restore`
4. Select target node, storage, and VMID
5. Optionally enable `Start after restore`

### Single File Restore

PBS supports mounting backup archives to extract individual files:

```bash
# On the PBS server, mount a backup for file-level access
proxmox-backup-manager catalog dump vm/201/2026-03-02T02:00:00Z

# Or use proxmox-backup-client on the PVE node
proxmox-backup-client restore \
    --repository pve-backup@pbs@<pbs-ip>:vm-backups \
    vm/201/2026-03-02T02:00:00Z \
    drive-scsi0.img.fidx \
    /tmp/restored-disk.img
```

## Verifying Backup Integrity

PBS stores SHA-256 checksums for all data. Verify backup integrity regularly:

```bash
# Verify all backups in a datastore
proxmox-backup-manager verify-job create check-integrity \
    --datastore vm-backups \
    --schedule "sat 03:00"

# Manually trigger verification
proxmox-backup-manager verify vm-backups
```

## Summary

Proxmox Backup Server provides enterprise-grade VM backup capabilities with minimal overhead. The chunk-based deduplication is the standout feature - once you've backed up similar VMs (e.g., multiple Ubuntu server clones), subsequent backups of each are extremely fast and storage-efficient since shared OS chunks are already stored.

Key operational practices:
- Test restores regularly - don't assume backups work until you've verified a restore
- Use API tokens rather than root passwords for PVE to PBS authentication
- Set garbage collection schedules to reclaim space after old snapshots expire
- Monitor PBS storage usage to ensure you don't run out of space mid-backup
