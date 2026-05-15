# How to Configure Logstash Grok Filters for Custom Log Formats on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Logstash, ELK Stack, Log Parsing, Linux

Description: Learn how to configure Logstash Grok Filters for Custom Log Formats on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Configure Logstash Grok Filters for Custom Log Formats on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Configure Logstash Grok Filters for Custom Log Formats requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch
sudo tee /etc/yum.repos.d/logstash.repo > /dev/null <<'EOF'
[logstash-9.x]
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
sudo dnf install -y logstash
```

Verify the installation:

```bash
rpm -qi logstash
sudo /usr/share/logstash/bin/logstash --version
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo vi /etc/logstash/conf.d/custom-grok.conf
```

Apply the recommended settings for your environment. Start with a simple pipeline and adjust the Grok pattern based on your log format:

```conf
input {
  file {
    path => "/var/log/custom-app.log"
    start_position => "beginning"
    sincedb_path => "/var/lib/logstash/custom-app.sincedb"
  }
}

filter {
  grok {
    match => {
      "message" => "%{TIMESTAMP_ISO8601:log_timestamp} %{LOGLEVEL:log_level} service=%{DATA:service} user=%{USERNAME:user} action=%{WORD:action} status=%{INT:status:int}"
    }
  }
}

output {
  stdout {
    codec => rubydebug
  }
}
```

This example matches log lines in this format:

```text
2026-03-04T12:00:00Z INFO service=checkout user=alice action=login status=200
```

## Step 4: Start and Enable the Service

```bash
sudo systemctl enable --now logstash
sudo systemctl status logstash
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo /usr/share/logstash/bin/logstash --path.settings /etc/logstash -f /etc/logstash/conf.d/custom-grok.conf --config.test_and_exit
```

Check the logs for any errors:

```bash
journalctl -u logstash -f
```

## Step 6: Configure Firewall Rules

If Logstash is configured to receive network input, such as Beats input on port 5044:

```bash
sudo firewall-cmd --permanent --add-port=5044/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show logstash --property=MemoryCurrent
top -p "$(systemctl show -p MainPID --value logstash)"
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u logstash -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured Logstash Grok filters for custom log formats on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
