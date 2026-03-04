# How to Configure Proxmox Backup Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Backups, Proxmox, Virtualization, Storage

Description: A practical guide to installing and configuring Proxmox Backup Server on Ubuntu to create an efficient, deduplicating backup solution for VMs and containers.

---

Proxmox Backup Server (PBS) is a backup solution designed primarily for Proxmox VE environments. It uses chunk-based deduplication to store backups efficiently, supports incremental backups, and provides end-to-end encryption. Even if you don't run Proxmox VE, PBS works well as a general-purpose backup target for Linux systems through the proxmox-backup-client tool. This guide covers installing PBS on a dedicated Ubuntu backup server and configuring it to receive backups.

## System Requirements

PBS works best on dedicated hardware with:
- A CPU with AES-NI support (for encryption)
- At least 2GB RAM (more for large datastores)
- Separate drives for the OS and backup storage (ZFS is supported and recommended for the datastore)

## Adding the PBS Repository

PBS is not in Ubuntu's default repositories. Add the Proxmox no-subscription repository:

```bash
sudo apt update
sudo apt install -y curl gnupg2

# Add the Proxmox repository key
curl -fsSL https://enterprise.proxmox.com/debian/proxmox-release-bookworm.gpg | \
    sudo gpg --dearmor -o /usr/share/keyrings/proxmox-release-bookworm.gpg

# Add the PBS repository for Debian Bookworm
# Note: PBS packages are Debian-based; use this on Ubuntu 22.04 with care
echo "deb [signed-by=/usr/share/keyrings/proxmox-release-bookworm.gpg] https://download.proxmox.com/debian/pbs bookworm pbs-no-subscription" | \
    sudo tee /etc/apt/sources.list.d/pbs.list

sudo apt update
```

For Ubuntu specifically, it's often cleaner to install PBS using a dedicated Proxmox Backup Server ISO on bare metal. The ISO creates its own Debian-based environment. However, if you want to run it on Ubuntu, the packages above work with some adjustments.

## Alternative: Using the Official PBS ISO

The recommended path for a production setup is the official PBS ISO:

1. Download the PBS ISO from https://www.proxmox.com/en/downloads
2. Boot from the ISO and install to a dedicated server
3. The installer creates a Debian-based system with PBS pre-configured
4. Access the web interface at `https://server-ip:8007`

This guide continues with configuring PBS after it is installed (either via package or ISO).

## Initial Setup via Web Interface

Access the PBS web interface at `https://your-server-ip:8007` and log in with root credentials.

### Creating a Datastore

A datastore is where backups are stored. Navigate to **Datastore** > **Add Datastore**:

```bash
# Alternatively, create a datastore via CLI
proxmox-backup-manager datastore create backup-store /mnt/backup-disk

# List existing datastores
proxmox-backup-manager datastore list
```

If using ZFS for the backup storage, create the pool first:

```bash
# Create a ZFS pool for backup storage (replace sdX with your drives)
sudo zpool create -o ashift=12 backup-pool raidz /dev/sdb /dev/sdc /dev/sdd

# Create a dataset for PBS
sudo zfs create backup-pool/pbs-datastore
sudo zfs set compression=lz4 backup-pool/pbs-datastore

# Then create the datastore pointing to this path
proxmox-backup-manager datastore create main /backup-pool/pbs-datastore
```

## Configuring Backup Users

Create a dedicated backup user rather than using root for everything:

```bash
# Create a PBS user
proxmox-backup-manager user create backup@pbs --comment "Backup service account"
proxmox-backup-manager user update backup@pbs --password 'SecurePassword123!'

# Grant backup permissions on the datastore
proxmox-backup-manager acl update /datastore/backup-store backup@pbs --role DatastoreBackup

# List users and their permissions
proxmox-backup-manager user list
proxmox-backup-manager acl list
```

## Setting Up Encryption Keys

PBS supports end-to-end encryption. Keys are managed client-side:

```bash
# On the backup client - generate an encryption key
proxmox-backup-client key create /etc/pbs/encryption.key

# Export the key for safekeeping (store this securely!)
proxmox-backup-client key paperkey /etc/pbs/encryption.key > /tmp/encryption-paperkey.txt

# The paperkey is a QR code and text representation for offline storage
```

## Configuring a Backup Client

Install the PBS client on systems you want to back up:

```bash
# On Ubuntu client systems
sudo apt install proxmox-backup-client

# Or download from Proxmox website
wget https://downloads.proxmox.com/debian/pbs/dists/bookworm/main/binary-amd64/proxmox-backup-client_3.1.0-1_amd64.deb
sudo dpkg -i proxmox-backup-client_3.1.0-1_amd64.deb
```

Configure the client to connect to PBS:

```bash
# Set PBS connection details as environment variables
export PBS_REPOSITORY="backup@pbs@your-pbs-server:8007:backup-store"
export PBS_PASSWORD="SecurePassword123!"
export PBS_FINGERPRINT="xx:xx:xx:..."  # Get from PBS web interface

# Or use a config file
mkdir -p ~/.config/proxmox-backup
cat > ~/.config/proxmox-backup/client.conf << 'EOF'
[repository "backup@pbs@pbs-server:backup-store"]
    server = pbs-server.example.com
    port = 8007
    datastore = backup-store
    username = backup@pbs
EOF
```

## Running Backups

```bash
# Back up a directory
proxmox-backup-client backup root.pxar:/ --repository "backup@pbs@pbs-server:backup-store"

# Back up with encryption
proxmox-backup-client backup root.pxar:/ \
    --repository "backup@pbs@pbs-server:backup-store" \
    --keyfile /etc/pbs/encryption.key

# Back up specific directories
proxmox-backup-client backup \
    etc.pxar:/etc \
    home.pxar:/home \
    var.pxar:/var/www \
    --repository "backup@pbs@pbs-server:backup-store"

# List existing backups
proxmox-backup-client list --repository "backup@pbs@pbs-server:backup-store"
```

## Scheduling Automatic Backups

Create a systemd timer for scheduled backups:

```bash
sudo nano /etc/systemd/system/pbs-backup.service
```

```ini
[Unit]
Description=Proxmox Backup Service
After=network.target

[Service]
Type=oneshot
User=root
Environment="PBS_REPOSITORY=backup@pbs@pbs-server:backup-store"
Environment="PBS_PASSWORD=SecurePassword123!"
ExecStart=/usr/bin/proxmox-backup-client backup \
    etc.pxar:/etc \
    home.pxar:/home \
    --keyfile /etc/pbs/encryption.key
```

```bash
sudo nano /etc/systemd/system/pbs-backup.timer
```

```ini
[Unit]
Description=Run PBS backup daily

[Timer]
OnCalendar=daily
RandomizedDelaySec=30min
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable pbs-backup.timer
sudo systemctl start pbs-backup.timer
```

## Configuring Pruning and Garbage Collection

PBS stores deduplicated chunks. Configure retention policies and run GC to reclaim space:

```bash
# Set pruning schedule on the datastore
# Keep 7 daily, 4 weekly, 12 monthly backups
proxmox-backup-manager prune-job create daily-prune \
    --store backup-store \
    --schedule "daily" \
    --keep-daily 7 \
    --keep-weekly 4 \
    --keep-monthly 12

# Run garbage collection manually
proxmox-backup-manager garbage-collection start backup-store

# Check GC status
proxmox-backup-manager task list | grep garbage
```

## Restoring Backups

```bash
# List snapshots available for restore
proxmox-backup-client snapshots --repository "backup@pbs@pbs-server:backup-store"

# Restore a specific file from a backup snapshot
proxmox-backup-client restore etc.pxar /tmp/restore-test \
    --repository "backup@pbs@pbs-server:backup-store" \
    --snapshot "host/2026-03-02T00:00:00Z"

# Restore with decryption
proxmox-backup-client restore etc.pxar /tmp/restore-test \
    --repository "backup@pbs@pbs-server:backup-store" \
    --keyfile /etc/pbs/encryption.key \
    --snapshot "host/2026-03-02T00:00:00Z"
```

PBS's deduplication means that after the first full backup, subsequent backups only transfer changed chunks. For systems with large amounts of static data, this dramatically reduces both backup time and storage consumption compared to traditional full or incremental backup approaches.
