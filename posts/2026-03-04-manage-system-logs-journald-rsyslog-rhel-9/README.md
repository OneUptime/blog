# How to Manage System Logs with journald and rsyslog on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, journald, rsyslog, Logging, Linux, System Administration

Description: A practical guide to managing system logs on RHEL using journalctl for querying systemd journal entries and rsyslog for traditional log file management, rotation, and remote logging.

---

## The Two Logging Systems on RHEL

RHEL ships with two logging systems running side by side: systemd-journald and rsyslog. This is not redundant, they serve complementary purposes.

**journald** collects log data from the kernel, early boot messages, stdout and stderr from systemd services, and syslog messages. It stores everything in a structured, binary format that is fast to query.

**rsyslog** reads messages from journald (and other sources), processes them through rules, and writes them to traditional text-based log files in `/var/log/`. It also handles forwarding logs to remote servers.

```mermaid
flowchart LR
    A[Kernel] --> D[journald]
    B[systemd Services] --> D
    C[Syslog Messages] --> D
    D --> E[Binary Journal Storage]
    D --> F[rsyslog]
    F --> G[/var/log/messages]
    F --> H[/var/log/secure]
    F --> I[/var/log/maillog]
    F --> J[Remote Log Server]
```

## Working with journalctl

The `journalctl` command is your main tool for reading journal entries. Without any options, it dumps the entire journal, which is rarely what you want.

### Viewing Recent Logs

```bash
# Show the last 50 log entries
journalctl -n 50

# Follow new log entries in real time, similar to tail -f
journalctl -f
```

### Filtering by Time

```bash
# Show logs from the last hour
journalctl --since "1 hour ago"

# Show logs from a specific time range
journalctl --since "2026-03-04 08:00:00" --until "2026-03-04 12:00:00"

# Show logs since the last boot
journalctl -b
```

### Filtering by Unit

This is one of the most useful filters. You can isolate logs from a specific systemd service.

```bash
# Show logs for the sshd service
journalctl -u sshd

# Show logs for nginx since the last boot
journalctl -u nginx -b

# Follow logs for a service in real time
journalctl -u httpd -f
```

### Filtering by Priority

Journal entries have priority levels that match syslog severity. You can filter by these to find critical issues fast.

```bash
# Show only error-level messages and above (emergency, alert, critical, error)
journalctl -p err

# Show only warning-level and above
journalctl -p warning

# Show a specific priority range
journalctl -p err..crit
```

The priority levels from most to least severe are: emerg (0), alert (1), crit (2), err (3), warning (4), notice (5), info (6), debug (7).

### Output Formats

```bash
# Show logs in verbose format with all fields
journalctl -o verbose

# Output as JSON for parsing with other tools
journalctl -u sshd -o json-pretty

# Short output with timestamps in ISO format
journalctl -o short-iso
```

### Filtering by Process or User

```bash
# Show logs from a specific PID
journalctl _PID=1234

# Show logs from a specific user
journalctl _UID=1000

# Show kernel messages only
journalctl -k
```

## Understanding rsyslog Configuration

rsyslog configuration lives in `/etc/rsyslog.conf` and additional files in `/etc/rsyslog.d/`.

```bash
# View the main rsyslog configuration
cat /etc/rsyslog.conf
```

The default configuration routes messages to different files based on facility and severity. The key rules look like this:

```
# Log all kernel messages to /var/log/messages
*.info;mail.none;authpriv.none;cron.none    /var/log/messages

# Authentication messages go to /var/log/secure
authpriv.*                                   /var/log/secure

# Mail system messages
mail.*                                       /var/log/maillog

# Cron job messages
cron.*                                       /var/log/cron
```

### Adding Custom Rules

To route specific messages to a custom log file, create a new file in `/etc/rsyslog.d/`.

```bash
# Create a custom rule to log all local0 facility messages
sudo tee /etc/rsyslog.d/custom-app.conf << 'EOF'
# Route local0 messages to a dedicated file
local0.*    /var/log/myapp.log
EOF

# Restart rsyslog to apply the change
sudo systemctl restart rsyslog
```

You can test this with the `logger` command:

```bash
# Send a test message to the local0 facility
logger -p local0.info "Test message from my application"

# Verify it landed in the right file
cat /var/log/myapp.log
```

## Log Rotation

Without rotation, log files will grow until they fill up the disk. RHEL uses `logrotate` to manage this, configured via `/etc/logrotate.conf` and files in `/etc/logrotate.d/`.

```bash
# View the main logrotate configuration
cat /etc/logrotate.conf
```

The default rsyslog rotation config is at `/etc/logrotate.d/syslog`:

```bash
# Check how system logs are rotated
cat /etc/logrotate.d/syslog
```

### Creating a Custom Rotation Policy

If you added a custom log file, you should add a rotation policy for it.

```bash
# Create a logrotate policy for the custom app log
sudo tee /etc/logrotate.d/myapp << 'EOF'
/var/log/myapp.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        /usr/bin/systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF
```

Key directives explained:
- `daily` - Rotate once per day
- `rotate 14` - Keep 14 rotated files before deleting the oldest
- `compress` - Compress rotated files with gzip
- `delaycompress` - Do not compress the most recently rotated file (useful if a process still has it open)
- `missingok` - Do not report an error if the log file is missing
- `notifempty` - Do not rotate if the file is empty

Test the rotation without actually doing it:

```bash
# Dry run to check for errors
sudo logrotate -d /etc/logrotate.d/myapp
```

Force a rotation manually:

```bash
# Force rotation now
sudo logrotate -f /etc/logrotate.d/myapp
```

## Setting Up Remote Logging

Centralizing logs from multiple servers is essential for any production environment. rsyslog can both send and receive logs over the network.

### Configuring the Log Server (Receiver)

On the central log server, enable TCP or UDP reception.

```bash
# Create a configuration for receiving remote logs
sudo tee /etc/rsyslog.d/remote-input.conf << 'EOF'
# Enable TCP syslog reception on port 514
module(load="imtcp")
input(type="imtcp" port="514")

# Store remote logs in per-host directories
template(name="RemoteLogs" type="string"
    string="/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log")

# Apply template to all remote messages
if $fromhost-ip != '127.0.0.1' then {
    action(type="omfile" dynaFile="RemoteLogs")
    stop
}
EOF

# Restart rsyslog
sudo systemctl restart rsyslog
```

Open the firewall for incoming syslog traffic:

```bash
# Allow TCP syslog through the firewall
sudo firewall-cmd --permanent --add-port=514/tcp
sudo firewall-cmd --reload
```

### Configuring the Client (Sender)

On each client server, configure rsyslog to forward logs.

```bash
# Create a forwarding rule
sudo tee /etc/rsyslog.d/forward.conf << 'EOF'
# Forward all logs to the central server via TCP
# @@ means TCP, @ means UDP
*.* @@logserver.example.com:514
EOF

# Restart rsyslog
sudo systemctl restart rsyslog
```

### Testing Remote Logging

From the client:

```bash
# Send a test message
logger "Test remote log entry from $(hostname)"
```

On the log server, check for the message:

```bash
# Look for the test message
ls /var/log/remote/
```

## Disk Usage and Cleanup

Journal storage can grow large over time. Check how much space it uses:

```bash
# Show disk usage of the journal
journalctl --disk-usage
```

Clean up old entries:

```bash
# Remove journal entries older than 2 weeks
sudo journalctl --vacuum-time=2w

# Limit the journal to 500MB
sudo journalctl --vacuum-size=500M
```

For rsyslog text files, `logrotate` handles cleanup automatically based on the rotation policy. But you can always check manually:

```bash
# Check the size of log files in /var/log
du -sh /var/log/*
```

## Quick Reference

Here is a summary of the most common log management tasks:

| Task | Command |
|------|---------|
| View recent logs | `journalctl -n 50` |
| Follow logs live | `journalctl -f` |
| Logs for a service | `journalctl -u sshd` |
| Errors only | `journalctl -p err` |
| Logs since boot | `journalctl -b` |
| Kernel messages | `journalctl -k` |
| Check journal size | `journalctl --disk-usage` |
| Clean old journal entries | `journalctl --vacuum-time=2w` |
| Test syslog | `logger "test message"` |
| Restart rsyslog | `systemctl restart rsyslog` |

## Wrapping Up

On RHEL, journald and rsyslog work together to give you flexible, powerful logging. Use `journalctl` for quick, structured queries, especially when troubleshooting a specific service or time window. Use rsyslog when you need traditional text log files, custom routing rules, or centralized logging across your infrastructure. Keep an eye on disk usage, set up proper rotation policies, and consider forwarding logs to a central server early in your deployment. You will thank yourself the first time something breaks at 2 AM and you need to trace what happened.
