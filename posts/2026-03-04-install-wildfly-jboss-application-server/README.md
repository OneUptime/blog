# How to Install WildFly (JBoss) Application Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, WildFly, Java, Linux

Description: Learn how to install WildFly (JBoss) Application Server on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Install WildFly (JBoss) Application Server on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- Red Hat Subscription Manager access to the RHEL repositories

## Overview

Installing WildFly (JBoss) Application Server requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y java-21-openjdk-devel wget curl tar gzip firewalld
java -version
```

## Step 2: Install Required Packages

```bash
cd /tmp
wget https://github.com/wildfly/wildfly/releases/download/39.0.1.Final/wildfly-39.0.1.Final.tar.gz
sudo tar -xzf wildfly-39.0.1.Final.tar.gz -C /opt
sudo ln -sfn /opt/wildfly-39.0.1.Final /opt/wildfly
```

Verify the installation:

```bash
readlink -f /opt/wildfly
test -x /opt/wildfly/bin/standalone.sh
```

## Step 3: Configure the Service

Create a dedicated user and generate the systemd service files shipped with WildFly:

```bash
sudo groupadd -r wildfly
sudo useradd -r -g wildfly -d /opt/wildfly -s /sbin/nologin wildfly
sudo chown -R wildfly:wildfly /opt/wildfly-39.0.1.Final
cd /opt/wildfly/bin/systemd
sudo ./generate_systemd_unit.sh standalone wildfly wildfly
```

Create or edit the main service configuration file:

```bash
sudo vi /opt/wildfly/bin/systemd/wildfly-standalone.conf
```

Set `JAVA_HOME` if your server does not already use the expected Java installation. Start with the defaults and adjust based on your workload and hardware.

## Step 4: Start and Enable the Service

```bash
sudo cp /opt/wildfly/bin/systemd/wildfly-standalone.service /etc/systemd/system/
sudo cp /opt/wildfly/bin/systemd/wildfly-standalone.conf /etc/sysconfig/
sudo systemctl daemon-reload
sudo systemctl enable --now wildfly-standalone
sudo systemctl status wildfly-standalone
```

## Step 5: Verify the Configuration

Test the setup:

```bash
curl -I http://127.0.0.1:8080/
```

Check the logs for any errors:

```bash
journalctl -u wildfly-standalone -f
```

## Step 6: Configure Firewall Rules

If the service needs network access, open the default WildFly HTTP port:

```bash
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

Only open the management port for trusted administration networks:

```bash
sudo firewall-cmd --permanent --add-port=9990/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show wildfly-standalone --property=MemoryCurrent
top -p "$(pgrep -f 'org.jboss.as.standalone' | paste -sd, -)"
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

You have successfully configured WildFly (JBoss) Application Server on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
