# How to Forward Logs to Elasticsearch or Splunk from RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Elasticsearch, Splunk, Logging, Linux

Description: Forward RHEL 9 system logs to Elasticsearch or Splunk for centralized analysis.

---

## Overview

Forward RHEL 9 system logs to Elasticsearch or Splunk for centralized analysis. This guide covers the essential steps and configuration needed for a production RHEL 9 environment.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- A compatible ingestion path, such as Splunk Universal Forwarder, Elastic Agent, Filebeat, Logstash, or a syslog listener in front of Splunk or Elasticsearch
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

To forward logs to Elasticsearch or Splunk from RHEL 9 with rsyslog, send syslog events to a compatible receiver, such as a Splunk syslog input, Logstash syslog input, or another rsyslog server that forwards into the platform. The main files are:

- `/etc/rsyslog.conf` and `/etc/rsyslog.d/*.conf` for rsyslog
- `/etc/systemd/journald.conf` for journald

Create a forwarding rule for rsyslog:

```bash
sudo tee /etc/rsyslog.d/10-forward-logs.conf >/dev/null <<'EOF'
*.* action(type="omfwd"
  target="logs.example.com"
  port="514"
  protocol="tcp"
  queue.type="linkedList"
  queue.filename="forward_logs"
  action.resumeRetryCount="-1"
  queue.saveOnShutdown="on"
)
EOF
```

Replace `logs.example.com` and `514` with the host and port of your Splunk or Elasticsearch ingestion endpoint. Then validate the configuration and restart the relevant service:

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
logger "rhel9 forwarding test"
journalctl --since "5 minutes ago"
tail -20 /var/log/messages
```

Confirm that the test message also appears in the receiving Elasticsearch or Splunk pipeline.

## Step 5 - Open Firewall Ports (If Applicable)

If your setup involves a remote syslog listener, open the necessary port on the receiving server. Use the protocol and port your receiver is actually configured to listen on:

```bash
sudo firewall-cmd --permanent --add-port=514/tcp
sudo firewall-cmd --reload
```

## Troubleshooting

- Check for syntax errors in rsyslog configuration: `rsyslogd -N1`
- Verify SELinux is not blocking log operations: `ausearch -m AVC -ts recent`
- Ensure the receiver is listening on the configured host, port, and protocol
- If the receiver writes logs to local files, ensure the target directory exists and has correct permissions

## Summary

You have learned how to forward logs to Elasticsearch or Splunk from RHEL 9. Regular log management is essential for security, compliance, and troubleshooting in any production environment.
