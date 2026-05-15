# How to Configure rsyslog for Centralized Log Management on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Rsyslog, Logging, Linux

Description: Learn how to configure rsyslog on RHEL 9 for centralized log management from multiple servers.

---

## Overview

Learn how to configure rsyslog on RHEL 9 for centralized log management from multiple servers. This guide covers the essential steps and configuration needed for a production RHEL 9 environment.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Basic familiarity with the command line

## Step 1 - Verify the Required Packages

Ensure the relevant packages are installed:

```bash
sudo dnf install -y rsyslog
```

systemd-journald is part of systemd, and rsyslog is normally installed on RHEL 9 systems.

## Step 2 - Understand the Logging Architecture

RHEL 9 uses two logging systems:

- **systemd-journald** - captures structured binary logs from all services, the kernel, and early boot
- **rsyslog** - processes, filters, and forwards text-based syslog messages

The two work together: journald collects everything, and rsyslog can read from the journal or receive messages directly via the syslog socket.

## Step 3 - Apply the Configuration

To configure rsyslog for centralized log management, you need to edit the appropriate configuration files. The main files are:

- `/etc/rsyslog.conf` and `/etc/rsyslog.d/*.conf` for rsyslog
- `/etc/systemd/journald.conf` for journald

On the logging server, create `/etc/rsyslog.d/remotelog.conf`:

```bash
sudo vi /etc/rsyslog.d/remotelog.conf
```

Add a TCP listener and store remote logs by host:

```conf
template(name="RemoteLogs" type="string" string="/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log")

module(load="imtcp")
ruleset(name="remote") {
    *.* action(type="omfile" DynaFile="RemoteLogs")
}
input(type="imtcp" port="514" ruleset="remote")
```

On each client, create `/etc/rsyslog.d/10-remotelog.conf`:

```bash
sudo vi /etc/rsyslog.d/10-remotelog.conf
```

Forward all messages to the logging server over TCP:

```conf
*.* action(type="omfwd" target="log-server.example.com" port="514" protocol="tcp")
```

Replace `log-server.example.com` with the hostname or IP address of your logging server.

Make your changes, validate the rsyslog configuration, then restart the relevant service:

```bash
sudo rsyslogd -N1
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
logger "centralized rsyslog test"
journalctl --since "5 minutes ago"
tail -20 /var/log/messages
sudo find /var/log/remote -type f -name "*.log" -print
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

You have learned how to configure rsyslog for centralized log management on RHEL 9. Regular log management is essential for security, compliance, and troubleshooting in any production environment.
