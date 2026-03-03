# How to Configure Samba Audit Logging on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Samba, Security, Auditing, Logging

Description: Set up Samba audit logging on Ubuntu using the full_audit VFS module to track file access, creation, deletion, and authentication events for compliance and security monitoring.

---

Audit logging in Samba records file system operations - who accessed what files, when, and what they did. This is essential for compliance requirements, security investigations, and tracking down accidental deletions or unauthorized access. Samba provides audit logging through its VFS (Virtual File System) module system, specifically the `full_audit` module.

## How Samba Audit Logging Works

Samba's audit capability hooks into the VFS layer. Every file system operation (open, read, write, rename, delete) passes through VFS modules before reaching the actual filesystem. The `full_audit` VFS module intercepts these operations and logs them via syslog. You can then direct syslog to a dedicated audit log file.

There is also a simpler `audit` VFS module that only logs connects, disconnects, and file opens. The `full_audit` module gives you granular control over what gets logged.

## Prerequisites

Samba must be installed and running:

```bash
# Install Samba if not already present
sudo apt update
sudo apt install samba -y

# Verify the full_audit module is available
smbd -b | grep MODULES
```

## Configuring full_audit on a Share

Edit your Samba configuration:

```bash
sudo nano /etc/samba/smb.conf
```

Add the `full_audit` VFS module to a share definition:

```ini
[global]
   workgroup = WORKGROUP
   server string = Ubuntu Samba Server
   log file = /var/log/samba/log.%m
   max log size = 1000
   logging = syslog
   syslog = 3

[audited-share]
   comment = Share with Audit Logging
   path = /srv/samba/audited
   valid users = @smbusers
   read only = no
   browseable = yes

   # Enable the full_audit VFS module
   vfs objects = full_audit

   # What to log on success
   full_audit:success = open read write rename unlink mkdir rmdir connect disconnect

   # What to log on failure
   full_audit:failure = connect open

   # Syslog priority level for audit messages
   full_audit:priority = NOTICE

   # Syslog facility
   full_audit:facility = LOCAL5

   # Format of each log entry
   # %u = username, %I = client IP, %S = share name, %f = file/object, %o = operation
   full_audit:prefix = %u|%I|%S
```

### Available Operation Names

The operations you can audit include:

- `connect` / `disconnect` - share connections
- `open` / `close` - file open/close
- `read` / `pread` - file reads
- `write` / `pwrite` - file writes
- `rename` - file/directory renames
- `unlink` - file deletions
- `mkdir` / `rmdir` - directory creation/deletion
- `chmod` / `chown` - permission changes
- `lock` / `unlock` - file locking

For comprehensive auditing:

```ini
full_audit:success = connect disconnect open close read write rename unlink mkdir rmdir chmod chown lock
full_audit:failure = connect open
```

For lighter auditing that focuses on changes:

```ini
full_audit:success = open write rename unlink mkdir rmdir connect
full_audit:failure = connect open
```

## Configuring Syslog for Samba Audit Logs

By default, syslog sends all messages to `/var/log/syslog`. Redirect Samba audit messages to a dedicated file for easier analysis.

### Using rsyslog (Default on Ubuntu)

```bash
# Create a rsyslog configuration for Samba audit logs
sudo nano /etc/rsyslog.d/samba-audit.conf
```

```text
# Route Samba audit messages (LOCAL5 facility) to a dedicated file
local5.*    /var/log/samba/audit.log

# Stop processing LOCAL5 messages further (prevents duplication)
local5.*    stop
```

```bash
# Create the audit log file with correct permissions
sudo touch /var/log/samba/audit.log
sudo chown root:adm /var/log/samba/audit.log
sudo chmod 640 /var/log/samba/audit.log

# Restart rsyslog to apply the configuration
sudo systemctl restart rsyslog
```

### Verify the Configuration

```bash
# Test syslog routing with a manual message
logger -p local5.notice "Test Samba audit message"

# Check if it appeared in the audit log
sudo tail -f /var/log/samba/audit.log
```

## Setting Up Log Rotation

Audit logs can grow large. Configure logrotate to manage them:

```bash
sudo nano /etc/logrotate.d/samba-audit
```

```text
/var/log/samba/audit.log {
    daily
    missingok
    rotate 90
    compress
    delaycompress
    notifempty
    create 640 root adm
    postrotate
        /usr/lib/rsyslog/rsyslog-rotate
    endscript
}
```

## Applying the Configuration

After editing `smb.conf`, validate and reload:

```bash
# Test configuration syntax
testparm

# Reload Samba without dropping connections
sudo smbcontrol smbd reload-config

# Or restart fully
sudo systemctl restart smbd
```

## Reading Audit Log Entries

With the prefix format `%u|%I|%S`, log entries look like:

```text
Mar 02 10:23:45 ubuntu smbd_audit: alice|192.168.1.101|audited-share|ok|open|documents/report.docx
Mar 02 10:23:46 ubuntu smbd_audit: alice|192.168.1.101|audited-share|ok|write|documents/report.docx
Mar 02 10:24:01 ubuntu smbd_audit: bob|192.168.1.102|audited-share|ok|connect|.
Mar 02 10:24:05 ubuntu smbd_audit: bob|192.168.1.102|audited-share|FAILED|open|documents/confidential.pdf
```

Each entry contains:
- Timestamp
- Hostname and process
- `smbd_audit:` prefix
- Your prefix format (user, IP, share)
- Result (`ok` or `FAILED`)
- Operation type
- File or directory affected

## Parsing Audit Logs with Common Tools

```bash
# See all failed access attempts
sudo grep "FAILED" /var/log/samba/audit.log

# Count file deletions per user
sudo grep "|ok|unlink|" /var/log/samba/audit.log | awk -F'|' '{print $1}' | sort | uniq -c | sort -rn

# Find all activity from a specific IP
sudo grep "192.168.1.101" /var/log/samba/audit.log

# Find all renames (useful for tracking ransomware activity)
sudo grep "|ok|rename|" /var/log/samba/audit.log | tail -50

# Activity in the last hour
sudo grep "$(date '+%b %d %H')" /var/log/samba/audit.log
```

## Using full_audit with Multiple VFS Modules

If you also use other VFS modules (like `recycle` for a recycle bin), stack them correctly:

```ini
[audited-share]
   path = /srv/samba/audited
   vfs objects = full_audit recycle

   # full_audit settings
   full_audit:success = open write rename unlink mkdir rmdir connect disconnect
   full_audit:failure = connect open
   full_audit:priority = NOTICE
   full_audit:facility = LOCAL5
   full_audit:prefix = %u|%I|%S

   # Recycle bin settings
   recycle:repository = .recycle
   recycle:keeptree = yes
   recycle:versions = yes
```

## Forwarding Audit Logs to a SIEM

For enterprise environments, forward Samba audit logs to a centralized Security Information and Event Management (SIEM) system. Using rsyslog to forward to a remote syslog server:

```bash
sudo nano /etc/rsyslog.d/samba-audit.conf
```

```text
# Forward LOCAL5 (Samba audit) to remote syslog server
local5.*    action(type="omfwd" target="siem.company.com" port="514" protocol="tcp")
local5.*    /var/log/samba/audit.log
```

Or use Filebeat to ship logs to Elasticsearch:

```yaml
# /etc/filebeat/filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/samba/audit.log
    fields:
      log_type: samba_audit
    fields_under_root: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

Audit logging is not a fire-and-forget setup. Establish a baseline of normal activity and set up alerts for anomalous patterns: mass deletions, access to sensitive files outside business hours, or repeated failed connection attempts.
