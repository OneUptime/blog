# How to Configure systemd-journald for Persistent Logging on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, systemd, journald, System Administration

Description: Configure systemd-journald for persistent log storage on Ubuntu, set storage limits, control retention policies, and ensure logs survive system reboots.

---

By default on some Ubuntu configurations, systemd-journald stores logs in `/run/log/journal/`, which is a tmpfs mount that gets wiped on every reboot. When troubleshooting an issue that caused a reboot (a kernel panic, a crashed service, or an OOM event), having logs that survive across reboots is essential. This guide covers making journald storage persistent and configuring its behavior.

## Volatile vs. Persistent Storage

The journal operates in two modes:

- **Volatile** - logs stored in `/run/log/journal/` (RAM-based tmpfs). Lost on reboot. This is the default when `/var/log/journal/` doesn't exist.
- **Persistent** - logs stored in `/var/log/journal/` (disk). Survives reboots. Requires the directory to exist.

```bash
# Check current storage mode
journalctl --disk-usage

# Identify where journals are stored
ls /run/log/journal/ 2>/dev/null && echo "Volatile (runtime) storage"
ls /var/log/journal/ 2>/dev/null && echo "Persistent storage"

# Or check in the config
grep -i storage /etc/systemd/journald.conf /etc/systemd/journald.conf.d/*.conf 2>/dev/null
```

## Enabling Persistent Logging

The simplest way to enable persistent logging is to create the directory:

```bash
# Create the persistent journal directory
sudo mkdir -p /var/log/journal

# Set correct ownership
sudo chown root:systemd-journal /var/log/journal

# Set permissions (group-readable, sticky bit for security)
sudo chmod 2755 /var/log/journal

# Flush existing logs to the new location
sudo journalctl --flush

# Force journal to recognize the new directory
sudo systemd-tmpfiles --create --prefix /var/log/journal

# Restart journald
sudo systemctl restart systemd-journald

# Verify persistent storage is now active
journalctl --disk-usage
ls /var/log/journal/
```

## Configuring journald.conf

The main configuration file is `/etc/systemd/journald.conf`:

```bash
sudo nano /etc/systemd/journald.conf
```

```bash
[Journal]
# Storage mode: auto, volatile, persistent, or none
# auto = persistent if /var/log/journal/ exists, otherwise volatile
# persistent = always use /var/log/journal/
# volatile = always use /run/log/journal/
# none = disable journal storage
Storage=persistent

# Compress log entries
Compress=yes

# Seal journal files with FSS (Forward Secure Sealing) for tamper detection
# Requires "journalctl --setup-keys" after enabling
Seal=no

# How long to wait before writing to disk (in seconds)
# 0 = write immediately
SyncIntervalSec=5m

# Rate limiting - max messages per interval per service
RateLimitIntervalSec=30s
RateLimitBurst=10000

# Maximum size of the journal
SystemMaxUse=2G

# Maximum size of the in-memory (runtime) journal
RuntimeMaxUse=200M

# How much disk space to keep free
SystemKeepFree=1G

# Size at which individual journal files are rotated
SystemMaxFileSize=100M

# Maximum number of journal files to keep per user
SystemMaxFiles=100

# Maximum time to retain journal entries
MaxRetentionSec=1month

# Maximum time a journal file stays open before rotation
MaxFileSec=1week

# Forward messages to /dev/kmsg kernel ring buffer
ForwardToKMsg=no

# Forward messages to syslog (rsyslog/syslog-ng)
ForwardToSyslog=yes

# Forward messages to the console
ForwardToConsole=no

# Console TTY for console forwarding
TTYPath=/dev/console

# Maximum log level to store
MaxLevelStore=debug

# Maximum log level to forward to syslog
MaxLevelSyslog=debug

# Maximum log level to print to console
MaxLevelConsole=info
```

After editing:

```bash
# Restart journald to apply changes
sudo systemctl restart systemd-journald

# Verify configuration was accepted
journalctl --disk-usage
journalctl --list-boots   # Should now show multiple boots if logs existed
```

## Using Drop-in Configuration Files

Rather than editing the main configuration file (which may be overwritten by package updates), use drop-in files:

```bash
# Create drop-in directory
sudo mkdir -p /etc/systemd/journald.conf.d

# Create a custom configuration
sudo nano /etc/systemd/journald.conf.d/99-custom.conf
```

```bash
[Journal]
# Override specific settings
Storage=persistent
SystemMaxUse=5G
MaxRetentionSec=3months
Compress=yes
```

```bash
# Verify the configuration
systemd-analyze cat-config systemd/journald.conf
```

## Storage Limits and Retention

Control how much disk space the journal uses:

```bash
# Check current disk usage
journalctl --disk-usage

# Manually vacuum (reduce) journal storage
# Keep only the last 500MB
journalctl --vacuum-size=500M

# Keep only the last 7 days
journalctl --vacuum-time=7d

# Keep only 5 archive files per boot
journalctl --vacuum-files=5

# Combine multiple vacuum operations
journalctl --vacuum-size=1G --vacuum-time=30d
```

After vacuuming, check the result:

```bash
journalctl --disk-usage
ls -lh /var/log/journal/*/
```

## Automatic Retention Configuration

Configure automatic retention in `journald.conf` so you don't need to manually vacuum:

```bash
sudo nano /etc/systemd/journald.conf.d/99-retention.conf
```

```bash
[Journal]
# Keep at most 2GB of logs
SystemMaxUse=2G

# Always keep at least 1GB free
SystemKeepFree=1G

# Rotate files larger than 200MB
SystemMaxFileSize=200M

# Delete entries older than 90 days
MaxRetentionSec=90day

# Each journal file covers at most 1 week
MaxFileSec=1week
```

```bash
sudo systemctl restart systemd-journald
```

## Viewing Logs Across Multiple Boots

With persistent logging enabled, you can browse logs from previous boots:

```bash
# List all available boots
journalctl --list-boots
# Output shows: Boot ID, First timestamp, Last timestamp

# Example output:
# -3 abc123...  Mon 2026-02-27 08:00:00 UTC - Mon 2026-02-27 23:59:58 UTC
# -2 def456...  Tue 2026-02-28 08:00:01 UTC - Tue 2026-02-28 23:59:59 UTC
# -1 ghi789...  Wed 2026-02-29 08:00:00 UTC - Wed 2026-02-29 23:59:59 UTC
#  0 jkl012...  Sun 2026-03-01 08:00:02 UTC - Sun 2026-03-01 15:30:00 UTC

# Show logs from the previous boot
journalctl -b -1

# Show errors from two boots ago
journalctl -b -2 -p err

# Show logs from a specific boot by ID
journalctl -b abc123...

# Show kernel messages from the boot before last
journalctl -b -1 -k

# Look for why the previous boot ended (shutdown/crash)
journalctl -b -1 | tail -100
```

## Rate Limiting Configuration

Prevent a misbehaving service from flooding the journal:

```bash
sudo nano /etc/systemd/journald.conf.d/99-rate-limit.conf
```

```bash
[Journal]
# Allow 1000 messages per 30 seconds per service
# Adjust based on your most verbose services
RateLimitIntervalSec=30s
RateLimitBurst=1000
```

To configure rate limiting per-service, use the service's unit file:

```bash
# Override for a specific service that logs a lot
sudo systemctl edit myapp.service
```

```bash
[Service]
# Allow this service to log more
LogRateLimitIntervalSec=60s
LogRateLimitBurst=10000
```

## Forwarding Journal to Syslog

If you're running rsyslog or syslog-ng alongside journald:

```bash
sudo nano /etc/systemd/journald.conf.d/99-syslog.conf
```

```bash
[Journal]
# Forward all messages to syslog socket
ForwardToSyslog=yes

# What level to forward (avoid forwarding debug to syslog)
MaxLevelSyslog=info
```

Check that rsyslog is receiving forwarded messages:

```bash
# rsyslog receives from journald via /run/systemd/journal/syslog
ls -la /run/systemd/journal/syslog

# Verify forwarding is working
logger -t test "Test forwarding to syslog"
grep "Test forwarding" /var/log/syslog
journalctl -t test
```

## Security: Journal Sealing

Journal sealing uses Forward Secure Sealing (FSS) to detect tampering with log files:

```bash
# Set up journal sealing
sudo journalctl --setup-keys

# This generates a verification key pair
# The verification key can be stored offline
# The sealing key is stored on the system

# Enable sealing in config
sudo nano /etc/systemd/journald.conf.d/99-seal.conf
```

```bash
[Journal]
Seal=yes
```

```bash
sudo systemctl restart systemd-journald

# Verify journal integrity
sudo journalctl --verify
```

## Monitoring journald Health

```bash
# Check journald service status
systemctl status systemd-journald

# View journald's own log entries
journalctl -u systemd-journald

# Check for journal corruption warnings
journalctl -u systemd-journald | grep -i "corrupt\|error\|fail"

# View current journal configuration
systemd-analyze cat-config systemd/journald.conf

# Check disk usage trend
watch -n 5 'journalctl --disk-usage'
```

## Exporting and Importing Journal Data

For archival or transfer purposes:

```bash
# Export current journal to a file
journalctl -o export > /backup/journal-backup.bin

# Export a specific time range
journalctl --since "2026-03-01" --until "2026-03-02" -o export > /backup/march-01.bin

# Import exported journal data (view only, can't merge back)
journalctl --file /backup/journal-backup.bin

# Export as JSON for external processing
journalctl -o json --since "1 hour ago" > /tmp/recent-logs.json
```

Persistent journald storage makes post-incident analysis much more effective. Being able to look back at what happened across the last week of system operation, including previous boots, is invaluable when tracking down intermittent issues or understanding the sequence of events leading to an outage.
