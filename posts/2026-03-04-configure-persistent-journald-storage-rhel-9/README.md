# How to Configure Persistent Journald Storage on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, journald, Systemd, Logging, Linux

Description: Configure persistent journald storage on RHEL 9 so logs survive reboots.

---

## Overview

Configure persistent journald storage on RHEL 9 so logs survive reboots. This guide covers the essential steps and configuration needed for a production RHEL 9 environment.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Basic familiarity with the command line

## Step 1 - Verify the Required Packages

Ensure the relevant packages are installed:

```bash
sudo dnf install -y systemd
```

systemd-journald ships with systemd and is installed by default on RHEL 9. Install rsyslog only if you also need syslog file output or remote syslog forwarding.

## Step 2 - Understand the Logging Architecture

RHEL 9 uses two logging systems:

- **systemd-journald** - captures structured binary logs from all services, the kernel, and early boot
- **rsyslog** - processes, filters, and forwards text-based syslog messages

The two work together: journald collects everything, and rsyslog can read from the journal or receive messages directly via the syslog socket.

## Step 3 - Apply the Configuration

To configure persistent journald storage, edit `/etc/systemd/journald.conf` and set:

```ini
[Journal]
Storage=persistent
```

The `Storage=persistent` setting stores journal files under `/var/log/journal`, with a fallback to `/run/log/journal` during early boot or when the disk is not writable.

After saving the file, restart journald and flush any existing volatile logs to persistent storage:

```bash
sudo systemctl restart systemd-journald
sudo journalctl --flush
```

## Step 4 - Verify the Setup

Check the service status:

```bash
systemctl status systemd-journald
```

Review recent logs to confirm your changes are working:

```bash
journalctl --since "5 minutes ago"
journalctl --list-boots
```

## Step 5 - Open Firewall Ports (If Applicable)

If your setup involves remote logging, open the necessary ports:

```bash
sudo firewall-cmd --permanent --add-port=514/tcp
sudo firewall-cmd --reload
```

## Troubleshooting

- Check for syntax errors in rsyslog configuration: `rsyslogd -N1`
- Verify SELinux is not blocking log operations: `ausearch -m AVC -ts recent`
- Ensure `/var/log/journal` exists if you use `Storage=auto`; `Storage=persistent` creates it when needed

## Summary

You have learned how to configure persistent journald storage on RHEL 9. Regular log management is essential for security, compliance, and troubleshooting in any production environment.
