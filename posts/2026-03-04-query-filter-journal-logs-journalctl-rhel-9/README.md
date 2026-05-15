# How to Query and Filter systemd Journal Logs with journalctl on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, journalctl, Systemd, Logging, Linux

Description: Master journalctl on RHEL 9 to query, filter, and analyze systemd journal logs.

---

## Overview

Master journalctl on RHEL 9 to query, filter, and analyze systemd journal logs. This guide covers the essential steps and configuration needed for a production RHEL 9 environment.

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

## Step 3 - Query and Filter the Journal

You do not need to edit configuration files for normal `journalctl` queries. Use `journalctl` options and journal field matches to filter entries:

```bash
journalctl -b
journalctl -u sshd.service
journalctl -p warning..alert
journalctl _SYSTEMD_UNIT=sshd.service --since "1 hour ago"
```

Edit configuration files only when you want to change storage, retention, forwarding, or rsyslog routing behavior. The main files are:

- `/etc/rsyslog.conf` and `/etc/rsyslog.d/*.conf` for rsyslog
- `/etc/systemd/journald.conf` and `/etc/systemd/journald.conf.d/*.conf` for journald

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

If your setup involves remote logging over TCP, open the necessary port:

```bash
sudo firewall-cmd --permanent --add-port=514/tcp
sudo firewall-cmd --reload
```

For UDP-based remote logging, use `514/udp` instead.

## Troubleshooting

- Check for syntax errors in rsyslog configuration: `rsyslogd -N1`
- Verify SELinux is not blocking log operations: `ausearch -m AVC -ts recent`
- Ensure the target directory exists and has correct permissions

## Summary

You have learned how to query and filter systemd journal logs with journalctl on RHEL 9. Regular log management is essential for security, compliance, and troubleshooting in any production environment.
