# How to Install Logstash on RHEL and Create Your First Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Logstash, ELK Stack, Linux

Description: Learn how to install Logstash and Create Your First Pipeline on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Install Logstash on RHEL and Create Your First Pipeline. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Install Logstash and Create Your First Pipeline requires careful planning and execution. This guide walks through the complete process from installation to verification.

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
/usr/share/logstash/bin/logstash --version
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo tee /etc/logstash/conf.d/first-pipeline.conf > /dev/null <<'EOF'
input {
  file {
    path => "/tmp/logstash-input.log"
    start_position => "beginning"
    sincedb_path => "/dev/null"
  }
}

output {
  file {
    path => "/tmp/logstash-output.log"
    codec => line { format => "%{message}" }
  }
  stdout { codec => rubydebug }
}
EOF
```

Apply the recommended settings for your environment. RPM installs use `/etc/logstash/logstash.yml` for Logstash settings and `/etc/logstash/conf.d/*.conf` for pipeline configuration. Start with the defaults and adjust based on your workload and hardware.

## Step 4: Start and Enable the Service

```bash
echo "hello from logstash" | sudo tee -a /tmp/logstash-input.log
sudo systemctl enable --now logstash
sudo systemctl status logstash
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo /usr/share/logstash/bin/logstash --path.settings /etc/logstash -f /etc/logstash/conf.d/first-pipeline.conf --config.test_and_exit
sudo tail -n 5 /tmp/logstash-output.log
```

Check the logs for any errors:

```bash
sudo journalctl -u logstash -f
```

## Step 6: Configure Firewall Rules

The sample pipeline reads and writes local files, so it does not require a firewall rule. If you later configure a network input, open the port used by that input. For example, a TCP input on port 5000 requires:

```bash
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show logstash --property=MemoryCurrent
top -p $(pgrep -f 'org.logstash.Logstash' | head -n 1)
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

You have successfully configured install logstash and create your first pipeline on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
