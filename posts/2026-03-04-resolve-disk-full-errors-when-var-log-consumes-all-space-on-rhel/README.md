# How to Resolve 'Disk Full' Errors When /var/log Consumes All Space on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Disk Space, Logging, Troubleshooting, Linux

Description: Free up disk space when /var/log fills the partition on RHEL, and configure log rotation to prevent it from happening again.

---

A full /var/log partition can prevent services from starting, cause applications to crash, and block system logging. Here is how to fix it and prevent recurrence.

## Step 1: Identify What is Using the Space

```bash
# Check overall disk usage
df -h

# Find the largest files in /var/log
sudo du -ah /var/log | sort -rh | head -20

# Common culprits:
# /var/log/messages or /var/log/syslog
# /var/log/audit/audit.log
# /var/log/journal/
# Application-specific logs
```

## Step 2: Free Space Immediately

```bash
# Truncate large log files (clears content but keeps the file)
sudo truncate -s 0 /var/log/messages
sudo truncate -s 0 /var/log/secure

# Do NOT use rm on active log files - the space will not be freed
# until the process holding the file descriptor closes it

# If you must remove old rotated logs
sudo rm -f /var/log/messages-20250*
sudo rm -f /var/log/secure-20250*

# Clear the systemd journal
sudo journalctl --vacuum-size=100M
```

## Step 3: Find Deleted but Open Files

```bash
# Processes may hold file descriptors to deleted files
# These still consume disk space
sudo lsof +L1 | grep /var/log

# Restart the process to release the file descriptor
sudo systemctl restart rsyslog
```

## Step 4: Configure Log Rotation

```bash
# Check the existing logrotate configuration
cat /etc/logrotate.conf

# Edit the main config or add per-service configs
sudo vi /etc/logrotate.d/syslog
```

Example configuration:

```
/var/log/messages /var/log/secure /var/log/maillog /var/log/cron {
    daily
    rotate 7
    maxsize 100M
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        /usr/bin/systemctl kill -s HUP rsyslog.service >/dev/null 2>&1 || true
    endscript
}
```

## Step 5: Configure Journal Size Limits

```bash
# Edit the journal configuration
sudo vi /etc/systemd/journald.conf

# Set a maximum size
# [Journal]
# SystemMaxUse=500M
# MaxRetentionSec=14day

# Restart journald
sudo systemctl restart systemd-journald
```

## Step 6: Configure Audit Log Limits

```bash
# Edit the audit daemon config
sudo vi /etc/audit/auditd.conf

# Set rotation:
# max_log_file = 50
# num_logs = 5
# max_log_file_action = ROTATE

sudo systemctl restart auditd
```

## Step 7: Move /var/log to a Separate Partition

For a permanent solution, give /var/log its own partition:

```bash
# Create a new logical volume for /var/log
sudo lvcreate -L 10G -n lv_varlog vg_root
sudo mkfs.xfs /dev/vg_root/lv_varlog

# Add to fstab
echo "/dev/vg_root/lv_varlog /var/log xfs defaults 0 0" | sudo tee -a /etc/fstab
```

A separate /var/log partition prevents log growth from affecting the root filesystem.
