# How to Configure auditd Rules for File Access Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, auditd, Compliance, Monitoring

Description: Configure auditd rules on Ubuntu to monitor file access and modifications, creating an audit trail for security compliance and incident investigation.

---

The Linux Audit System (`auditd`) provides a kernel-level mechanism for logging security-relevant events. Unlike application-level logging, auditd hooks into the kernel and captures events before they can be intercepted or modified by user-space processes. This makes it suitable for security compliance frameworks like PCI DSS, HIPAA, and SOC 2, which require evidence of file access monitoring.

This guide focuses specifically on file access monitoring rules - watching who reads, writes, or executes specific files and directories.

## Installing and Starting auditd

```bash
# Install auditd
sudo apt update
sudo apt install auditd audispd-plugins -y

# Enable and start the service
sudo systemctl enable auditd
sudo systemctl start auditd

# Verify auditd is running
sudo systemctl status auditd
sudo auditctl -s    # Show audit daemon status
```

## Understanding auditd Rule Syntax

Audit rules use the `auditctl` command or are placed in `/etc/audit/rules.d/` files. The basic syntax for file watch rules:

```bash
auditctl -w /path/to/watch -p permissions -k key_name
```

Where permissions can be:
- `r` - read access
- `w` - write access
- `x` - execute access
- `a` - attribute changes (ownership, permissions, timestamps)

The key (`-k`) is a label that lets you search for related events in logs.

## Creating File Watch Rules

### Rule Files

Place rules in `/etc/audit/rules.d/` as `.rules` files. The system processes them in alphabetical order. A common convention uses numbered prefixes:

```bash
sudo nano /etc/audit/rules.d/30-file-access.rules
```

### Basic File Watches

```bash
# Watch a specific file for all access types
-w /etc/passwd -p rwa -k identity-files
-w /etc/shadow -p rwa -k identity-files
-w /etc/group -p rwa -k identity-files
-w /etc/gshadow -p rwa -k identity-files

# Watch SSH configuration
-w /etc/ssh/sshd_config -p rwa -k ssh-config

# Watch sudo configuration
-w /etc/sudoers -p rwa -k sudoers-change
-w /etc/sudoers.d/ -p rwa -k sudoers-change
```

### Monitoring Directory Access

```bash
# Watch a directory and all files in it (recursive is NOT supported by auditctl directly)
# -w on a directory monitors the directory itself and immediate children
-w /var/log -p rwa -k log-access
-w /etc -p rwa -k etc-changes

# For web application files
-w /var/www/html -p rwa -k web-files

# For application configuration
-w /opt/myapp/config -p rwa -k app-config
```

Note: `auditctl -w` on a directory does not recursively watch subdirectories. For subdirectory monitoring, use `-a` rules with `path` fields (covered below).

### Monitoring Specific Users

Watch for specific users reading sensitive files:

```bash
# Audit rules in /etc/audit/rules.d/40-user-access.rules

# Watch file access by root (uid=0)
-a always,exit -F path=/etc/shadow -F uid=0 -F perm=r -k root-shadow-read

# Watch for any user reading the SSH private keys
-a always,exit -F path=/home/admin/.ssh/id_rsa -F perm=r -k ssh-key-read

# Watch file access by a specific user (uid=1001)
-a always,exit -F path=/var/www/html -F uid=1001 -F perm=w -k specific-user-writes
```

### Monitoring Writes to Critical System Files

```bash
# /etc/audit/rules.d/50-critical-files.rules

# Kernel module loading configuration
-w /etc/modprobe.d/ -p wa -k modprobe-config
-w /etc/modules -p wa -k modprobe-config

# Cron configuration
-w /etc/cron.d/ -p wa -k cron-config
-w /etc/cron.daily/ -p wa -k cron-config
-w /etc/cron.hourly/ -p wa -k cron-config
-w /var/spool/cron/crontabs/ -p wa -k cron-config
-w /etc/crontab -p wa -k cron-config

# Login configuration
-w /etc/login.defs -p wa -k login-config
-w /etc/pam.d/ -p wa -k pam-config
-w /etc/security/ -p wa -k security-config

# Systemd service files
-w /etc/systemd/system/ -p wa -k systemd-services
-w /lib/systemd/system/ -p wa -k systemd-services
```

### Monitoring Read Access to Sensitive Data

```bash
# /etc/audit/rules.d/60-sensitive-reads.rules

# Certificate and key files
-a always,exit -F path=/etc/ssl/private -F perm=r -k ssl-key-access

# Database password files
-a always,exit -F path=/etc/mysql/debian.cnf -F perm=r -k db-creds

# Application secrets
-a always,exit -F path=/etc/myapp/secrets.conf -F perm=r -k app-secrets

# Web server private keys
-a always,exit -F path=/etc/nginx/ssl -F perm=r -k nginx-ssl-access
```

## Applying the Rules

Load the rules from the rules.d directory:

```bash
# Load all rules from /etc/audit/rules.d/
sudo augenrules --load

# Or reload the service
sudo service auditd reload

# Verify rules are loaded
sudo auditctl -l

# Check rule count
sudo auditctl -l | wc -l
```

## Testing Rules

Trigger an event to verify monitoring works:

```bash
# Trigger a watched file access
cat /etc/passwd

# Search for events related to this access
sudo ausearch -k identity-files -ts recent

# Example output includes:
# time->... type=SYSCALL ... comm="cat" exe="/bin/cat" key="identity-files"
# type=PATH ... name="/etc/passwd" ...
```

## Audit Log Format

The audit log is at `/var/log/audit/audit.log`. Each event consists of multiple records:

```bash
# View raw audit log
sudo tail -f /var/log/audit/audit.log

# Example records for a file read:
# type=SYSCALL msg=audit(timestamp): arch=c000003e syscall=257 success=yes exit=3
#   a0=ffffff9c a1=7fff... a2=0 a3=0 items=1 ppid=1234 pid=5678
#   uid=1000 gid=1000 euid=1000 ... comm="cat" exe="/bin/cat" key="identity-files"
# type=PATH msg=audit(timestamp): item=0 name="/etc/passwd" inode=... dev=...
#   mode=0100644 ouid=0 ogid=0 rdev=00:00 nametype=NORMAL cap_...
```

Key fields:
- `uid/euid`: Real and effective user IDs
- `comm`: Command name
- `exe`: Full path to executable
- `key`: The `-k` label from the rule
- `name`: The file path in PATH records

## Making Rules Immutable

Once satisfied with the configuration, lock the rules to prevent modification by unprivileged processes:

```bash
# Add to the end of your rules file
-e 2
```

With `-e 2` set, audit rules cannot be changed until the system reboots. This prevents an attacker with root access from disabling audit logging after compromise. Place this as the last line in your rules:

```bash
# /etc/audit/rules.d/99-finalize.rules
# Make rules immutable - requires reboot to change
-e 2
```

## Common Compliance Rule Sets

For CIS benchmark compliance, a minimal file access ruleset:

```bash
sudo nano /etc/audit/rules.d/70-cis-file-access.rules
```

```bash
# CIS Level 1 - Audit file access
# 4.1.6 - Ensure events that modify the system's network environment are collected
-a always,exit -F arch=b64 -S sethostname -S setdomainname -k system-locale
-a always,exit -F arch=b32 -S sethostname -S setdomainname -k system-locale
-w /etc/issue -p wa -k system-locale
-w /etc/issue.net -p wa -k system-locale
-w /etc/hosts -p wa -k system-locale
-w /etc/network -p wa -k system-locale

# 4.1.8 - Ensure login and logout events are collected
-w /var/log/faillog -p wa -k logins
-w /var/log/lastlog -p wa -k logins
-w /var/log/tallylog -p wa -k logins

# 4.1.9 - Ensure session initiation information is collected
-w /var/run/utmp -p wa -k session
-w /var/log/wtmp -p wa -k logins
-w /var/log/btmp -p wa -k logins

# 4.1.14 - Ensure changes to system administration scope (sudoers) are collected
-w /etc/sudoers -p wa -k scope
-w /etc/sudoers.d/ -p wa -k scope
```

## Rotating and Managing Audit Logs

Configure log rotation in `/etc/audit/auditd.conf`:

```bash
sudo nano /etc/audit/auditd.conf
```

```ini
# Log file location and rotation
log_file = /var/log/audit/audit.log
log_format = ENRICHED
max_log_file = 100          # Max size per log file in MB
num_logs = 10               # Keep 10 rotated logs
max_log_file_action = ROTATE

# What to do when disk is full
disk_full_action = SYSLOG
disk_error_action = SYSLOG

# Flush mode
flush = INCREMENTAL_ASYNC
freq = 50
```

## Verifying Log Completeness

Check that no audit events are being lost:

```bash
# Check for lost events
sudo auditctl -s | grep lost
# Should be 0 or very low

# Check backlog queue
sudo auditctl -s | grep backlog
# Monitor during high-activity periods

# If backlog is large, increase it
sudo auditctl -b 8192    # Increase backlog limit to 8192 events
```

Add to rules file for persistence:

```bash
# /etc/audit/rules.d/10-buffering.rules
-b 8192
```

Auditd file access monitoring provides an immutable record of who accessed sensitive files and when. Combined with centralized log shipping (rsyslog, Filebeat), it forms a core component of a compliance-ready Ubuntu server configuration.
