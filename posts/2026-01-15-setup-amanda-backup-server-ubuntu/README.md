# How to Set Up Amanda Backup Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Amanda, Backup, Network Backup, Enterprise, Tutorial

Description: Complete guide to setting up Amanda network backup solution on Ubuntu.

---

Amanda (Advanced Maryland Automatic Network Disk Archiver) is one of the most powerful and flexible open-source backup solutions available for enterprise environments. Originally developed at the University of Maryland, Amanda has evolved into a comprehensive backup system capable of protecting hundreds of servers across your network. This guide will walk you through setting up Amanda backup server on Ubuntu from scratch.

## Understanding Amanda Architecture

Before diving into installation, it is essential to understand how Amanda works. Amanda follows a client-server architecture with several key components:

### Core Components

**Amanda Server (Backup Server)**: The central system that orchestrates all backup operations. It runs the backup scheduler, manages storage devices, and maintains the catalog of all backups.

**Amanda Client (Backup Client)**: Software installed on each machine you want to back up. The client responds to server requests and sends data during backup windows.

**Virtual Tapes (VTapes)**: Amanda was originally designed for tape drives, but modern deployments typically use disk-based virtual tapes. These are directories on disk that simulate tape behavior.

**Holding Disk**: A staging area where backup data is temporarily stored before being written to the final storage destination. This improves performance and reliability.

**Backup Sets (Configurations)**: Amanda organizes backups into configurations, each with its own settings, schedules, and target lists.

### How Amanda Works

1. The Amanda server contacts each client according to the backup schedule
2. Clients compress and optionally encrypt their data before sending
3. Data is written to the holding disk
4. Once all clients complete, data is flushed from holding disk to virtual tapes
5. Amanda maintains an index of all backed-up files for quick restoration

## Prerequisites

Before beginning the installation, ensure you have:

- Ubuntu 22.04 LTS or newer (this guide uses Ubuntu 24.04)
- Root or sudo access on both server and client machines
- Network connectivity between server and clients
- Sufficient disk space for backup storage (at least 2x your backup data size recommended)
- Firewall rules allowing Amanda traffic (ports 10080-10083 TCP/UDP)

## Installing Amanda Server

Let's begin by installing the Amanda server package on your Ubuntu system.

### Step 1: Update System Packages

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Amanda Server

```bash
# Install the Amanda server package and dependencies
sudo apt install amanda-server amanda-client -y

# The installation creates an 'amandabackup' user automatically
# Verify the user was created
id amandabackup
```

### Step 3: Verify Installation

```bash
# Check Amanda version
amadmin --version

# List installed Amanda components
dpkg -l | grep amanda
```

## Configuring the Amanda Server

Amanda configurations are stored in `/etc/amanda/`. Each backup configuration gets its own directory. We'll create a configuration called "DailyBackup".

### Step 1: Create Configuration Directory

```bash
# Create the configuration directory
sudo mkdir -p /etc/amanda/DailyBackup

# Set proper ownership
sudo chown -R amandabackup:amandabackup /etc/amanda/DailyBackup
```

### Step 2: Create the Main Configuration File (amanda.conf)

Create the primary configuration file at `/etc/amanda/DailyBackup/amanda.conf`:

```bash
sudo -u amandabackup nano /etc/amanda/DailyBackup/amanda.conf
```

Add the following configuration:

```conf
# /etc/amanda/DailyBackup/amanda.conf
# Amanda Configuration File for DailyBackup
# Created: January 2026

#============================================================================
# ORGANIZATION SETTINGS
#============================================================================

# Unique identifier for your organization (appears in reports)
org "MyCompany"

# Email address for backup reports and notifications
mailto "admin@example.com"

# Administrator email for critical alerts
dumpuser "amandabackup"

#============================================================================
# NETWORK AND COMMUNICATION SETTINGS
#============================================================================

# Network interface to bind to (leave empty for all interfaces)
# netusage 8000  # Limit network bandwidth in KB/s (optional)

# Timeout settings for client communication
dtimeout 1800      # Data timeout in seconds
ctimeout 30        # Connect timeout in seconds
etimeout 300       # Estimate timeout in seconds

#============================================================================
# DUMP SETTINGS
#============================================================================

# Dumpcycle determines how often full backups occur
# Amanda automatically calculates incremental schedules
dumpcycle 7 days    # Full backup cycle length

# Run estimation before backup to plan tape usage
estimate calcsize

# Compression settings (applied on client side)
# Options: none, client fast, client best, server fast, server best
compress client fast

#============================================================================
# HOLDING DISK CONFIGURATION
#============================================================================

# Holding disk is a staging area for backups before writing to vtapes
# This improves reliability and allows parallel client backups

holdingdisk hd1 {
    comment "Primary holding disk"
    directory "/var/lib/amanda/holding"
    use 50 GB                    # Maximum space to use
    chunksize 1 GB               # Split files into chunks of this size
}

#============================================================================
# TAPE/STORAGE CONFIGURATION
#============================================================================

# Using virtual tapes (disk-based storage)
# Tapedev specifies the virtual tape device
tapedev "file:/var/lib/amanda/vtapes/DailyBackup/slot{1,2,3,4,5,6,7,8,9,10}"

# Define tape type for virtual tapes
define tapetype DISK {
    comment "Virtual tape on disk"
    length 100 GB               # Size of each virtual tape
    filemark 0 KB               # No filemark overhead for disk
    speed 40 MB/s               # Estimated write speed
}

tapetype DISK

# Label template for tapes
labelstr "DailyBackup-[0-9][0-9]*"

# Number of tapes in rotation
runtapes 1

# Tape changer configuration for virtual tapes
tpchanger "chg-disk:/var/lib/amanda/vtapes/DailyBackup"

#============================================================================
# SCHEDULING AND PRIORITY SETTINGS
#============================================================================

# Run mode:
# dumpcycle: time between full dumps
# runspercycle: number of amdump runs per cycle
runspercycle 7

# Maximum number of parallel dumps
inparallel 4

# Maximum dump rate limiting
maxdumps 4

#============================================================================
# LOGGING AND REPORTING
#============================================================================

# Log directory
logdir "/var/log/amanda/DailyBackup"

# Index directory for file catalogs (enables quick restore)
indexdir "/var/lib/amanda/index/DailyBackup"

# Information directory (dump state database)
infofile "/var/lib/amanda/DailyBackup/curinfo"

# Tape list file
tapelist "/var/lib/amanda/DailyBackup/tapelist"

#============================================================================
# DUMP TYPE DEFINITIONS
#============================================================================

# Define different dump types for various backup scenarios

define dumptype global {
    comment "Global default settings"
    auth "bsdtcp"               # Authentication method
    compress client fast         # Compression on client
    index yes                    # Enable file indexing for restore
    record yes                   # Record in database
}

define dumptype full-backup {
    comment "Full backup with no compression"
    global
    compress none
    priority high
    strategy standard
}

define dumptype daily-backup {
    comment "Daily incremental backup"
    global
    compress client fast
    priority medium
    strategy standard
}

define dumptype mysql-backup {
    comment "MySQL database backup"
    global
    program "APPLICATION"
    application "ampgsql"        # For PostgreSQL, use ampsql for MySQL
    compress client best
    priority high
}

define dumptype exclude-system {
    comment "Backup excluding system directories"
    global
    exclude list "/etc/amanda/DailyBackup/exclude.list"
}

#============================================================================
# INTERFACE DEFINITIONS (NETWORK BANDWIDTH LIMITS)
#============================================================================

define interface local {
    comment "Local network - no bandwidth limit"
    use 1000000 KB/s
}

define interface wan {
    comment "WAN connections - limited bandwidth"
    use 5000 KB/s
}
```

### Step 3: Create Exclude List

Create an exclude list for files and directories to skip:

```bash
sudo -u amandabackup nano /etc/amanda/DailyBackup/exclude.list
```

Add common exclusions:

```text
# Exclude list for Amanda backups
# One pattern per line, supports wildcards

# Temporary files
*.tmp
*.temp
*.swp
*~

# Cache directories
.cache
**/cache/**
**/Cache/**

# Log files (usually not needed in backups)
*.log

# Development files
**/node_modules/**
**/__pycache__/**
*.pyc
**/venv/**
**/.git/objects/**

# System directories (when backing up root)
/proc
/sys
/dev
/run
/tmp
/var/tmp
/var/cache
/var/run
/mnt
/media
/lost+found
```

## Setting Up Virtual Tapes

Virtual tapes simulate physical tape behavior using disk storage. This section covers creating and managing virtual tapes.

### Step 1: Create Virtual Tape Directory Structure

```bash
# Create the base directory for virtual tapes
sudo mkdir -p /var/lib/amanda/vtapes/DailyBackup

# Create slot directories (10 virtual tapes)
for i in $(seq 1 10); do
    sudo mkdir -p /var/lib/amanda/vtapes/DailyBackup/slot$i
done

# Create additional required directories
sudo mkdir -p /var/lib/amanda/holding
sudo mkdir -p /var/lib/amanda/index/DailyBackup
sudo mkdir -p /var/lib/amanda/DailyBackup
sudo mkdir -p /var/log/amanda/DailyBackup

# Set ownership for all Amanda directories
sudo chown -R amandabackup:amandabackup /var/lib/amanda
sudo chown -R amandabackup:amandabackup /var/log/amanda
```

### Step 2: Initialize Virtual Tape Changer

```bash
# Create the tape changer configuration
sudo -u amandabackup nano /var/lib/amanda/vtapes/DailyBackup/changer.conf
```

Add the changer configuration:

```conf
# Changer configuration for virtual tapes
tpchanger "chg-disk"
changerfile "/var/lib/amanda/vtapes/DailyBackup/changer-state"
property "num-slot" "10"
property "auto-create-slot" "yes"
```

### Step 3: Initialize Tape Labels

```bash
# Initialize labels for each virtual tape
sudo -u amandabackup amlabel DailyBackup DailyBackup-01 slot 1
sudo -u amandabackup amlabel DailyBackup DailyBackup-02 slot 2
sudo -u amandabackup amlabel DailyBackup DailyBackup-03 slot 3
sudo -u amandabackup amlabel DailyBackup DailyBackup-04 slot 4
sudo -u amandabackup amlabel DailyBackup DailyBackup-05 slot 5
sudo -u amandabackup amlabel DailyBackup DailyBackup-06 slot 6
sudo -u amandabackup amlabel DailyBackup DailyBackup-07 slot 7
sudo -u amandabackup amlabel DailyBackup DailyBackup-08 slot 8
sudo -u amandabackup amlabel DailyBackup DailyBackup-09 slot 9
sudo -u amandabackup amlabel DailyBackup DailyBackup-10 slot 10
```

### Step 4: Verify Tape Setup

```bash
# Check tape changer status
sudo -u amandabackup amtape DailyBackup show

# List all labeled tapes
sudo -u amandabackup amtape DailyBackup inventory
```

## Configuring Backup Sets (disklist)

The `disklist` file defines which directories on which hosts to back up. This is the heart of your backup configuration.

### Create the Disklist File

```bash
sudo -u amandabackup nano /etc/amanda/DailyBackup/disklist
```

Add your backup targets:

```conf
# /etc/amanda/DailyBackup/disklist
# Disk List Entry Format:
# hostname  disk-path  dumptype  [spindle  interface]
#
# hostname: Client hostname or IP address
# disk-path: Directory path to back up
# dumptype: Reference to dumptype defined in amanda.conf
# spindle: (optional) Group related filesystems
# interface: (optional) Network interface to use

#============================================================================
# LOCAL SERVER BACKUPS
#============================================================================

# Backup server configuration directory
localhost /etc/amanda daily-backup

# System configuration files
localhost /etc daily-backup

# Home directories on the server
localhost /home daily-backup

# Web server data
localhost /var/www daily-backup

#============================================================================
# REMOTE CLIENT BACKUPS
#============================================================================

# Web Server (192.168.1.10)
webserver.example.com /etc daily-backup
webserver.example.com /var/www daily-backup
webserver.example.com /home daily-backup

# Database Server (192.168.1.20)
dbserver.example.com /etc daily-backup
dbserver.example.com /var/lib/mysql full-backup
dbserver.example.com /home daily-backup

# File Server (192.168.1.30)
fileserver.example.com /etc daily-backup
fileserver.example.com /srv/data daily-backup
fileserver.example.com /home daily-backup

# Application Server (192.168.1.40)
appserver.example.com /etc daily-backup
appserver.example.com /opt/application daily-backup
appserver.example.com /var/log exclude-system

#============================================================================
# SPECIAL BACKUP CONFIGURATIONS
#============================================================================

# Full system backup example (excluding system directories)
# Use for disaster recovery scenarios
# recoveryserver.example.com / exclude-system
```

### Advanced Disklist Options

For more complex setups, you can create a separate file for each type of backup:

```bash
# Include additional disklist files in amanda.conf by adding:
# includefile "/etc/amanda/DailyBackup/disklist.webservers"
# includefile "/etc/amanda/DailyBackup/disklist.databases"
```

## Client Configuration

Each machine you want to back up needs the Amanda client installed and configured.

### Step 1: Install Amanda Client

On each client machine:

```bash
# Install Amanda client
sudo apt update
sudo apt install amanda-client -y
```

### Step 2: Configure Amanda Client

Edit the client configuration file:

```bash
sudo nano /etc/amanda/amanda-client.conf
```

Add the configuration:

```conf
# /etc/amanda/amanda-client.conf
# Amanda Client Configuration

# Server hostname or IP address
conf "DailyBackup"

# Server IP/hostname that will contact this client
index_server "backup-server.example.com"
tape_server "backup-server.example.com"

# Authentication method (must match server)
auth "bsdtcp"

# SSH key for amandabackup user (if using SSH authentication)
# ssh_keys "/var/lib/amanda/.ssh/id_rsa"

# Compression settings
compress fast
```

### Step 3: Configure Access Control

The `.amandahosts` file controls which servers can back up this client:

```bash
sudo nano /var/lib/amanda/.amandahosts
```

Add authorized servers:

```text
# /var/lib/amanda/.amandahosts
# Format: hostname amandabackup-user
# Allow backup server to initiate backups

backup-server.example.com amandabackup amdump
backup-server.example.com amandabackup amindexd
backup-server.example.com amandabackup amidxtaped
localhost amandabackup amdump
```

Set proper permissions:

```bash
sudo chown amandabackup:amandabackup /var/lib/amanda/.amandahosts
sudo chmod 600 /var/lib/amanda/.amandahosts
```

### Step 4: Configure Firewall on Client

```bash
# Allow Amanda traffic from backup server
sudo ufw allow from backup-server-ip to any port 10080:10083 proto tcp
sudo ufw allow from backup-server-ip to any port 10080:10083 proto udp
```

### Step 5: Test Client Connectivity

From the server, test connectivity to each client:

```bash
# Check if Amanda can connect to client
sudo -u amandabackup amcheck -c DailyBackup webserver.example.com

# Run a test estimate
sudo -u amandabackup amadmin DailyBackup estimate webserver.example.com /etc
```

## Server Access Configuration

Configure the server's `.amandahosts` file to allow client communication:

```bash
sudo nano /var/lib/amanda/.amandahosts
```

```text
# /var/lib/amanda/.amandahosts on backup server
# Allow localhost operations
localhost amandabackup amdump
localhost amandabackup amindexd
localhost amandabackup amidxtaped

# Allow clients to request restores
webserver.example.com amandabackup amrecover
dbserver.example.com amandabackup amrecover
fileserver.example.com amandabackup amrecover
appserver.example.com amandabackup amrecover

# For recovery server operations
localhost root amrecover
```

## Running Backups with amdump

The `amdump` command is the primary tool for executing backups.

### Running Manual Backups

```bash
# Run a full backup for the DailyBackup configuration
sudo -u amandabackup amdump DailyBackup

# Run backup with verbose output
sudo -u amandabackup amdump DailyBackup --no-taper

# Run backup for specific hosts only (useful for testing)
sudo -u amandabackup amdump DailyBackup webserver.example.com
```

### Scheduling Automated Backups

Create a cron job for automated backups:

```bash
sudo -u amandabackup crontab -e
```

Add the scheduled backup:

```cron
# Run Amanda backup every night at 2:00 AM
0 2 * * * /usr/sbin/amdump DailyBackup

# Run Amanda check every night at 1:30 AM (before backup)
30 1 * * * /usr/sbin/amcheck -m DailyBackup
```

### Understanding Backup Levels

Amanda uses backup levels (0-9) to implement incremental backups:

- **Level 0**: Full backup (backs up all files)
- **Level 1-9**: Incremental backups (backs up changes since last lower-level backup)

Amanda automatically calculates the optimal backup level based on your dumpcycle setting.

## Checking Backup Status

Amanda provides several tools to monitor and verify backup status.

### amcheck - Pre-backup Verification

```bash
# Run all checks (server, clients, tapes)
sudo -u amandabackup amcheck DailyBackup

# Check clients only
sudo -u amandabackup amcheck -c DailyBackup

# Check tapes only
sudo -u amandabackup amcheck -t DailyBackup

# Check server configuration only
sudo -u amandabackup amcheck -s DailyBackup

# Send email report
sudo -u amandabackup amcheck -m DailyBackup
```

### amreport - Backup Reports

```bash
# Generate text report for last backup
sudo -u amandabackup amreport DailyBackup

# Generate report for specific date
sudo -u amandabackup amreport DailyBackup --date 20260115

# Email the report
sudo -u amandabackup amreport DailyBackup | mail -s "Backup Report" admin@example.com
```

### amstatus - Real-time Status

```bash
# Monitor running backup
sudo -u amandabackup amstatus DailyBackup

# Detailed status with client information
sudo -u amandabackup amstatus DailyBackup --detail
```

### amadmin - Administrative Commands

```bash
# Show backup database information
sudo -u amandabackup amadmin DailyBackup info

# List all hosts and their backup states
sudo -u amandabackup amadmin DailyBackup disklist

# Show tape usage
sudo -u amandabackup amadmin DailyBackup tape

# Show balance of scheduled backups
sudo -u amandabackup amadmin DailyBackup balance

# Force a full backup for specific host/disk
sudo -u amandabackup amadmin DailyBackup force webserver.example.com /etc

# List all versions of a specific backup
sudo -u amandabackup amadmin DailyBackup find webserver.example.com /etc
```

## Restoring Files

Amanda provides multiple methods for restoring data, from interactive tools to command-line utilities.

### Method 1: amrecover - Interactive Restore

The `amrecover` command provides an interactive FTP-like interface:

```bash
# Start interactive recovery session
sudo -u amandabackup amrecover DailyBackup

# Once in the amrecover shell:
amrecover> sethost webserver.example.com
amrecover> setdisk /etc
amrecover> setdate 2026-01-15
amrecover> ls
amrecover> cd nginx
amrecover> add nginx.conf
amrecover> extract
amrecover> quit
```

### Method 2: amfetchdump - Direct Restore

For scripted or direct restores:

```bash
# Extract specific backup to current directory
sudo -u amandabackup amfetchdump -p DailyBackup webserver.example.com /etc \
    | tar xvf -

# Extract with specific date
sudo -u amandabackup amfetchdump -p DailyBackup webserver.example.com /etc \
    20260115 | tar xvf -

# Extract to specific directory
sudo -u amandabackup amfetchdump -p DailyBackup webserver.example.com /etc \
    | tar xvf - -C /tmp/restore/
```

### Method 3: amrestore - Low-level Restore

For restoring directly from tape or vtape:

```bash
# List contents of a virtual tape
sudo -u amandabackup amrestore --list /var/lib/amanda/vtapes/DailyBackup/slot1

# Restore specific file from tape
sudo -u amandabackup amrestore /var/lib/amanda/vtapes/DailyBackup/slot1 \
    webserver.example.com /etc
```

### Creating a Restore Script

```bash
#!/bin/bash
# /usr/local/bin/amanda-restore.sh
# Simple restore script for Amanda backups

CONFIG="DailyBackup"
HOST="$1"
DISK="$2"
DATE="$3"
DEST="${4:-/tmp/restore}"

if [ -z "$HOST" ] || [ -z "$DISK" ]; then
    echo "Usage: $0 <hostname> <disk-path> [date] [destination]"
    echo "Example: $0 webserver.example.com /etc 20260115 /tmp/restore"
    exit 1
fi

mkdir -p "$DEST"
cd "$DEST"

if [ -n "$DATE" ]; then
    sudo -u amandabackup amfetchdump -p "$CONFIG" "$HOST" "$DISK" "$DATE" | tar xvf -
else
    sudo -u amandabackup amfetchdump -p "$CONFIG" "$HOST" "$DISK" | tar xvf -
fi

echo "Restore completed to: $DEST"
```

## Amanda Tools Overview

Amanda includes a comprehensive suite of tools for managing backups:

### Backup Execution Tools

| Tool | Description |
|------|-------------|
| `amdump` | Main backup execution command |
| `amflush` | Flush data from holding disk to tape |
| `amvault` | Copy backups to secondary storage |

### Verification and Reporting Tools

| Tool | Description |
|------|-------------|
| `amcheck` | Verify configuration and connectivity |
| `amreport` | Generate backup reports |
| `amstatus` | Show real-time backup status |
| `amoverview` | Display backup overview matrix |

### Administration Tools

| Tool | Description |
|------|-------------|
| `amadmin` | Administrative functions and queries |
| `amtape` | Tape/vtape management |
| `amlabel` | Label tapes |
| `amrmtape` | Remove tape from rotation |

### Recovery Tools

| Tool | Description |
|------|-------------|
| `amrecover` | Interactive file recovery |
| `amfetchdump` | Extract backups programmatically |
| `amrestore` | Low-level tape restore |

### Utility Tools

| Tool | Description |
|------|-------------|
| `amcleanup` | Clean up after failed backups |
| `amtoc` | Display table of contents |
| `amgetconf` | Query configuration values |
| `amdevcheck` | Check device compatibility |

## Tape Rotation and Retention

Proper tape rotation ensures data availability while managing storage efficiently.

### Understanding Tape Rotation

Amanda uses a tape rotation scheme based on:

1. **Dumpcycle**: Period between full backups (e.g., 7 days)
2. **Runspercycle**: Number of backup runs per cycle
3. **Tapecycle**: Number of tapes in rotation (should be at least 2 * runspercycle)

### Recommended Retention Policies

```conf
# Example retention configurations in amanda.conf

# Weekly full, daily incremental - 2 weeks retention
dumpcycle 7 days
runspercycle 7
tapecycle 14 tapes     # 2 weeks of backups

# Monthly full, weekly incremental - 1 month retention
dumpcycle 30 days
runspercycle 4
tapecycle 8 tapes      # 2 months of backups

# Grandfather-Father-Son scheme
# Requires more complex setup with multiple configurations
```

### Managing Tape Lifecycle

```bash
# View tape status and usage
sudo -u amandabackup amtape DailyBackup inventory

# View when tapes can be recycled
sudo -u amandabackup amadmin DailyBackup tape

# Manually mark tape as reusable (use with caution)
sudo -u amandabackup amadmin DailyBackup reuse DailyBackup-05

# Remove tape from rotation (e.g., for offsite storage)
sudo -u amandabackup amadmin DailyBackup no-reuse DailyBackup-05
```

### Implementing Long-term Retention

For regulatory compliance or disaster recovery, implement a separate configuration:

```bash
# Create monthly archive configuration
sudo mkdir -p /etc/amanda/MonthlyArchive
sudo cp /etc/amanda/DailyBackup/amanda.conf /etc/amanda/MonthlyArchive/
```

Modify for monthly archives:

```conf
# /etc/amanda/MonthlyArchive/amanda.conf additions
dumpcycle 30 days
runspercycle 1
tapecycle 12            # One year retention

# Use separate storage location
tpchanger "chg-disk:/var/lib/amanda/vtapes/MonthlyArchive"
```

## Advanced Configuration

### Encryption Configuration

Add encryption to protect backup data:

```conf
# Add to amanda.conf
define dumptype encrypted-backup {
    global
    encrypt client
    client_encrypt "/usr/sbin/amcrypt"
    client_decrypt_option "-d"
}
```

Create encryption key:

```bash
# Generate encryption key
sudo -u amandabackup mkdir -p /var/lib/amanda/.gnupg
sudo -u amandabackup gpg --gen-key
```

### Application-specific Backups

For database backups using application APIs:

```conf
# MySQL backup application
define application app-mysql {
    plugin "ampgsql"
    property "host" "localhost"
    property "user" "amandabackup"
    property "password-file" "/etc/amanda/DailyBackup/mysql.passwd"
}

define dumptype mysql-app {
    global
    program "APPLICATION"
    application "app-mysql"
}
```

### Pre and Post Backup Scripts

```conf
# Add to amanda.conf for script execution
define script pre-backup-check {
    plugin "script-email"
    execute-on pre-dle-backup
    execute-where client
    property "mailto" "admin@example.com"
}

define dumptype with-scripts {
    global
    script "pre-backup-check"
}
```

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Client Connection Failed

```bash
# Error: "Could not connect to client"
# Solution: Verify network connectivity and firewall rules

# Test basic connectivity
ping client-hostname
telnet client-hostname 10080

# Check Amanda ports
sudo netstat -tlnp | grep amanda

# Verify .amandahosts on client
sudo cat /var/lib/amanda/.amandahosts
```

#### Issue 2: Permission Denied

```bash
# Error: "Permission denied" or "Authentication failed"
# Solution: Fix ownership and permissions

# Reset permissions on server
sudo chown -R amandabackup:amandabackup /var/lib/amanda
sudo chown -R amandabackup:amandabackup /etc/amanda
sudo chmod 700 /var/lib/amanda/.amandahosts
sudo chmod 600 /var/lib/amanda/.amandahosts

# Reset permissions on client
sudo chown amandabackup:amandabackup /var/lib/amanda/.amandahosts
sudo chmod 600 /var/lib/amanda/.amandahosts
```

#### Issue 3: Tape Full or Missing

```bash
# Error: "No tape available" or "Tape full"
# Solution: Check tape status and add more tapes

# Check tape inventory
sudo -u amandabackup amtape DailyBackup inventory

# Add new tape
sudo mkdir -p /var/lib/amanda/vtapes/DailyBackup/slot11
sudo chown amandabackup:amandabackup /var/lib/amanda/vtapes/DailyBackup/slot11
sudo -u amandabackup amlabel DailyBackup DailyBackup-11 slot 11
```

#### Issue 4: Backup Interrupted

```bash
# Error: Backup was interrupted or failed
# Solution: Clean up and retry

# Run cleanup
sudo -u amandabackup amcleanup -k DailyBackup

# Flush pending data
sudo -u amandabackup amflush DailyBackup

# Check for problems
sudo -u amandabackup amcheck DailyBackup
```

#### Issue 5: Holding Disk Full

```bash
# Error: "No space left on holding disk"
# Solution: Flush to tape or increase holding disk

# Flush holding disk to tape
sudo -u amandabackup amflush DailyBackup

# Check holding disk usage
df -h /var/lib/amanda/holding

# Clear old holding data (if stuck)
sudo -u amandabackup ls /var/lib/amanda/holding/
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Run amcheck with debug output
sudo -u amandabackup amcheck DailyBackup 2>&1 | tee /tmp/amcheck-debug.log

# Run backup with debug
sudo -u amandabackup amdump DailyBackup --debug 9

# Check debug logs
ls /tmp/amanda/
cat /tmp/amanda/server/amdump.*
```

### Log File Locations

```bash
# Server logs
/var/log/amanda/DailyBackup/log
/var/log/amanda/DailyBackup/amdump
/var/log/amanda/DailyBackup/amflush

# Debug logs (when enabled)
/tmp/amanda/server/
/tmp/amanda/client/
```

## Security Best Practices

### Network Security

```bash
# Configure firewall to allow only backup server
sudo ufw allow from backup-server-ip to any port 10080:10083 proto tcp
sudo ufw allow from backup-server-ip to any port 10080:10083 proto udp

# Consider using SSH tunneling for WAN backups
# Or configure Amanda to use SSH authentication
```

### Authentication Hardening

```conf
# In amanda.conf, use stronger authentication
define dumptype secure-backup {
    global
    auth "ssh"                  # Use SSH instead of bsdtcp
    ssh_keys "/var/lib/amanda/.ssh/id_rsa_amanda"
}
```

### File Permissions Audit

```bash
# Audit script for Amanda permissions
#!/bin/bash
echo "Checking Amanda permissions..."
ls -la /var/lib/amanda/.amandahosts
ls -la /etc/amanda/
ls -laR /var/lib/amanda/vtapes/
```

## Performance Tuning

### Optimize Network Performance

```conf
# In amanda.conf
netusage 80000             # 80 MB/s limit
inparallel 4               # Parallel dumps
maxdumps 4                 # Max concurrent dumps
```

### Optimize Disk I/O

```bash
# Use separate disk for holding area
# Mount with noatime for better performance
mount -o noatime /dev/sdb1 /var/lib/amanda/holding

# Consider using SSD for holding disk
```

### Client-side Optimization

```conf
# In client amanda.conf
# Use faster compression
compress fast

# Or disable compression for fast networks
compress none
```

## Monitoring Amanda with OneUptime

While Amanda provides built-in reporting capabilities, enterprise environments require comprehensive monitoring solutions. **OneUptime** (https://oneuptime.com) offers an excellent platform for monitoring your Amanda backup infrastructure.

### Why Monitor Backups with OneUptime?

- **Proactive Alerting**: Receive instant notifications when backups fail or take longer than expected
- **Dashboard Visibility**: Visualize backup success rates, timing, and storage utilization
- **Integration Capabilities**: Connect backup monitoring with your existing infrastructure monitoring
- **Incident Management**: Automatically create incidents when backup issues are detected
- **Historical Analytics**: Track backup performance trends over time

### Setting Up Amanda Monitoring with OneUptime

1. **Create a custom monitor** in OneUptime to check Amanda backup status
2. **Monitor log files** for error patterns using log monitoring
3. **Set up synthetic monitors** to verify backup file accessibility
4. **Configure alert thresholds** based on your backup SLAs

By combining Amanda's powerful backup capabilities with OneUptime's monitoring platform, you can ensure your backup infrastructure remains healthy and your data stays protected.

## Conclusion

Amanda is a robust, enterprise-grade backup solution that can protect your entire network infrastructure. This guide covered the essential aspects of setting up Amanda on Ubuntu:

- Understanding Amanda's client-server architecture
- Installing and configuring the Amanda server
- Setting up virtual tapes for disk-based backups
- Creating backup sets with the disklist file
- Configuring clients for network backups
- Running and monitoring backups
- Restoring data when needed
- Implementing tape rotation for retention policies
- Troubleshooting common issues

Remember to regularly test your restores, monitor backup reports, and adjust your configuration as your infrastructure grows. With proper setup and maintenance, Amanda will provide reliable backup protection for your organization.

For production environments, consider implementing redundant backup servers, offsite tape rotation, and comprehensive monitoring with tools like OneUptime to ensure your backup infrastructure is always operational and your data remains protected.
