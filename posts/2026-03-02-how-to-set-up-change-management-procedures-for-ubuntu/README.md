# How to Set Up Change Management Procedures for Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Change Management, DevOps, Operations, Compliance

Description: Establish change management procedures for Ubuntu server environments, covering change tracking, pre-change backups, rollback procedures, and audit trails for controlled deployments.

---

Change management is the process of controlling modifications to production systems to minimize risk and maintain stability. In regulated environments, it's required by frameworks like SOC 2, HIPAA, and ISO 27001. Even outside of compliance requirements, structured change management prevents the kind of undocumented, untested change that causes outages and makes troubleshooting a nightmare.

This post covers practical change management procedures specifically for Ubuntu server environments.

## What Counts as a Change

Not every action needs a formal change request. Categorize changes by risk:

- **Standard changes**: Pre-approved, low-risk, repeatable (applying security patches, restarting services)
- **Normal changes**: Require review and approval before implementation (package installations, configuration changes)
- **Emergency changes**: Must happen immediately but need retrospective documentation (critical security patches, active incident response)

Changes that always require formal tracking:
- Package installations and removals
- Kernel updates (require reboots)
- Configuration file modifications
- Firewall rule changes
- User account additions or privilege changes
- New services being deployed
- Infrastructure changes (disk, network, memory)

## Setting Up a Change Log

Start with a simple on-server change log before integrating with a ticketing system:

```bash
# Create a change log directory
sudo mkdir -p /var/log/change-management
sudo chmod 750 /var/log/change-management

# Create a change log script
sudo tee /usr/local/bin/change-log << 'SCRIPT'
#!/bin/bash
# Usage: change-log "description" [ticket_id]

LOGFILE="/var/log/change-management/changes.log"
DESCRIPTION="$1"
TICKET="${2:-UNTRACKED}"
USER="${SUDO_USER:-$USER}"
DATE=$(date '+%Y-%m-%d %H:%M:%S %Z')
HOST=$(hostname -f)

if [ -z "$DESCRIPTION" ]; then
    echo "Usage: change-log \"description\" [ticket_id]"
    exit 1
fi

cat >> "$LOGFILE" << EOF
---
Date: $DATE
Host: $HOST
User: $USER
Ticket: $TICKET
Description: $DESCRIPTION
EOF

echo "Change logged: $TICKET - $DESCRIPTION"
SCRIPT

sudo chmod +x /usr/local/bin/change-log
```

## Pre-Change Procedures

Every change should have a pre-change checklist:

```bash
#!/bin/bash
# /usr/local/bin/pre-change-check.sh
# Run before making any production changes

TICKET="$1"

if [ -z "$TICKET" ]; then
    echo "Usage: pre-change-check.sh <ticket_id>"
    exit 1
fi

echo "=== Pre-Change Check for $TICKET ==="
echo "Time: $(date)"
echo "Host: $(hostname)"
echo "User: ${SUDO_USER:-$USER}"
echo ""

# 1. Verify you have a rollback plan
echo "CHECKLIST - Confirm each item:"
echo ""
read -p "[ ] You have a rollback plan documented? (y/n) " ROLLBACK
read -p "[ ] You have notified stakeholders of the maintenance window? (y/n) " NOTIFIED
read -p "[ ] You have taken a configuration backup? (y/n) " BACKUP
read -p "[ ] Change has been tested in a non-production environment? (y/n) " TESTED

echo ""

# 2. Capture system state before change
echo "=== Current System State ===" | tee /tmp/pre-change-state-$TICKET.txt
echo "Date: $(date)" >> /tmp/pre-change-state-$TICKET.txt
echo "" >> /tmp/pre-change-state-$TICKET.txt
echo "--- Running Services ---" >> /tmp/pre-change-state-$TICKET.txt
systemctl list-units --state=running --no-pager >> /tmp/pre-change-state-$TICKET.txt
echo "" >> /tmp/pre-change-state-$TICKET.txt
echo "--- Disk Usage ---" >> /tmp/pre-change-state-$TICKET.txt
df -h >> /tmp/pre-change-state-$TICKET.txt
echo "" >> /tmp/pre-change-state-$TICKET.txt
echo "--- Memory Usage ---" >> /tmp/pre-change-state-$TICKET.txt
free -h >> /tmp/pre-change-state-$TICKET.txt
echo "" >> /tmp/pre-change-state-$TICKET.txt
echo "--- Installed Packages (snapshot) ---" >> /tmp/pre-change-state-$TICKET.txt
dpkg -l | grep "^ii" >> /tmp/pre-change-state-$TICKET.txt

echo "Pre-change state saved to /tmp/pre-change-state-$TICKET.txt"
echo ""
echo "=== Ready to proceed with change $TICKET ==="
```

## Configuration Backup Before Changes

Always back up configuration before modifying it:

```bash
#!/bin/bash
# /usr/local/bin/config-backup.sh
# Create a timestamped backup of a configuration file

FILE="$1"
TICKET="${2:-manual}"

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
    echo "Usage: config-backup.sh <file> [ticket_id]"
    exit 1
fi

BACKUP_DIR="/var/backups/config-changes"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FILENAME=$(basename "$FILE")
BACKUP_NAME="${BACKUP_DIR}/${FILENAME}.${TIMESTAMP}.${TICKET}.bak"

cp -p "$FILE" "$BACKUP_NAME"
echo "Backed up: $FILE -> $BACKUP_NAME"

# Log the backup
change-log "Config backup taken: $FILE -> $BACKUP_NAME" "$TICKET"
```

Create a wrapper that automatically backs up before editing:

```bash
# Add to /etc/profile.d/safe-edit.sh
sudo tee /etc/profile.d/safe-edit.sh << 'EOF'
# safe-edit: backup a file before editing it
safe-edit() {
    local FILE="$1"
    local TICKET="${2:-manual}"
    if [ -z "$FILE" ]; then
        echo "Usage: safe-edit <file> [ticket_id]"
        return 1
    fi
    config-backup "$FILE" "$TICKET"
    ${EDITOR:-nano} "$FILE"
}
EOF
```

## Tracking Package Changes

Automatically log package installations and removals:

```bash
# dpkg logs all package operations to /var/log/dpkg.log
# Set up a script to generate a daily package change report

sudo tee /usr/local/bin/package-change-report.sh << 'SCRIPT'
#!/bin/bash
# Report package changes from the last 24 hours

DATE=$(date -d "yesterday" '+%Y-%m-%d')
LOGFILE="/var/log/dpkg.log"

echo "=== Package Changes on $(hostname) - $DATE ==="
echo ""

echo "Installed packages:"
grep "$DATE.*\ install\ " "$LOGFILE" | awk '{print "  +", $4}' | sort -u

echo ""
echo "Removed packages:"
grep "$DATE.*\ remove\ " "$LOGFILE" | awk '{print "  -", $4}' | sort -u

echo ""
echo "Upgraded packages:"
grep "$DATE.*\ upgrade\ " "$LOGFILE" | awk '{print "  ^", $4}' | sort -u
SCRIPT

sudo chmod +x /usr/local/bin/package-change-report.sh

# Schedule daily report
echo "0 8 * * * root /usr/local/bin/package-change-report.sh | mail -s 'Package changes on $(hostname)' admin@example.com" | \
  sudo tee /etc/cron.d/package-change-report
```

## Post-Change Verification

After making a change, verify the system is in the expected state:

```bash
#!/bin/bash
# /usr/local/bin/post-change-verify.sh

TICKET="$1"

echo "=== Post-Change Verification for $TICKET ==="
echo "Time: $(date)"
echo ""

# Compare service state with pre-change state
if [ -f "/tmp/pre-change-state-$TICKET.txt" ]; then
    echo "Comparing running services with pre-change state..."
    systemctl list-units --state=running --no-pager > /tmp/post-change-services.txt

    # Find newly stopped services (potential issue)
    STOPPED=$(diff \
        <(grep "running" /tmp/pre-change-state-$TICKET.txt) \
        <(grep "running" /tmp/post-change-services.txt) | \
        grep "^<" | awk '{print $1}')

    if [ -n "$STOPPED" ]; then
        echo "WARNING: These services were running before but not now:"
        echo "$STOPPED"
    else
        echo "All previously running services are still running."
    fi
fi

# Quick service health checks
echo ""
echo "Critical service status:"
for SERVICE in sshd ufw fail2ban nginx mysql postgresql; do
    if systemctl is-enabled "$SERVICE" &>/dev/null; then
        STATUS=$(systemctl is-active "$SERVICE")
        echo "  $SERVICE: $STATUS"
    fi
done

# Check system logs for errors since change started
echo ""
echo "Recent errors in system log:"
journalctl --since "15 minutes ago" -p err --no-pager | tail -20

echo ""
read -p "Is the system functioning correctly? (y/n) " OK

if [ "$OK" = "y" ]; then
    change-log "Change $TICKET completed successfully - post-change verification passed" "$TICKET"
    echo "Change documented as successful."
else
    echo "Issues detected. Consider rolling back."
    change-log "Change $TICKET completed - post-change verification FAILED - review required" "$TICKET"
fi
```

## Rollback Procedures

Document a rollback for every change type:

```bash
#!/bin/bash
# /usr/local/bin/rollback-config.sh
# Rollback a configuration file to a backup

FILE="$1"
TICKET="${2:-manual}"

BACKUP_DIR="/var/backups/config-changes"
FILENAME=$(basename "$FILE")

echo "Available backups for $FILENAME:"
ls -la "$BACKUP_DIR/${FILENAME}".*.bak 2>/dev/null | awk '{print NR, $9}'

echo ""
read -p "Enter backup number to restore (or 'q' to quit): " CHOICE

if [ "$CHOICE" = "q" ]; then
    exit 0
fi

BACKUP=$(ls "$BACKUP_DIR/${FILENAME}".*.bak 2>/dev/null | sed -n "${CHOICE}p")

if [ -z "$BACKUP" ]; then
    echo "Invalid selection"
    exit 1
fi

echo "Restoring from: $BACKUP"
read -p "Confirm restore? (y/n) " CONFIRM

if [ "$CONFIRM" = "y" ]; then
    # Backup the current (bad) state before restoring
    config-backup "$FILE" "${TICKET}-rollback"
    cp -p "$BACKUP" "$FILE"
    echo "Restored: $FILE from $BACKUP"
    change-log "Rolled back $FILE to $BACKUP" "$TICKET"
fi
```

For package rollbacks:

```bash
# Roll back a package to its previous version
# First, find the previous version in apt cache or history
apt-get changelog packagename
zgrep "install\|upgrade" /var/log/dpkg.log* | grep packagename

# Downgrade to specific version
sudo apt install packagename=1.0-1ubuntu1

# Pin the downgraded package to prevent auto-upgrade
echo "packagename hold" | sudo dpkg --set-selections
```

## Integrating with Ticketing Systems

Most organizations use a ticketing system. Add a simple integration hook:

```bash
# /usr/local/bin/change-close-ticket.sh
# Call your ticketing API to close/update a change ticket

TICKET="$1"
STATUS="${2:-completed}"

# Example: update a ticket via REST API
curl -s -X PATCH \
    -H "Authorization: Bearer $JIRA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"status\": \"$STATUS\", \"resolution\": \"Change applied on $(hostname) at $(date)\"}" \
    "https://yourorg.atlassian.net/rest/api/3/issue/$TICKET/transitions"
```

## Audit Trail

All changes create an audit trail through:
1. The `/var/log/change-management/changes.log` file
2. `/var/log/dpkg.log` for package changes
3. `/var/log/auth.log` for user authentication and sudo
4. The auditd log at `/var/log/audit/audit.log`

Review these regularly as part of your operational process, and ensure they're backed up off-server for durability and compliance purposes.
