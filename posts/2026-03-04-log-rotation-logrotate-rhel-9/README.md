# How to Set Up Log Rotation with logrotate on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, logrotate, Logging, Linux

Description: Set up and customize log rotation with logrotate on RHEL 9 to manage disk space.

---

## Overview

Set up and customize log rotation with logrotate on RHEL 9 to manage disk space. This guide covers the essential steps and configuration needed for a production RHEL 9 environment.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Basic familiarity with the command line

## Step 1 - Verify the Required Packages

Ensure the relevant packages are installed:

```bash
sudo dnf install -y rsyslog systemd
```

rsyslog and systemd-journald ship by default on RHEL 9.

## Step 2 - Understand the Logging Architecture

RHEL 9 uses two logging systems:

- **systemd-journald** - captures structured binary logs from all services, the kernel, and early boot
- **rsyslog** - processes, filters, and forwards text-based syslog messages

The two work together: journald collects everything, and rsyslog can read from the journal or receive messages directly via the syslog socket.

## Step 3 - Apply the Configuration

To set up log rotation with logrotate, you need to edit the appropriate configuration files. The main files are:

- `/etc/rsyslog.conf` and `/etc/rsyslog.d/*.conf` for rsyslog
- `/etc/systemd/journald.conf` for journald

Make your changes, then restart the relevant service:

```bash
sudo systemctl restart rsyslog
# or
sudo systemctl restart systemd-journald
```

## Step 4 - Verify the Setup

Check the service status:

```bash
systemctl status rsyslog
systemctl status systemd-journald
```

Review recent logs to confirm your changes are working:

```bash
journalctl --since "5 minutes ago"
tail -20 /var/log/messages
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
- Ensure the target directory exists and has correct permissions

## Summary

You have learned how to set up log rotation with logrotate on RHEL 9. Regular log management is essential for security, compliance, and troubleshooting in any production environment.
