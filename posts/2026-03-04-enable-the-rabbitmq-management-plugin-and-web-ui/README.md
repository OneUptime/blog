# How to Enable the RabbitMQ Management Plugin and Web UI on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RabbitMQ, Message Broker, Linux

Description: Learn how to enable the RabbitMQ Management Plugin and Web UI on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Enable the RabbitMQ Management Plugin and Web UI on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Enable the RabbitMQ Management Plugin and Web UI requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y logrotate
```

## Step 2: Install Required Packages

If RabbitMQ is not already installed, configure the official RabbitMQ and Erlang RPM repositories for your RHEL version, then install the server package:

```bash
sudo dnf install -y rabbitmq-server
```

Verify the installation:

```bash
rpm -qi rabbitmq-server
```

## Step 3: Configure the Service

Enable the RabbitMQ management plugin:

```bash
sudo rabbitmq-plugins enable rabbitmq_management
```

The management UI uses port `15672` by default. If you need to set it explicitly, create or edit the main RabbitMQ configuration file:

```bash
sudo vi /etc/rabbitmq/rabbitmq.conf
```

Add the management listener setting:

```ini
management.tcp.port = 15672
```

## Step 4: Start and Enable the Service

```bash
sudo systemctl enable --now rabbitmq-server
sudo systemctl status rabbitmq-server
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo rabbitmq-diagnostics -q ping
sudo rabbitmq-diagnostics -s listeners
```

Check the logs for any errors:

```bash
journalctl -u rabbitmq-server -f
```

Open the management UI from the server or an allowed client:

```text
http://localhost:15672/
```

## Step 6: Configure Firewall Rules

If the management UI needs network access from another host, open the management UI port:

```bash
sudo firewall-cmd --permanent --add-port=15672/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show rabbitmq-server --property=MemoryCurrent
top -p $(pidof beam.smp)
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u rabbitmq-server -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port
4. **Remote login with guest fails**: The default `guest` user can only connect from localhost. Create a separate user for remote management access.

## Conclusion

You have successfully configured enable the rabbitmq management plugin and web ui on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
