# How to Configure Proxmox Backup Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Backup, Proxmox, Virtualization, Storage

Description: A practical guide to installing and configuring Proxmox Backup Server on Ubuntu to create an efficient, deduplicating backup solution for VMs and containers.

---

Proxmox Backup Server (PBS) is a backup solution designed primarily for Proxmox VE environments. It uses chunk-based deduplication to store backups efficiently, supports incremental backups, and provides end-to-end encryption. Even if you don't run Proxmox VE, PBS works well as a general-purpose backup target for Linux systems through the proxmox-backup-client tool. This guide covers installing PBS on a dedicated backup server and configuring Ubuntu clients to send backups to it.

## System Requirements

PBS works best on dedicated hardware with:
- A modern 64-bit AMD or Intel CPU
- At least 4GB RAM for production use (more for large datastores)
- Separate drives for the OS and backup storage (ZFS is supported and recommended for the datastore)

## Adding the PBS Repository

PBS is not in Ubuntu's default repositories. The Proxmox Backup Server packages are built for Debian, not Ubuntu. If you are installing PBS packages directly, use a matching Debian release and add the Proxmox no-subscription repository:

```bash
sudo apt update
sudo apt install -y wget

# Add the Proxmox repository key

sudo wget https://enterprise.proxmox.com/debian/proxmox-archive-keyring-trixie.gpg \
    -O /usr/share/keyrings/proxmox-archive-keyring.gpg

# Add the PBS repository for Debian Trixie
sudo tee /etc/apt/sources.list.d/proxmox.sources > /dev/null << 'EOF'
Types: deb
URIs: http://download.proxmox.com/debian/pbs
Suites: trixie
Components: pbs-no-subscription
Signed-By: /usr/share/keyrings/proxmox-archive-keyring.gpg
EOF

sudo apt update
sudo apt install proxmox-backup-server
```

For Ubuntu specifically, it is cleaner to install PBS using a dedicated Proxmox Backup Server ISO on bare metal or in a Debian VM. The ISO creates its own Debian-based environment.

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
proxmox-backup-manager user create backup@pbs --comment "Backup service account" --password 'SecurePassword123!'

# Grant backup permissions on the datastore
proxmox-backup-manager acl update /datastore/backup-store DatastoreBackup --auth-id backup@pbs

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
# On Ubuntu client systems, add the client-only repository first

sudo wget https://enterprise.proxmox.com/debian/proxmox-archive-keyring-trixie.gpg \
    -O /usr/share/keyrings/proxmox-archive-keyring.gpg

sudo tee /etc/apt/sources.list.d/pbs-client.sources > /dev/null << 'EOF'
Types: deb
URIs: http://download.proxmox.com/debian/pbs-client
Suites: trixie
Components: main
Signed-By: /usr/share/keyrings/proxmox-archive-keyring.gpg
EOF

sudo apt update
sudo apt install proxmox-backup-client
```

Configure the client to connect to PBS:

```bash
# Set PBS connection details as environment variables
export PBS_REPOSITORY="backup@pbs@your-pbs-server:8007:backup-store"
export PBS_PASSWORD="SecurePassword123!"
export PBS_FINGERPRINT="xx:xx:xx:..."  # Get from the datastore connection information in the PBS web interface
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
proxmox-backup-manager garbage-collection status backup-store
```

## Restoring Backups

```bash
# List snapshots available for restore
proxmox-backup-client snapshot list --repository "backup@pbs@pbs-server:backup-store"

# Restore a backup archive from a snapshot
proxmox-backup-client restore "host/hostname/2026-03-02T00:00:00Z" etc.pxar /tmp/restore-test \
    --repository "backup@pbs@pbs-server:backup-store"

# Restore with decryption
proxmox-backup-client restore "host/hostname/2026-03-02T00:00:00Z" etc.pxar /tmp/restore-test \
    --repository "backup@pbs@pbs-server:backup-store" \
    --keyfile /etc/pbs/encryption.key
```

PBS's deduplication means that after the first full backup, subsequent backups only transfer changed chunks. For systems with large amounts of static data, this dramatically reduces both backup time and storage consumption compared to traditional full or incremental backup approaches.
