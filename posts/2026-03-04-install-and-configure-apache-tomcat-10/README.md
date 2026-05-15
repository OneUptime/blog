# How to Install and Configure Apache Tomcat 10 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Tomcat, Java, Linux

Description: Learn how to install and Configure Apache Tomcat 10 on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Install and Configure Apache Tomcat 10 on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- Java 11 or later; this guide uses OpenJDK 17

## Overview

Installing and configuring Apache Tomcat 10 requires Java, the Tomcat binary distribution, a dedicated service account, and a systemd unit. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y java-17-openjdk curl tar gzip
```

## Step 2: Install Required Packages

```bash
TOMCAT_VERSION=10.1.55
curl -fLO https://downloads.apache.org/tomcat/tomcat-10/v${TOMCAT_VERSION}/bin/apache-tomcat-${TOMCAT_VERSION}.tar.gz
curl -fLO https://downloads.apache.org/tomcat/tomcat-10/v${TOMCAT_VERSION}/bin/apache-tomcat-${TOMCAT_VERSION}.tar.gz.sha512
sha512sum -c apache-tomcat-${TOMCAT_VERSION}.tar.gz.sha512
sudo mkdir -p /opt/tomcat
sudo tar xzf apache-tomcat-${TOMCAT_VERSION}.tar.gz -C /opt/tomcat --strip-components=1
sudo useradd --system --home-dir /opt/tomcat --shell /sbin/nologin tomcat
sudo chown -R tomcat:tomcat /opt/tomcat
sudo chmod +x /opt/tomcat/bin/*.sh
```

Verify the installation:

```bash
java -version
/opt/tomcat/bin/catalina.sh version
```

## Step 3: Configure the Service

Create the systemd service file:

```bash
sudo vi /etc/systemd/system/tomcat.service
```

Use this service definition:

```ini
[Unit]
Description=Apache Tomcat 10
After=network.target

[Service]
Type=forking
User=tomcat
Group=tomcat
Environment="CATALINA_HOME=/opt/tomcat"
Environment="CATALINA_BASE=/opt/tomcat"
Environment="CATALINA_PID=/opt/tomcat/temp/tomcat.pid"
Environment="CATALINA_OPTS=-Xms512M -Xmx1024M -XX:+UseG1GC"
ExecStart=/opt/tomcat/bin/startup.sh
ExecStop=/opt/tomcat/bin/shutdown.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Apply the recommended settings for your environment. Start with the defaults and adjust `CATALINA_OPTS` based on your workload and hardware.

## Step 4: Start and Enable the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tomcat
sudo systemctl status tomcat
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo -u tomcat /opt/tomcat/bin/catalina.sh configtest
curl -I http://localhost:8080/
```

Check the logs for any errors:

```bash
journalctl -u tomcat -f
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
systemctl show tomcat --property=MemoryCurrent
top -p $(pgrep -d, -f 'org.apache.catalina.startup.Bootstrap')
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u tomcat -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully installed and configured Apache Tomcat 10 on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
