# How to Install and Configure Tomcat on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Java, Tomcat, Web Server, Deployment

Description: Install and configure Apache Tomcat on Ubuntu, set up a dedicated service user, configure systemd, and deploy web applications securely.

---

Apache Tomcat is a widely used Java servlet container for running Java web applications (.war files). Setting it up correctly on Ubuntu involves more than running the installer - you need a dedicated service user, proper directory permissions, a systemd unit, and some basic security hardening.

## Prerequisites

Tomcat requires Java. Install OpenJDK first:

```bash
sudo apt update
sudo apt install openjdk-21-jdk-headless

# Verify
java -version
```

Set JAVA_HOME:

```bash
echo 'JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"' | sudo tee -a /etc/environment
source /etc/environment
```

## Creating a Dedicated Tomcat User

Never run Tomcat as root. Create a system user that owns the Tomcat process:

```bash
# Create a system group and user for Tomcat
sudo groupadd --system tomcat
sudo useradd --system --no-create-home --gid tomcat --shell /bin/false tomcat
```

## Downloading Tomcat

Download Tomcat directly from Apache's official mirrors. Find the latest version at [tomcat.apache.org](https://tomcat.apache.org):

```bash
# Download Tomcat 10.x (check for latest version on official site)
TOMCAT_VERSION="10.1.20"
wget https://downloads.apache.org/tomcat/tomcat-10/v${TOMCAT_VERSION}/bin/apache-tomcat-${TOMCAT_VERSION}.tar.gz

# Verify the download with SHA512 checksum (compare against Apache's published hash)
sha512sum apache-tomcat-${TOMCAT_VERSION}.tar.gz
```

## Installing Tomcat

```bash
# Create installation directory
sudo mkdir -p /opt/tomcat

# Extract Tomcat
sudo tar -xzf apache-tomcat-${TOMCAT_VERSION}.tar.gz -C /opt/tomcat --strip-components=1

# Set ownership to the tomcat user
sudo chown -R tomcat:tomcat /opt/tomcat

# Set permissions
# Executable scripts need execute permission
sudo chmod +x /opt/tomcat/bin/*.sh

# Restrict access to sensitive directories
sudo chmod 750 /opt/tomcat/conf
sudo chmod 640 /opt/tomcat/conf/*
```

## Configuring Tomcat

### Server Configuration

The main configuration is in `/opt/tomcat/conf/server.xml`:

```bash
sudo nano /opt/tomcat/conf/server.xml
```

Key changes to make:

```xml
<!-- Change the default connector port if needed (default 8080) -->
<Connector port="8080" protocol="HTTP/1.1"
           connectionTimeout="20000"
           redirectPort="8443"
           maxParameterCount="1000"
           />

<!-- Remove the shutdown port listener if you won't use it -->
<!-- Or change it from the default 8005 -->
<Server port="-1" shutdown="SHUTDOWN">
```

Disable the AJP connector if you're not using Apache httpd in front:

```xml
<!-- Comment out or remove this entire block -->
<!--
<Connector protocol="AJP/1.3"
           address="::1"
           port="8009"
           redirectPort="8443"
           maxParameterCount="1000"
           />
-->
```

### Tomcat Users for Manager App

The Tomcat Manager web application lets you deploy wars through a UI. Configure credentials in `/opt/tomcat/conf/tomcat-users.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<tomcat-users xmlns="http://tomcat.apache.org/xml"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xsi:schemaLocation="http://tomcat.apache.org/xml tomcat-users.xsd"
              version="1.0">

    <!-- Define roles -->
    <role rolename="manager-gui"/>
    <role rolename="manager-script"/>
    <role rolename="admin-gui"/>

    <!-- Define users - use strong passwords in production -->
    <user username="admin" password="your-strong-password-here" roles="manager-gui,admin-gui"/>
    <user username="deployer" password="deploy-password-here" roles="manager-script"/>

</tomcat-users>
```

By default, the Manager app is restricted to localhost. To allow remote access, modify `/opt/tomcat/webapps/manager/META-INF/context.xml`:

```xml
<Context antiResourceLocking="false" privileged="true" >
    <!-- Comment out or modify the RemoteAddrValve -->
    <!--
    <Valve className="org.apache.catalina.valves.RemoteAddrValve"
           allow="127\.\d+\.\d+\.\d+|::1|0:0:0:0:0:0:0:1" />
    -->
    <!-- Allow from your office IP range -->
    <Valve className="org.apache.catalina.valves.RemoteAddrValve"
           allow="10\.0\.1\.\d+|127\.\d+\.\d+\.\d+" />
</Context>
```

### Setting Java Options

Create a `setenv.sh` script in the bin directory to configure JVM options:

```bash
sudo nano /opt/tomcat/bin/setenv.sh
```

```bash
#!/bin/bash
# /opt/tomcat/bin/setenv.sh
# JVM settings for Tomcat

# Memory settings
CATALINA_OPTS="-Xms512m -Xmx1024m"

# Garbage collector - G1GC is generally a good default
CATALINA_OPTS="$CATALINA_OPTS -XX:+UseG1GC"

# JMX for monitoring (disable if not needed)
# CATALINA_OPTS="$CATALINA_OPTS -Dcom.sun.management.jmxremote"
# CATALINA_OPTS="$CATALINA_OPTS -Dcom.sun.management.jmxremote.port=9999"

# Temp directory
CATALINA_TMPDIR="/opt/tomcat/temp"

export CATALINA_OPTS CATALINA_TMPDIR
```

```bash
sudo chmod +x /opt/tomcat/bin/setenv.sh
sudo chown tomcat:tomcat /opt/tomcat/bin/setenv.sh
```

## Creating the systemd Service

```bash
sudo nano /etc/systemd/system/tomcat.service
```

```ini
[Unit]
Description=Apache Tomcat Web Application Container
After=network.target

[Service]
Type=forking

User=tomcat
Group=tomcat

# Java and Tomcat paths
Environment=JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
Environment=CATALINA_PID=/opt/tomcat/temp/tomcat.pid
Environment=CATALINA_HOME=/opt/tomcat
Environment=CATALINA_BASE=/opt/tomcat
Environment="CATALINA_OPTS=-Xms512M -Xmx1024M"
Environment="JAVA_OPTS=-Djava.awt.headless=true -Djava.security.egd=file:/dev/./urandom"

ExecStart=/opt/tomcat/bin/startup.sh
ExecStop=/opt/tomcat/bin/shutdown.sh

# Give Tomcat up to 60 seconds to start
TimeoutStartSec=60

# Restart settings
Restart=on-failure
RestartSec=10

# Security
NoNewPrivileges=yes

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable tomcat
sudo systemctl start tomcat

# Check status
sudo systemctl status tomcat
```

## Verifying Tomcat is Running

```bash
# Check if port 8080 is listening
ss -tlnp | grep 8080

# Test the HTTP response
curl -I http://localhost:8080

# Follow Tomcat's own logs
sudo tail -f /opt/tomcat/logs/catalina.out

# Or via journald
journalctl -u tomcat.service -f
```

## Deploying a Web Application

### Manual WAR Deployment

```bash
# Copy a WAR file to the webapps directory
sudo cp /tmp/myapp.war /opt/tomcat/webapps/
sudo chown tomcat:tomcat /opt/tomcat/webapps/myapp.war

# Tomcat auto-deploys WAR files - check logs to confirm
sudo tail -f /opt/tomcat/logs/catalina.out
```

The application becomes available at `http://yourserver:8080/myapp/`.

### Deployment via Manager Script API

```bash
# Deploy a WAR file using the Manager REST API
curl -u deployer:deploy-password-here \
     -T /tmp/myapp.war \
     "http://localhost:8080/manager/text/deploy?path=/myapp&update=true"

# Undeploy
curl -u deployer:deploy-password-here \
     "http://localhost:8080/manager/text/undeploy?path=/myapp"
```

## Putting Nginx in Front of Tomcat

For production, put nginx as a reverse proxy in front of Tomcat. nginx handles SSL, static files, and connection management more efficiently:

```nginx
# /etc/nginx/sites-available/myapp
server {
    listen 80;
    server_name myapp.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name myapp.example.com;

    ssl_certificate /etc/letsencrypt/live/myapp.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

With nginx in front, you can block direct access to port 8080 via the firewall:

```bash
sudo ufw allow 'Nginx Full'
# Don't open port 8080 externally
```

## Log Management

Tomcat logs go to `/opt/tomcat/logs/`. Configure log rotation:

```bash
sudo nano /etc/logrotate.d/tomcat
```

```text
/opt/tomcat/logs/*.log
/opt/tomcat/logs/*.txt {
    daily
    rotate 14
    missingok
    notifempty
    compress
    delaycompress
    sharedscripts
    postrotate
        systemctl reload tomcat 2>/dev/null || true
    endscript
}
```

A properly configured Tomcat installation on Ubuntu with a dedicated service user, systemd management, and nginx as a reverse proxy is production-ready and maintainable for long-term operation.
