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
-w /etc/passwd -p wa -k identity-change
-w /etc/group -p wa -k identity-change
-w /etc/shadow -p wa -k identity-change
-w /etc/gshadow -p wa -k identity-change
-w /etc/sudoers -p wa -k privileged-access
-w /etc/sudoers.d/ -p wa -k privileged-access

# ---- Authentication events ----
# Track login/logout
-w /var/log/wtmp -p wa -k authentication
-w /var/log/btmp -p wa -k authentication
-w /var/log/lastlog -p wa -k authentication
-w /var/run/faillock/ -p wa -k authentication

# PAM configuration changes
-w /etc/pam.d/ -p wa -k pam-config

# ---- Privileged commands ----
# Log all sudo usage (syscall level)
-a always,exit -F arch=b64 -S execve -F euid=0 -F auid>=1000 -F auid!=4294967295 -k privileged-commands

# Specific privileged commands
-w /usr/bin/sudo -p x -k privileged-sudo
-w /usr/bin/su -p x -k privileged-su
-w /sbin/sulogin -p x -k privileged-sulogin
-w /usr/bin/newgrp -p x -k privileged-priv-change
-w /usr/bin/chsh -p x -k privileged-priv-change
-w /usr/bin/passwd -p x -k privileged-passwd

# ---- File access - sensitive files ----
-w /etc/ssh/sshd_config -p rwa -k sshd-config-change
-w /etc/hosts -p wa -k network-config-change
-w /etc/hostname -p wa -k network-config-change
-w /etc/resolv.conf -p wa -k network-config-change
-w /etc/crontab -p wa -k scheduled-tasks
-w /etc/cron.d/ -p wa -k scheduled-tasks
-w /etc/cron.daily/ -p wa -k scheduled-tasks
-w /etc/cron.hourly/ -p wa -k scheduled-tasks
-w /var/spool/cron/ -p wa -k scheduled-tasks

# ---- System administration ----
# Track systemctl usage
-w /usr/bin/systemctl -p x -k systemctl
-w /bin/systemctl -p x -k systemctl

# Track kernel module operations
-w /sbin/insmod -p x -k kernel-module
-w /sbin/rmmod -p x -k kernel-module
-w /sbin/modprobe -p x -k kernel-module
-a always,exit -F arch=b64 -S init_module -S delete_module -k kernel-module

# ---- Network configuration changes ----
-a always,exit -F arch=b64 -S sethostname -S setdomainname -k network-change
-w /etc/network/ -p wa -k network-config-change
-w /etc/netplan/ -p wa -k network-config-change

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
# SOC 2 requires retaining logs for at least 1 year (12 months minimum)
# Configure log rotation accordingly

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

# Load modules for TLS
module(load="omfwd")

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
sudo ausearch -m USER_LOGIN -ts "start of week"

# Find failed login attempts
sudo ausearch -m USER_LOGIN -sv no -ts today

# Search for privilege escalation
sudo ausearch -k privileged-commands -ts "this month"

# Generate audit report
sudo aureport --start "last month" --end "this month" -au

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

# Initialize the AIDE database
sudo aideinit
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Configure log file monitoring in AIDE
cat << 'EOF' | sudo tee /etc/aide/aide.conf.d/99-soc2-logs
# Monitor audit log integrity
/var/log/audit/   p+u+g+n+acl+selinux+sha256
/var/log/auth.log p+u+g+n+acl+selinux+sha256
/var/log/syslog   p+u+g+n+acl+selinux+sha256
EOF

# Daily AIDE check - add to cron
echo "0 4 * * * root /usr/sbin/aide --check 2>&1 | mail -s 'AIDE Integrity Report' admin@example.com" | \
    sudo tee /etc/cron.d/aide-daily
```

## Documenting Log Retention for Auditors

Create a log retention policy document that maps to your technical controls:

```bash
cat << 'EOF' | sudo tee /etc/logrotate.d/soc2-audit-logs
# SOC 2 compliant log retention
# Retain audit logs for 13 months (1 year + 1 month buffer)

/var/log/audit/audit.log {
    rotate 52      # 52 weekly rotations = 1 year
    weekly
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        /usr/bin/killall -HUP auditd
    endscript
}

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
