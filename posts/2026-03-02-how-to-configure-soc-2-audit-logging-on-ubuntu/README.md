# How to Configure SOC 2 Audit Logging on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SOC 2, Audit Logging, Compliance, Security

Description: Configure comprehensive audit logging on Ubuntu to satisfy SOC 2 Trust Service Criteria, covering user activity, privileged access, file integrity, and log retention.

---

SOC 2 (System and Organization Controls 2) compliance requires that organizations demonstrate they have controls around security, availability, processing integrity, confidentiality, and privacy. The audit logging requirements are extensive: you must be able to show who accessed what systems, when, what actions they performed, and prove that logs haven't been tampered with. Getting Ubuntu's logging infrastructure right from the start is far easier than retrofitting it later.

## What SOC 2 Requires for Logging

The Trust Service Criteria (TSC) relevant to audit logging include:

- **CC6.1** - Logical and physical access controls - log all access attempts
- **CC6.2** - Authentication mechanisms - log logins, failures, privilege escalation
- **CC6.3** - Access changes - log user account creation, modification, deletion
- **CC7.2** - Anomaly and threat detection - correlate logs to detect incidents
- **CC7.3** - Incident response - logs must support forensic investigation
- **A1.1** - Availability monitoring - log system events affecting availability

## Installing and Configuring auditd

The Linux Audit subsystem (`auditd`) is the foundation for SOC 2 logging. It captures system calls and kernel events at a level that other logging tools can't:

```bash
sudo apt update
sudo apt install auditd audispd-plugins -y
sudo systemctl enable --now auditd
```

## Audit Rules for SOC 2

Create a comprehensive audit rules file:

```bash
sudo nano /etc/audit/rules.d/99-soc2.rules
```

```text
# /etc/audit/rules.d/99-soc2.rules

# SOC 2 Audit Rules for Ubuntu

# ---- Performance settings ----
# Buffer size (increase for high-volume systems)
-b 8192

# Failure mode: 1=silent, 2=panic (use 1 for production)
-f 1

# ---- User and group management ----
# Track changes to user accounts
-a always,exit -F path=/etc/passwd -F perm=wa -F key=identity-change
-a always,exit -F path=/etc/group -F perm=wa -F key=identity-change
-a always,exit -F path=/etc/shadow -F perm=wa -F key=identity-change
-a always,exit -F path=/etc/gshadow -F perm=wa -F key=identity-change
-a always,exit -F path=/etc/sudoers -F perm=wa -F key=privileged-access
-a always,exit -F dir=/etc/sudoers.d/ -F perm=wa -F key=privileged-access

# ---- Authentication events ----
# Track login/logout
-a always,exit -F path=/var/log/wtmp -F perm=wa -F key=authentication
-a always,exit -F path=/var/log/btmp -F perm=wa -F key=authentication
-a always,exit -F path=/var/log/lastlog -F perm=wa -F key=authentication

# PAM configuration changes
-a always,exit -F dir=/etc/pam.d/ -F perm=wa -F key=pam-config

# ---- Privileged commands ----
# Log all sudo usage (syscall level)
-a always,exit -F arch=b64 -S execve -F euid=0 -F auid>=1000 -F auid!=4294967295 -k privileged-commands

# Specific privileged commands
-a always,exit -F path=/usr/bin/sudo -F perm=x -F key=privileged-sudo
-a always,exit -F path=/usr/bin/su -F perm=x -F key=privileged-su
-a always,exit -F path=/sbin/sulogin -F perm=x -F key=privileged-sulogin
-a always,exit -F path=/usr/bin/newgrp -F perm=x -F key=privileged-priv-change
-a always,exit -F path=/usr/bin/chsh -F perm=x -F key=privileged-priv-change
-a always,exit -F path=/usr/bin/passwd -F perm=x -F key=privileged-passwd

# ---- File access - sensitive files ----
-a always,exit -F path=/etc/ssh/sshd_config -F perm=rwa -F key=sshd-config-change
-a always,exit -F path=/etc/hosts -F perm=wa -F key=network-config-change
-a always,exit -F path=/etc/hostname -F perm=wa -F key=network-config-change
-a always,exit -F path=/etc/resolv.conf -F perm=wa -F key=network-config-change
-a always,exit -F path=/etc/crontab -F perm=wa -F key=scheduled-tasks
-a always,exit -F dir=/etc/cron.d/ -F perm=wa -F key=scheduled-tasks
-a always,exit -F dir=/etc/cron.daily/ -F perm=wa -F key=scheduled-tasks
-a always,exit -F dir=/etc/cron.hourly/ -F perm=wa -F key=scheduled-tasks
-a always,exit -F dir=/var/spool/cron/ -F perm=wa -F key=scheduled-tasks

# ---- System administration ----
# Track systemctl usage
-a always,exit -F path=/usr/bin/systemctl -F perm=x -F key=systemctl
-a always,exit -F path=/bin/systemctl -F perm=x -F key=systemctl

# Track kernel module operations
-a always,exit -F path=/sbin/insmod -F perm=x -F key=kernel-module
-a always,exit -F path=/sbin/rmmod -F perm=x -F key=kernel-module
-a always,exit -F path=/sbin/modprobe -F perm=x -F key=kernel-module
-a always,exit -F arch=b64 -S init_module -S delete_module -k kernel-module

# ---- Network configuration changes ----
-a always,exit -F arch=b64 -S sethostname -S setdomainname -k network-change
-a always,exit -F dir=/etc/network/ -F perm=wa -F key=network-config-change
-a always,exit -F dir=/etc/netplan/ -F perm=wa -F key=network-config-change

# ---- System calls for data exfiltration detection ----
# Log outbound connection attempts by privileged processes
-a always,exit -F arch=b64 -S connect -F euid=0 -k privileged-network-connect

# ---- File deletion and permission changes ----
-a always,exit -F arch=b64 -S unlink -S unlinkat -S rename -S renameat -F auid>=1000 -F auid!=4294967295 -k file-deletion
-a always,exit -F arch=b64 -S chmod -S fchmod -S fchmodat -F auid>=1000 -F auid!=4294967295 -k perm-change
-a always,exit -F arch=b64 -S chown -S fchown -S lchown -S fchownat -F auid>=1000 -F auid!=4294967295 -k ownership-change

# ---- Make rules immutable (requires reboot to change) ----
# Uncomment for maximum tamper resistance in production
# -e 2
```

Apply the rules:

```bash
# Reload audit rules
sudo augenrules --load

# Verify rules are loaded
sudo auditctl -l

# Check status
sudo auditctl -s
```

## Configuring auditd Retention

```bash
sudo nano /etc/audit/auditd.conf
```

```text
# Configure retention to match your SOC 2 control description and
# customer/regulatory commitments. Many organizations retain at least
# 12 months of security logs.

log_file = /var/log/audit/audit.log
log_format = RAW
log_group = root

# Maximum log file size (MB)
max_log_file = 50

# Action when log file reaches max size
# Values: ignore, syslog, suspend, rotate, keep_logs
max_log_file_action = rotate

# Number of log files to keep (50MB * 200 = 10GB)
# Adjust based on your audit volume
num_logs = 200

# Disk space threshold - warn when disk runs low
space_left = 500
space_left_action = email
action_mail_acct = root

# Panic if disk is critically low
admin_space_left = 50
admin_space_left_action = halt

# Flush frequency
flush = incremental_async
freq = 50
```

## Shipping Logs to a SIEM

SOC 2 auditors want logs stored in a tamper-evident system separate from the host. Configure log forwarding:

```bash
# Install and configure rsyslog for log forwarding
sudo apt install rsyslog -y

sudo nano /etc/rsyslog.d/50-soc2-forward.conf
```

```text
# Forward all authentication and audit events to SIEM
# Replace SIEM_HOST with your actual SIEM address

# Forward auth logs (logins, sudo, etc.)
auth,authpriv.*    @@SIEM_HOST:514

# Forward audit logs
:programname, isequal, "audit"    @@SIEM_HOST:514

# Forward all logs for complete audit trail
*.*    @@SIEM_HOST:6514

# Use TLS for log forwarding (recommended for SOC 2)
# *.* action(type="omfwd"
#           target="SIEM_HOST"
#           port="6514"
#           protocol="tcp"
#           StreamDriver="gtls"
#           StreamDriverMode="1"
#           StreamDriverAuthMode="x509/name"
#           StreamDriverPermittedPeers="siem.example.com")
```

## SSH Access Logging

Ensure SSH logs all authentication attempts in detail:

```bash
sudo nano /etc/ssh/sshd_config.d/logging.conf
```

```text
# Enhanced SSH logging for SOC 2
LogLevel VERBOSE
SyslogFacility AUTH

# Log which key was used for authentication
# (requires OpenSSH 7.3+)
PrintLastLog yes
```

```bash
sudo systemctl restart sshd
```

## Logging Privileged Access with sudo

Configure sudo to log all commands:

```bash
# Add audit logging configuration for sudo
cat << 'EOF' | sudo tee /etc/sudoers.d/99-audit-logging
# Log all sudo commands to syslog and audit
Defaults log_host, log_year, logfile="/var/log/sudo.log"
Defaults log_input, log_output
Defaults iolog_dir=/var/log/sudo-io/%{seq}
EOF

sudo chmod 440 /etc/sudoers.d/99-audit-logging
```

## Searching Audit Logs

```bash
# View recent authentication events
sudo ausearch -k authentication -ts recent

# Find all sudo command usage
sudo ausearch -k privileged-sudo -ts today

# Search by user
sudo ausearch -ua jsmith -ts today

# Search by event type
sudo ausearch -m USER_LOGIN -ts this-week

# Find failed login attempts
sudo ausearch -m USER_LOGIN -sv no -ts today

# Search for privilege escalation
sudo ausearch -k privileged-commands -ts this-month

# Generate audit report
sudo aureport --start week-ago --end today -au

# Logins report
sudo aureport --start today --login

# Failed events report
sudo aureport --start today --failed
```

## Log Integrity and Tamper Detection

SOC 2 requires evidence that logs haven't been modified:

```bash
# Configure AIDE for file integrity monitoring of log directories
sudo apt install aide -y

# Configure log file monitoring in AIDE
cat << 'EOF' | sudo tee /etc/aide/aide.conf.d/99-soc2-logs
# Monitor audit log integrity
/var/log/audit/   p+u+g+n+acl+selinux+sha256
/var/log/auth.log p+u+g+n+acl+selinux+sha256
/var/log/syslog   p+u+g+n+acl+selinux+sha256
EOF

# Initialize the AIDE database after adding your local rules
sudo aideinit
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Daily AIDE check - add to cron
echo "0 4 * * * root /usr/bin/aide --check 2>&1 | mail -s 'AIDE Integrity Report' admin@example.com" | \
    sudo tee /etc/cron.d/aide-daily
```

## Documenting Log Retention for Auditors

Create a log retention policy document for logs that are not already rotated by `auditd`:

```bash
cat << 'EOF' | sudo tee /etc/logrotate.d/soc2-audit-logs
# SOC 2 log retention
# Retain supporting logs for 52 weekly rotations.
# auditd rotates /var/log/audit/audit.log according to auditd.conf.

/var/log/sudo.log {
    rotate 52
    weekly
    compress
    delaycompress
    missingok
    notifempty
}

/var/log/auth.log {
    rotate 52
    weekly
    compress
    delaycompress
    missingok
    notifempty
}
EOF
```

## Periodic Log Review Process

Automate the daily review that auditors expect to see evidence of:

```bash
#!/bin/bash
# /usr/local/bin/daily-log-review.sh - SOC 2 daily audit log review
# Run this daily and archive results

DATE=$(date +%Y-%m-%d)
REPORT_FILE="/var/log/security-reviews/daily-${DATE}.txt"
mkdir -p /var/log/security-reviews

{
    echo "=== Daily Security Log Review: $DATE ==="
    echo "Reviewed by: automated-review@$(hostname)"
    echo ""

    echo "--- Failed Login Attempts ---"
    sudo ausearch -m USER_LOGIN -sv no -ts today 2>/dev/null | grep -c "type=USER_LOGIN" || echo "0 failures"

    echo ""
    echo "--- Privileged Command Usage ---"
    sudo ausearch -k privileged-sudo -ts today 2>/dev/null | grep "type=EXECVE" | wc -l
    echo "sudo executions today"

    echo ""
    echo "--- Account Changes ---"
    sudo ausearch -k identity-change -ts today 2>/dev/null | grep "type=CONFIG_CHANGE\|type=ADD_USER\|type=DEL_USER" || echo "No account changes"

    echo ""
    echo "--- System Changes ---"
    sudo ausearch -k systemctl -ts today 2>/dev/null | grep "type=EXECVE" | head -20

} > "$REPORT_FILE"

# Archive and optionally email the report
cat "$REPORT_FILE"
```

SOC 2 audit logging is about demonstrating a consistent, documented process over time. Auditors look for evidence that you run these reviews regularly and act on anomalies - the logs themselves matter less than showing they're actively monitored.
