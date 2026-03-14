# How to Install and Configure auditd on RHEL for System Auditing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Auditd, Auditing, Security, Compliance, Linux

Description: Set up the Linux Audit daemon (auditd) on RHEL to monitor system activity, track security events, and meet compliance requirements.

---

The Linux Audit system, centered around the `auditd` daemon, provides detailed tracking of system events for security monitoring and compliance. On RHEL, auditd is the standard tool for recording who did what, when, and how on your system. This guide covers installation, basic configuration, and getting started with audit rules.

## What auditd Monitors

```mermaid
flowchart TD
    A[auditd - Linux Audit Daemon] --> B[File Access]
    A --> C[System Calls]
    A --> D[User Commands]
    A --> E[Authentication Events]
    A --> F[Network Connections]
    A --> G[Configuration Changes]

    B --> H[/var/log/audit/audit.log]
    C --> H
    D --> H
    E --> H
    F --> H
    G --> H
```

## Installing auditd

On RHEL, the audit package is usually installed by default. If it is not present:

```bash
# Install the audit packages
sudo dnf install audit audit-libs

# Verify the installation
rpm -qa | grep audit
```

## Starting and Enabling auditd

```bash
# Start the audit daemon
sudo systemctl start auditd

# Enable it to start at boot
sudo systemctl enable auditd

# Check the status
sudo systemctl status auditd
```

Note: auditd is special compared to most systemd services. You should not use `systemctl restart auditd` because it can cause audit events to be lost. Instead, use:

```bash
# Reload auditd configuration without restarting
sudo service auditd reload

# Or use the auditctl command to signal a reload
sudo auditctl -R /etc/audit/rules.d/audit.rules
```

## Understanding the Configuration Files

The main configuration files are:

| File | Purpose |
|------|---------|
| `/etc/audit/auditd.conf` | Daemon configuration (log file, size, rotation) |
| `/etc/audit/rules.d/*.rules` | Audit rules (what to monitor) |
| `/etc/audit/audit.rules` | Compiled rules file (generated from rules.d/) |

## Configuring auditd.conf

Edit the main configuration file to set up logging behavior:

```bash
sudo vi /etc/audit/auditd.conf
```

Key settings to review and adjust:

```ini
# /etc/audit/auditd.conf

# Where to write audit logs
log_file = /var/log/audit/audit.log

# Log file format (RAW or ENRICHED)
# ENRICHED adds resolved user/group names
log_format = ENRICHED

# Maximum size of a single log file in MB
max_log_file = 50

# Number of log files to keep
num_logs = 10

# Action when max log size is reached
max_log_file_action = ROTATE

# Action when disk space is running low
space_left = 75
space_left_action = SYSLOG
admin_space_left = 50
admin_space_left_action = SUSPEND

# Action when disk is full
disk_full_action = SUSPEND
disk_error_action = SUSPEND

# Flush strategy: INCREMENTAL_ASYNC is recommended for performance
flush = INCREMENTAL_ASYNC
freq = 50
```

After editing, reload the configuration:

```bash
sudo service auditd reload
```

## Writing Basic Audit Rules

Audit rules define what the system monitors. There are three types of rules:

1. **Control rules** - configure the audit system behavior
2. **File system rules (watches)** - monitor file/directory access
3. **System call rules** - monitor specific system calls

### File System Watch Rules

```bash
# Watch the /etc/passwd file for any changes
# -w = watch path, -p = permissions to watch, -k = key for searching
sudo auditctl -w /etc/passwd -p wa -k identity_changes

# Watch the /etc/shadow file
sudo auditctl -w /etc/shadow -p wa -k identity_changes

# Watch the sudoers file and directory
sudo auditctl -w /etc/sudoers -p wa -k sudoers_changes
sudo auditctl -w /etc/sudoers.d/ -p wa -k sudoers_changes
```

Permission flags:
- `r` - read
- `w` - write
- `x` - execute
- `a` - attribute change

### System Call Rules

```bash
# Monitor all file deletions by root
# -a = add rule, -S = system call, -F = field filter
sudo auditctl -a always,exit -F arch=b64 -S unlink -S unlinkat -S rename -S renameat -F auid=0 -k root_file_delete

# Monitor changes to system time
sudo auditctl -a always,exit -F arch=b64 -S adjtimex -S settimeofday -k time_change
sudo auditctl -a always,exit -F arch=b64 -S clock_settime -F a0=0x0 -k time_change
```

## Making Rules Persistent

Rules added with `auditctl` are lost on reboot. To make them persistent, create rule files in `/etc/audit/rules.d/`:

```bash
# Create a custom rules file
sudo tee /etc/audit/rules.d/custom.rules << 'EOF'
# Delete all previous rules
-D

# Set the buffer size for audit messages
-b 8192

# Set failure mode (1=printk, 2=panic)
-f 1

# Monitor identity files
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/group -p wa -k identity
-w /etc/gshadow -p wa -k identity

# Monitor sudo configuration
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers

# Monitor SSH configuration
-w /etc/ssh/sshd_config -p wa -k sshd_config

# Monitor audit configuration
-w /etc/audit/ -p wa -k audit_config
-w /etc/audit/auditd.conf -p wa -k audit_config

# Monitor cron configuration
-w /etc/crontab -p wa -k cron
-w /etc/cron.d/ -p wa -k cron
-w /var/spool/cron/ -p wa -k cron
EOF
```

Load the new rules:

```bash
# Generate the compiled rules file
sudo augenrules --load

# Verify the rules are loaded
sudo auditctl -l
```

## Verifying auditd is Working

```bash
# Check current audit status
sudo auditctl -s

# View the number of audit rules loaded
sudo auditctl -l | wc -l

# Trigger a test event by modifying a watched file
sudo touch /etc/passwd

# Search for the event
sudo ausearch -k identity -ts recent
```

## Viewing Audit Logs

```bash
# View the raw audit log
sudo tail -20 /var/log/audit/audit.log

# Search for specific events by key
sudo ausearch -k identity

# Generate a summary report
sudo aureport --summary

# View a login report
sudo aureport --login
```

## Summary

Setting up auditd on RHEL gives you a comprehensive system auditing capability. Install the audit package, configure the daemon settings in `auditd.conf`, write rules to monitor the files and events you care about, and make those rules persistent in `/etc/audit/rules.d/`. With auditd running, you will have a detailed record of system activity for security monitoring and compliance auditing.
