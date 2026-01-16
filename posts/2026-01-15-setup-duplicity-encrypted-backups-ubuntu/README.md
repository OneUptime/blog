# How to Set Up Duplicity for Encrypted Backups on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Duplicity, Encrypted Backup, GPG, Cloud Backup, Tutorial

Description: Complete guide to setting up Duplicity for encrypted incremental backups on Ubuntu.

---

Data loss can be catastrophic for individuals and organizations alike. Whether it's accidental deletion, hardware failure, ransomware attacks, or natural disasters, having a reliable backup strategy is essential. Duplicity is a powerful open-source backup tool that combines the best of both worlds: encrypted backups and bandwidth-efficient incremental transfers. In this comprehensive guide, we'll walk through setting up Duplicity for encrypted backups on Ubuntu, covering everything from basic usage to advanced automation.

## Understanding Duplicity Features

Duplicity stands out among backup solutions for several compelling reasons:

### Key Features

1. **Strong Encryption**: Uses GnuPG (GPG) to encrypt all backup data, ensuring your files remain private even when stored on remote servers or cloud storage.

2. **Bandwidth Efficiency**: Implements the rsync algorithm for incremental backups, transferring only the changed portions of files after the initial full backup.

3. **Multiple Backend Support**: Supports numerous storage destinations including Amazon S3, Google Cloud Storage, Azure, SFTP, FTP, WebDAV, Dropbox, and local storage.

4. **Tar Format Archives**: Stores backups in standard tar format, making recovery possible even without Duplicity in emergencies.

5. **Signature Files**: Maintains signature files to track file changes without needing access to previous backup data.

6. **Full and Incremental Backups**: Automatically manages full and incremental backup chains for optimal storage usage.

7. **Point-in-Time Recovery**: Allows restoration to any specific point in the backup history.

### How Duplicity Works

Duplicity operates by creating an initial full backup followed by incremental backups that capture only the changes since the last backup. The workflow is:

1. First run: Creates a full backup (compressed and encrypted)
2. Subsequent runs: Creates incremental backups containing only changes
3. Restoration: Combines full backup with necessary incremental backups

## Installing Duplicity

### Method 1: Using APT (Recommended)

The simplest way to install Duplicity on Ubuntu is through the package manager:

```bash
# Update package lists to ensure we have the latest package information
sudo apt update

# Install duplicity and its dependencies
sudo apt install -y duplicity

# Verify the installation by checking the version
duplicity --version
```

### Method 2: Installing from PPA for Latest Version

For the most recent version with the latest features and bug fixes:

```bash
# Add the Duplicity team's PPA repository
sudo add-apt-repository ppa:duplicity-team/duplicity-release-git

# Update package lists to include the new repository
sudo apt update

# Install the latest version of duplicity
sudo apt install -y duplicity

# Verify installation
duplicity --version
```

### Method 3: Installing via pip

For maximum control over the version or for development purposes:

```bash
# Install pip if not already present
sudo apt install -y python3-pip

# Install duplicity using pip
pip3 install duplicity

# You may need to install additional backend dependencies
pip3 install boto3 paramiko dropbox
```

### Installing Backend Dependencies

Depending on your backup destination, install the appropriate backend:

```bash
# For Amazon S3 backups
sudo apt install -y python3-boto3

# For SFTP/SSH backups
sudo apt install -y python3-paramiko

# For Google Cloud Storage
sudo apt install -y python3-google-cloud-storage

# For Azure Blob Storage
pip3 install azure-storage-blob

# For Dropbox
pip3 install dropbox

# For WebDAV
sudo apt install -y python3-webdav

# For multiple backends at once
sudo apt install -y python3-boto3 python3-paramiko duplicity
```

## GPG Key Setup for Encryption

Duplicity uses GPG for encryption. You can use symmetric encryption (passphrase only) or asymmetric encryption (GPG keys). Using GPG keys is more secure for automated backups.

### Creating a GPG Key Pair

```bash
# Generate a new GPG key pair
# This will prompt for key type, size, expiration, and passphrase
gpg --full-generate-key
```

When prompted, choose these recommended settings:
- Key type: RSA and RSA (option 1)
- Key size: 4096 bits (maximum security)
- Expiration: 0 (key does not expire) or set based on your policy
- Real name: Your name or server identifier
- Email: Your email address
- Passphrase: Strong, unique passphrase

### Listing Your GPG Keys

```bash
# List all GPG keys in your keyring
# The key ID is shown after the algorithm (e.g., rsa4096/ABCD1234)
gpg --list-keys

# Example output:
# pub   rsa4096 2026-01-15 [SC]
#       ABCD1234EFGH5678IJKL9012MNOP3456QRST7890
# uid           [ultimate] Your Name <your@email.com>
# sub   rsa4096 2026-01-15 [E]
```

### Exporting Keys for Backup

Always backup your GPG keys securely - without them, you cannot decrypt your backups:

```bash
# Export your public key (safe to share)
gpg --export --armor your@email.com > ~/gpg-public-key.asc

# Export your private key (keep this extremely secure!)
gpg --export-secret-keys --armor your@email.com > ~/gpg-private-key.asc

# Store these files securely (encrypted USB, password manager, etc.)
# IMPORTANT: Without the private key, encrypted backups cannot be restored!
```

### Importing Keys on Another System

If you need to restore on a different machine:

```bash
# Import the public key
gpg --import ~/gpg-public-key.asc

# Import the private key
gpg --import ~/gpg-private-key.asc

# Trust the imported key
gpg --edit-key your@email.com
# In the GPG prompt, type: trust
# Select option 5 (ultimate trust)
# Type: quit
```

## Basic Backup Commands

### Your First Backup

Let's start with a simple backup to understand the basics:

```bash
# Set the passphrase as an environment variable
# This avoids being prompted during backup
export PASSPHRASE="your-secure-passphrase"

# Basic backup to a local directory
# Syntax: duplicity [options] source_directory target_url
duplicity /home/user/documents file:///backup/documents

# Backup with GPG key encryption (recommended)
# Replace ABCD1234 with your actual GPG key ID
duplicity --encrypt-key ABCD1234 /home/user/documents file:///backup/documents

# Backup with symmetric encryption (passphrase only)
duplicity --no-encryption /home/user/documents file:///backup/documents

# Clear the passphrase from environment when done
unset PASSPHRASE
```

### Understanding Backup URLs

Duplicity uses URLs to specify backup destinations:

```bash
# Local filesystem
file:///path/to/backup/directory

# SFTP (SSH File Transfer Protocol)
sftp://user@hostname/path/to/backup

# Amazon S3
s3://bucket-name/path/to/backup

# Google Cloud Storage
gs://bucket-name/path/to/backup

# Azure Blob Storage
azure://container-name

# Dropbox
dpbx:///path/in/dropbox

# WebDAV
webdav://user@hostname/path

# FTP (not recommended - use SFTP instead)
ftp://user@hostname/path
```

### Excluding and Including Files

Control what gets backed up using include/exclude patterns:

```bash
# Exclude specific directories
duplicity --exclude /home/user/documents/temp \
          --exclude /home/user/documents/cache \
          --encrypt-key ABCD1234 \
          /home/user/documents file:///backup/documents

# Use an exclude file for complex patterns
# Create exclude file: /home/user/backup-excludes.txt
# Contents:
# - **/.cache
# - **/node_modules
# - **/*.tmp
# - **/temp/**

duplicity --exclude-filelist /home/user/backup-excludes.txt \
          --encrypt-key ABCD1234 \
          /home/user/documents file:///backup/documents

# Include only specific patterns
duplicity --include /home/user/documents/important \
          --exclude '**' \
          --encrypt-key ABCD1234 \
          /home/user/documents file:///backup/documents
```

## Incremental Backups

Duplicity automatically performs incremental backups after the initial full backup.

### How Incremental Backups Work

```bash
# First backup - creates a full backup automatically
duplicity --encrypt-key ABCD1234 /home/user/documents file:///backup/documents
# Output: "Last full backup date: none"
# This creates the initial full backup

# Second backup - automatically incremental
duplicity --encrypt-key ABCD1234 /home/user/documents file:///backup/documents
# Output: "Last full backup date: Thu Jan 15 10:00:00 2026"
# This creates an incremental backup containing only changes
```

### Forcing a Full Backup

Periodically, you should create new full backups to prevent long incremental chains:

```bash
# Force a full backup regardless of existing backups
duplicity full --encrypt-key ABCD1234 /home/user/documents file:///backup/documents

# Alternatively, use the --full-if-older-than option
# This creates a full backup if the last one is older than 30 days
duplicity --full-if-older-than 30D \
          --encrypt-key ABCD1234 \
          /home/user/documents file:///backup/documents
```

### Checking Backup Status

```bash
# List all backup sets (full and incremental)
duplicity collection-status file:///backup/documents

# Example output shows:
# - Chain start time (when full backup was created)
# - Chain end time (most recent incremental)
# - Number of volumes in each backup set
# - Total backup size
```

## Backing Up to Various Destinations

### Amazon S3

```bash
# Set AWS credentials as environment variables
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export PASSPHRASE="your-gpg-passphrase"

# Backup to S3
# The s3 URL format is: s3://bucket-name/path/to/backup
duplicity --encrypt-key ABCD1234 \
          --s3-use-new-style \
          /home/user/documents \
          s3://my-backup-bucket/documents

# Using a specific S3 region
duplicity --encrypt-key ABCD1234 \
          --s3-use-new-style \
          --s3-region-name us-west-2 \
          /home/user/documents \
          s3://my-backup-bucket/documents

# Using S3-compatible storage (MinIO, Wasabi, etc.)
duplicity --encrypt-key ABCD1234 \
          --s3-use-new-style \
          --s3-endpoint-url https://s3.wasabisys.com \
          /home/user/documents \
          s3://my-wasabi-bucket/documents

# Clean up environment variables
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY PASSPHRASE
```

### SFTP (SSH)

```bash
# Set passphrase for GPG
export PASSPHRASE="your-gpg-passphrase"

# Basic SFTP backup using password authentication
# You'll be prompted for the SSH password
duplicity --encrypt-key ABCD1234 \
          /home/user/documents \
          sftp://user@backup-server.example.com/backups/documents

# Using SSH key authentication (recommended)
# First, ensure your SSH key is added to ssh-agent
eval $(ssh-agent)
ssh-add ~/.ssh/id_rsa

duplicity --encrypt-key ABCD1234 \
          --ssh-options="-oIdentityFile=~/.ssh/id_rsa" \
          /home/user/documents \
          sftp://user@backup-server.example.com/backups/documents

# Specifying a non-standard SSH port
duplicity --encrypt-key ABCD1234 \
          --ssh-options="-oPort=2222" \
          /home/user/documents \
          sftp://user@backup-server.example.com/backups/documents

unset PASSPHRASE
```

### Google Cloud Storage

```bash
# First, authenticate with Google Cloud
# Install gcloud CLI if needed: https://cloud.google.com/sdk/docs/install
gcloud auth application-default login

# Set passphrase
export PASSPHRASE="your-gpg-passphrase"

# Alternatively, use a service account key file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Backup to Google Cloud Storage
duplicity --encrypt-key ABCD1234 \
          /home/user/documents \
          gs://my-backup-bucket/documents

unset PASSPHRASE GOOGLE_APPLICATION_CREDENTIALS
```

### Azure Blob Storage

```bash
# Set Azure credentials
export AZURE_ACCOUNT_NAME="your-storage-account-name"
export AZURE_ACCOUNT_KEY="your-storage-account-key"
export PASSPHRASE="your-gpg-passphrase"

# Backup to Azure Blob Storage
duplicity --encrypt-key ABCD1234 \
          /home/user/documents \
          azure://my-backup-container

unset AZURE_ACCOUNT_NAME AZURE_ACCOUNT_KEY PASSPHRASE
```

### Dropbox

```bash
# Install the Dropbox backend
pip3 install dropbox

# You'll need to create a Dropbox app and get an access token
# Visit: https://www.dropbox.com/developers/apps

export DPBX_ACCESS_TOKEN="your-dropbox-access-token"
export PASSPHRASE="your-gpg-passphrase"

# Backup to Dropbox
duplicity --encrypt-key ABCD1234 \
          /home/user/documents \
          dpbx:///backups/documents

unset DPBX_ACCESS_TOKEN PASSPHRASE
```

### Backblaze B2

```bash
# Set B2 credentials
export B2_ACCOUNT_ID="your-account-id"
export B2_APPLICATION_KEY="your-application-key"
export PASSPHRASE="your-gpg-passphrase"

# Backup to Backblaze B2
duplicity --encrypt-key ABCD1234 \
          /home/user/documents \
          b2://my-backup-bucket/documents

unset B2_ACCOUNT_ID B2_APPLICATION_KEY PASSPHRASE
```

## Restoring Files

### Full Restoration

```bash
# Set the passphrase for decryption
export PASSPHRASE="your-gpg-passphrase"

# Restore entire backup to a directory
# The destination directory will be created if it doesn't exist
duplicity restore file:///backup/documents /home/user/restored-documents

# Restore from a specific point in time
# Use formats like: 2026-01-15, 2D (2 days ago), 1W (1 week ago)
duplicity restore --time 2026-01-10 \
                  file:///backup/documents \
                  /home/user/restored-documents

# Restore from 3 days ago
duplicity restore --time 3D \
                  file:///backup/documents \
                  /home/user/restored-documents

unset PASSPHRASE
```

### Restoring Specific Files

```bash
export PASSPHRASE="your-gpg-passphrase"

# Restore a single file
# Use --file-to-restore with the relative path from backup root
duplicity restore --file-to-restore important-document.txt \
                  file:///backup/documents \
                  /home/user/important-document-restored.txt

# Restore a specific directory
duplicity restore --file-to-restore projects/webapp \
                  file:///backup/documents \
                  /home/user/webapp-restored

# Restore a file from a specific point in time
duplicity restore --time 2026-01-10 \
                  --file-to-restore config/settings.conf \
                  file:///backup/documents \
                  /home/user/settings-restored.conf

unset PASSPHRASE
```

### Listing Backup Contents

```bash
export PASSPHRASE="your-gpg-passphrase"

# List all files in the current backup
duplicity list-current-files file:///backup/documents

# List files at a specific point in time
duplicity list-current-files --time 2026-01-10 file:///backup/documents

# List files matching a pattern (using grep to filter)
duplicity list-current-files file:///backup/documents | grep "\.conf$"

unset PASSPHRASE
```

## Verifying Backups

Regular verification ensures your backups are valid and restorable.

### Basic Verification

```bash
export PASSPHRASE="your-gpg-passphrase"

# Verify backup integrity
# This downloads and verifies the backup against current files
duplicity verify file:///backup/documents /home/user/documents

# Verify specific files only
duplicity verify --file-to-restore important.txt \
                 file:///backup/documents \
                 /home/user/documents

unset PASSPHRASE
```

### Collection Status

```bash
# Check the status of backup collections without needing the passphrase
duplicity collection-status file:///backup/documents

# This shows:
# - Number of backup chains
# - Full backup dates
# - Incremental backup dates
# - Total number of volumes
# - Any incomplete backups
```

### Creating a Verification Script

```bash
#!/bin/bash
# verify-backup.sh - Verify backup integrity and send alert on failure

# Configuration
BACKUP_URL="file:///backup/documents"
SOURCE_DIR="/home/user/documents"
LOG_FILE="/var/log/backup-verify.log"
ALERT_EMAIL="admin@example.com"

# Load credentials securely
source /root/.backup-credentials

export PASSPHRASE

# Perform verification
echo "$(date): Starting backup verification" >> "$LOG_FILE"

if duplicity verify "$BACKUP_URL" "$SOURCE_DIR" >> "$LOG_FILE" 2>&1; then
    echo "$(date): Verification successful" >> "$LOG_FILE"
else
    echo "$(date): Verification FAILED" >> "$LOG_FILE"
    # Send alert email
    echo "Backup verification failed. Check $LOG_FILE for details." | \
        mail -s "ALERT: Backup Verification Failed" "$ALERT_EMAIL"
fi

unset PASSPHRASE
```

## Automated Backup Scripts

### Basic Automated Backup Script

```bash
#!/bin/bash
#===============================================================================
# backup.sh - Automated Duplicity backup script
#
# This script performs encrypted incremental backups using Duplicity.
# It handles GPG encryption, rotation of old backups, and logging.
#
# Usage: ./backup.sh [full]
#   - Run without arguments for incremental backup
#   - Run with 'full' argument to force a full backup
#
# Prerequisites:
#   - Duplicity installed
#   - GPG key created and trusted
#   - Credentials file at /root/.backup-credentials
#===============================================================================

set -e  # Exit on any error
set -u  # Error on undefined variables

#-------------------------------------------------------------------------------
# Configuration
#-------------------------------------------------------------------------------

# What to backup
SOURCE_DIR="/home/user/documents"

# Where to backup (supports various backends)
BACKUP_URL="s3://my-backup-bucket/documents"

# GPG key ID for encryption
GPG_KEY="ABCD1234EFGH5678IJKL9012MNOP3456QRST7890"

# Backup retention settings
FULL_BACKUP_INTERVAL="30D"    # Create new full backup if older than 30 days
KEEP_FULL_BACKUPS="3"         # Keep 3 full backups
KEEP_INCREMENTAL_CHAINS="3"   # Keep incrementals for 3 full backup chains

# Logging
LOG_FILE="/var/log/duplicity-backup.log"
DATE=$(date +"%Y-%m-%d %H:%M:%S")

# Exclude patterns file
EXCLUDE_FILE="/etc/duplicity/excludes.txt"

#-------------------------------------------------------------------------------
# Load credentials
#-------------------------------------------------------------------------------

# Credentials file should contain:
# export AWS_ACCESS_KEY_ID="..."
# export AWS_SECRET_ACCESS_KEY="..."
# export PASSPHRASE="..."
if [[ -f /root/.backup-credentials ]]; then
    source /root/.backup-credentials
else
    echo "[$DATE] ERROR: Credentials file not found" >> "$LOG_FILE"
    exit 1
fi

#-------------------------------------------------------------------------------
# Logging function
#-------------------------------------------------------------------------------
log() {
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" >> "$LOG_FILE"
}

#-------------------------------------------------------------------------------
# Main backup function
#-------------------------------------------------------------------------------
perform_backup() {
    log "Starting backup of $SOURCE_DIR to $BACKUP_URL"

    # Build duplicity command
    local cmd="duplicity"

    # Check if full backup requested
    if [[ "${1:-}" == "full" ]]; then
        cmd="$cmd full"
        log "Performing FULL backup"
    else
        cmd="$cmd --full-if-older-than $FULL_BACKUP_INTERVAL"
        log "Performing incremental backup (full if older than $FULL_BACKUP_INTERVAL)"
    fi

    # Add common options
    cmd="$cmd --encrypt-key $GPG_KEY"
    cmd="$cmd --s3-use-new-style"
    cmd="$cmd --volsize 250"  # 250MB volumes for better parallelism
    cmd="$cmd --asynchronous-upload"  # Upload while creating next volume

    # Add exclude file if it exists
    if [[ -f "$EXCLUDE_FILE" ]]; then
        cmd="$cmd --exclude-filelist $EXCLUDE_FILE"
    fi

    # Add source and destination
    cmd="$cmd $SOURCE_DIR $BACKUP_URL"

    # Execute backup
    if eval "$cmd" >> "$LOG_FILE" 2>&1; then
        log "Backup completed successfully"
    else
        log "ERROR: Backup failed"
        return 1
    fi
}

#-------------------------------------------------------------------------------
# Cleanup old backups
#-------------------------------------------------------------------------------
cleanup_old_backups() {
    log "Cleaning up old backups"

    # Remove old backup sets beyond retention
    duplicity remove-all-but-n-full "$KEEP_FULL_BACKUPS" \
              --force \
              "$BACKUP_URL" >> "$LOG_FILE" 2>&1

    # Remove any incomplete backup sets
    duplicity cleanup \
              --force \
              "$BACKUP_URL" >> "$LOG_FILE" 2>&1

    log "Cleanup completed"
}

#-------------------------------------------------------------------------------
# Main execution
#-------------------------------------------------------------------------------
main() {
    log "=========================================="
    log "Backup job started"

    # Perform the backup
    if perform_backup "${1:-}"; then
        # Only cleanup if backup succeeded
        cleanup_old_backups
        log "Backup job completed successfully"
    else
        log "Backup job failed"
        exit 1
    fi

    log "=========================================="
}

# Run main function with any passed arguments
main "$@"

# Clean up environment
unset PASSPHRASE AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
```

### Credentials File

Create a secure credentials file:

```bash
#!/bin/bash
# /root/.backup-credentials
# This file contains sensitive credentials - protect it!

# GPG passphrase for encryption/decryption
export PASSPHRASE="your-very-secure-gpg-passphrase"

# AWS credentials for S3 backup
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# Optional: Set AWS region
export AWS_DEFAULT_REGION="us-east-1"
```

Secure the credentials file:

```bash
# Set strict permissions - only root can read
sudo chown root:root /root/.backup-credentials
sudo chmod 600 /root/.backup-credentials
```

### Setting Up Cron Jobs

```bash
# Edit the root crontab for automated backups
sudo crontab -e

# Add these entries:

# Daily incremental backup at 2:00 AM
0 2 * * * /usr/local/bin/backup.sh >> /var/log/cron-backup.log 2>&1

# Weekly full backup on Sunday at 3:00 AM
0 3 * * 0 /usr/local/bin/backup.sh full >> /var/log/cron-backup.log 2>&1

# Monthly verification on the 1st at 4:00 AM
0 4 1 * * /usr/local/bin/verify-backup.sh >> /var/log/cron-backup.log 2>&1
```

### Systemd Timer Alternative

For more robust scheduling, use systemd timers:

```bash
# /etc/systemd/system/duplicity-backup.service
[Unit]
Description=Duplicity Backup Service
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
User=root
StandardOutput=append:/var/log/duplicity-backup.log
StandardError=append:/var/log/duplicity-backup.log

[Install]
WantedBy=multi-user.target
```

```bash
# /etc/systemd/system/duplicity-backup.timer
[Unit]
Description=Daily Duplicity Backup Timer

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

Enable the timer:

```bash
# Reload systemd to recognize new files
sudo systemctl daemon-reload

# Enable and start the timer
sudo systemctl enable duplicity-backup.timer
sudo systemctl start duplicity-backup.timer

# Check timer status
sudo systemctl list-timers duplicity-backup.timer
```

## Retention and Cleanup

### Understanding Retention

Duplicity maintains chains of backups. Each chain starts with a full backup followed by incrementals. Proper retention management is crucial for:
- Preventing storage bloat
- Ensuring quick restoration
- Maintaining backup integrity

### Cleanup Commands

```bash
export PASSPHRASE="your-gpg-passphrase"

# Remove backup sets older than a specific time
# Keep backups from the last 60 days
duplicity remove-older-than 60D --force file:///backup/documents

# Remove all but the N most recent full backup chains
# This keeps 3 complete chains (full + incrementals)
duplicity remove-all-but-n-full 3 --force file:///backup/documents

# Remove incomplete backup sets (from interrupted backups)
duplicity cleanup --force file:///backup/documents

# Remove all incremental backups, keeping only full backups
duplicity remove-all-inc-of-but-n-full 2 --force file:///backup/documents

unset PASSPHRASE
```

### Comprehensive Cleanup Script

```bash
#!/bin/bash
#===============================================================================
# cleanup-backups.sh - Manage backup retention and cleanup
#===============================================================================

BACKUP_URL="s3://my-backup-bucket/documents"
source /root/.backup-credentials

log() {
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1"
}

log "Starting backup cleanup"

# Step 1: Remove any failed/incomplete backups
log "Removing incomplete backup sets..."
duplicity cleanup --force "$BACKUP_URL"

# Step 2: Remove old backup chains
log "Removing backup chains older than 90 days..."
duplicity remove-older-than 90D --force "$BACKUP_URL"

# Step 3: Keep only the last 4 full backup chains
log "Keeping only last 4 full backup chains..."
duplicity remove-all-but-n-full 4 --force "$BACKUP_URL"

# Step 4: Show current collection status
log "Current backup collection status:"
duplicity collection-status "$BACKUP_URL"

log "Cleanup completed"

unset PASSPHRASE
```

## Using Duply for Easier Management

Duply is a wrapper script for Duplicity that simplifies configuration and management. It uses profiles to store settings, making complex backup configurations much easier to manage.

### Installing Duply

```bash
# Install duply from Ubuntu repositories
sudo apt install -y duply

# Verify installation
duply --version
```

### Creating a Duply Profile

```bash
# Create a new profile called "documents"
# This creates the profile directory with template configuration files
duply documents create

# This creates: ~/.duply/documents/
# Contains: conf (configuration) and exclude (exclusion patterns)
```

### Configuring the Profile

Edit the configuration file `~/.duply/documents/conf`:

```bash
# ~/.duply/documents/conf
# Duply configuration for documents backup

#-------------------------------------------------------------------------------
# GPG Configuration
#-------------------------------------------------------------------------------

# GPG key ID for encryption (use 'gpg --list-keys' to find yours)
GPG_KEY='ABCD1234EFGH5678IJKL9012MNOP3456QRST7890'

# GPG passphrase (alternatively, use GPG_PW_FILE for file-based storage)
GPG_PW='your-secure-passphrase'

# For even better security, use a password file:
# GPG_PW_FILE='/root/.duply-password'

#-------------------------------------------------------------------------------
# Backup Source and Target
#-------------------------------------------------------------------------------

# What to backup (the source directory)
SOURCE='/home/user/documents'

# Where to store backups (the target URL)
# Supports: file://, s3://, sftp://, gs://, azure://, etc.
TARGET='s3://my-backup-bucket/documents'

# For S3, set credentials
TARGET_USER='AKIAIOSFODNN7EXAMPLE'
TARGET_PASS='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'

#-------------------------------------------------------------------------------
# Backup Settings
#-------------------------------------------------------------------------------

# Maximum age of the most recent full backup before a new one is created
MAX_AGE=1M

# Number of full backups to keep (including incrementals in chain)
MAX_FULL_BACKUPS=4

# Number of full backups for which incrementals are kept
MAX_FULLS_WITH_INCRS=2

# Volume size in MB (smaller = better parallelism, larger = fewer files)
VOLSIZE=250

#-------------------------------------------------------------------------------
# Advanced Options
#-------------------------------------------------------------------------------

# Additional duplicity options
DUPL_PARAMS="$DUPL_PARAMS --s3-use-new-style "
DUPL_PARAMS="$DUPL_PARAMS --asynchronous-upload "

# Verbosity level (0-9, default 4)
VERBOSITY=4

# Archive directory for local signature cache
ARCH_DIR='/var/cache/duplicity/documents'
```

### Setting Up Excludes

Edit the exclude file `~/.duply/documents/exclude`:

```bash
# ~/.duply/documents/exclude
# Patterns for files and directories to exclude from backup

# Temporary files
**/*.tmp
**/*.temp
**/*.swp
**/~*

# Cache directories
**/.cache
**/cache
**/__pycache__

# Build artifacts and dependencies
**/node_modules
**/vendor
**/.git
**/build
**/dist

# Large media files (adjust based on your needs)
# **/*.iso
# **/*.mp4

# Log files
**/*.log

# OS-specific files
**/.DS_Store
**/Thumbs.db
```

### Using Duply Commands

```bash
# Perform a backup (incremental if possible, full if needed)
duply documents backup

# Force a full backup
duply documents full

# Incremental backup only
duply documents incr

# List files in backup
duply documents list

# Show backup status
duply documents status

# Verify backup integrity
duply documents verify

# Restore entire backup to original location
duply documents restore

# Restore to a specific directory
duply documents restore /home/user/restored-docs

# Restore specific file
duply documents fetch path/to/file.txt /home/user/file-restored.txt

# Restore from specific point in time
duply documents restore /home/user/restored-docs 2026-01-10

# Cleanup old backups according to retention settings
duply documents purge

# Remove incomplete backups
duply documents cleanup

# Combined backup and purge in one command
duply documents backup_purge

# Full backup followed by verification and purge
duply documents full_verify_purge
```

### Pre and Post Scripts

Duply supports pre and post backup scripts for advanced workflows:

```bash
# ~/.duply/documents/pre
#!/bin/bash
# Pre-backup script - runs before backup starts

# Example: Create database dump before backup
echo "Creating database dump..."
mysqldump -u root mydatabase > /home/user/documents/db-backup.sql

# Example: Stop services that might modify files
# systemctl stop myapp

echo "Pre-backup tasks completed"
```

```bash
# ~/.duply/documents/post
#!/bin/bash
# Post-backup script - runs after backup completes

# Example: Start services again
# systemctl start myapp

# Example: Send notification
echo "Backup completed at $(date)" | mail -s "Backup Complete" admin@example.com

# Example: Clean up temporary files
rm -f /home/user/documents/db-backup.sql

echo "Post-backup tasks completed"
```

Make the scripts executable:

```bash
chmod +x ~/.duply/documents/pre
chmod +x ~/.duply/documents/post
```

## Performance Optimization

### Volume Size Optimization

```bash
# Default volume size is 25MB, which creates many small files
# For cloud storage, larger volumes (200-500MB) reduce API calls

duplicity --volsize 250 \
          --encrypt-key ABCD1234 \
          /home/user/documents s3://bucket/documents

# In duply configuration
VOLSIZE=250
```

### Asynchronous Upload

```bash
# Enable asynchronous upload to speed up backups
# This uploads completed volumes while creating the next one

duplicity --asynchronous-upload \
          --encrypt-key ABCD1234 \
          /home/user/documents s3://bucket/documents

# In duply configuration
DUPL_PARAMS="$DUPL_PARAMS --asynchronous-upload "
```

### Local Signature Cache

```bash
# Duplicity uses signature files to track changes
# Keeping them locally avoids re-downloading from remote

# Create a local archive directory
sudo mkdir -p /var/cache/duplicity
sudo chown $USER:$USER /var/cache/duplicity

# Use the archive directory
duplicity --archive-dir /var/cache/duplicity \
          --encrypt-key ABCD1234 \
          /home/user/documents s3://bucket/documents

# In duply configuration
ARCH_DIR='/var/cache/duplicity/documents'
```

### Compression Settings

```bash
# By default, Duplicity uses gzip compression
# For already compressed files, disable compression to save CPU

# No compression (faster for compressed files like images, videos)
duplicity --gpg-options '--compress-algo=none' \
          --encrypt-key ABCD1234 \
          /home/user/media s3://bucket/media

# Use faster compression algorithm
duplicity --gpg-options '--compress-algo=zlib --compress-level=1' \
          --encrypt-key ABCD1234 \
          /home/user/documents s3://bucket/documents
```

### Parallel Processing with Multiple Streams

For very large backups, consider splitting into multiple backup jobs:

```bash
#!/bin/bash
# parallel-backup.sh - Run multiple backup jobs in parallel

# Define backup jobs
declare -A BACKUP_JOBS=(
    ["documents"]="/home/user/documents"
    ["media"]="/home/user/media"
    ["projects"]="/home/user/projects"
)

# Run backups in parallel
for job_name in "${!BACKUP_JOBS[@]}"; do
    source_dir="${BACKUP_JOBS[$job_name]}"
    (
        echo "Starting backup of $job_name"
        duplicity --encrypt-key ABCD1234 \
                  "$source_dir" \
                  "s3://bucket/$job_name"
        echo "Completed backup of $job_name"
    ) &
done

# Wait for all background jobs to complete
wait

echo "All parallel backups completed"
```

### Network Optimization

```bash
# Limit bandwidth usage (useful for not saturating network)
duplicity --max-upload-rate 5000000 \
          --encrypt-key ABCD1234 \
          /home/user/documents s3://bucket/documents
# 5000000 = 5 MB/s

# Set timeout for slow connections
duplicity --timeout 300 \
          --encrypt-key ABCD1234 \
          /home/user/documents sftp://server/backups
```

### Memory Optimization for Large Backups

```bash
# For systems with limited memory, reduce memory usage
# by processing fewer files at once

duplicity --max-blocksize 2048 \
          --encrypt-key ABCD1234 \
          /home/user/large-dataset s3://bucket/large-dataset

# Disable metadata caching for very large file counts
duplicity --no-files-changed \
          --encrypt-key ABCD1234 \
          /home/user/huge-dataset s3://bucket/huge-dataset
```

## Complete Backup Solution Example

Here's a complete, production-ready backup solution combining everything we've learned:

```bash
#!/bin/bash
#===============================================================================
# Production Backup Solution with Duplicity
#
# Features:
# - GPG encryption
# - Incremental backups with periodic full backups
# - Multiple backup destinations for redundancy
# - Email notifications
# - Logging and monitoring
# - Automatic retention management
#===============================================================================

set -euo pipefail

#-------------------------------------------------------------------------------
# Configuration
#-------------------------------------------------------------------------------

readonly SCRIPT_NAME=$(basename "$0")
readonly SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
readonly CONFIG_FILE="/etc/duplicity/backup.conf"
readonly LOCK_FILE="/var/run/duplicity-backup.lock"
readonly LOG_FILE="/var/log/duplicity/backup-$(date +%Y%m%d).log"

# Default values (can be overridden in config file)
SOURCE_DIR="/home"
PRIMARY_TARGET="s3://primary-backup-bucket/server1"
SECONDARY_TARGET="sftp://backup@offsite-server/backups/server1"
GPG_KEY="ABCD1234EFGH5678IJKL9012MNOP3456QRST7890"
FULL_BACKUP_INTERVAL="30D"
RETENTION_FULL_CHAINS="4"
ALERT_EMAIL="admin@example.com"

#-------------------------------------------------------------------------------
# Load configuration
#-------------------------------------------------------------------------------

if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
fi

# Load credentials
source /root/.backup-credentials

#-------------------------------------------------------------------------------
# Functions
#-------------------------------------------------------------------------------

log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

send_alert() {
    local subject="$1"
    local body="$2"

    if command -v mail &> /dev/null; then
        echo "$body" | mail -s "$subject" "$ALERT_EMAIL"
    fi

    # Also log the alert
    log "ALERT" "$subject: $body"
}

cleanup_on_exit() {
    rm -f "$LOCK_FILE"
    unset PASSPHRASE AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
}

acquire_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        local pid=$(cat "$LOCK_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log "ERROR" "Another backup is running (PID: $pid)"
            exit 1
        fi
        rm -f "$LOCK_FILE"
    fi
    echo $$ > "$LOCK_FILE"
}

perform_backup() {
    local target="$1"
    local backup_type="${2:-incremental}"

    log "INFO" "Starting $backup_type backup to $target"

    local cmd="duplicity"

    if [[ "$backup_type" == "full" ]]; then
        cmd="$cmd full"
    else
        cmd="$cmd --full-if-older-than $FULL_BACKUP_INTERVAL"
    fi

    cmd="$cmd --encrypt-key $GPG_KEY"
    cmd="$cmd --volsize 250"
    cmd="$cmd --asynchronous-upload"
    cmd="$cmd --archive-dir /var/cache/duplicity"

    if [[ -f /etc/duplicity/excludes.txt ]]; then
        cmd="$cmd --exclude-filelist /etc/duplicity/excludes.txt"
    fi

    cmd="$cmd $SOURCE_DIR $target"

    local start_time=$(date +%s)

    if eval "$cmd" >> "$LOG_FILE" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log "INFO" "Backup to $target completed in ${duration}s"
        return 0
    else
        log "ERROR" "Backup to $target failed"
        return 1
    fi
}

cleanup_backups() {
    local target="$1"

    log "INFO" "Cleaning up old backups at $target"

    # Remove old backup chains
    duplicity remove-all-but-n-full "$RETENTION_FULL_CHAINS" \
              --force "$target" >> "$LOG_FILE" 2>&1

    # Remove incomplete backups
    duplicity cleanup --force "$target" >> "$LOG_FILE" 2>&1

    log "INFO" "Cleanup completed for $target"
}

verify_backup() {
    local target="$1"

    log "INFO" "Verifying backup at $target"

    if duplicity verify --compare-data "$target" "$SOURCE_DIR" >> "$LOG_FILE" 2>&1; then
        log "INFO" "Verification successful for $target"
        return 0
    else
        log "ERROR" "Verification failed for $target"
        return 1
    fi
}

#-------------------------------------------------------------------------------
# Main
#-------------------------------------------------------------------------------

main() {
    # Set up cleanup trap
    trap cleanup_on_exit EXIT

    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"

    # Acquire lock
    acquire_lock

    log "INFO" "=================================================="
    log "INFO" "Backup job started"
    log "INFO" "Source: $SOURCE_DIR"
    log "INFO" "Primary target: $PRIMARY_TARGET"
    log "INFO" "Secondary target: $SECONDARY_TARGET"
    log "INFO" "=================================================="

    local backup_type="${1:-incremental}"
    local errors=0

    # Backup to primary target
    if ! perform_backup "$PRIMARY_TARGET" "$backup_type"; then
        ((errors++))
        send_alert "Backup Failed" "Primary backup to $PRIMARY_TARGET failed"
    else
        cleanup_backups "$PRIMARY_TARGET"
    fi

    # Backup to secondary target
    if ! perform_backup "$SECONDARY_TARGET" "$backup_type"; then
        ((errors++))
        send_alert "Backup Failed" "Secondary backup to $SECONDARY_TARGET failed"
    else
        cleanup_backups "$SECONDARY_TARGET"
    fi

    # Weekly verification (only on Sundays)
    if [[ $(date +%u) -eq 7 ]]; then
        log "INFO" "Performing weekly verification"
        if ! verify_backup "$PRIMARY_TARGET"; then
            ((errors++))
            send_alert "Verification Failed" "Backup verification failed for $PRIMARY_TARGET"
        fi
    fi

    # Final status
    if [[ $errors -eq 0 ]]; then
        log "INFO" "Backup job completed successfully"
        send_alert "Backup Successful" "All backups completed successfully"
    else
        log "ERROR" "Backup job completed with $errors error(s)"
        send_alert "Backup Completed with Errors" "$errors backup operation(s) failed"
    fi

    log "INFO" "=================================================="
}

# Run main with all arguments
main "$@"
```

## Monitoring Your Backups with OneUptime

While Duplicity provides excellent backup capabilities, monitoring your backup infrastructure is equally important. You need to know immediately if backups fail, take too long, or if your storage is running low.

[OneUptime](https://oneuptime.com) offers comprehensive monitoring solutions that can help you track your backup operations:

1. **Cron Job Monitoring**: Create heartbeat monitors that expect your backup scripts to check in. If a backup doesn't complete on time, you'll be alerted immediately.

2. **Custom Metrics**: Track backup duration, size, and success rates over time to identify trends and potential issues before they become critical.

3. **Alert Integration**: Receive notifications via email, SMS, Slack, or other channels when backup operations fail or exhibit unusual behavior.

4. **Status Pages**: Keep stakeholders informed about your backup infrastructure status through public or private status pages.

5. **Incident Management**: When backup failures occur, OneUptime helps you track and manage incidents through to resolution.

Setting up backup monitoring with OneUptime is straightforward. Add a simple curl command to your backup script to ping OneUptime upon successful completion:

```bash
# Add to end of backup script after successful backup
curl -s "https://oneuptime.com/heartbeat/your-unique-heartbeat-id" > /dev/null
```

This ensures you're immediately notified if backups fail or don't run on schedule, giving you confidence that your data is always protected.

## Conclusion

Duplicity is a powerful, flexible backup solution that combines strong encryption with bandwidth-efficient incremental backups. By following this guide, you've learned how to:

- Install and configure Duplicity on Ubuntu
- Set up GPG encryption for secure backups
- Perform backups to various cloud and remote destinations
- Restore files from any point in backup history
- Automate backups with scripts and cron jobs
- Manage backup retention and cleanup
- Use Duply for simplified backup management
- Optimize performance for large-scale backups

Remember that a backup strategy is only as good as your ability to restore from it. Regularly test your restoration process and monitor your backup jobs to ensure your data is always protected.
