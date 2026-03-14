# How to Set Up Structured Logging with journald on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, Journald, Systemd, System Administration

Description: Configure structured logging with journald on Ubuntu, including storage settings, field filtering, log forwarding, and integration with log analysis tools.

---

journald, the logging component of systemd, stores logs in a binary format with structured fields rather than plain text. This structure makes it possible to query logs by any field - unit name, priority, PID, user, or any custom field your application adds. journald collects logs from multiple sources: the kernel ring buffer, syslog, systemd units, and anything writing to its socket. Setting it up correctly improves both query performance and log retention management.

## Understanding journald's Structured Format

Unlike traditional syslog, which produces plain text lines, journald stores each log entry as a set of key-value pairs. Every entry has standard fields like `MESSAGE`, `PRIORITY`, `_SYSTEMD_UNIT`, `_PID`, `_UID`, and many others. Applications can add custom fields by writing to journald's native socket.

```bash
# View a recent log entry in its full structured form
sudo journalctl -n 1 -o json | python3 -m json.tool

# See all available fields in a single message
sudo journalctl -n 1 -o verbose

# List all unique field names ever seen in the journal
sudo journalctl -F _SYSTEMD_UNIT | sort | head -20
```

## journald Configuration File

The main configuration is at `/etc/systemd/journald.conf`.

```bash
# View the current effective configuration
sudo journalctl --show-config 2>/dev/null || cat /etc/systemd/journald.conf

# For per-user journal configuration
ls /etc/systemd/journald.conf.d/
```

## Configuring Storage

```bash
sudo nano /etc/systemd/journald.conf
```

```ini
[Journal]
# Where to store journals:
# "volatile" - RAM only (/run/log/journal)
# "persistent" - disk (/var/log/journal)
# "auto" - persistent if /var/log/journal exists, volatile otherwise (default)
# "none" - discard all logs
Storage=persistent

# Maximum disk space journals can use
# Default is 10% of filesystem, capped at 4G
SystemMaxUse=2G

# Minimum free space to keep on the filesystem
SystemKeepFree=1G

# Maximum size of a single journal file (before rotation)
SystemMaxFileSize=200M

# Maximum number of journal files to retain
SystemMaxFiles=10

# Same settings for volatile (RAM) storage
RuntimeMaxUse=200M
RuntimeKeepFree=100M
RuntimeMaxFileSize=50M
```

After changing the configuration:

```bash
sudo systemctl restart systemd-journald

# Ensure /var/log/journal exists for persistent storage
sudo mkdir -p /var/log/journal
sudo systemd-tmpfiles --create --prefix /var/log/journal
sudo systemctl restart systemd-journald
```

## Controlling Log Retention

```bash
# Rotate and remove old journal files to reclaim space
sudo journalctl --rotate
sudo journalctl --vacuum-size=1G      # Keep only 1G of logs
sudo journalctl --vacuum-time=30d     # Keep only last 30 days
sudo journalctl --vacuum-files=10     # Keep only last 10 journal files

# Verify the current disk usage
sudo journalctl --disk-usage
```

## Filtering Structured Logs

The structured format enables precise filtering that plain text log files cannot match.

```bash
# Filter by systemd unit
sudo journalctl -u nginx.service
sudo journalctl -u nginx.service -u mysql.service  # multiple units

# Filter by priority (0=emerg, 1=alert, 2=crit, 3=err, 4=warning, 5=notice, 6=info, 7=debug)
sudo journalctl -p err         # error and above
sudo journalctl -p warning..info  # range: warning to info

# Filter by time range
sudo journalctl --since "2026-03-01 00:00:00" --until "2026-03-02 00:00:00"
sudo journalctl --since "1 hour ago"
sudo journalctl --since yesterday

# Filter by PID
sudo journalctl _PID=1234

# Filter by user
sudo journalctl _UID=1000
sudo journalctl _COMM=sshd   # by executable name

# Combine filters (AND logic)
sudo journalctl -u nginx.service -p err --since "1 hour ago"
```

## Output Formats for Structured Data

```bash
# JSON output (one JSON object per log entry, good for log shippers)
sudo journalctl -u nginx -o json | head -5

# JSON pretty-printed
sudo journalctl -u nginx -n 5 -o json-pretty

# Compact format showing all fields
sudo journalctl -n 5 -o verbose

# Export format for archiving (binary, preserves all fields)
sudo journalctl --export -u nginx > /tmp/nginx-logs.export

# Import/view exported logs
sudo journalctl --file /tmp/nginx-logs.export
```

## Adding Custom Structured Fields from Applications

Applications can log to journald with custom structured fields. Python example:

```python
# Python: log to journald with custom fields
from systemd.journal import send

send("Application started",
     PRIORITY=6,  # INFO
     APP_VERSION="2.0",
     ENVIRONMENT="production",
     CUSTOMER_ID="cust-123")
```

Shell script example using `systemd-cat`:

```bash
# Log a message with a custom identifier
echo "Backup completed: 1523 files" | systemd-cat -t backup-service -p info

# Alternatively using the sd_journal API via logger
logger -t myapp --journald << 'EOF'
MESSAGE=Database connection failed
DB_HOST=db.example.com
DB_PORT=5432
RETRY_COUNT=3
EOF
```

## Writing Applications That Log to journald Natively

For applications using structured journald fields, write directly to the journal socket.

```bash
# Shell function to log with structured fields
journal_log() {
    local priority="$1"
    local message="$2"
    shift 2

    local fields=()
    while [ $# -gt 0 ]; do
        fields+=("$1")
        shift
    done

    echo -e "PRIORITY=$priority\nMESSAGE=$message\n$(printf '%s\n' "${fields[@]}")" | \
        systemd-cat -t "$(basename "$0")" -p "$priority"
}

# Use the function
journal_log 6 "Deployment started" "APP_VERSION=2.1" "ENVIRONMENT=production" "TRIGGERED_BY=jenkins"
```

## Forwarding Structured Logs to syslog or External Systems

```bash
# In /etc/systemd/journald.conf, enable forwarding to syslog
sudo nano /etc/systemd/journald.conf
```

```ini
[Journal]
# Forward to syslog socket (for rsyslog or syslog-ng)
ForwardToSyslog=yes

# Forward to the kernel console
ForwardToConsole=no

# Forward to /dev/kmsg (useful for single-user mode debugging)
ForwardToKMsg=no

# Forward to wall messages
ForwardToWall=no
```

```bash
sudo systemctl restart systemd-journald
```

## Using journalctl for Log Analysis

```bash
# Count entries per unit (sorted by frequency)
sudo journalctl --no-pager -o short-unix | \
  awk '{print $3}' | sort | uniq -c | sort -nr | head -20

# Show error rate per unit
sudo journalctl -p err --since "24 hours ago" --no-pager -o short | \
  awk '{print $5}' | sort | uniq -c | sort -nr | head -10

# Find the most recent errors
sudo journalctl -p err -n 20 --no-pager

# Follow logs for multiple services simultaneously
sudo journalctl -f -u nginx -u php-fpm -u mysql
```

## Setting Up Automated Log Analysis

```bash
# Create a daily log summary script
sudo tee /usr/local/bin/journal-daily-summary.sh << 'EOF'
#!/bin/bash
# Generate a daily log summary

SINCE="24 hours ago"

echo "=== Journal Summary for $(hostname) ==="
echo "Period: Last 24 hours"
echo ""

echo "--- Error Count by Service ---"
journalctl -p err --since "$SINCE" --no-pager -o short-unix 2>/dev/null | \
  awk '{print $5}' | sort | uniq -c | sort -nr | head -10

echo ""
echo "--- Total Messages by Priority ---"
for p in emerg alert crit err warning notice info debug; do
    count=$(journalctl -p "$p..$p" --since "$SINCE" --no-pager 2>/dev/null | wc -l)
    echo "  $p: $count"
done

echo ""
echo "--- Failed Services ---"
systemctl list-units --state=failed --no-legend 2>/dev/null

echo ""
echo "--- Disk Usage ---"
journalctl --disk-usage 2>/dev/null
EOF

sudo chmod +x /usr/local/bin/journal-daily-summary.sh

# Schedule it daily
sudo tee /etc/cron.daily/journal-summary << 'EOF'
#!/bin/bash
/usr/local/bin/journal-daily-summary.sh | mail -s "Journal Summary $(hostname)" admin@example.com
EOF
sudo chmod +x /etc/cron.daily/journal-summary
```

## Configuring Maximum Log Rate

To prevent a misbehaving service from flooding the journal:

```ini
# In /etc/systemd/journald.conf
[Journal]
# Maximum log entries per service per time window
RateLimitIntervalSec=30s
RateLimitBurst=10000
```

journald's structured logging is one of the most underused features of modern Ubuntu systems. Once you start using structured fields effectively - both for filtering existing logs and for adding application-specific fields - troubleshooting and log analysis become significantly faster.
