# How to Restore iptables Rules from a Backup File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, Linux, Firewall, Backup, Recovery, Security

Description: Restore iptables rules from backup files using iptables-restore, verify the restoration, and implement a safe pre-change backup workflow.

Restoring iptables rules from backup is your safety net after accidental flushes, misconfigurations, or failed deployments. A solid backup workflow makes iptables changes much less risky.

## Create a Backup Before Making Changes

```bash
# Always back up before changes - this is a 5-second habit that saves hours

sudo iptables-save > /tmp/iptables-backup-$(date +%Y%m%d-%H%M%S).txt

# Create a versioned backup directory
sudo mkdir -p /var/backups/iptables
sudo sh -c 'iptables-save > "/var/backups/iptables/rules-$(date +%Y%m%d-%H%M%S).txt"'

# List available backups
ls -la /var/backups/iptables/
```

## Restore from Backup File

```bash
# Restore all rules from a backup file
sudo iptables-restore < /tmp/iptables-backup-20260319-101500.txt

# Verify restoration
sudo iptables-save

# For specific tables only:
# Restore only filter table from a full backup
sudo iptables-restore --table=filter < /tmp/backup.txt
```

## Safe Restore with Pre-Check

```bash
#!/bin/bash
# safe-restore.sh - Restore with connectivity pre-check

BACKUP="$1"

if [ -z "$BACKUP" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

if [ ! -f "$BACKUP" ]; then
    echo "Backup file not found: $BACKUP"
    exit 1
fi

# Validate the file before restoring
sudo iptables-restore --test < "$BACKUP"
if [ $? -ne 0 ]; then
    echo "Backup file has errors - restore aborted"
    exit 1
fi

# Create a backup of current rules
CURRENT_BACKUP="/tmp/iptables-before-restore-$(date +%H%M%S).txt"
sudo iptables-save > "$CURRENT_BACKUP"
echo "Current rules saved to: $CURRENT_BACKUP"

# Restore from backup
sudo iptables-restore < "$BACKUP"
echo "Restored from: $BACKUP"

# Verify outbound connectivity
sleep 2
if ping -c 1 -W 2 8.8.8.8 > /dev/null 2>&1; then
    echo "Connectivity check: OK"
else
    echo "WARNING: Cannot ping 8.8.8.8 after restore - check rules"
fi
```

## Restore with --noflush (Merge, Don't Replace)

By default, `iptables-restore` flushes the affected tables before restoring. Use `--noflush` to add rules without removing existing ones:

```bash
# Add rules FROM backup WITHOUT flushing current rules
sudo iptables-restore --noflush < /tmp/additional-rules.txt

# Use cases:
# - Adding rules to an existing ruleset
# - Merging rules from multiple sources
# - Adding rules incrementally
```

## Test Restore Without Applying

```bash
# Validate a backup file without actually applying it
sudo iptables-restore --test < /tmp/iptables-backup.txt

# Exit code 0 = valid for this system; it should restore successfully if state does not change
# Non-zero = file has errors, won't apply

# Check specific aspects:
grep -E "^-A|^:INPUT|^:OUTPUT|^:FORWARD|^\*" /tmp/backup.txt
```

## Automated Backup with Cron

```bash
# Daily automatic backup of iptables rules
echo "0 2 * * * root iptables-save > /var/backups/iptables/rules-\$(date +\%Y\%m\%d).txt && find /var/backups/iptables/ -type f -mtime +30 -delete" \
  | sudo tee /etc/cron.d/iptables-backup
```

The `iptables-restore` command restores the saved ruleset, including rules and chain default policies. Use `iptables-save -c` and `iptables-restore -c` as well if you also need packet and byte counters.
