# How to Set Up Filebeat for Shipping Logs to Elasticsearch on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Filebeat, Log Aggregation, Elasticsearch, ELK Stack, Linux

Description: Learn how to set Up Filebeat for Shipping Logs to Elasticsearch on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Set Up Filebeat for Shipping Logs to Elasticsearch on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Set Up Filebeat for Shipping Logs to Elasticsearch requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Import Elastic's package signing key:

```bash
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch
```

Create the Elastic YUM repository definition:

```bash
sudo tee /etc/yum.repos.d/elastic.repo > /dev/null <<'EOF'
[elastic-9.x]
name=Elastic repository for 9.x packages
baseurl=https://artifacts.elastic.co/packages/9.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md
EOF
```

## Step 2: Install Required Packages

```bash
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

Configure Filebeat inputs and the Elasticsearch output for your environment. This example reads common RHEL log files and sends events to Elasticsearch over HTTPS:

```yaml
filebeat.inputs:
  - type: filestream
    id: rhel-system-logs
    paths:
      - /var/log/messages
      - /var/log/secure

output.elasticsearch:
  hosts: ["https://elasticsearch.example.com:9200"]
  username: "filebeat_internal"
  password: "YOUR_PASSWORD"
  ssl:
    certificate_authorities: ["/etc/filebeat/certs/http_ca.crt"]
```

If you are using Elastic Cloud Hosted, configure `cloud.id` and `cloud.auth` instead of the manual `output.elasticsearch` connection settings.

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
sudo journalctl -u filebeat.service -f
```

## Step 6: Configure Firewall Rules

Filebeat usually does not require an inbound firewall rule because it opens outbound connections to Elasticsearch or Logstash. Allow outbound access to your Elasticsearch endpoint if your host firewall or network policy restricts egress:

```bash
sudo firewall-cmd --list-all
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show filebeat --property=MemoryCurrent
top -p $(pidof filebeat)
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u filebeat.service -xe` for error messages
2. **Permission denied**: Verify log file permissions and SELinux contexts with `ls -laZ`
3. **Connection issues**: Use `filebeat test output -e` to verify that Filebeat can reach Elasticsearch

## Conclusion

You have successfully configured Filebeat for shipping logs to Elasticsearch on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
