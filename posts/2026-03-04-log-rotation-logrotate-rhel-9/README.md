# How to Set Up Log Rotation with logrotate on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Logrotate, Logging, Linux

Description: Set up and customize log rotation with logrotate on RHEL to manage disk space.

---

## Overview

Set up and customize log rotation with logrotate on RHEL to manage disk space. This guide covers the essential steps and configuration needed for a production RHEL environment.

## Prerequisites

- A RHEL system with a valid subscription or configured repositories
- Root or sudo access
- Basic familiarity with the command line

## Step 1 - Verify the Required Packages

Ensure the relevant packages are installed:

```bash
sudo dnf install -y logrotate
```

logrotate is commonly installed by default on RHEL, but installing the package ensures the logrotate command and systemd timer are present.

## Step 2 - Understand the Logging Architecture

RHEL uses two logging systems:

- **systemd-journald** - captures structured binary logs from all services, the kernel, and early boot
- **rsyslog** - processes, filters, and forwards text-based syslog messages

The two work together: journald collects logs, and rsyslog can read from the journal or receive messages directly via the syslog socket. logrotate manages text log files such as files under `/var/log`. It does not rotate the binary journal; journald retention is controlled separately in `/etc/systemd/journald.conf`.

## Step 3 - Apply the Configuration

To set up log rotation with logrotate, you need to edit the appropriate configuration files. The main files are:

- `/etc/logrotate.conf` for global logrotate defaults
- `/etc/logrotate.d/*` for per-application log rotation policies

For example, create a per-application policy in `/etc/logrotate.d/myapp`:

```bash
sudo vi /etc/logrotate.d/myapp
```

```text
/var/log/myapp/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 0640 root root
}
```

On RHEL 9, logrotate is run by a systemd timer. Enable and start the timer if needed:

```bash
sudo systemctl enable --now logrotate.timer
```

## Step 4 - Verify the Setup

Check the service status:

```bash
systemctl status logrotate.timer
```

Run logrotate in debug mode to check the configuration without changing any log files:

```bash
sudo logrotate -d /etc/logrotate.conf
```

After the timer runs, check the logrotate state file to confirm which logs have been processed:

```bash
sudo cat /var/lib/logrotate/logrotate.status
```

## Step 5 - Open Firewall Ports (If Applicable)

Log rotation itself does not require firewall changes. If your setup also involves receiving remote syslog messages, open the port and protocol used by your rsyslog listener:

```bash
sudo firewall-cmd --permanent --add-port=514/tcp
sudo firewall-cmd --permanent --add-port=514/udp
sudo firewall-cmd --reload
```

## Troubleshooting

- Check for logrotate configuration errors: `logrotate -d /etc/logrotate.conf`
- Verify SELinux is not blocking log operations: `ausearch -m AVC -ts recent`
- Ensure the target directory exists and has correct permissions

## Summary

You have learned how to set up log rotation with logrotate on RHEL. Regular log management is essential for security, compliance, and troubleshooting in any production environment.
