# How to Manage Journal Disk Usage and Vacuum Old Logs on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, journald, Disk Usage, Log Management, systemd, Vacuum

Description: Control systemd journal disk consumption on RHEL by setting size limits, vacuuming old entries, and configuring automatic retention policies.

---

The systemd journal can grow to consume gigabytes of disk space if left unchecked. On RHEL, you should monitor journal size and configure retention policies to prevent disk space issues.

## Check Current Disk Usage

```bash
# See how much space the journal occupies
journalctl --disk-usage
# Example output: Archived and active journals take up 1.2G in the file system.

# See where journal files are stored
ls -lh /var/log/journal/
ls -lh /run/log/journal/
```

## Vacuum by Size

```bash
# Reduce journal to at most 500MB
sudo journalctl --vacuum-size=500M

# Reduce to 1GB
sudo journalctl --vacuum-size=1G

# Verify the new size
journalctl --disk-usage
```

## Vacuum by Time

```bash
# Remove all entries older than 30 days
sudo journalctl --vacuum-time=30d

# Remove entries older than 2 weeks
sudo journalctl --vacuum-time=2weeks

# Remove entries older than 6 hours (useful for testing)
sudo journalctl --vacuum-time=6h
```

## Vacuum by Number of Files

```bash
# Keep only the 5 most recent journal files
sudo journalctl --vacuum-files=5
```

## Set Permanent Size Limits

Configure journald to automatically enforce limits:

```bash
# Create a drop-in configuration
sudo mkdir -p /etc/systemd/journald.conf.d/
sudo tee /etc/systemd/journald.conf.d/size-limit.conf << 'EOF'
[Journal]
# Maximum disk space the journal can use
SystemMaxUse=1G

# Maximum size of individual journal files
SystemMaxFileSize=50M

# Keep at least this much free on the partition
SystemKeepFree=2G

# For volatile storage (/run), set separate limits
RuntimeMaxUse=200M
RuntimeMaxFileSize=20M
RuntimeKeepFree=500M
EOF

# Restart journald to apply
sudo systemctl restart systemd-journald
```

## Set Time-Based Retention

```bash
sudo tee /etc/systemd/journald.conf.d/retention.conf << 'EOF'
[Journal]
# Automatically remove entries older than 30 days
MaxRetentionSec=30day
EOF

sudo systemctl restart systemd-journald
```

## Verify Current Settings

```bash
# Show all active journald settings
systemd-analyze cat-config systemd/journald.conf

# Check journal file details
journalctl --header | head -30
```

## Automate Cleanup with a Timer

If you want more control, create a systemd timer for regular vacuuming:

```bash
# Create the service unit
sudo tee /etc/systemd/system/journal-vacuum.service << 'EOF'
[Unit]
Description=Vacuum old journal entries

[Service]
Type=oneshot
ExecStart=/usr/bin/journalctl --vacuum-time=14d --vacuum-size=1G
EOF

# Create the timer unit
sudo tee /etc/systemd/system/journal-vacuum.timer << 'EOF'
[Unit]
Description=Weekly journal vacuum

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable the timer
sudo systemctl enable --now journal-vacuum.timer
```

Setting proper journal limits from the start avoids the surprise of a full disk at 3 AM. A combination of size and time limits works best for most RHEL servers.
