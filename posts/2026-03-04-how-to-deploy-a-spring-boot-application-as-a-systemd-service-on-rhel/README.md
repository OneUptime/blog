# How to Deploy a Spring Boot Application as a systemd Service on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Spring Boot, systemd, Java, Deployments

Description: Learn how to deploy a Spring Boot application as a systemd service on RHEL with proper logging, restart policies, and security hardening.

---

Running a Spring Boot application as a systemd service provides automatic startup on boot, restart on failure, and integration with standard RHEL service management tools.

## Prerequisites

```bash
# Ensure Java is installed
sudo dnf install -y java-17-openjdk-headless
```

## Preparing the Application

```bash
# Create an application directory and user
sudo useradd -r -s /sbin/nologin springapp
sudo mkdir -p /opt/springapp /var/log/springapp
sudo chown springapp:springapp /opt/springapp /var/log/springapp

# Copy your JAR file
sudo cp myapp-1.0.0.jar /opt/springapp/myapp.jar
sudo chown springapp:springapp /opt/springapp/myapp.jar
```

## Creating the Application Configuration

```bash
# Create an application.properties or use environment file
cat << 'PROPS' | sudo tee /opt/springapp/application.properties
server.port=8080
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb
spring.datasource.username=appuser
spring.datasource.password=secret
logging.file.name=/var/log/springapp/application.log
PROPS

sudo chown springapp:springapp /opt/springapp/application.properties
sudo chmod 600 /opt/springapp/application.properties
```

## Creating the systemd Service

```bash
cat << 'SERVICE' | sudo tee /etc/systemd/system/springapp.service
[Unit]
Description=Spring Boot Application
After=network.target postgresql.service

[Service]
Type=simple
User=springapp
Group=springapp

# JVM and application configuration
ExecStart=/usr/bin/java \
  -Xms256m -Xmx1g \
  -XX:+UseG1GC \
  -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/var/log/springapp/ \
  -Dspring.config.location=/opt/springapp/application.properties \
  -jar /opt/springapp/myapp.jar

# Restart policy
Restart=on-failure
RestartSec=10

# Security hardening
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
ReadOnlyPaths=/opt/springapp
ReadWritePaths=/var/log/springapp

# File descriptors
LimitNOFILE=65536

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=springapp

[Install]
WantedBy=multi-user.target
SERVICE
```

## Managing the Service

```bash
# Reload systemd and start the service
sudo systemctl daemon-reload
sudo systemctl enable --now springapp

# Check status
sudo systemctl status springapp

# View logs
sudo journalctl -u springapp -f

# Restart after deploying a new JAR
sudo systemctl restart springapp
```

## Graceful Shutdown

Spring Boot supports graceful shutdown. Enable it in your application:

```properties
# application.properties
server.shutdown=graceful
spring.lifecycle.timeout-per-shutdown-phase=30s
```

```bash
# systemd will send SIGTERM and wait
# Increase the stop timeout if needed
# Add to [Service] section:
# TimeoutStopSec=45
```

## Health Check Script

```bash
# Create a health check script
cat << 'HEALTH' | sudo tee /usr/local/bin/springapp-health.sh
#!/bin/bash
curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1
exit $?
HEALTH

sudo chmod +x /usr/local/bin/springapp-health.sh
```

Use the `ProtectSystem`, `NoNewPrivileges`, and `ReadOnlyPaths` directives to restrict the service's access to the filesystem. This follows the principle of least privilege and limits the impact of potential security vulnerabilities.
