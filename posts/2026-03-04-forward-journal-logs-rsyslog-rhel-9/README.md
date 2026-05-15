# How to Forward Journal Logs to rsyslog on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, journald, Rsyslog, Logging, Linux

Description: Forward systemd journal logs to rsyslog on RHEL to combine both logging systems.

---

## Overview

Forward systemd journal logs to rsyslog on RHEL to combine both logging systems. This guide covers the essential steps and configuration needed for a production RHEL environment.

## Prerequisites

- A RHEL system with a valid subscription or configured repositories
- Root or sudo access
- Basic familiarity with the command line

## Step 1 - Verify the Required Packages

Ensure the relevant packages are installed:

```bash
sudo dnf install -y rsyslog systemd
```

rsyslog and systemd-journald ship by default on RHEL.

## Step 2 - Understand the Logging Architecture

RHEL uses two logging systems:

- **systemd-journald** - captures structured binary logs from all services, the kernel, and early boot
- **rsyslog** - processes, filters, and forwards text-based syslog messages

The two work together: journald collects everything, and rsyslog can read from the journal or receive messages directly via the syslog socket.

## Step 3 - Apply the Configuration

On RHEL, rsyslog normally reads journal entries through its `imjournal` input. Verify that `/etc/rsyslog.conf` contains an `imjournal` module line like this:

```conf
module(load="imjournal" StateFile="imjournal.state")
```

If your system instead uses journald socket forwarding, configure `ForwardToSyslog=yes` in `/etc/systemd/journald.conf` and ensure rsyslog is reading the system log socket. Do not enable both methods unless you have checked for duplicate messages.

Use `/etc/rsyslog.conf` or `/etc/rsyslog.d/*.conf` for rsyslog rules and outputs. Use `/etc/systemd/journald.conf` only for journald behavior such as socket forwarding or journal storage.

Make your changes, then restart the relevant service:

```bash
sudo systemctl restart rsyslog

# If you changed journald.conf:
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

If your setup involves receiving remote logging traffic, open the necessary port on the log server. For example, for TCP syslog on port 514:

```bash
sudo firewall-cmd --permanent --add-port=514/tcp
sudo firewall-cmd --reload
```

## Troubleshooting

- Check for syntax errors in rsyslog configuration: `rsyslogd -N1`
- Verify SELinux is not blocking log operations: `ausearch -m AVC -ts recent`
- Ensure the target directory exists and has correct permissions

## Summary

You have learned how to forward journal logs to rsyslog on RHEL. Regular log management is essential for security, compliance, and troubleshooting in any production environment.
