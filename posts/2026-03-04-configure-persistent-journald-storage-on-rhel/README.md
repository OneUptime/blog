# How to Configure Persistent Journald Storage on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Journald, Systemd, Logging, Persistent Storage, System Administration

Description: Configure systemd-journald on RHEL to store journal logs persistently on disk so they survive reboots, and learn how to control storage size and retention.

---

By default on RHEL, journald may store logs in `/run/log/journal/`, which is a tmpfs and gets wiped on every reboot. For production systems, you want persistent storage so you can review logs from previous boots.

## Check Current Storage Mode

```bash
# See where journals are stored currently
journalctl --disk-usage

# Check if persistent directory exists
ls -la /var/log/journal/
# If this directory does not exist, storage is volatile
```

## Enable Persistent Storage

```bash
# Edit the journald configuration
sudo vi /etc/systemd/journald.conf

# Set Storage to persistent
# Under the [Journal] section:
# Storage=persistent
```

Or use a drop-in configuration (recommended):

```bash
# Create a drop-in config
sudo mkdir -p /etc/systemd/journald.conf.d/
sudo tee /etc/systemd/journald.conf.d/persistent.conf << 'EOF'
[Journal]
# Store journals on disk in /var/log/journal/
Storage=persistent
EOF
```

## Create the Storage Directory and Restart

```bash
# Create the persistent journal directory
sudo mkdir -p /var/log/journal

# Set proper ownership and permissions
sudo systemd-tmpfiles --create --prefix /var/log/journal

# Restart journald to apply the change
sudo systemctl restart systemd-journald

# Verify storage is now persistent
journalctl --disk-usage
ls -la /var/log/journal/
```

## Configure Size Limits

Without limits, the journal can consume a lot of disk space.

```bash
# Create or update the drop-in config
sudo tee /etc/systemd/journald.conf.d/persistent.conf << 'EOF'
[Journal]
Storage=persistent

# Maximum total disk space for journal files
SystemMaxUse=2G

# Maximum size of individual journal files
SystemMaxFileSize=100M

# Keep at least this much free disk space
SystemKeepFree=1G

# Maximum time to keep journal entries
MaxRetentionSec=30day
EOF

# Restart to apply
sudo systemctl restart systemd-journald
```

## Verify Previous Boots Are Available

```bash
# List all available boots
journalctl --list-boots

# View logs from the previous boot
journalctl -b -1

# View logs from two boots ago
journalctl -b -2
```

## Storage Options Explained

```bash
# Storage=volatile  -> only in /run/log/journal/ (lost on reboot)
# Storage=persistent -> stored in /var/log/journal/ (survives reboot)
# Storage=auto -> persistent if /var/log/journal/ exists, otherwise volatile
# Storage=none -> all logs are discarded
```

## Manually Reclaim Space

```bash
# Reduce journal to a maximum of 500MB
sudo journalctl --vacuum-size=500M

# Remove entries older than 14 days
sudo journalctl --vacuum-time=14d

# Check usage after cleanup
journalctl --disk-usage
```

Persistent journal storage is essential for any production RHEL server. It lets you investigate issues that caused crashes or occurred during previous boot cycles.
