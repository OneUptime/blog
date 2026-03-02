# How to Set Up Apache Guacamole for Web-Based Remote Access on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Guacamole, Remote Access, RDP, VNC

Description: Install and configure Apache Guacamole on Ubuntu to provide browser-based remote desktop access to servers and workstations via RDP, VNC, and SSH.

---

Apache Guacamole is a clientless remote desktop gateway. Users connect to remote machines through a web browser - no client software required. Guacamole sits in the middle, speaking native protocols (RDP, VNC, SSH) on the backend and serving a JavaScript client on the frontend over HTML5. This makes it useful for providing access to servers and desktop systems from any device with a modern browser.

## Architecture Overview

Guacamole has two components:

- **guacamole-server (guacd)**: The native daemon that handles protocol-level connections to remote machines (RDP, VNC, SSH).
- **guacamole-client**: A Java web application (WAR file) deployed to Tomcat that provides the web interface.

Communication between guacd and the client uses Guacamole's own protocol over a local socket or TCP connection.

## Installing Dependencies

```bash
sudo apt update
sudo apt install -y \
    build-essential \
    libcairo2-dev \
    libjpeg-turbo8-dev \
    libpng-dev \
    libtool-bin \
    libossp-uuid-dev \
    libavcodec-dev \
    libavformat-dev \
    libavutil-dev \
    libswscale-dev \
    freerdp2-dev \
    libpango1.0-dev \
    libssh2-1-dev \
    libvncserver-dev \
    libssl-dev \
    libwebp-dev \
    libpulse-dev \
    tomcat9 \
    tomcat9-admin \
    tomcat9-common
```

## Building and Installing guacamole-server

The server component must be compiled from source:

```bash
# Download the latest release (check https://guacamole.apache.org/releases/)
GUAC_VERSION="1.5.5"
wget "https://downloads.apache.org/guacamole/${GUAC_VERSION}/source/guacamole-server-${GUAC_VERSION}.tar.gz" \
    -O /tmp/guacamole-server.tar.gz

cd /tmp
tar -xzf guacamole-server.tar.gz
cd "guacamole-server-${GUAC_VERSION}"

# Configure build
./configure --with-init-dir=/etc/init.d

# Check the output - verify that RDP, VNC, SSH are enabled
# "RDP support:   yes" etc.

# Compile and install
make -j$(nproc)
sudo make install
sudo ldconfig

# Enable and start guacd
sudo systemctl enable --now guacd
sudo systemctl status guacd
```

## Installing guacamole-client

```bash
GUAC_VERSION="1.5.5"

# Download the pre-built WAR file
wget "https://downloads.apache.org/guacamole/${GUAC_VERSION}/binary/guacamole-${GUAC_VERSION}.war" \
    -O /tmp/guacamole.war

# Deploy to Tomcat
sudo mkdir -p /etc/guacamole
sudo cp /tmp/guacamole.war /var/lib/tomcat9/webapps/guacamole.war

# Create Guacamole home directory
sudo mkdir -p /etc/guacamole/{extensions,lib}

# Set environment variable for Guacamole configuration
echo "GUACAMOLE_HOME=/etc/guacamole" | sudo tee -a /etc/default/tomcat9

# Restart Tomcat to deploy the WAR
sudo systemctl restart tomcat9
```

## Configuring guacamole.properties

The main configuration file:

```bash
sudo nano /etc/guacamole/guacamole.properties
```

```properties
# Connection to guacd
guacd-hostname: localhost
guacd-port: 4822

# Use basic file-based authentication
auth-provider: net.sourceforge.guacamole.net.basic.BasicFileAuthenticationProvider

# Path to the user-mapping file
basic-user-mapping: /etc/guacamole/user-mapping.xml
```

## Configuring User Mapping

For simple deployments, the user-mapping.xml file defines users and their connections:

```bash
sudo nano /etc/guacamole/user-mapping.xml
```

```xml
<user-mapping>
    <!-- Admin user -->
    <authorize username="admin"
               password="[MD5_HASH_OF_PASSWORD]"
               encoding="md5">

        <!-- SSH connection to a server -->
        <connection name="Web Server SSH">
            <protocol>ssh</protocol>
            <param name="hostname">192.168.1.10</param>
            <param name="port">22</param>
            <param name="username">ubuntu</param>
        </connection>

        <!-- RDP connection to a Windows desktop -->
        <connection name="Windows Desktop">
            <protocol>rdp</protocol>
            <param name="hostname">192.168.1.20</param>
            <param name="port">3389</param>
            <param name="username">Administrator</param>
            <param name="password">windows-password</param>
            <param name="ignore-cert">true</param>
        </connection>

        <!-- VNC connection -->
        <connection name="Dev Machine VNC">
            <protocol>vnc</protocol>
            <param name="hostname">192.168.1.30</param>
            <param name="port">5901</param>
            <param name="password">vnc-password</param>
        </connection>
    </authorize>
</user-mapping>
```

Generate MD5 password hash:

```bash
echo -n "your-password" | md5sum | awk '{print $1}'
```

Use the output as the `password` attribute value.

## Linking Configuration to Tomcat

```bash
# Create symlink so Tomcat can find the configuration
sudo ln -s /etc/guacamole /usr/share/tomcat9/.guacamole

sudo systemctl restart tomcat9 guacd
```

## Setting Up Nginx as a Reverse Proxy

Access Guacamole through Nginx on standard ports with SSL:

```bash
sudo apt install nginx

sudo nano /etc/nginx/sites-available/guacamole
```

```nginx
server {
    listen 80;
    server_name guacamole.example.com;
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name guacamole.example.com;

    ssl_certificate     /etc/letsencrypt/live/guacamole.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/guacamole.example.com/privkey.pem;

    # Proxy to Tomcat's Guacamole deployment
    location / {
        proxy_pass http://localhost:8080/guacamole/;
        proxy_buffering off;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $http_connection;
        proxy_cookie_path /guacamole/ /;
        # Required for WebSocket tunneling
        access_log off;
    }

    # Handle Guacamole WebSocket tunnels
    location /tunnel {
        proxy_pass http://localhost:8080/guacamole/tunnel;
        proxy_buffering off;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $http_connection;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/guacamole /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Using the Database Authentication Extension

For production use, database-backed authentication is more manageable than XML user mapping. Install MySQL:

```bash
sudo apt install mysql-server

# Download Guacamole JDBC extension
GUAC_VERSION="1.5.5"
wget "https://downloads.apache.org/guacamole/${GUAC_VERSION}/binary/guacamole-auth-jdbc-${GUAC_VERSION}.tar.gz" \
    -O /tmp/guacamole-auth-jdbc.tar.gz

cd /tmp
tar -xzf guacamole-auth-jdbc.tar.gz
```

Create the database:

```bash
sudo mysql -e "
CREATE DATABASE guacamole_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'guacamole'@'localhost' IDENTIFIED BY 'strong-password';
GRANT SELECT,INSERT,UPDATE,DELETE ON guacamole_db.* TO 'guacamole'@'localhost';
FLUSH PRIVILEGES;
"

# Import schema
cat guacamole-auth-jdbc-${GUAC_VERSION}/mysql/schema/*.sql | \
    sudo mysql guacamole_db
```

Deploy the extension:

```bash
# Copy JDBC extension JAR
sudo cp guacamole-auth-jdbc-${GUAC_VERSION}/mysql/guacamole-auth-jdbc-mysql-${GUAC_VERSION}.jar \
    /etc/guacamole/extensions/

# Download MySQL connector
wget "https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-j_8.3.0-1ubuntu22.04_all.deb"
sudo dpkg -i mysql-connector-j_8.3.0-1ubuntu22.04_all.deb
sudo cp /usr/share/java/mysql-connector-j-*.jar /etc/guacamole/lib/
```

Update `guacamole.properties`:

```properties
guacd-hostname: localhost
guacd-port: 4822

# MySQL authentication
mysql-hostname: localhost
mysql-port: 3306
mysql-database: guacamole_db
mysql-username: guacamole
mysql-password: strong-password
```

```bash
sudo systemctl restart tomcat9
```

The default admin credentials after database setup are `guacadmin` / `guacadmin` - change immediately after first login.

## Firewall Configuration

```bash
# Allow HTTPS from anywhere
sudo ufw allow 443/tcp

# Allow HTTP for redirect (or restrict to internal only)
sudo ufw allow 80/tcp

# guacd should NOT be exposed externally (only local access)
# No rule needed - it only listens on localhost by default
```

## Verifying the Installation

```bash
# Check guacd is running and listening
sudo systemctl status guacd
ss -tlnp | grep 4822

# Check Tomcat deployed the WAR
ls /var/lib/tomcat9/webapps/guacamole/

# Check Tomcat logs
sudo tail -f /var/log/tomcat9/catalina.out
```

Access Guacamole at `https://guacamole.example.com/` in a browser.

## Troubleshooting

**Blank screen after login:**
- Check that guacd is running
- Verify guacamole.properties has correct guacd hostname and port
- Check Tomcat logs: `sudo journalctl -u tomcat9 -n 100`

**RDP connection fails:**
- Verify freerdp2 was available when building guacd (check `./configure` output)
- For Windows systems, ensure Network Level Authentication matches your setting

**WebSocket errors in browser console:**
- Check nginx proxy configuration includes the WebSocket headers
- Ensure nginx proxy_read_timeout is set high enough (Guacamole connections can be long-lived)

## Summary

Apache Guacamole provides a practical solution for browser-based remote access to Linux servers (SSH), Windows machines (RDP), and VNC sessions without requiring any client software. The combination of guacd for protocol handling, Tomcat for the web frontend, and nginx for SSL termination and proxying creates a production-ready gateway that works reliably for internal remote access infrastructure.
