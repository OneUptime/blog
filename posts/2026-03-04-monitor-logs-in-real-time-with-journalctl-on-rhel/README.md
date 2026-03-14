# How to Monitor Logs in Real Time with journalctl -f on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Journalctl, Real-Time Monitoring, Logging, Systemd, Troubleshooting

Description: Use journalctl -f and related options on RHEL to watch log output in real time, filtering by service, priority, or other criteria for live troubleshooting.

---

When you are actively troubleshooting an issue on RHEL, watching logs scroll by in real time is often the fastest way to find the problem. The `journalctl -f` command works like `tail -f` but for the systemd journal, with the added benefit of powerful filtering.

## Basic Real-Time Monitoring

```bash
# Follow all journal entries in real time
journalctl -f

# This shows new entries as they appear
# Press Ctrl+C to stop
```

## Follow a Specific Service

```bash
# Watch only the httpd service logs
journalctl -f -u httpd.service

# Watch multiple services simultaneously
journalctl -f -u nginx.service -u php-fpm.service

# Watch a service and filter by priority (errors and above)
journalctl -f -u mariadb.service -p err
```

## Filter by Syslog Identifier

```bash
# Watch logs from a specific program tag
journalctl -f -t sshd

# Watch logs from a custom application
journalctl -f -t myapp

# Combine with priority filtering
journalctl -f -t sudo -p warning
```

## Follow Kernel Messages

```bash
# Watch kernel messages in real time (like dmesg -w)
journalctl -f -k

# Watch for specific kernel subsystem messages
journalctl -f -k | grep -i "usb\|disk\|error"
```

## Use Output Formatting

```bash
# Show full timestamps while following
journalctl -f -o short-full

# Show JSON output for parsing with other tools
journalctl -f -o json

# Show verbose output with all metadata fields
journalctl -f -o verbose
```

## Combine with grep for Pattern Matching

```bash
# Watch for failed SSH login attempts in real time
journalctl -f -u sshd | grep "Failed password"

# Watch for any OOM killer activity
journalctl -f -k | grep -i "out of memory\|oom"

# Watch for SELinux denials
journalctl -f -t setroubleshoot
```

## Practical Troubleshooting Scenarios

```bash
# Scenario 1: Debug a service that fails to start
# Terminal 1 - watch the service logs
journalctl -f -u myapp.service

# Terminal 2 - restart the service
sudo systemctl restart myapp.service

# Scenario 2: Watch for disk issues
journalctl -f -k -p warning

# Scenario 3: Monitor authentication events
journalctl -f -t sshd -t sudo -t login

# Scenario 4: Watch container-related logs
journalctl -f -t podman
```

## Using tail -f for Traditional Log Files

Some applications write to files instead of the journal:

```bash
# Follow a traditional log file
tail -f /var/log/audit/audit.log

# Follow multiple files
tail -f /var/log/messages /var/log/secure

# Use multitail for colored multi-file monitoring
sudo dnf install -y multitail
multitail /var/log/messages /var/log/secure
```

Real-time log monitoring with `journalctl -f` is one of the simplest and most effective tools in a sysadmin's toolkit. Combine it with filters to cut through the noise and focus on what matters during an active incident.
