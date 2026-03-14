# How to Manage systemd Journal Disk Space on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, Journal, Logging, Disk Space

Description: Control how much disk space the systemd journal consumes on RHEL by configuring retention limits, vacuuming old logs, and setting size caps.

---

The systemd journal can grow to consume significant disk space, especially on busy servers. RHEL stores journal logs in `/var/log/journal/` by default. Here is how to manage that space.

## Check Current Journal Size

```bash
# See how much space the journal is using
journalctl --disk-usage

# Example output:
# Archived and active journals take up 2.3G in the file system.
```

## Vacuum Old Logs

You can immediately reclaim space by removing old journal entries:

```bash
# Remove journal entries older than 7 days
sudo journalctl --vacuum-time=7d

# Remove journal entries until the total size is under 500 MB
sudo journalctl --vacuum-size=500M

# Remove all but the most recent 3 journal files
sudo journalctl --vacuum-files=3
```

## Configure Persistent Limits

Edit the journal configuration to set permanent size limits:

```bash
# Edit the journal configuration
sudo vi /etc/systemd/journald.conf
```

Add or modify these settings:

```ini
# /etc/systemd/journald.conf
[Journal]
# Maximum disk space the journal can use
SystemMaxUse=1G

# Maximum size of individual journal files
SystemMaxFileSize=100M

# How long to keep journal entries
MaxRetentionSec=30day

# Keep at least this much free disk space
SystemKeepFree=2G
```

Apply the changes:

```bash
# Restart the journal service
sudo systemctl restart systemd-journald

# Verify the new settings
journalctl --disk-usage
```

## Disable Persistent Journal Storage

If you want logs only in memory (lost on reboot):

```bash
# Remove the persistent journal directory
sudo rm -rf /var/log/journal

# Restart journald - it will fall back to /run/log/journal (tmpfs)
sudo systemctl restart systemd-journald

# Verify storage type
journalctl --header | grep "Storage"
```

## Forward Logs to rsyslog

If you prefer traditional log files in `/var/log/`:

```bash
# Ensure rsyslog is installed and running
sudo dnf install -y rsyslog
sudo systemctl enable --now rsyslog

# Configure journald to forward to syslog
sudo vi /etc/systemd/journald.conf
# Set: ForwardToSyslog=yes

sudo systemctl restart systemd-journald
```

## Monitor Journal Growth

```bash
# Check journal disk usage as part of regular monitoring
journalctl --disk-usage

# Watch the journal directory size directly
du -sh /var/log/journal/
```

Set journal size limits during system provisioning to prevent surprises. A good starting point for most servers is `SystemMaxUse=1G` with `MaxRetentionSec=30day`.
