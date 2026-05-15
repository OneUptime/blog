# How to Set Up Logstash Alternative Fluent Bit on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ELK Stack, Logging, Linux

Description: Step-by-step guide on set up logstash alternative fluent bit using Red Hat Enterprise Linux 9.

---

Setting up Logstash Alternative Fluent Bit on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Fluent Bit

Create the Fluent Bit Yum repository file:

```bash
sudo vi /etc/yum.repos.d/fluent-bit.repo
```

For CentOS Stream 9, add the following repository configuration:

```ini
[fluent-bit]
name=Fluent Bit
baseurl=https://packages.fluentbit.io/centos/$releasever/$basearch/
gpgcheck=1
gpgkey=https://packages.fluentbit.io/fluentbit.key
repo_gpgcheck=1
enabled=1
```

For RHEL 9, use the AlmaLinux or Rocky Linux repository path instead, because Fluent Bit does not publish a dedicated RHEL 9 repository:

```ini
[fluent-bit]
name=Fluent Bit
baseurl=https://packages.fluentbit.io/almalinux/9/$basearch/
gpgcheck=1
gpgkey=https://packages.fluentbit.io/fluentbit.key
repo_gpgcheck=1
enabled=1
```

Install Fluent Bit:

```bash
sudo yum install fluent-bit
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/fluent-bit/fluent-bit.conf
```

Adjust the settings according to your requirements. For example, the following configuration reads `journald` entries and writes them to standard output:

```ini
[SERVICE]
  Flush        1
  Log_Level    info

[INPUT]
  Name  systemd
  Tag   host.*

[OUTPUT]
  Name   stdout
  Match  *
```

```bash
# Restart the service to apply changes
sudo systemctl restart fluent-bit
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable fluent-bit

# Start the service
sudo systemctl start fluent-bit

# Check the status
sudo systemctl status fluent-bit
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status fluent-bit

# Review recent logs
journalctl -u fluent-bit --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u fluent-bit -e --no-pager`.
- Ensure the package is installed: `rpm -qa | grep fluent-bit`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
