# How to Configure Auditbeat for Security Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Auditbeat, Elasticsearch, Monitoring

Description: Step-by-step guide to setting up Auditbeat on Ubuntu for tracking file integrity, user logins, process execution, and system calls for security monitoring.

---

Auditbeat is an Elastic Beat that collects audit data from the Linux kernel's audit framework. Unlike traditional log-based security tools, Auditbeat hooks directly into the audit subsystem and ships structured events to Elasticsearch. This makes it well-suited for detecting unauthorized file modifications, tracking privileged command execution, and satisfying compliance requirements like PCI-DSS and HIPAA.

## How Auditbeat Works

Auditbeat operates through two primary modules:

- **Auditd module** - reads events from the Linux kernel audit framework (via `netlink`)
- **File Integrity module (FIM)** - monitors specified directories for file changes

The auditd module effectively replaces `auditd` daemon on the host - you should not run both simultaneously.

## Prerequisites

- Ubuntu 20.04 or 22.04
- Elasticsearch 8.x cluster
- sudo or root access
- The `auditd` service should be stopped if running

## Installation

```bash
# Add the Elastic APT repository (if not already added)
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | \
  sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] \
  https://artifacts.elastic.co/packages/8.x/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/elastic-8.x.list

sudo apt-get update && sudo apt-get install -y auditbeat

# Stop auditd if it's running - Auditbeat replaces it
sudo systemctl stop auditd
sudo systemctl disable auditd
```

## Main Configuration

Edit `/etc/auditbeat/auditbeat.yml`:

```yaml
# /etc/auditbeat/auditbeat.yml

output.elasticsearch:
  hosts: ["https://localhost:9200"]
  username: "elastic"
  password: "your-elasticsearch-password"
  ssl.certificate_authorities: ["/etc/auditbeat/certs/ca.crt"]

setup.kibana:
  host: "https://localhost:5601"
  username: "elastic"
  password: "your-elasticsearch-password"

# General settings
name: "prod-webserver-01"  # How this host appears in events
tags: ["production", "web-tier"]

fields:
  environment: production
  datacenter: us-east-1
fields_under_root: true
```

## Configuring the Auditd Module

The auditd module captures kernel audit events. Configure it at `/etc/auditbeat/modules.d/auditd.yml`:

```yaml
# /etc/auditbeat/modules.d/auditd.yml
- module: auditd
  resolve_ids: true       # Resolve UIDs/GIDs to usernames
  failure_mode: log       # log|panic - what to do on failure
  backlog_limit: 8192     # Kernel audit backlog queue size
  rate_limit: 0           # 0 = no rate limit
  include_raw_message: false
  include_warnings: false

  # Audit rules - these replace /etc/audit/rules.d/*.rules
  audit_rules: |
    # Track all authentication events
    -w /etc/pam.d/ -p wa -k pam_changes
    -w /etc/passwd -p wa -k passwd_changes
    -w /etc/shadow -p wa -k shadow_changes
    -w /etc/group -p wa -k group_changes
    -w /etc/sudoers -p wa -k sudoers_changes
    -w /etc/sudoers.d/ -p wa -k sudoers_changes

    # Track SSH configuration changes
    -w /etc/ssh/sshd_config -p wa -k ssh_config

    # Monitor cron jobs
    -w /etc/cron.d/ -p wa -k cron_changes
    -w /etc/crontab -p wa -k cron_changes
    -w /var/spool/cron/ -p wa -k cron_changes

    # Track privileged command execution
    -a always,exit -F path=/usr/bin/sudo -F perm=x -k sudo_exec
    -a always,exit -F path=/bin/su -F perm=x -k su_exec
    -a always,exit -F path=/usr/bin/newgrp -F perm=x -k newgrp_exec

    # Network configuration changes
    -w /etc/hosts -p wa -k hosts_file
    -w /etc/resolv.conf -p wa -k resolv_conf
    -w /etc/iptables/ -p wa -k firewall_changes

    # Track system calls for privilege escalation
    -a always,exit -F arch=b64 -S setuid -S setgid -k setuid_setgid
    -a always,exit -F arch=b64 -S ptrace -k ptrace

    # Monitor kernel module loading
    -w /sbin/insmod -p x -k modules
    -w /sbin/rmmod -p x -k modules
    -w /sbin/modprobe -p x -k modules

    # Track failed login attempts
    -w /var/log/faillog -p wa -k login_failures
    -w /var/log/lastlog -p wa -k logins
    -w /var/run/utmp -p wa -k session
    -w /var/log/btmp -p wa -k session
    -w /var/log/wtmp -p wa -k session
```

### Understanding Audit Rule Syntax

Audit rules use a specific syntax:

- `-w path` - watch a file or directory
- `-p permissions` - which operations: `r` (read), `w` (write), `x` (execute), `a` (attribute change)
- `-k key` - tag events with this key for filtering
- `-a action,list -F filter -S syscall` - syscall audit rule
- `arch=b64` - 64-bit architecture (use `b32` for 32-bit)

## Configuring the File Integrity Module

The FIM module watches files and directories at the filesystem level:

```yaml
# /etc/auditbeat/modules.d/file_integrity.yml
- module: file_integrity
  paths:
    # Web application directories
    - /var/www/html
    - /etc/nginx
    - /etc/apache2

    # System binaries - detect tampering
    - /bin
    - /sbin
    - /usr/bin
    - /usr/sbin

    # Startup scripts
    - /etc/init.d
    - /etc/systemd/system

    # SSL certificates
    - /etc/ssl/certs
    - /etc/letsencrypt

  # Directories to exclude from watching
  exclude_files:
    - '(?i)\.sw[nop]$'   # Vim swap files
    - '~$'                # Editor backup files
    - '/\.git'            # Git directories

  # Hash algorithms to use for file fingerprinting
  hash_types: [md5, sha1, sha256]

  # Scan files on startup to detect changes made while stopped
  scan_at_start: true
  scan_rate_per_sec: 50   # Files per second during initial scan

  # Recursive watching
  recursive: true
```

## Loading Index Templates and Dashboards

```bash
# Load everything needed into Elasticsearch and Kibana
sudo auditbeat setup -e

# Or separately
sudo auditbeat setup --index-management
sudo auditbeat setup --dashboards
```

## Starting Auditbeat

```bash
sudo systemctl enable auditbeat
sudo systemctl start auditbeat
sudo systemctl status auditbeat
```

Watch live events:

```bash
sudo journalctl -u auditbeat -f
```

## Verifying Data Collection

Test that events are flowing to Elasticsearch:

```bash
# Run a privileged command to trigger an event
sudo ls /root

# Query Elasticsearch for recent events with the sudo_exec key
curl -u elastic:password \
  -H "Content-Type: application/json" \
  "https://localhost:9200/auditbeat-*/_search?pretty" \
  -d '{
    "query": {
      "match": {"tags": "sudo_exec"}
    },
    "size": 5,
    "sort": [{"@timestamp": "desc"}]
  }'
```

## Creating Kibana Alerts for Critical Events

In Kibana, navigate to Security > Rules and create detection rules based on audit events. For example, a rule that fires when `/etc/passwd` is modified:

- Index pattern: `auditbeat-*`
- Query: `file.path:"/etc/passwd" AND event.action:"updated"`
- Severity: High
- Frequency: Every 5 minutes

## Tuning for Performance

Auditbeat can generate significant event volume on busy systems. Reduce noise:

```yaml
# In the auditd module, use syscall filters sparingly
# Avoid -a always,exit -S all (catches everything)

# Add exclusions for noisy processes
-a never,exit -F uid=33  # Exclude www-data user from some rules
-a never,exit -F path=/proc  # Exclude /proc reads
```

Check the backlog:

```bash
# Monitor kernel audit queue
auditctl -s

# If backlog is frequently full, increase backlog_limit in the config
```

## Troubleshooting

**Auditbeat fails to start because auditd is still running:**
```bash
sudo systemctl stop auditd
sudo systemctl mask auditd  # Prevent it from starting on reboot
sudo systemctl start auditbeat
```

**High event volume overwhelming Elasticsearch:**
- Review audit rules - remove overly broad syscall rules
- Add `-a never` exclusion rules before the broad rules
- Increase Elasticsearch indexing capacity or use ILM to roll over indices

**Missing events:**
```bash
# Check if the kernel audit subsystem is working
sudo auditctl -l  # List active rules
sudo auditctl -s  # Show audit status
```

## What to Watch For

With Auditbeat running, you gain visibility into:

- Who ran `sudo` commands and what they executed
- Any changes to `/etc/passwd`, `/etc/shadow`, or `/etc/sudoers`
- Files modified in web directories (potential web shell uploads)
- SSH configuration changes
- New cron jobs added
- Binary replacement attempts in system directories

This data becomes significantly more useful when correlated with other sources like authentication logs and network traffic. Elastic Security's SIEM capabilities can handle this correlation automatically once data is in Elasticsearch.
