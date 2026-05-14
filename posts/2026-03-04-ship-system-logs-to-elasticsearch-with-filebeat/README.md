# How to Ship System Logs to Elasticsearch with Filebeat on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Elasticsearch, ELK Stack, Filebeat, Linux

Description: Learn how to ship System Logs to Elasticsearch with Filebeat on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Ship System Logs to Elasticsearch with Filebeat on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A reachable Elasticsearch cluster and credentials or an API key

## Overview

Shipping System Logs to Elasticsearch with Filebeat requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y curl ca-certificates
```

## Step 2: Install Required Packages

```bash
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch
sudo tee /etc/yum.repos.d/elastic-9.x.repo >/dev/null <<'EOF'
[elastic-9.x]
name=Elastic repository for 9.x packages
baseurl=https://artifacts.elastic.co/packages/9.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md
EOF
sudo dnf install -y filebeat
```

Verify the installation:

```bash
rpm -qi filebeat
filebeat version
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo vi /etc/filebeat/filebeat.yml
```

Configure the Elasticsearch output for your environment. For example:

```yaml
output.elasticsearch:
  hosts: ["https://elasticsearch.example.com:9200"]
  api_key: "YOUR_API_KEY"
```

Enable the Filebeat system module and make sure the `syslog` and `auth` filesets are enabled:

```bash
sudo filebeat modules enable system
sudo vi /etc/filebeat/modules.d/system.yml
```

For RHEL hosts that write system logs to journald, use:

```yaml
- module: system
  syslog:
    enabled: true
    var.use_journald: true
  auth:
    enabled: true
    var.use_journald: true
```

## Step 4: Start and Enable the Service

```bash
sudo filebeat setup -e
sudo systemctl enable --now filebeat
sudo systemctl status filebeat
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo filebeat test config -e
sudo filebeat test output -e
```

Check the logs for any errors:

```bash
journalctl -u filebeat.service -f
```

## Step 6: Configure Firewall Rules

Filebeat sends data outbound to Elasticsearch and normally does not require an inbound firewall rule on the RHEL host. If a local firewall blocks outbound traffic, allow access to the Elasticsearch endpoint and test connectivity:

```bash
curl -I https://elasticsearch.example.com:9200
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show filebeat --property=MemoryCurrent
top -p $(pidof filebeat)
```

## Security Considerations

- Filebeat often needs elevated permissions to read system logs; keep its configuration files owned by root and limit permissions
- Enable TLS/SSL for Elasticsearch communication
- Store API keys and passwords in the Filebeat keystore instead of hard-coding them in `filebeat.yml`
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u filebeat.service -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Elasticsearch connection fails**: Run `sudo filebeat test output -e` and verify the host, TLS settings, and credentials

## Conclusion

You have successfully configured Filebeat to ship system logs to Elasticsearch on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
