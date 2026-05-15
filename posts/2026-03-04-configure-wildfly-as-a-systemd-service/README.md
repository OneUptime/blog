# How to Configure WildFly as a systemd Service on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, System Administration, WildFly, Java, Linux

Description: Learn how to configure WildFly as a systemd Service on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Configure WildFly as a systemd Service on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- Java SE 11 or later

## Overview

Configuring WildFly as a systemd service requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y java-17-openjdk tar gzip curl
```

## Step 2: Install Required Packages

```bash
cd /tmp
curl -LO https://github.com/wildfly/wildfly/releases/download/38.0.0.Final/wildfly-38.0.0.Final.tar.gz
sudo tar -xzf wildfly-38.0.0.Final.tar.gz -C /opt
sudo ln -sfn /opt/wildfly-38.0.0.Final /opt/wildfly
```

Verify the installation:

```bash
/opt/wildfly/bin/standalone.sh --version
```

## Step 3: Configure the Service

Create the user and group that will run WildFly:

```bash
sudo groupadd -r wildfly
sudo useradd -r -g wildfly -d /opt/wildfly -s /sbin/nologin wildfly
sudo chown -R wildfly:wildfly /opt/wildfly-38.0.0.Final
sudo chown -h wildfly:wildfly /opt/wildfly
```

Generate the systemd unit and edit the environment file:

```bash
cd /opt/wildfly/bin/systemd
sudo ./generate_systemd_unit.sh standalone wildfly wildfly
sudo vi /opt/wildfly/bin/systemd/wildfly-standalone.conf
```

Apply the recommended settings for your environment. Start with the defaults and adjust based on your workload and hardware. For example, set `JAVA_HOME` if your environment requires a specific Java installation.

Copy the generated files into the locations used by systemd and RHEL service configuration:

```bash
sudo cp /opt/wildfly/bin/systemd/wildfly-standalone.service /etc/systemd/system/
sudo cp /opt/wildfly/bin/systemd/wildfly-standalone.conf /etc/sysconfig/
sudo systemctl daemon-reload
```

## Step 4: Start and Enable the Service

```bash
sudo systemctl enable --now wildfly-standalone
sudo systemctl status wildfly-standalone
```

## Step 5: Verify the Configuration

Test the setup:

```bash
systemctl is-active wildfly-standalone
systemctl is-enabled wildfly-standalone
curl http://127.0.0.1:8080/
```

Check the logs for any errors:

```bash
journalctl -u wildfly-standalone -f
```

## Step 6: Configure Firewall Rules

If the service needs network access:

```bash
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show wildfly-standalone --property=MemoryCurrent
top -p $(systemctl show wildfly-standalone --property=MainPID --value)
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u wildfly-standalone -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured WildFly as a systemd service on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
