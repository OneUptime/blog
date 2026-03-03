# How to Write auditd Rules for Monitoring File Access on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, auditd, Security, Audit Logging, Compliance

Description: Practical guide to writing auditd rules on Ubuntu for monitoring file access, system calls, and user actions, including rule syntax, key management, log analysis, and compliance configurations.

---

The Linux Audit system (auditd) records detailed information about system events at the kernel level. Unlike application-level logs, auditd captures what actually happened in the kernel - which system calls were made, who made them, what files were accessed, and what the result was. This makes it invaluable for forensic investigation, compliance requirements (PCI-DSS, HIPAA, CIS benchmarks), and detecting suspicious behavior.

## How auditd Works

The audit subsystem has two parts:
1. **Kernel audit module**: Intercepts system calls and generates audit events
2. **auditd daemon**: Receives events from the kernel and writes them to `/var/log/audit/audit.log`

Rules tell the kernel what to watch. When a monitored event occurs, an audit record is created.

## Installation

```bash
sudo apt-get update
sudo apt-get install -y auditd audispd-plugins

sudo systemctl enable auditd
sudo systemctl start auditd

# Verify auditd is running
sudo auditctl -s
```

## Rule Types

Three types of audit rules:

1. **Control rules**: Configure the audit system itself (`-b` for buffer, `-f` for failure mode)
2. **File watch rules**: Monitor specific files or directories (`-w`)
3. **System call rules**: Monitor specific system calls (`-a`)

## Basic Syntax

### File Watch Rule Syntax

```bash
auditctl -w /path/to/file -p permissions -k keyname

# Permissions flags:
# r = read
# w = write
# x = execute
# a = attribute change (chmod, chown, etc.)
```

### System Call Rule Syntax

```bash
auditctl -a action,list -S syscall -F field=value -k keyname

# action: always (log) or never (suppress)
# list: exit (after syscall), entry (before), task, exclude
# -S: system call name or number
# -F: filter field (pid, uid, auid, arch, etc.)
# -k: key for searching logs later
```

## Writing Rules to /etc/audit/rules.d/

Rules in `/etc/audit/rules.d/` persist across reboots. Files are processed alphabetically:

```bash
# Create a rules file
sudo tee /etc/audit/rules.d/50-security.rules << 'EOF'
# ============================================================
# AUDIT RULES - Security monitoring
# ============================================================

# Increase the default buffer size for high-activity systems
-b 8192

# Failure mode: 1 = printk, 2 = panic (use 1 for production)
-f 1

# ============================================================
# AUTHENTICATION AND AUTHORIZATION
# ============================================================

# Monitor password file changes
-w /etc/passwd -p wa -k auth_changes
-w /etc/shadow -p wa -k auth_changes
-w /etc/group -p wa -k auth_changes
-w /etc/gshadow -p wa -k auth_changes

# Monitor sudo configuration
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers

# Monitor PAM configuration
-w /etc/pam.d/ -p wa -k pam_config

# Track who uses sudo and su
-w /bin/su -p x -k privilege_escalation
-w /usr/bin/sudo -p x -k privilege_escalation
-w /usr/bin/sudoedit -p x -k privilege_escalation

# ============================================================
# SSH CONFIGURATION
# ============================================================

-w /etc/ssh/sshd_config -p wa -k ssh_config
-w /etc/ssh/ssh_config -p wa -k ssh_config
-w /root/.ssh -p wa -k ssh_keys
-a always,exit -F dir=/home -F name=.ssh -F op=create -k ssh_keys

# ============================================================
# SYSTEM BINARIES
# ============================================================

# Monitor execution of critical binaries
-w /sbin/insmod -p x -k kernel_modules
-w /sbin/rmmod -p x -k kernel_modules
-w /sbin/modprobe -p x -k kernel_modules

# Monitor iptables/nftables changes
-w /sbin/iptables -p x -k firewall
-w /sbin/ip6tables -p x -k firewall
-w /sbin/nft -p x -k firewall

# ============================================================
# CRON AND SCHEDULED TASKS
# ============================================================

-w /etc/cron.allow -p wa -k cron
-w /etc/cron.deny -p wa -k cron
-w /etc/cron.d/ -p wa -k cron
-w /etc/cron.daily/ -p wa -k cron
-w /etc/cron.hourly/ -p wa -k cron
-w /etc/cron.monthly/ -p wa -k cron
-w /etc/cron.weekly/ -p wa -k cron
-w /etc/crontab -p wa -k cron
-w /var/spool/cron/ -p wa -k cron

# ============================================================
# NETWORK CONFIGURATION
# ============================================================

-w /etc/hosts -p wa -k network_config
-w /etc/hostname -p wa -k network_config
-w /etc/network/ -p wa -k network_config
-w /etc/sysconfig/network -p wa -k network_config

# ============================================================
# SYSTEM CALLS: FILE OPERATIONS
# ============================================================

# Monitor file deletion
-a always,exit -F arch=b64 -S unlink -S unlinkat -S rename -S renameat -k file_deletion
-a always,exit -F arch=b32 -S unlink -S unlinkat -S rename -S renameat -k file_deletion

# Monitor file permission changes
-a always,exit -F arch=b64 -S chmod -S fchmod -S fchmodat -k file_permissions
-a always,exit -F arch=b32 -S chmod -S fchmod -S fchmodat -k file_permissions

# Monitor ownership changes
-a always,exit -F arch=b64 -S chown -S fchown -S lchown -S fchownat -k file_ownership
-a always,exit -F arch=b32 -S chown -S fchown -S lchown -S fchownat -k file_ownership

# Monitor access to sensitive files (even if not changed)
-a always,exit -F arch=b64 -S open -F dir=/etc -F exit=-EACCES -k unauthorized_access
-a always,exit -F arch=b64 -S open -F dir=/etc -F exit=-EPERM -k unauthorized_access

# ============================================================
# PROCESS AND EXECUTION MONITORING
# ============================================================

# Monitor process execution
-a always,exit -F arch=b64 -S execve -k exec_commands
-a always,exit -F arch=b32 -S execve -k exec_commands

# Monitor setuid execution
-a always,exit -F arch=b64 -S setuid -F a0=0 -k privilege_escalation
-a always,exit -F arch=b64 -S setgid -F a0=0 -k privilege_escalation

# ============================================================
# IMMUTABLE FLAG (must be last - prevents rule changes without reboot)
# -e 2
EOF
```

## Loading Rules

```bash
# Load rules from files
sudo augenrules --load

# Verify rules are loaded
sudo auditctl -l

# Check rule count
sudo auditctl -l | wc -l

# View current audit status
sudo auditctl -s
```

## Searching Audit Logs

`ausearch` is the primary tool for querying audit logs:

```bash
# Search by key (what you defined with -k)
sudo ausearch -k auth_changes

# Search by key with time filter
sudo ausearch -k sudoers --start yesterday --end now

# Search for specific file
sudo ausearch -f /etc/passwd

# Search by user
sudo ausearch -ua 1000  # audit UID (auid = actual user before sudo)

# Search by executable
sudo ausearch -x /bin/su

# Search for failed access attempts
sudo ausearch -k unauthorized_access

# Output in interpretable format
sudo ausearch -k auth_changes -i

# Output as JSON
sudo ausearch -k auth_changes --format json
```

## Understanding Audit Records

A raw audit log entry looks like:

```text
type=SYSCALL msg=audit(1709389200.123:456): arch=c000003e syscall=257 success=no exit=-13 a0=ffffff9c a1=7f1234567890 a2=0 a3=0 items=1 ppid=1234 pid=5678 auid=1000 uid=0 gid=0 euid=0 suid=0 fsuid=0 egid=0 sgid=0 fsgid=0 tty=pts0 ses=1 comm="cat" exe="/bin/cat" subj=unconfined key="unauthorized_access"
```

Decode it with:

```bash
# ausearch with -i flag interprets hex values
sudo ausearch -k unauthorized_access -i | head -20

# aureport generates summary reports
sudo aureport --summary

# Report on failed accesses
sudo aureport --failed

# Report on authentication events
sudo aureport --auth

# Report on executable usage
sudo aureport --executable
```

## Generating Reports

```bash
# Summary of all events in the last 24 hours
sudo aureport --start yesterday --end now --summary

# Authentication report
sudo aureport --auth --start recent

# Files accessed in failed operations
sudo aureport -f --start yesterday --end now --failed

# Users running commands via sudo
sudo ausearch -x /usr/bin/sudo -i | grep "auid=" | awk '{for(i=1;i<=NF;i++) if ($i~/^auid=/) print $i}' | sort | uniq -c | sort -rn
```

## CIS Benchmark Audit Rules

For CIS (Center for Internet Security) compliance, use the published ruleset:

```bash
# Download CIS rules
wget https://github.com/linux-audit/audit-userspace/raw/master/rules/30-pci-dss-v31.rules

# Or install from package (includes PCI, NISPOM, STIG, OSPP profiles)
sudo apt-get install -y auditd

# Pre-built rulesets are in:
ls /usr/share/doc/auditd/examples/

# Copy the one that matches your compliance requirement
sudo cp /usr/share/doc/auditd/examples/rules/30-pci-dss-v31.rules /etc/audit/rules.d/
sudo augenrules --load
```

## Monitoring Specific Directories

```bash
# Watch a web application's config directory
sudo auditctl -w /var/www/html -p wa -k webapp_changes

# Monitor a database data directory for unauthorized access
sudo auditctl -w /var/lib/mysql -p r -k db_access

# Track all writes to a secrets directory
sudo auditctl -w /etc/ssl/private -p wa -k ssl_keys
```

## Tuning for Performance

Audit rules have performance implications. Monitor access at high rates generates many events:

```bash
# Check current events per second
sudo auditctl -s | grep backlog

# View audit statistics
sudo auditd -s

# Exclude noisy processes from monitoring
# Exclude specific users (e.g., monitoring agents)
-a never,exit -F uid=nagios
-a never,exit -F uid=prometheus

# Exclude specific commands from exec monitoring
-a never,exit -F exe=/usr/bin/python3 -S execve
```

## Log Management

```bash
# Configure log rotation in /etc/audit/auditd.conf
sudo nano /etc/audit/auditd.conf

# Key settings:
# max_log_file = 100           (MB per log file)
# num_logs = 10               (number of rotated logs to keep)
# max_log_file_action = ROTATE (rotate when size reached)
# space_left_action = SYSLOG  (alert when disk space is low)
# admin_space_left_action = HALT (halt if critically low)

# Restart after changes
sudo systemctl restart auditd

# Manually rotate logs
sudo killall -HUP auditd
```

## Sending Audit Logs to Remote Syslog

```bash
# Configure audisp to forward to syslog
sudo tee /etc/audisp/plugins.d/syslog.conf << 'EOF'
active = yes
direction = out
path = builtin_syslog
type = builtin
args = LOG_INFO LOG_DAEMON
format = string
EOF

sudo systemctl restart auditd
```

Auditd provides the most detailed view of system activity available on Linux. Paired with a SIEM (Security Information and Event Management) system that ingests the audit logs, you get full visibility into system activity for both real-time alerting and forensic investigation.
