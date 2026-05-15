# How to Configure Filebeat Modules for Apache, Nginx, and System Logs on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Filebeat, Log Aggregation, Nginx, Linux

Description: Learn how to configure Filebeat Modules for Apache, Nginx, and System Logs on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Configure Filebeat Modules for Apache, Nginx, and System Logs on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- Access to an Elasticsearch or Elastic Cloud deployment, or to Logstash configured for Beats input

## Overview

Configuring Filebeat Modules for Apache, Nginx, and System Logs requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y curl
```

## Step 2: Install Required Packages

Import Elastic's package signing key and add the Elastic YUM repository:

```bash
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch
sudo tee /etc/yum.repos.d/elastic.repo >/dev/null <<'EOF'
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

Create or edit the main Filebeat configuration file:

```bash
sudo vi /etc/filebeat/filebeat.yml
```

Set one output for your environment. For Elasticsearch or Elastic Cloud, configure `cloud.id` and `cloud.auth`, or configure `output.elasticsearch`. For Logstash, disable the Elasticsearch output and configure `output.logstash`.

```yaml
# Elastic Cloud example
cloud.id: "YOUR_CLOUD_ID"
cloud.auth: "filebeat_writer:YOUR_PASSWORD"
```

```yaml
# Self-managed Elasticsearch example
output.elasticsearch:
  hosts: ["https://elasticsearch.example.com:9200"]
  username: "filebeat_writer"
  password: "YOUR_PASSWORD"
```

```yaml
# Logstash example
output.logstash:
  hosts: ["logstash.example.com:5044"]
```

Enable the Apache, Nginx, and System modules:

```bash
sudo filebeat modules enable apache nginx system
```

Then adjust the enabled filesets in `/etc/filebeat/modules.d/apache.yml`, `/etc/filebeat/modules.d/nginx.yml`, and `/etc/filebeat/modules.d/system.yml`. Filesets are disabled by default, so enable at least one fileset in each module. On RHEL, the common paths are:

```yaml
# /etc/filebeat/modules.d/apache.yml
- module: apache
  access:
    enabled: true
    var.paths: ["/var/log/httpd/access_log*"]
  error:
    enabled: true
    var.paths: ["/var/log/httpd/error_log*"]
```

```yaml
# /etc/filebeat/modules.d/nginx.yml
- module: nginx
  access:
    enabled: true
    var.paths: ["/var/log/nginx/access.log*"]
  error:
    enabled: true
    var.paths: ["/var/log/nginx/error.log*"]
```

```yaml
# /etc/filebeat/modules.d/system.yml
- module: system
  syslog:
    enabled: true
    var.paths: ["/var/log/messages*"]
  auth:
    enabled: true
    var.paths: ["/var/log/secure*"]
```

## Step 4: Start and Enable the Service

Load Filebeat assets before starting the service. If you send events directly to Elasticsearch, Filebeat can load module ingest pipelines automatically on first connection. If you send events through Logstash, load the ingest pipelines manually:

```bash
sudo filebeat setup --pipelines --modules apache,nginx,system --force-enable-module-filesets
```

Then start and enable Filebeat:

```bash
sudo systemctl enable --now filebeat
sudo systemctl status filebeat
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo filebeat test config
sudo filebeat test output
```

Check the logs for any errors:

```bash
journalctl -u filebeat -f
```

## Step 6: Configure Firewall Rules

Filebeat usually initiates outbound connections to Elasticsearch, Elastic Cloud, or Logstash and does not require an inbound firewall service rule on the RHEL host. Verify that the host can reach the configured output port, such as 443 for Elastic Cloud, 9200 for Elasticsearch, or 5044 for Logstash:

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

- Protect `/etc/filebeat/filebeat.yml` and files in `/etc/filebeat/modules.d/` because they can contain credentials
- Enable TLS/SSL for Elasticsearch or Logstash communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`
- Store sensitive values in the Filebeat keystore when possible

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u filebeat -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Output connection fails**: Run `sudo filebeat test output` and verify the configured host, port, credentials, and TLS settings
4. **No parsed Apache, Nginx, or system events**: Confirm the module filesets are enabled and that `var.paths` matches the actual log files on the RHEL host

## Conclusion

You have successfully configured Filebeat modules for Apache, Nginx, and system logs on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
