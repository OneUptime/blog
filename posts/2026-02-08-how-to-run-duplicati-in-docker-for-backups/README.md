# How to Run Duplicati in Docker for Backups

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, duplicati, backup, disaster-recovery, self-hosted, encryption

Description: Deploy Duplicati in Docker for encrypted, deduplicated backups to local storage, S3, Backblaze B2, and other cloud destinations.

---

Duplicati is a free, open-source backup tool that creates encrypted, incremental backups and stores them on a wide variety of storage backends. It supports local drives, network shares, Amazon S3, Backblaze B2, Google Drive, SFTP, and over 20 other destinations. Running Duplicati in Docker gives you a web-based backup management interface that runs headlessly on any server.

## Why Duplicati?

Good backup software needs three properties: encryption (so your data is safe at rest), deduplication (so storage costs stay reasonable), and flexibility in storage destinations. Duplicati checks all three boxes. It encrypts backups with AES-256 before they leave your server, deduplicates at the block level to minimize storage usage, and supports nearly every cloud storage provider. The web UI makes scheduling and monitoring backups straightforward.

## Prerequisites

- A Linux server with Docker and Docker Compose installed
- At least 1 GB of RAM
- Storage for backups (local disk, NAS mount, or cloud storage credentials)
- The directories you want to back up mounted or accessible to the container

## Project Setup

```bash
# Create the Duplicati project directory
mkdir -p ~/duplicati/config
cd ~/duplicati
```

## Docker Compose Configuration

```yaml
# docker-compose.yml - Duplicati Backup Solution
version: "3.8"

services:
  duplicati:
    image: lscr.io/linuxserver/duplicati:latest
    container_name: duplicati
    restart: unless-stopped
    ports:
      # Web UI for backup management
      - "8200:8200"
    environment:
      # Run as root to access all files on the host
      - PUID=0
      - PGID=0
      - TZ=America/New_York
    volumes:
      # Duplicati configuration and database
      - ./config:/config
      # Source directories to back up (mount as read-only)
      - /home:/source/home:ro
      - /etc:/source/etc:ro
      - /var/lib/docker/volumes:/source/docker-volumes:ro
      # Local backup destination (optional)
      - /mnt/backup-drive:/backups
```

Running as PUID=0 (root) allows Duplicati to read all files on the system. If you are only backing up your user's files, use your own UID instead.

## Starting Duplicati

```bash
# Start Duplicati in detached mode
docker compose up -d
```

Check the logs:

```bash
# Verify Duplicati started cleanly
docker compose logs -f duplicati
```

Open `http://<your-server-ip>:8200` in your browser. The first time you access the web UI, Duplicati asks if you want to set a password to protect the interface. Set a strong password since this interface controls your backup configuration.

## Creating Your First Backup Job

Click "Add backup" and choose "Configure a new backup." The wizard walks through five steps:

### Step 1: General Settings

```
Name: Daily Server Backup
Description: Backs up home directories and configurations
Encryption: AES-256, built-in
Passphrase: (set a strong passphrase - you need this to restore)
```

Store the passphrase somewhere safe. Without it, your encrypted backups are unrecoverable.

### Step 2: Backup Destination

Choose your storage backend. Here are the most common options:

For local storage:

```
Storage Type: Local folder or drive
Folder path: /backups/server-daily
```

For Backblaze B2:

```
Storage Type: B2 Cloud Storage
Bucket: your-backup-bucket
Account ID: your_account_id
Application Key: your_application_key
Folder path: server-daily
```

For Amazon S3:

```
Storage Type: S3 Compatible
Server: s3.amazonaws.com
Bucket: your-backup-bucket
AWS Access ID: your_access_key
AWS Access Key: your_secret_key
Region: us-east-1
Folder path: server-daily
```

### Step 3: Source Data

Select the directories to include:

```
# Check these paths in the file browser
/source/home
/source/etc
/source/docker-volumes
```

Add exclusion filters for files you do not want to back up:

```
# Exclusion filters
*.tmp
*.cache
*/node_modules/*
*/.git/objects/*
*/Trash/*
```

### Step 4: Schedule

Set the backup frequency:

```
Run automatically: Yes
Schedule: Every day at 02:00 AM
```

### Step 5: Options

Configure retention policy:

```
# Keep backups for a rolling period
Keep all backups that are newer than: 7 days
Keep one backup per day that is newer than: 30 days
Keep one backup per week that is newer than: 90 days
Keep one backup per month that is newer than: 365 days
```

This retention policy keeps recent backups granular and older ones sparse, balancing storage usage with recovery flexibility.

## Testing Backups

After creating a backup job, run it manually to verify everything works:

1. Click on the backup job
2. Click "Run now"
3. Monitor the progress in the UI

After the backup completes, test a restore:

1. Click on the backup job
2. Click "Restore"
3. Browse the backup contents
4. Select a file and restore it to a test directory

Never trust backups you have not tested. A backup that cannot be restored is not a backup.

## Command-Line Operations

Duplicati includes a command-line interface for scripted operations:

```bash
# List backup jobs configured in Duplicati
docker exec duplicati duplicati-cli list-backup-sets /backups/server-daily

# Run a backup job from the command line
docker exec duplicati duplicati-cli backup \
  "file:///backups/server-daily" \
  "/source/home" \
  --passphrase="your_passphrase" \
  --encryption-module="aes"

# Verify backup integrity
docker exec duplicati duplicati-cli test \
  "file:///backups/server-daily" \
  --passphrase="your_passphrase"
```

## Backup Verification

Duplicati can automatically verify backups after each run. Enable this in the backup job's advanced options:

```
# Under Advanced Options, add:
--backup-test-samples=3
```

This tests 3 random backup files after each backup run to verify they are valid and can be restored.

## Notification Setup

Configure email notifications for backup success and failure. In the backup job settings, go to Advanced Options:

```
# Email notification settings
--send-mail-to=admin@your-domain.com
--send-mail-from=duplicati@your-domain.com
--send-mail-url=smtp://smtp.gmail.com:587/?starttls=when-available
--send-mail-username=your-email@gmail.com
--send-mail-password=your-app-password
--send-mail-level=Warning,Error,Fatal
```

Setting the level to "Warning,Error,Fatal" means you only get notified about problems, not every successful backup.

## Backing Up Docker Volumes

To back up Docker volumes, mount the volumes directory into the Duplicati container. The Compose file above already includes `/var/lib/docker/volumes`. For specific application data, mount individual paths:

```yaml
# Mount specific application data directories
volumes:
  - ./config:/config
  - /home/user/nextcloud/data:/source/nextcloud-data:ro
  - /home/user/vaultwarden/data:/source/vaultwarden-data:ro
  - /home/user/home-assistant/config:/source/ha-config:ro
```

Create separate backup jobs for different applications so you can restore them independently.

## Storage Optimization

Duplicati uses block-level deduplication. If you have similar data across multiple directories, the storage usage is much lower than the raw data size. Adjust the block size for different workloads:

```
# For many small files (documents, configs): use smaller blocks
--blocksize=100KB

# For large files (databases, media): use larger blocks
--blocksize=1MB
```

## Disaster Recovery

If you need to restore from scratch on a new server:

1. Install Docker and Duplicati on the new server
2. Use the CLI to restore directly from your backup destination:

```bash
# Restore from a remote backup to a new server
docker run --rm -v /restore-target:/restore \
  lscr.io/linuxserver/duplicati:latest \
  duplicati-cli restore \
  "b2://your-bucket/server-daily" \
  --restore-path="/restore" \
  --passphrase="your_passphrase"
```

## Monitoring with OneUptime

Monitor your Duplicati web interface with OneUptime to ensure the backup management dashboard stays accessible. Combine this with custom monitors that check for recent successful backup completion. If backups stop running, you want to know immediately, not when you need to restore.

## Wrapping Up

Duplicati in Docker provides a comprehensive backup solution with encryption, deduplication, and flexible storage destinations. The web UI makes managing backup jobs accessible, while the CLI enables scripted and automated workflows. With proper scheduling, retention policies, and restore testing, Duplicati keeps your data safe without breaking the bank on storage costs.
