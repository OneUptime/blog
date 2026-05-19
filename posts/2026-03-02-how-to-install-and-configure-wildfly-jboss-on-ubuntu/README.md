# How to Install and Configure WildFly (JBoss) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Java, WildFly, JBoss, Application Server

Description: Install and configure WildFly (formerly JBoss) application server on Ubuntu with systemd service management, security hardening, and standalone mode configuration.

---

WildFly is the open-source Java application server that was previously known as JBoss AS. It implements the Jakarta EE Platform and is the upstream project for Red Hat JBoss EAP. If you're running Java EE or Jakarta EE applications - EJBs, JPA with full container management, JMS, JAX-RS, or CDI - WildFly handles all of it out of the box.

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
WILDFLY_VERSION="39.0.1.Final"

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
sudo mkdir -p /etc/sysconfig
```

### WildFly Configuration File

```bash
sudo nano /etc/sysconfig/wildfly-standalone.conf
```

```bash
# /etc/sysconfig/wildfly-standalone.conf
# WildFly configuration

# Java location
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

# Standalone configuration file
WILDFLY_SERVER_CONFIG=standalone.xml

# Bind address for the HTTP/HTTPS connectors
WILDFLY_BIND=0.0.0.0

# Bind address for the management interface
# Keep this on loopback for security
WILDFLY_OPTS="-bmanagement=127.0.0.1"

# JVM options
JAVA_OPTS="-Xms512m -Xmx1024m -XX:+UseG1GC"
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

WildFly provides systemd files in its `bin/systemd` directory. Generate a unit for the `wildfly` user and group:

```bash
cd /opt/wildfly/bin/systemd
sudo ./generate_systemd_unit.sh standalone wildfly wildfly
```

Copy the environment file into the generated systemd directory:

```bash
sudo cp /etc/sysconfig/wildfly-standalone.conf /opt/wildfly/bin/systemd/wildfly-standalone.conf
```

Copy the generated files into place:

```bash
sudo cp /opt/wildfly/bin/systemd/wildfly-standalone.service /etc/systemd/system/
sudo cp /opt/wildfly/bin/systemd/wildfly-standalone.conf /etc/sysconfig/
```

Start WildFly:

```bash
sudo systemctl daemon-reload
sudo systemctl enable wildfly-standalone
sudo systemctl start wildfly-standalone

# Monitor startup (can take 30-60 seconds)
journalctl -u wildfly-standalone.service -f
```

## Verifying WildFly is Running

```bash
# Check service status
sudo systemctl status wildfly-standalone.service

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

```text
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
# Create a keystore resource and generate a test key pair (in production, use a proper certificate)
/subsystem=elytron/key-store=MyKeyStore:add(path=myapp.keystore.pkcs12, relative-to=jboss.server.config.dir, credential-reference={clear-text="keystore-password"}, type=PKCS12)
/subsystem=elytron/key-store=MyKeyStore:generate-key-pair(alias=localhost, algorithm=RSA, key-size=2048, validity=365, credential-reference={clear-text="keystore-password"}, distinguished-name="CN=localhost")
/subsystem=elytron/key-store=MyKeyStore:store()

# Add a key manager
/subsystem=elytron/key-manager=MyKeyManager:add(key-store=MyKeyStore, credential-reference={clear-text="keystore-password"})

# Create an SSL context
/subsystem=elytron/server-ssl-context=MySSLContext:add(key-manager=MyKeyManager, protocols=["TLSv1.3","TLSv1.2"])

# Configure the HTTPS listener
/subsystem=undertow/server=default-server/https-listener=https:write-attribute(name=ssl-context, value=MySSLContext)

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
