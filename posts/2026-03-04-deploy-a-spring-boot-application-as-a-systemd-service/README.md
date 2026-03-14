# How to Deploy a Spring Boot Application as a systemd Service on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, System Administration, Spring Boot, Java, Linux

Description: Learn how to deploy a Spring Boot Application as a systemd Service on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Spring Boot applications can be deployed as standalone executables that run as systemd services on RHEL 9. This approach provides automatic startup, restart on failure, and integration with system logging.

## Prerequisites

- RHEL 9 with OpenJDK 17 installed
- A Spring Boot JAR file
- Root or sudo access

## Step 1: Create Application User

```bash
sudo useradd -r -s /sbin/nologin springapp
sudo mkdir -p /opt/springapp
sudo chown springapp:springapp /opt/springapp
```

## Step 2: Deploy the JAR

```bash
sudo cp myapp-1.0.0.jar /opt/springapp/myapp.jar
sudo chown springapp:springapp /opt/springapp/myapp.jar
```

## Step 3: Create Configuration

```bash
sudo vi /opt/springapp/application.properties
```

```properties
server.port=8080
spring.profiles.active=production
logging.file.name=/var/log/springapp/application.log
```

```bash
sudo mkdir -p /var/log/springapp
sudo chown springapp:springapp /var/log/springapp
```

## Step 4: Create systemd Service

```bash
sudo vi /etc/systemd/system/springapp.service
```

```ini
[Unit]
Description=Spring Boot Application
After=network.target

[Service]
Type=simple
User=springapp
Group=springapp
ExecStart=/usr/bin/java -Xms256m -Xmx512m -jar /opt/springapp/myapp.jar --spring.config.location=/opt/springapp/application.properties
Restart=on-failure
RestartSec=10
SuccessExitStatus=143
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

## Step 5: Start and Enable

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now springapp
sudo systemctl status springapp
```

## Step 6: View Logs

```bash
journalctl -u springapp -f
```

## Step 7: Graceful Shutdown

Spring Boot supports graceful shutdown. Add to application.properties:

```properties
server.shutdown=graceful
spring.lifecycle.timeout-per-shutdown-phase=30s
```

systemd sends SIGTERM, and Spring Boot completes in-flight requests before exiting.

## Step 8: Health Check Integration

Use the Spring Boot Actuator health endpoint with systemd watchdog:

```ini
[Service]
Type=notify
WatchdogSec=60
```

## Conclusion

Running Spring Boot as a systemd service on RHEL 9 provides production-grade process management with automatic restarts, logging integration, and graceful shutdown support. This is the recommended deployment method for standalone Spring Boot applications.
