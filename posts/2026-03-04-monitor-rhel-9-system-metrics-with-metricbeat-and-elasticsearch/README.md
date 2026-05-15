# How to Monitor RHEL System Metrics with Metricbeat and Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Elasticsearch, ELK Stack, Metricbeat, Monitoring, Linux

Description: Learn how to monitor RHEL System Metrics with Metricbeat and Elasticsearch on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Monitor RHEL System Metrics with Metricbeat and Elasticsearch. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Monitor RHEL System Metrics with Metricbeat and Elasticsearch requires careful planning and execution. This guide walks through the complete process from installation to verification.

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
sudo dnf install -y metricbeat
```

Verify the installation:

```bash
rpm -qi metricbeat
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo vi /etc/metricbeat/metricbeat.yml
```

Set the Elasticsearch output for your environment:

```yaml
output.elasticsearch:
  hosts: ["https://elasticsearch.example.com:9200"]
  api_key: "YOUR_API_KEY"
```

The system module is enabled by default in Metricbeat. To review or adjust it, edit the module configuration:

```bash
sudo vi /etc/metricbeat/modules.d/system.yml
```

Start with the defaults and adjust based on your workload and hardware.

## Step 4: Start and Enable the Service

```bash
sudo metricbeat setup -e
sudo systemctl enable --now metricbeat
sudo systemctl status metricbeat
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo metricbeat test config -e
sudo metricbeat test output -e
```

Check the logs for any errors:

```bash
journalctl -u metricbeat -f
```

## Step 6: Configure Firewall Rules

Metricbeat sends data outbound to Elasticsearch. If Elasticsearch is protected by a host firewall on the same RHEL server, allow its port:

```bash
sudo firewall-cmd --permanent --add-port=9200/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show metricbeat --property=MemoryCurrent
top -p $(pgrep -d, metricbeat)
```

## Security Considerations

- Use a least-privilege Elasticsearch API key or publishing user
- Store sensitive values in the Metricbeat keystore instead of plaintext configuration when possible
- Enable TLS/SSL for Elasticsearch communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u metricbeat -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured Monitor RHEL System Metrics with Metricbeat and Elasticsearch on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
