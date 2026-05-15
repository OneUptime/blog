# How to Manage Journal Disk Usage and Vacuum Old Logs on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, journald, Disk Management, Logging

Description: Control journal disk usage and vacuum old logs on RHEL 9 to prevent storage issues.

---

## Overview

Control journal disk usage and vacuum old logs on RHEL 9 to prevent storage issues. This guide covers the essential steps and configuration needed for a production RHEL 9 environment.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Basic familiarity with the command line

## Step 1 - Verify the Required Packages

Ensure the relevant packages are installed:

```bash
sudo dnf install -y rsyslog
```

systemd-journald is part of systemd, which is installed by default on RHEL 9. rsyslog also ships with the default RHEL 9 logging stack.

## Step 2 - Understand the Logging Architecture

RHEL 9 uses two logging systems:

- **systemd-journald** - captures structured binary logs from all services, the kernel, and early boot
- **rsyslog** - processes, filters, and forwards text-based syslog messages

The two work together: journald collects everything, and rsyslog can read from the journal or receive messages directly via the syslog socket.

## Step 3 - Apply the Configuration

To manage journal disk usage and vacuum old logs, configure journald limits and use `journalctl` for one-time cleanup. The main files are:

- `/etc/rsyslog.conf` and `/etc/rsyslog.d/*.conf` for rsyslog
- `/etc/systemd/journald.conf` and `/etc/systemd/journald.conf.d/*.conf` for journald

For example, create a journald drop-in that caps persistent journal storage and retention:

```bash
sudo mkdir -p /etc/systemd/journald.conf.d
sudo vi /etc/systemd/journald.conf.d/10-size-limits.conf
```

Add settings like these:

```ini
[Journal]
SystemMaxUse=1G
SystemKeepFree=2G
MaxRetentionSec=30day
```

Then restart journald:

```bash
sudo systemctl restart systemd-journald
```

To immediately remove old archived journal files, rotate the active journal first, then vacuum by size or time:

```bash
sudo journalctl --rotate
sudo journalctl --vacuum-size=1G
sudo journalctl --vacuum-time=30days
```

## Step 4 - Verify the Setup

Check the service status:

```bash
systemctl status rsyslog
systemctl status systemd-journald
```

Review recent logs to confirm your changes are working:

```bash
journalctl --disk-usage
journalctl --since "5 minutes ago"
tail -20 /var/log/messages
```

## Step 5 - Open Firewall Ports (If Applicable)

If your rsyslog setup receives remote logs over TCP port 514, open the necessary port:

```bash
sudo firewall-cmd --permanent --add-port=514/tcp
sudo firewall-cmd --reload
```

## Troubleshooting

- Check for syntax errors in rsyslog configuration: `rsyslogd -N1`
- Verify SELinux is not blocking log operations: `ausearch -m AVC -ts recent`
- Ensure the target directory exists and has correct permissions

## Summary

You have learned how to manage journal disk usage and vacuum old logs on RHEL 9. Regular log management is essential for security, compliance, and troubleshooting in any production environment.
