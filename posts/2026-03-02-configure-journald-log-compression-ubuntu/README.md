# How to Configure journald Log Compression on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, journald, System Administration

Description: Configure journald log compression on Ubuntu to reduce disk usage while retaining full log history for auditing and troubleshooting purposes.

---

journald stores logs in a binary format that already provides some efficiency over plain text syslog files, but logs can still accumulate quickly on active systems. Enabling compression in journald reduces the disk footprint of stored log data significantly, often by 50 to 70 percent depending on log content. This is particularly valuable on servers with constrained storage or long retention requirements.

## How journald Compression Works

journald uses LZ4 compression by default when the `Compress` option is enabled. LZ4 is fast and lightweight, making it well-suited for log data since it adds minimal CPU overhead while achieving good compression ratios. Compressed journal files use the `.journal` extension just like uncompressed ones - the compression is transparent to all journalctl operations.

Compression applies to journal files as they are written. Once a journal file is sealed (marked as complete), it remains in its compressed state. New entries written to active journal files are compressed on the fly.

## Check Current Configuration

Before making changes, look at what journald is currently doing:

```bash
# Show current journal disk usage
sudo journalctl --disk-usage

# Check current journald configuration
sudo systemctl cat systemd-journald | head -20

# View the active configuration file
cat /etc/systemd/journald.conf
```

If the configuration file is mostly commented out, journald is using compiled-in defaults. On Ubuntu, compression is typically enabled by default, but the other settings around it are worth reviewing.

## Configure Compression

The main configuration file is `/etc/systemd/journald.conf`. Open it and adjust the compression-related settings:

```bash
sudo nano /etc/systemd/journald.conf
```

```ini
[Journal]
# Enable log compression
Compress=yes

# Storage mode - persistent keeps logs across reboots
Storage=persistent

# Maximum total disk space journals may use
SystemMaxUse=10G

# Space to keep free on the disk at all times
SystemKeepFree=500M

# Maximum size of a single journal file before it is rotated
SystemMaxFileSize=200M

# How long to keep old journal files
MaxRetentionSec=3month

# Compress journal files after they reach this size
# This is the threshold at which LZ4 kicks in
SystemMaxFileSize=128M
```

The critical setting is `Compress=yes`. The others are standard housekeeping settings that work alongside compression to control overall storage use.

## Apply the Configuration

After saving the file, restart journald:

```bash
sudo systemctl restart systemd-journald
```

journald does not need a full system restart. The new settings take effect immediately for new journal files.

## Force Journal Rotation to Apply Compression

Existing journal files that were written before compression was enabled will not be retroactively compressed. You need to rotate the journals to get the new compressed files:

```bash
# Rotate all journal files - this seals current files and starts new ones
sudo journalctl --rotate

# Vacuum old logs to clean up uncompressed files beyond retention limits
sudo journalctl --vacuum-time=1month
sudo journalctl --vacuum-size=5G
```

After rotation, new journal files will be compressed. You can verify this by checking file sizes before and after:

```bash
# Check the journal directory
ls -lh /var/log/journal/$(cat /etc/machine-id)/

# Check overall disk usage
sudo journalctl --disk-usage
```

## Verify Compression is Active

There is no direct flag in journalctl to show compression status on individual files, but you can verify that files are being compressed by comparing the file size to the uncompressed data they contain:

```bash
# Check a specific journal file
ls -lh /var/log/journal/$(cat /etc/machine-id)/*.journal | head -5

# Check how much data journald reports vs actual file sizes
sudo journalctl --disk-usage

# Use file command to inspect journal files
file /var/log/journal/$(cat /etc/machine-id)/system.journal
```

You can also check using `journalctl` verbose flags:

```bash
# Show journal file information including compression
sudo journalctl --header --file /var/log/journal/$(cat /etc/machine-id)/system.journal 2>/dev/null | head -30
```

## Measure Space Savings

To understand the real-world compression benefit, compare journal disk usage before and after rotation:

```bash
# Before rotation - note the size
du -sh /var/log/journal/

# Rotate
sudo journalctl --rotate

# Check size of newly written files after some time
du -sh /var/log/journal/
```

In practice, structured log data from systemd services compresses very well. Text-heavy logs from web servers or application frameworks often compress to 20 to 30 percent of their original size. Binary or already-compressed data (base64 payloads, encrypted content) compresses less efficiently.

## Configure Per-Boot Log Limits

If compression alone is not enough to keep storage under control, combine it with tighter size limits and retention policies:

```bash
sudo nano /etc/systemd/journald.conf
```

```ini
[Journal]
Compress=yes
Storage=persistent

# Total cap on persistent journal storage
SystemMaxUse=8G

# Total cap on volatile (in-memory) journal storage
RuntimeMaxUse=256M

# Keep at least this free on the partition
SystemKeepFree=1G

# Rotate after this many journal files
SystemMaxFiles=100

# Maximum retention period
MaxRetentionSec=90day

# Sync to disk after this interval (lower values = safer, higher = better performance)
SyncIntervalSec=5m
```

## Automate Cleanup with a Timer

Rather than manually vacuuming logs, set up a systemd timer to run regular cleanup:

```bash
# Create a cleanup service
sudo nano /etc/systemd/system/journal-cleanup.service
```

```ini
[Unit]
Description=Clean up old journal logs

[Service]
Type=oneshot
# Remove journal files older than 90 days
ExecStart=/usr/bin/journalctl --vacuum-time=90d
# Keep total size under 8GB
ExecStart=/usr/bin/journalctl --vacuum-size=8G
```

```bash
# Create the timer
sudo nano /etc/systemd/system/journal-cleanup.timer
```

```ini
[Unit]
Description=Run journal cleanup weekly

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Enable and start the timer
sudo systemctl daemon-reload
sudo systemctl enable --now journal-cleanup.timer

# Verify the timer is scheduled
systemctl list-timers journal-cleanup.timer
```

## Monitor Compression Effectiveness Over Time

Add a quick check to your monitoring or cron setup to track journal storage trends:

```bash
# Script to log journal disk usage over time
cat << 'EOF' | sudo tee /usr/local/bin/journal-stats.sh
#!/bin/bash
DATE=$(date +%Y-%m-%d)
USAGE=$(journalctl --disk-usage 2>/dev/null | grep -oP '[\d.]+ [KMGT]')
echo "$DATE journal disk usage: $USAGE" >> /var/log/journal-usage.log
EOF

sudo chmod +x /usr/local/bin/journal-stats.sh

# Run daily
echo "0 6 * * * root /usr/local/bin/journal-stats.sh" | sudo tee /etc/cron.d/journal-stats
```

With compression enabled and retention limits set, journald becomes a much more storage-efficient logging solution. The configuration changes take only a few minutes but can extend how far back your logs reach significantly, which is invaluable during incident investigations.
