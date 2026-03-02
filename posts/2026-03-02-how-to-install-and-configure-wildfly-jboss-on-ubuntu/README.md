# How to Install and Configure WildFly (JBoss) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Java, WildFly, JBoss, Application Server

Description: Install and configure WildFly (formerly JBoss) application server on Ubuntu with systemd service management, security hardening, and standalone mode configuration.

---

WildFly is the open-source Java application server that was previously known as JBoss AS. It implements the full Jakarta EE specification and is the upstream project for Red Hat JBoss EAP. If you're running Java EE or Jakarta EE applications - EJBs, JPA with full container management, JMS, JAX-RS, or CDI - WildFly handles all of it out of the box.

## Prerequisites

WildFly requires Java 11 or later. Install OpenJDK:

```bash
sudo apt update
sudo apt install openjdk-21-jdk-headless

java -version
# openjdk version "21.x.x" ...

# Set JAVA_HOME system-wide
echo 'JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"' | sudo tee -a /etc/environment
source /etc/environment
```

## Creating the WildFly User and Group

```bash
sudo groupadd --system wildfly
sudo useradd --system --no-create-home --gid wildfly --shell /bin/false wildfly
```

## Downloading and Installing WildFly

Check the WildFly releases page for the current version. The download is a ZIP or tar.gz archive:

```bash
# Set version variable
WILDFLY_VERSION="31.0.0.Final"

# Download WildFly
wget https://github.com/wildfly/wildfly/releases/download/${WILDFLY_VERSION}/wildfly-${WILDFLY_VERSION}.tar.gz

# Verify with SHA256 (compare hash on GitHub release page)
sha256sum wildfly-${WILDFLY_VERSION}.tar.gz

# Create install directory and extract
sudo mkdir -p /opt/wildfly
sudo tar -xzf wildfly-${WILDFLY_VERSION}.tar.gz -C /opt/wildfly --strip-components=1

# Set ownership
sudo chown -R wildfly:wildfly /opt/wildfly
```

## WildFly Modes

WildFly has two operating modes:

- **Standalone Mode** - Single server instance. This is what most deployments use and what this guide covers.
- **Domain Mode** - Centralized management of multiple server instances. Useful for large clusters.

For standalone mode, the configuration lives in `/opt/wildfly/standalone/configuration/standalone.xml`.

## Configuring WildFly for Standalone Mode

### Create WildFly Configuration Directory

```bash
sudo mkdir -p /etc/wildfly
```

### WildFly Configuration File

```bash
sudo nano /etc/wildfly/wildfly.conf
```

```bash
# /etc/wildfly/wildfly.conf
# WildFly configuration

# The mode to run WildFly in (standalone or domain)
WILDFLY_MODE=standalone

# Bind address for the HTTP/HTTPS connectors
WILDFLY_BIND=0.0.0.0

# Bind address for the management interface
# Keep this on loopback for security
WILDFLY_CONSOLE_BIND=127.0.0.1

# Additional startup options
WILDFLY_OPTS="-Xms512m -Xmx1024m -XX:+UseG1GC"
```

### Security: Configuring the Management Interface

By default, the management console runs on port 9990. Create an admin user before starting WildFly:

```bash
# Add a management user
sudo /opt/wildfly/bin/add-user.sh -u admin -p 'StrongPassword123!' -s

# The -s flag runs silently (non-interactive)
# You can also run it interactively without -u and -p flags
```

## Creating the systemd Service

WildFly provides sample systemd files in its docs directory. Use them as a base:

```bash
# Check if launch.sh exists
ls /opt/wildfly/bin/launch.sh
```

If it doesn't exist, create it:

```bash
sudo nano /opt/wildfly/bin/launch.sh
```

```bash
#!/bin/bash
# /opt/wildfly/bin/launch.sh

WILDFLY_HOME="/opt/wildfly"

if [ "x$WILDFLY_MODE" = "xstandalone" ]; then
    $WILDFLY_HOME/bin/standalone.sh -c $WILDFLY_CONFIG \
        -b $WILDFLY_BIND \
        -bmanagement $WILDFLY_CONSOLE_BIND
else
    $WILDFLY_HOME/bin/domain.sh \
        -b $WILDFLY_BIND \
        -bmanagement $WILDFLY_CONSOLE_BIND
fi
```

```bash
sudo chmod +x /opt/wildfly/bin/launch.sh
sudo chown wildfly:wildfly /opt/wildfly/bin/launch.sh
```

Create the systemd unit file:

```bash
sudo nano /etc/systemd/system/wildfly.service
```

```ini
[Unit]
Description=WildFly Application Server
After=network.target

[Service]
User=wildfly
Group=wildfly

# Load WildFly configuration
EnvironmentFile=/etc/wildfly/wildfly.conf

# Set Java and WildFly environment
Environment=JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
Environment=JBOSS_HOME=/opt/wildfly
Environment=WILDFLY_CONFIG=standalone.xml
Environment=LAUNCH_JBOSS_IN_BACKGROUND=1
Environment=JBOSS_PIDFILE=/opt/wildfly/wildfly.pid

# Start and stop commands
ExecStart=/opt/wildfly/bin/launch.sh
ExecStop=/opt/wildfly/bin/jboss-cli.sh --connect command=:shutdown

# Process type - WildFly forks itself
Type=simple

# Restart policy
Restart=on-failure
RestartSec=30

# Give WildFly time to start (it can be slow on first boot)
TimeoutStartSec=120

# Resource limits
LimitNOFILE=102642

# Logging
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Start WildFly:

```bash
sudo systemctl daemon-reload
sudo systemctl enable wildfly
sudo systemctl start wildfly

# Monitor startup (can take 30-60 seconds)
journalctl -u wildfly.service -f
```

## Verifying WildFly is Running

```bash
# Check service status
sudo systemctl status wildfly.service

# Check if ports are open
ss -tlnp | grep -E '8080|9990'

# Test HTTP response
curl -I http://localhost:8080

# Test management interface
curl -I http://localhost:9990/console
```

## Configuring WildFly with the CLI

The `jboss-cli.sh` tool is the primary way to configure WildFly programmatically:

```bash
# Connect to a running WildFly instance
sudo -u wildfly /opt/wildfly/bin/jboss-cli.sh --connect

# Or connect to a remote instance with credentials
/opt/wildfly/bin/jboss-cli.sh --connect --controller=127.0.0.1:9990 --user=admin --password='StrongPassword123!'
```

Useful CLI commands:

```
# Check server status
[standalone@localhost:9990 /] :read-attribute(name=server-state)

# List deployed applications
[standalone@localhost:9990 /] deployment-info

# Read subsystem configuration
[standalone@localhost:9990 /] /subsystem=undertow:read-resource(recursive=true)

# Graceful shutdown
[standalone@localhost:9990 /] :shutdown(timeout=60)
```

## Deploying Applications

### Deploying a WAR File via CLI

```bash
# Deploy using jboss-cli
sudo -u wildfly /opt/wildfly/bin/jboss-cli.sh \
    --connect \
    --command="deploy /tmp/myapp.war"

# Deploy with a custom context path
sudo -u wildfly /opt/wildfly/bin/jboss-cli.sh \
    --connect \
    --command="deploy /tmp/myapp.war --name=myapp.war --runtime-name=ROOT.war"

# Undeploy
sudo -u wildfly /opt/wildfly/bin/jboss-cli.sh \
    --connect \
    --command="undeploy myapp.war"
```

### Deploying by Dropping Files in the Deployment Directory

WildFly watches the deployments directory:

```bash
# Copy a deployment file (WildFly auto-deploys when it sees it)
sudo cp /tmp/myapp.war /opt/wildfly/standalone/deployments/
sudo chown wildfly:wildfly /opt/wildfly/standalone/deployments/myapp.war

# Watch for deployment markers
ls /opt/wildfly/standalone/deployments/
# myapp.war.deployed  - success
# myapp.war.failed    - check logs for errors
```

## Configuring HTTPS

Add SSL using the CLI:

```bash
sudo -u wildfly /opt/wildfly/bin/jboss-cli.sh --connect << 'EOF'
# Create a keystore (in production, use a proper certificate)
/subsystem=elytron/key-store=MyKeyStore:add(path=/opt/wildfly/conf/myapp.keystore.jks, credential-reference={clear-text="keystore-password"}, type=JKS)

# Add a key manager
/subsystem=elytron/key-manager=MyKeyManager:add(key-store=MyKeyStore, credential-reference={clear-text="keystore-password"})

# Create an SSL context
/subsystem=elytron/server-ssl-context=MySSLContext:add(key-manager=MyKeyManager, protocols=["TLSv1.3","TLSv1.2"])

# Configure the HTTPS listener
/subsystem=undertow/server=default-server/https-listener=https:add(socket-binding=https, ssl-context=MySSLContext, enable-http2=true)

:reload
EOF
```

## Tuning Thread Pools

WildFly uses Undertow as its HTTP server. Tune the worker and IO thread counts:

```bash
sudo -u wildfly /opt/wildfly/bin/jboss-cli.sh --connect << 'EOF'
# Set IO threads (typically 2x CPU count)
/subsystem=io/worker=default:write-attribute(name=io-threads, value=8)

# Set worker threads
/subsystem=io/worker=default:write-attribute(name=task-max-threads, value=64)

:reload
EOF
```

## Log Management

WildFly logs to `/opt/wildfly/standalone/log/`:

```bash
# Follow the server log
sudo tail -f /opt/wildfly/standalone/log/server.log

# Set log level for a specific package
sudo -u wildfly /opt/wildfly/bin/jboss-cli.sh --connect \
    --command="/subsystem=logging/logger=com.myapp:add(level=DEBUG)"
```

WildFly is a comprehensive application server with significant configuration depth. Starting with standalone mode, the default configuration handles most Jakarta EE applications without modification - customization comes later as specific requirements emerge.
