# How to Clean Up systemd Journal Logs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Logging, Disk Management, Linux

Description: Manage and reclaim disk space used by systemd journal logs on Ubuntu, including size limits, time-based rotation, vacuum commands, and persistent configuration.

---

systemd's journal collects logs from the kernel, systemd services, and applications on Ubuntu. By default, it stores these logs in `/var/log/journal/` and will use up to 10% of your filesystem (or 4GB, whichever is smaller). On a busy server, the journal can accumulate gigabytes of log data, and on small VMs or containers, it can fill your root filesystem entirely.

## Checking Current Journal Size

Before cleaning anything up, assess what you're dealing with:

```bash
# Check the total disk space used by journal logs
journalctl --disk-usage

# Output example:
# Archived and active journals take up 2.4G in the filesystem.

# See where the journal files are stored
ls -lah /var/log/journal/

# List individual journal files with sizes
ls -lah /var/log/journal/$(ls /var/log/journal/)/

# Check how many journal files exist
find /var/log/journal/ -name "*.journal" | wc -l

# Get a breakdown by time period
journalctl --list-boots | head -20
```

## Immediate Cleanup with journalctl --vacuum

The `--vacuum` options let you remove old journal data immediately:

```bash
# Remove journals older than a specific time
sudo journalctl --vacuum-time=7d     # Keep only last 7 days
sudo journalctl --vacuum-time=2weeks # Keep last 2 weeks
sudo journalctl --vacuum-time=1month # Keep last month

# Remove journals until total size falls below a limit
sudo journalctl --vacuum-size=500M   # Keep only 500MB of logs
sudo journalctl --vacuum-size=1G     # Keep only 1GB
sudo journalctl --vacuum-size=100M   # Aggressive cleanup

# Remove journals beyond a certain number of files
sudo journalctl --vacuum-files=5     # Keep only 5 journal files

# Combine: time AND size (more restrictive wins)
sudo journalctl --vacuum-time=30d --vacuum-size=1G

# Verify how much space was reclaimed
journalctl --disk-usage
```

The vacuum command only removes old "archived" journal files - the current active journal is never touched.

## Configuring Persistent Limits

Rather than manually running vacuum commands, configure the journal to enforce size limits automatically. Settings go in `/etc/systemd/journald.conf`:

```bash
sudo nano /etc/systemd/journald.conf
```

```ini
# /etc/systemd/journald.conf
# Configure systemd journal behavior and size limits

[Journal]
# Where to store journals
# persistent: /var/log/journal/ (survives reboots)
# volatile: /run/log/journal/ (lost on reboot, good for containers)
# auto: persistent if /var/log/journal/ exists, otherwise volatile
Storage=persistent

# Maximum disk space the journal can use
# Use M for megabytes, G for gigabytes
SystemMaxUse=500M

# Reserve this amount of disk space for non-journal use
# Journal won't grow beyond (filesystem size - SystemKeepFree)
SystemKeepFree=1G

# Maximum size of individual journal files before rotation
SystemMaxFileSize=50M

# Maximum time to retain journal entries
MaxRetentionSec=2week

# Maximum time between journal file rotation
MaxFileSec=1month

# Rate limiting - prevent a runaway service from flooding the journal
# Limits per-service: allow burst of 10000 messages in 30 seconds
RateLimitIntervalSec=30s
RateLimitBurst=10000

# Compress journal entries
Compress=yes

# Forward to syslog (disabled by default since most distros use journal)
ForwardToSyslog=no

# Whether to sign journal files
Seal=yes
```

Apply the new configuration:

```bash
# Restart journald to apply changes
sudo systemctl restart systemd-journald

# Verify the new configuration is active
systemctl show systemd-journald | grep -E "Max|Keep|Retention"

# Run vacuum to immediately enforce the new limits
sudo journalctl --vacuum-size=500M

# Check the resulting journal size
journalctl --disk-usage
```

## Understanding Journal Storage Modes

The `Storage=` setting fundamentally changes how logs survive reboots:

```bash
# Check current storage mode
sudo cat /etc/systemd/journald.conf | grep Storage

# Volatile storage - logs in RAM, lost on reboot
# Good for containers where logs should be ephemeral
sudo mkdir -p /etc/systemd/journald.conf.d/
cat << 'EOF' | sudo tee /etc/systemd/journald.conf.d/storage.conf
[Journal]
Storage=volatile
SystemMaxUse=100M
EOF

# Persistent storage with strict limits
cat << 'EOF' | sudo tee /etc/systemd/journald.conf.d/limits.conf
[Journal]
Storage=persistent
SystemMaxUse=1G
SystemMaxFileSize=100M
MaxRetentionSec=30d
EOF

# Apply changes
sudo systemctl restart systemd-journald
```

Using drop-in files in `/etc/systemd/journald.conf.d/` is cleaner than editing the main config - they override specific settings without touching defaults.

## Querying and Filtering Logs Efficiently

Before deleting logs, you might want to archive or analyze specific service logs:

```bash
# Export logs from a specific service before clearing
journalctl -u nginx --since "1 month ago" > /backup/nginx-logs-$(date +%Y%m).txt

# Export logs from a specific time range
journalctl --since "2024-01-01" --until "2024-01-31" > /backup/january-logs.txt

# Export logs in JSON format for processing
journalctl -u myapp --output=json > /backup/myapp-logs.json

# Check which services are generating the most log volume
journalctl --since "1 hour ago" -o short | \
  awk '{print $5}' | sort | uniq -c | sort -rn | head -20

# Find services filling the journal with errors
journalctl -p err --since "1 day ago" | \
  awk '{print $5}' | sort | uniq -c | sort -rn | head -10
```

## Dealing with Rate-Limited Services

When a service generates logs faster than the rate limit allows, you'll see messages like:

```text
systemd-journald[xxx]: /dev/kmsg buffer overrun, some messages lost.
```

```bash
# Check which services are being rate-limited
journalctl -k | grep "rate limit"
journalctl | grep "Suppressed"

# Increase rate limit for noisy but important services
# Create a service override
sudo systemctl edit nginx.service
```

```ini
# Override for nginx - increase its journal rate limit
[Service]
LogRateLimitIntervalSec=0
LogRateLimitBurst=0
```

Or increase the global rate limit in `journald.conf`:

```ini
[Journal]
# 0 means unlimited (disable rate limiting)
RateLimitBurst=0
```

## Setting Up Automatic Cleanup via systemd Timer

Instead of relying only on the built-in size limits, set up a timer that runs `journalctl --vacuum` periodically:

```bash
# Create the service unit
sudo tee /etc/systemd/system/journal-vacuum.service << 'EOF'
[Unit]
Description=Vacuum systemd journal logs
Documentation=man:journalctl(1)

[Service]
Type=oneshot
ExecStart=/usr/bin/journalctl --vacuum-time=30d --vacuum-size=1G
EOF

# Create the timer
sudo tee /etc/systemd/system/journal-vacuum.timer << 'EOF'
[Unit]
Description=Run journal vacuum weekly

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable and start the timer
sudo systemctl daemon-reload
sudo systemctl enable journal-vacuum.timer
sudo systemctl start journal-vacuum.timer

# Verify the timer is scheduled
systemctl list-timers journal-vacuum.timer
```

## Container and VM-Specific Considerations

Containers typically use volatile storage to avoid filling the container overlay filesystem:

```bash
# For containers, use volatile storage and tight limits
cat << 'EOF' | sudo tee /etc/systemd/journald.conf.d/container.conf
[Journal]
Storage=volatile
RuntimeMaxUse=50M
RuntimeMaxFileSize=10M
RateLimitBurst=1000
EOF

sudo systemctl restart systemd-journald
```

For VMs with small root partitions, be aggressive with limits:

```bash
# For VMs with <20GB root partition
cat << 'EOF' | sudo tee /etc/systemd/journald.conf.d/small-vm.conf
[Journal]
Storage=persistent
SystemMaxUse=200M
SystemKeepFree=2G
SystemMaxFileSize=20M
MaxRetentionSec=7d
EOF

sudo systemctl restart systemd-journald
sudo journalctl --vacuum-size=200M
journalctl --disk-usage
```

Keeping journal logs under control is straightforward once you configure the limits. Set `SystemMaxUse` to something reasonable for your storage situation, add a `MaxRetentionSec` appropriate for your audit requirements, and restart journald. From that point on, the journal manages itself within your configured bounds.
