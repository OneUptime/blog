# How to Install and Configure AIDE (Advanced Intrusion Detection) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AIDE, Security, Intrusion Detection, File Integrity

Description: Complete guide to installing and configuring AIDE (Advanced Intrusion Detection Environment) on Ubuntu for file integrity monitoring, including database management, custom rules, and automated reporting.

---

AIDE (Advanced Intrusion Detection Environment) is a file integrity checker. It creates a cryptographic baseline of your filesystem and alerts you when anything changes - files added, modified, or deleted. This is particularly valuable for detecting rootkits, compromised binaries, unauthorized configuration changes, and other signs of system compromise that other security tools might miss.

## How AIDE Works

AIDE works in two phases:

1. **Initialization**: AIDE scans your filesystem and builds a database recording checksums, permissions, ownership, timestamps, and other attributes for every monitored file.
2. **Check**: On subsequent runs, AIDE re-scans and compares against the database. Any differences trigger alerts.

The key is that the initial database must be created from a known-good system state.

## Installation

```bash
sudo apt-get update
sudo apt-get install -y aide aide-common

# Verify installation
aide --version
```

## Understanding the Configuration

The main configuration file is at `/etc/aide/aide.conf`. It uses a rule definition language where you specify what attributes to check for each path.

```bash
# View the default configuration
cat /etc/aide/aide.conf | head -100

# Key sections:
# 1. Variable definitions (macros for attribute sets)
# 2. Database locations
# 3. Rule definitions (paths to monitor and how to monitor them)
```

### Attribute Groups

AIDE predefines attribute groups in the default config:

```
# Common predefined groups (from /etc/aide/aide.conf):
# p = permissions
# i = inode
# n = number of links
# u = user
# g = group
# s = size
# m = mtime (modification time)
# a = atime (access time)
# c = ctime (change time)
# md5 = MD5 hash
# sha256 = SHA-256 hash
# sha512 = SHA-512 hash
# R = p+i+n+u+g+s+m+c+sha256 (typical for regular files)
# L = p+i+n+u+g (for symlinks)
# E = empty group
```

## Custom Configuration

Create a custom configuration file for your environment:

```bash
sudo nano /etc/aide/aide.conf
```

Key configuration sections to customize:

```
# Database location - where the baseline is stored
database_in=file:/var/lib/aide/aide.db
database_out=file:/var/lib/aide/aide.db.new

# Log file
report_url=file:/var/log/aide/aide.log
# Also report to stdout
report_url=stdout

# Gzip the database for smaller file size
gzip_dbout=yes

# Define custom rule sets
# SECURE = full checking with multiple hashes
SECURE = p+i+n+u+g+s+m+c+sha256+sha512

# LOGSONLY = check only permissions and ownership (for log files that change content)
LOGSONLY = p+u+g

# BINARIES = check executables thoroughly
BINARIES = p+i+n+u+g+s+sha256+sha512

# NORMAL = standard check without access time
NORMAL = p+i+n+u+g+s+m+c+sha256
```

### Defining Monitored Paths

```
# Monitor critical system directories thoroughly
/bin BINARIES
/sbin BINARIES
/usr/bin BINARIES
/usr/sbin BINARIES
/usr/local/bin BINARIES
/lib BINARIES
/lib64 BINARIES
/usr/lib BINARIES

# Monitor configuration files
/etc SECURE

# Monitor boot files
/boot SECURE

# Monitor SSH configuration
/root/.ssh SECURE

# Watch kernel and modules
/lib/modules BINARIES
/usr/lib/modules BINARIES

# Log files - check permissions but not content
/var/log LOGSONLY

# Exclude noisy paths that change frequently
!/var/log/.*
!/var/cache/.*
!/var/lib/aide/.*
!/proc/.*
!/sys/.*
!/dev/.*
!/run/.*
!/tmp/.*
```

The `!` prefix excludes a path from monitoring.

## Initializing the Database

Create the baseline database from a known-good system state:

```bash
# Run initialization (this can take several minutes on large systems)
sudo aideinit

# The new database is written to: /var/lib/aide/aide.db.new

# Move it to the active database location
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Verify the database was created
ls -lh /var/lib/aide/aide.db
```

The initialization creates a snapshot of your current filesystem state. Run this right after system setup (and after any intended changes like package installations).

## Running an Integrity Check

```bash
# Run a check against the baseline
sudo aide --check

# Detailed output with file details
sudo aide --check --report=stdout

# Example output showing a modified file:
# AIDE found differences between database and filesystem!!
#
# Summary:
#   Total number of files:  42817
#   Added files:            0
#   Removed files:          0
#   Changed files:          2
#
# Changed files:
# /etc/hosts
#   Mtime: 2026-03-01 18:45:12 -> 2026-03-02 10:22:33
#   Sha256: abc123...-> def456...
```

## Automated Checks with Cron

Schedule daily AIDE checks:

```bash
# Create a check script with email reporting
sudo tee /usr/local/bin/aide-check.sh << 'EOF'
#!/bin/bash
# aide-check.sh - Run AIDE check and send report if changes found

LOG_FILE="/var/log/aide/aide-check.log"
ALERT_EMAIL="admin@example.com"
HOSTNAME=$(hostname)

# Ensure log directory exists
mkdir -p /var/log/aide

# Run the check
aide --check 2>&1 | tee "$LOG_FILE"
EXIT_CODE=$?

# Exit code meanings:
# 0 = no differences found
# 1 = new files found
# 2 = removed files found
# 3 = changed files found
# 4+ = errors

if [ $EXIT_CODE -ne 0 ]; then
    echo "AIDE detected changes on ${HOSTNAME}:" | \
        mail -s "AIDE Alert: File system changes on ${HOSTNAME}" \
        -a "From: aide@${HOSTNAME}" \
        "$ALERT_EMAIL" < "$LOG_FILE"
    logger "AIDE: File integrity check found changes (exit code: $EXIT_CODE)"
else
    logger "AIDE: File integrity check passed - no changes detected"
fi
EOF

sudo chmod +x /usr/local/bin/aide-check.sh

# Schedule daily check at 3 AM
echo "0 3 * * * root /usr/local/bin/aide-check.sh" | sudo tee /etc/cron.d/aide-check
```

## Updating the Database After Legitimate Changes

After planned changes (package updates, configuration changes), update the baseline:

```bash
# 1. Run a check to see current changes
sudo aide --check > /tmp/aide-before-update.log 2>&1

# 2. Review what changed to ensure all changes are expected
cat /tmp/aide-before-update.log

# 3. If changes are expected, generate a new database
sudo aide --init

# 4. Replace the old database
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

echo "AIDE database updated on $(date)" | sudo tee -a /var/log/aide/update.log
```

A best practice is to update the database immediately after:
- System package upgrades
- Application deployments
- Configuration changes that were planned

## Securing the AIDE Database

The database itself must be protected. If an attacker compromises the database, they can hide their tracks:

```bash
# Store a copy of the database on read-only media or remote storage
# After initialization, copy to a secure location
scp /var/lib/aide/aide.db backup-server:/secure/aide-databases/$(hostname)-$(date +%Y%m%d).db

# Use checksums to verify database integrity
sha256sum /var/lib/aide/aide.db > /var/lib/aide/aide.db.sha256
# Store aide.db.sha256 on a trusted system

# Verify database integrity before a check
sha256sum -c /var/lib/aide/aide.db.sha256 || echo "DATABASE INTEGRITY CHECK FAILED"
```

## Advanced Configuration: Custom Rules

### Checking Extended Attributes

```bash
# In aide.conf, add xattr support
SECURE = p+i+n+u+g+s+m+c+sha256+sha512+xattrs
```

### Monitoring Specific Files More Aggressively

```bash
# High-sensitivity rules for critical files
/etc/passwd SECURE
/etc/shadow SECURE
/etc/sudoers SECURE
/etc/ssh/sshd_config SECURE
/root/.ssh/authorized_keys SECURE
/etc/crontab SECURE
/etc/cron.d SECURE
/etc/cron.daily SECURE
```

### Excluding Dynamic Files

```bash
# These files change legitimately and frequently - exclude them
!/var/lib/apt/.*
!/var/lib/dpkg/.*
!/var/lib/systemd/.*
!/var/spool/.*
!/var/mail/.*
!/home/.*/.local/share/recently-used.xbel
!/home/.*/.bash_history
!/home/.*/.lesshst
```

## Reading AIDE Reports

```bash
# View a specific check report
sudo cat /var/log/aide/aide.log

# Parse for specific change types
sudo aide --check 2>&1 | grep -E "^[A-Z]:"

# Change type codes:
# f = regular file
# d = directory
# l = symbolic link
# Change attributes shown as: Sha256: old -> new
```

## Integration with Auditd

Combine AIDE with auditd for complete audit coverage:

```bash
# After AIDE reports a changed file, use auditd to find who changed it
# Assuming audit rules are in place for /etc:
sudo ausearch -f /etc/hosts --start yesterday --end now | aureport -f --summary

# Or search directly
sudo ausearch -f /etc/passwd -ts recent
```

## Reinstalling After System Updates

After major OS upgrades, many binaries change. Rather than generating hundreds of false positives, reinitialize:

```bash
# After apt-get upgrade or do-release-upgrade:
sudo apt-get update && sudo apt-get upgrade -y

# Reinitialize AIDE
sudo aide --init
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

echo "AIDE database reinitialized after update on $(date)" | \
    sudo tee -a /var/log/aide/update.log
```

AIDE is most effective as part of a larger security monitoring stack. Pair it with auditd for tracking who made changes, and with CrowdSec or fail2ban for blocking attack sources before they can make changes.
