# How to Install and Configure Kibana on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kibana, ELK Stack, Linux

Description: Learn how to install and Configure Kibana on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Install and Configure Kibana on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A running Elasticsearch node that uses the same Elastic Stack version as Kibana

## Overview

Install and Configure Kibana requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch
```

## Step 2: Install Required Packages

```bash
sudo tee /etc/yum.repos.d/kibana.repo > /dev/null <<'EOF'
[kibana-9.x]
name=Kibana repository for 9.x packages
baseurl=https://artifacts.elastic.co/packages/9.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md
EOF

sudo dnf install -y kibana
```

Verify the installation:

```bash
rpm -qi kibana
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo vi /etc/kibana/kibana.yml
```

Apply the recommended settings for your environment. The RPM package reads Kibana settings from `/etc/kibana/kibana.yml`. To allow remote users to connect, set the host and port:

```yaml
server.host: "0.0.0.0"
server.port: 5601
```

If your enrollment token has expired, generate a new Kibana enrollment token on the Elasticsearch host:

```bash
sudo /usr/share/elasticsearch/bin/elasticsearch-create-enrollment-token -s kibana
```

## Step 4: Start and Enable the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now kibana.service
sudo systemctl status kibana.service
```

## Step 5: Verify the Configuration

Test the setup:

```bash
curl -I http://localhost:5601
```

Check the logs for any errors:

```bash
journalctl -u kibana.service -f
```

## Step 6: Configure Firewall Rules

If the service needs network access:

```bash
sudo firewall-cmd --permanent --add-port=5601/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show kibana.service --property=MainPID,MemoryCurrent
top -p "$(systemctl show kibana.service --property=MainPID --value)"
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u kibana.service -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured Kibana on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
