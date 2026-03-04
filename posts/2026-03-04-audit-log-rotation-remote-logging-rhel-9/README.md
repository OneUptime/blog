# How to Configure Audit Log Rotation and Remote Logging on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, auditd, Log Rotation, Remote Logging, Security, Linux

Description: Set up audit log rotation and remote log forwarding on RHEL to manage disk space and ensure audit data is preserved on a central log server.

---

Audit logs on RHEL can grow quickly, especially on busy systems with comprehensive audit rules. Without proper log rotation, they will eventually fill up the disk. Remote logging adds another layer of protection by ensuring that audit data survives even if the local system is compromised. This guide covers both topics.

## Understanding Audit Log Management

```mermaid
flowchart TD
    A[auditd generates events] --> B[/var/log/audit/audit.log]
    B --> C{Log rotation}
    C --> D[audit.log.1, audit.log.2, ...]
    B --> E{Remote logging}
    E --> F[Remote syslog server]
    E --> G[Remote audit server]
```

## Configuring Log Rotation in auditd.conf

The primary way to manage audit log size is through the auditd daemon configuration:

```bash
sudo vi /etc/audit/auditd.conf
```

Key rotation settings:

```ini
# Maximum size of each log file in megabytes
max_log_file = 50

# Number of rotated log files to keep
num_logs = 10

# Action when max_log_file size is reached
# Options: IGNORE, SYSLOG, SUSPEND, ROTATE, KEEP_LOGS
max_log_file_action = ROTATE

# Action when disk space is getting low
space_left = 75
space_left_action = SYSLOG

# Action when disk space is critically low
admin_space_left = 50
admin_space_left_action = SUSPEND

# Action when disk is completely full
disk_full_action = SUSPEND
disk_error_action = SUSPEND
```

### Rotation Actions Explained

| Action | Behavior |
|--------|----------|
| `ROTATE` | Rotate the log file and start a new one |
| `KEEP_LOGS` | Rotate logs but never delete old ones |
| `SYSLOG` | Send a warning to syslog but keep writing to the current log |
| `SUSPEND` | Stop writing audit events (data may be lost) |
| `HALT` | Shut down the system (for high-security environments) |
| `IGNORE` | Do nothing |

### Calculating Storage Requirements

Estimate your audit log storage needs:

```bash
# Check current log size and growth rate
ls -lh /var/log/audit/audit.log

# Check total audit log directory size
du -sh /var/log/audit/

# Estimate daily log growth
sudo aureport --event -ts yesterday -te today | tail -1
```

A general formula: if your log grows by X MB per day and you want to keep N days of logs:

```bash
Storage needed = X * N MB
max_log_file = X (daily growth in MB)
num_logs = N (days to retain)
```

## Applying Rotation Settings

After editing `auditd.conf`:

```bash
# Reload auditd configuration
sudo service auditd reload

# Verify the settings
sudo auditctl -s
```

## Manual Log Rotation

You can manually rotate the audit log:

```bash
# Rotate the audit log immediately
sudo service auditd rotate

# Verify the rotation happened
ls -la /var/log/audit/
```

## Compressing Rotated Logs

auditd does not compress rotated logs by default. You can set up a cron job to compress older logs:

```bash
sudo tee /etc/cron.daily/compress-audit-logs << 'SCRIPT'
#!/bin/bash
# Compress audit logs older than 1 day
find /var/log/audit/ -name "audit.log.*" -not -name "*.gz" -mtime +1 -exec gzip {} \;
SCRIPT

sudo chmod +x /etc/cron.daily/compress-audit-logs
```

## Remote Logging with rsyslog

Forwarding audit events to a remote syslog server provides offsite backup of your audit trail.

### Step 1: Enable the audisp syslog Plugin

```bash
# Configure the syslog plugin
sudo tee /etc/audit/plugins.d/syslog.conf << 'EOF'
active = yes
direction = out
path = /sbin/audisp-syslog
type = always
args = LOG_LOCAL6
format = string
EOF

# Reload auditd
sudo service auditd reload
```

### Step 2: Configure rsyslog to Forward Events

```bash
# Create an rsyslog configuration for audit log forwarding
sudo tee /etc/rsyslog.d/audit-forward.conf << 'EOF'
# Forward audit events to remote server
# Using TCP for reliable delivery
local6.* @@logserver.example.com:514

# Or use RELP for even more reliable delivery
# Requires rsyslog-relp package
# local6.* :omrelp:logserver.example.com:2514
EOF

# Restart rsyslog
sudo systemctl restart rsyslog
```

### Step 3: Configure the Remote Server

On the receiving log server, configure rsyslog to accept remote connections:

```bash
# /etc/rsyslog.d/remote-audit.conf on the log server

# Accept TCP connections
module(load="imtcp")
input(type="imtcp" port="514")

# Write audit logs to a separate file per hostname
template(name="AuditLogFile" type="string"
    string="/var/log/remote-audit/%HOSTNAME%/audit.log")

local6.* ?AuditLogFile
& stop
EOF
```

## Remote Logging with audisp-remote

For more secure and reliable remote audit logging, use the dedicated `audisp-remote` plugin:

### Step 1: Install the Plugin

```bash
sudo dnf install audispd-plugins
```

### Step 2: Configure audisp-remote

```bash
sudo tee /etc/audit/audisp-remote.conf << 'EOF'
# Remote audit logging configuration
remote_server = auditlog.example.com
port = 60
transport = tcp
queue_file = /var/spool/audit/remote.log
mode = immediate
queue_depth = 2048
format = managed
network_retry_time = 1
max_tries_per_record = 3
max_time_per_record = 5
heartbeat_timeout = 0
network_failure_action = syslog
disk_low_action = suspend
disk_full_action = suspend
disk_error_action = syslog
remote_ending_action = suspend
generic_error_action = syslog
generic_warning_action = syslog
overflow_action = syslog
EOF
```

### Step 3: Enable the Plugin

```bash
sudo tee /etc/audit/plugins.d/au-remote.conf << 'EOF'
active = yes
direction = out
path = /sbin/audisp-remote
type = always
format = string
EOF

# Reload auditd
sudo service auditd reload
```

### Step 4: Configure the Remote Audit Server

On the receiving server, configure auditd to accept remote connections:

```bash
# /etc/audit/auditd.conf on the remote server
tcp_listen_port = 60
tcp_listen_queue = 5
tcp_max_per_addr = 1
tcp_client_max_idle = 0
```

## Securing Remote Log Transport with TLS

For encrypted transport of audit logs:

```bash
# Configure TLS in audisp-remote.conf
sudo vi /etc/audit/audisp-remote.conf
```

Add TLS settings:

```ini
transport = tcp
enable_krb5 = no

# For TLS (if using stunnel or a TLS-capable transport)
# You may need to set up stunnel for TLS wrapping
```

Set up stunnel for TLS encryption:

```bash
# Install stunnel
sudo dnf install stunnel

# Configure stunnel for audit log forwarding
sudo tee /etc/stunnel/audit-client.conf << 'EOF'
[audit-remote]
client = yes
accept = 127.0.0.1:60
connect = auditlog.example.com:6514
CAfile = /etc/pki/tls/certs/ca-bundle.crt
verify = 2
EOF

# Start stunnel
sudo systemctl enable --now stunnel@audit-client
```

## Verifying Remote Logging

```bash
# Generate a test event
sudo ausearch -m USER_LOGIN -ts recent

# On the remote server, check for the event
ssh logserver "sudo tail -5 /var/log/remote-audit/$(hostname)/audit.log"

# Check the queue for unsent events
ls -la /var/spool/audit/
```

## Summary

Proper audit log rotation and remote logging on RHEL are essential for both operational stability and security. Configure `auditd.conf` with appropriate rotation settings to prevent disk exhaustion, and set up remote logging using either the syslog plugin with rsyslog or the dedicated audisp-remote plugin for a more robust solution. Remote logging ensures that your audit trail is preserved even if the local system is compromised.
