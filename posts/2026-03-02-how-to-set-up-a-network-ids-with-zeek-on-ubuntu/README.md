# How to Set Up a Network IDS with Zeek on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Network Monitoring, Zeek, IDS

Description: Learn how to install and configure Zeek (formerly Bro) as a network intrusion detection system on Ubuntu to analyze traffic and detect threats.

---

Zeek (formerly known as Bro) is a powerful network analysis framework that sits on top of your network traffic and generates structured logs of network activity. Unlike signature-based IDS tools like Snort, Zeek is a scripting platform - it parses protocols, extracts metadata, and lets you write custom detection logic. The result is detailed, structured logs covering DNS queries, HTTP requests, TLS connections, file transfers, and more. This makes it valuable both for threat detection and for forensic investigation of security incidents.

## Architecture Overview

Zeek typically operates in two modes:

- **Standalone mode** - single node capturing and analyzing traffic
- **Cluster mode** - distributed setup with a manager, proxy, and worker nodes for high-bandwidth environments

This guide covers standalone mode, which is appropriate for networks under ~10 Gbps.

## Prerequisites

You need either a network tap, a monitor port (SPAN port) on a switch, or a server with direct network access to the traffic you want to inspect. The interface used for capture should be set to promiscuous mode and should not have an IP address assigned (to avoid generating traffic that appears in your captures).

## Installing Zeek

Zeek provides official packages for Ubuntu via its own repository:

```bash
# Install dependencies
sudo apt update
sudo apt install -y curl gnupg

# Add the Zeek repository (for Ubuntu 22.04)
echo 'deb http://download.opensuse.org/repositories/security:/zeek/xUbuntu_22.04/ /' | \
    sudo tee /etc/apt/sources.list.d/security:zeek.list

curl -fsSL https://download.opensuse.org/repositories/security:/zeek/xUbuntu_22.04/Release.key | \
    gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/security_zeek.gpg > /dev/null

sudo apt update

# Install Zeek (LTS version recommended for production)
sudo apt install zeek-lts
```

Add Zeek to your PATH:

```bash
echo 'export PATH=/opt/zeek/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## Basic Configuration

The main Zeek configuration lives in `/opt/zeek/etc/`:

```bash
# Edit node configuration
sudo nano /opt/zeek/etc/node.cfg
```

```ini
# /opt/zeek/etc/node.cfg - standalone configuration
[zeek]
type=standalone
host=localhost
interface=eth1     # The interface to capture traffic on
```

Configure local networks so Zeek knows which traffic is internal:

```bash
sudo nano /opt/zeek/etc/networks.cfg
```

```text
# /opt/zeek/etc/networks.cfg
# Define your internal network ranges
10.0.0.0/8         Private RFC 1918 space
172.16.0.0/12      Private RFC 1918 space
192.168.0.0/16     Private RFC 1918 space
```

Configure the main Zeek settings:

```bash
sudo nano /opt/zeek/etc/zeekctl.cfg
```

```ini
# /opt/zeek/etc/zeekctl.cfg
MailTo = admin@example.com
LogRotationInterval = 3600    # Rotate logs hourly
LogExpireInterval = 30days    # Keep logs for 30 days
StatusCmdShowAll = 0
```

## Deploying Zeek

Use `zeekctl` to manage Zeek:

```bash
# Deploy the configuration
sudo zeekctl deploy

# Check status
zeekctl status

# Start Zeek
zeekctl start

# Stop Zeek
zeekctl stop
```

Zeek writes logs to `/opt/zeek/logs/current/`. You'll see files like:

```bash
ls /opt/zeek/logs/current/
# conn.log      - all connections
# dns.log       - DNS queries and responses
# http.log      - HTTP requests
# ssl.log       - TLS/SSL connection metadata
# files.log     - files observed in traffic
# notice.log    - IDS alerts and notices
# weird.log     - protocol anomalies
# x509.log      - certificate details
```

## Understanding Zeek Logs

The log files are tab-separated by default. Look at a DNS log entry:

```bash
# View recent DNS queries
zeek-cut ts uid query qtype_name answers < /opt/zeek/logs/current/dns.log | head -20

# Find all queries for a specific domain
zeek-cut ts query answers < /opt/zeek/logs/current/dns.log | grep "suspicious-domain.com"
```

The conn.log has connection summaries useful for threat hunting:

```bash
# Find large outbound transfers (potential data exfiltration)
zeek-cut id.orig_h id.resp_h orig_bytes resp_bytes service < /opt/zeek/logs/current/conn.log | \
    awk '$4 > 100000000' | sort -k4 -rn | head -20

# Find connections to rare ports
zeek-cut id.orig_h id.resp_h id.resp_p service < /opt/zeek/logs/current/conn.log | \
    awk '$4 == "-"' | sort | uniq -c | sort -rn | head -20
```

## Writing Zeek Scripts

Zeek's scripting language allows custom detection logic. Scripts go in `/opt/zeek/share/zeek/site/local.zeek`:

```zeek
# /opt/zeek/share/zeek/site/local.zeek

# Load common scripts
@load base/frameworks/notice
@load policy/protocols/conn/known-hosts
@load policy/protocols/conn/known-services

# Detect SSH brute force
redef enum Notice::Type += {
    SSH::Password_Guessing
};

# Alert on cleartext HTTP POST with credentials
event http_message_done(c: connection, is_orig: bool, stat: http_message_stat)
{
    if ( is_orig && c$http?$uri && /login/ in c$http$uri )
    {
        NOTICE([
            $note = HTTP::Sensitive_URI,
            $conn = c,
            $msg = fmt("Potential credential submission over HTTP: %s", c$http$uri),
            $identifier = cat(c$id$orig_h, c$http$uri)
        ]);
    }
}
```

## Installing Zeek Packages

Zeek has a package manager called `zkg` with community scripts:

```bash
# Initialize the package manager
zkg autoconfig

# Install useful detection packages
zkg install zeek/corelight/zeek-community-id    # Add community ID to logs
zkg install zeek/sethhall/domain_tld             # Track TLD usage
zkg install zeek/cve-2021-44228                  # Log4Shell detection

# List installed packages
zkg list installed

# Refresh installed packages
zkg refresh
zkg upgrade
```

After installing packages, redeploy Zeek:

```bash
zeekctl deploy
```

## Integrating with JSON Logging

For integration with SIEM systems like Splunk or Elastic, configure JSON output:

```bash
# Add to /opt/zeek/share/zeek/site/local.zeek
echo '@load policy/tuning/json-logs' | sudo tee -a /opt/zeek/share/zeek/site/local.zeek

# Redeploy to apply
sudo zeekctl deploy
```

With JSON logging enabled, logs can be shipped to Elasticsearch using Filebeat:

```yaml
# /etc/filebeat/inputs.d/zeek.yml
- type: log
  enabled: true
  paths:
    - /opt/zeek/logs/current/*.log
  json.keys_under_root: true
  json.add_error_key: true
  fields:
    source: zeek
  fields_under_root: true
```

## Scheduled Maintenance

Set up cron to run Zeek maintenance tasks:

```bash
# Run zeekctl cron every 5 minutes - handles crashes, log rotation, stats
echo '*/5 * * * * /opt/zeek/bin/zeekctl cron' | sudo crontab -
```

Zeek gives you deep network visibility without the false-positive noise of signature-based IDS. The structured logs are particularly valuable when correlating events during incident response - you can quickly answer questions like "what DNS queries did this host make in the 30 minutes before the breach?" with a single command.
