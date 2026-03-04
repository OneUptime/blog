# How to Integrate RHEL Audit Logs with a SIEM Solution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, auditd, SIEM, Security, Linux

Description: Learn how to forward RHEL audit logs to a SIEM platform using audisp-remote, rsyslog, and other methods for centralized security monitoring.

---

If you run any kind of production RHEL environment, you probably already have auditd generating logs on each box. The problem is that those logs sitting on individual servers are only useful if someone actually goes and reads them. In a real-world scenario, you need those audit events flowing into a centralized SIEM (Security Information and Event Management) system where you can correlate events across your entire infrastructure.

This guide walks through the practical steps to get RHEL audit data into your SIEM.

## Understanding the Audit Log Pipeline

Before jumping into configuration, it helps to understand how data flows from auditd to your SIEM.

```mermaid
graph LR
    A[auditd] --> B[audisp Plugin]
    B --> C[audisp-remote]
    C --> D[SIEM Collector]
    A --> E[/var/log/audit/audit.log]
    E --> F[rsyslog/Filebeat]
    F --> D
```

There are two primary approaches:

1. **audisp-remote** - The audit dispatcher sends events directly to a remote aggregator.
2. **Log shipper** - Tools like rsyslog or Filebeat read from `/var/log/audit/audit.log` and forward them.

## Method 1: Using audisp-remote for Direct Forwarding

The audispd plugin framework ships with RHEL and can forward events in real time.

### Install the remote plugin

```bash
# Install the audisp remote plugin package
sudo dnf install audispd-plugins -y
```

### Configure the remote plugin

Edit the remote plugin configuration:

```bash
sudo vi /etc/audit/plugins.d/au-remote.conf
```

Set the plugin to active:

```
active = yes
direction = out
path = /sbin/audisp-remote
type = always
```

### Set the remote server address

Edit the remote configuration file:

```bash
sudo vi /etc/audit/audisp-remote.conf
```

Configure the target SIEM collector:

```
remote_server = siem.example.com
port = 60
transport = tcp
queue_depth = 2048
overflow_action = syslog
```

The `overflow_action = syslog` setting ensures you get notified if the queue fills up rather than silently dropping events.

### Restart the audit daemon

```bash
# Restart auditd - note that auditd requires the service command, not systemctl restart
sudo service auditd restart
```

### Verify events are flowing

```bash
# Check that the audisp-remote process is running
ps aux | grep audisp-remote

# Look for connection errors in syslog
sudo grep audisp /var/log/messages | tail -20
```

## Method 2: Using rsyslog to Forward Audit Logs

If your SIEM accepts syslog input, rsyslog can read the audit log and forward it.

### Configure rsyslog to read audit logs

Create a new rsyslog configuration file:

```bash
sudo vi /etc/rsyslog.d/audit-forward.conf
```

Add the following configuration:

```
# Load the file input module
module(load="imfile")

# Watch the audit log file
input(type="imfile"
    File="/var/log/audit/audit.log"
    Tag="auditd:"
    Severity="info"
    Facility="local6"
    PersistStateInterval="100"
)

# Forward local6 facility to the SIEM
local6.* action(
    type="omfwd"
    target="siem.example.com"
    port="514"
    protocol="tcp"
    queue.type="LinkedList"
    queue.size="10000"
    queue.filename="audit_fwd"
    queue.saveonshutdown="on"
    action.resumeRetryCount="-1"
)
```

### Restart rsyslog

```bash
sudo systemctl restart rsyslog
sudo systemctl status rsyslog
```

## Method 3: Using Filebeat for Elastic SIEM

If you use Elastic SIEM or the ELK stack, Filebeat has a native auditd module.

### Install Filebeat from the Elastic repository

```bash
# Add the Elastic repository
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch

sudo vi /etc/yum.repos.d/elastic.repo
```

Add the repo definition:

```
[elastic-8.x]
name=Elastic repository for 8.x packages
baseurl=https://artifacts.elastic.co/packages/8.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md
```

```bash
sudo dnf install filebeat -y
```

### Enable the auditd module

```bash
# Enable the built-in auditd module
sudo filebeat modules enable auditd

# Edit the module configuration
sudo vi /etc/filebeat/modules.d/auditd.yml
```

Set the log path:

```yaml
- module: auditd
  log:
    enabled: true
    var.paths:
      - /var/log/audit/audit.log*
```

### Configure Filebeat output

Edit the main Filebeat configuration:

```bash
sudo vi /etc/filebeat/filebeat.yml
```

Point it to your Elasticsearch or Logstash instance:

```yaml
output.elasticsearch:
  hosts: ["https://siem.example.com:9200"]
  username: "filebeat_writer"
  password: "your_password_here"
  ssl.verification_mode: full
```

### Start Filebeat

```bash
sudo systemctl enable --now filebeat
sudo systemctl status filebeat
```

## Enriching Audit Logs Before Forwarding

Raw audit log lines can be cryptic. Before forwarding, you may want to enrich them using ausearch or aureport for human-readable output.

### Create a script to parse and forward enriched logs

```bash
sudo vi /usr/local/bin/audit-enrich.sh
```

```bash
#!/bin/bash
# Parse raw audit events into a more readable format using ausearch
# This runs as a cron job and forwards enriched logs to syslog

LAST_RUN="/var/run/audit-enrich.timestamp"
NOW=$(date +%s)

if [ -f "$LAST_RUN" ]; then
    SINCE=$(cat "$LAST_RUN")
else
    SINCE=$(date -d '5 minutes ago' '+%m/%d/%Y %H:%M:%S')
fi

# Search for events since the last run and interpret them
ausearch --start "$SINCE" --interpret 2>/dev/null | \
    logger -t auditd-enriched -p local6.info

echo "$(date '+%m/%d/%Y %H:%M:%S')" > "$LAST_RUN"
```

```bash
sudo chmod 700 /usr/local/bin/audit-enrich.sh
```

## Verifying the Integration

After setting up forwarding, always verify that events actually arrive at your SIEM.

### Generate a test audit event

```bash
# Trigger a test event by watching a file
sudo auditctl -w /tmp/siem-test -p wa -k siem_integration_test

# Create the watched file to generate an event
touch /tmp/siem-test

# Verify the event was logged locally
sudo ausearch -k siem_integration_test
```

### Check your SIEM

Search your SIEM for events with the key `siem_integration_test`. If they appear within a few seconds, your pipeline is working.

### Clean up the test rule

```bash
sudo auditctl -d -w /tmp/siem-test -p wa -k siem_integration_test
rm -f /tmp/siem-test
```

## Handling High-Volume Environments

In environments with hundreds of audit rules, log volume can be significant. Here are some strategies:

- **Filter at the source** - Only forward critical events using audit rule priorities.
- **Use disk-backed queues** - Both rsyslog and Filebeat support disk-backed queues to handle bursts.
- **Batch events** - Configure your shipper to batch events rather than sending them one at a time.
- **Compress in transit** - Enable compression on your forwarder to reduce bandwidth.

### Check audit log volume

```bash
# See how fast the audit log is growing
sudo du -sh /var/log/audit/
sudo aureport --summary
```

## Securing the Forwarding Channel

Audit logs contain sensitive data. Always encrypt the transport.

For audisp-remote, enable TLS:

```
# In /etc/audit/audisp-remote.conf
transport = tcp
enable_krb5 = no
```

For rsyslog, use TLS with certificate verification:

```
# In /etc/rsyslog.d/audit-forward.conf
action(
    type="omfwd"
    target="siem.example.com"
    port="6514"
    protocol="tcp"
    StreamDriver="gtls"
    StreamDriverMode="1"
    StreamDriverAuthMode="x509/name"
)
```

## Wrapping Up

Getting audit logs off individual servers and into a SIEM is one of the most important steps you can take for security visibility. Whether you go with audisp-remote for simplicity, rsyslog for flexibility, or Filebeat for Elastic integration, the key is to verify the pipeline end-to-end and monitor it for failures. Audit logs are only valuable if they actually reach someone who can act on them.
