# How to Set Up MeshCentral for Remote Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MeshCentral, Remote Management, Self-Hosted, Node.js

Description: Install and configure MeshCentral on Ubuntu to provide self-hosted, web-based remote management for Linux and Windows machines using mesh agents.

---

MeshCentral is a self-hosted, open-source remote management server written in Node.js. It provides browser-based remote desktop, remote terminal, file management, and system monitoring for managed machines. Unlike commercial alternatives, you run the server yourself - all management traffic stays within your infrastructure.

MeshCentral supports Windows (RDP and native agent), Linux, and macOS endpoints through a lightweight agent that connects back to your server.

## Prerequisites

- Ubuntu 20.04 or newer
- Node.js 14 or newer
- At least 512MB RAM for the server (1GB+ recommended)
- A domain name with DNS pointing to your server (recommended for SSL)

## Installing Node.js

```bash
# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

## Installing MeshCentral

```bash
# Create a dedicated user
sudo useradd -r -m -s /bin/bash -d /opt/meshcentral meshcentral
sudo su - meshcentral

# Install MeshCentral via npm
mkdir meshcentral-data
npm install meshcentral

# Exit back to your regular user
exit
```

## Running MeshCentral for Initial Setup

```bash
# Run as the meshcentral user
sudo -u meshcentral node /opt/meshcentral/node_modules/meshcentral

# Press Ctrl+C to stop after initial setup completes
```

This first run generates the default configuration at `/opt/meshcentral/meshcentral-data/config.json`.

## Configuring MeshCentral

Edit the configuration file:

```bash
sudo nano /opt/meshcentral/meshcentral-data/config.json
```

```json
{
    "settings": {
        "port": 443,
        "aliasPort": 443,
        "redirPort": 80,
        "allowLoginToken": true,
        "allowFraming": false,
        "_comment_TLSOffload": "Set if behind a reverse proxy doing TLS",
        "cert": "meshcentral.example.com",
        "sessionKey": "generate-a-random-string-here",
        "sessionTime": 60
    },
    "domains": {
        "": {
            "title": "MeshCentral",
            "title2": "Remote Management",
            "userEmailVerification": false,
            "newAccountsRequireEmailVerification": false,
            "closedRegistration": true,
            "_comment_closedRegistration": "Prevent public registration - add users manually",
            "agentConfig": ["webSocketMaskOverride=1"],
            "maxInvalidLogin": {
                "time": 10,
                "count": 5,
                "coolofftime": 30
            }
        }
    }
}
```

Key settings to configure:

- `cert`: Your domain name or IP address - MeshCentral uses this for TLS certificate generation
- `sessionKey`: Generate a random string (e.g., `openssl rand -hex 32`)
- `closedRegistration`: Set to `true` to prevent public account creation

### Using Behind an Nginx Reverse Proxy

For production, use Nginx as a reverse proxy with your own TLS certificate:

```json
{
    "settings": {
        "port": 4430,
        "aliasPort": 443,
        "redirPort": 800,
        "tlsOffload": "127.0.0.1",
        "sessionKey": "your-random-session-key"
    }
}
```

Nginx configuration:

```nginx
server {
    listen 80;
    server_name meshcentral.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name meshcentral.example.com;

    ssl_certificate /etc/letsencrypt/live/meshcentral.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/meshcentral.example.com/privkey.pem;

    location / {
        proxy_pass https://localhost:4430;
        proxy_ssl_verify off;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }
}
```

## Creating a systemd Service

```bash
sudo nano /etc/systemd/system/meshcentral.service
```

```ini
[Unit]
Description=MeshCentral Remote Management Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=meshcentral
Group=meshcentral
WorkingDirectory=/opt/meshcentral
ExecStart=/usr/bin/node /opt/meshcentral/node_modules/meshcentral
Restart=on-failure
RestartSec=10s

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=meshcentral

# Environment
Environment=NODE_ENV=production

# Allow binding to ports 80/443 if not using reverse proxy
# AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
```

If MeshCentral needs to bind to ports 80 and 443 directly (without nginx):

```bash
# Grant Node.js permission to bind low ports
sudo setcap cap_net_bind_service=+ep /usr/bin/node
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now meshcentral
sudo systemctl status meshcentral
```

## First Login and Initial Setup

Access the web interface at `https://meshcentral.example.com/`. On first login, you'll be prompted to create an administrator account.

After creating your admin account:
1. Create a **Mesh** (device group) - click "Add Mesh"
2. Choose mesh type:
   - **Managed Devices (Agent)**: Full management with file transfer, terminal, remote desktop
   - **Intel AMT Devices**: For Intel AMT-capable machines

## Installing Agents on Managed Machines

Once you've created a mesh, download the agent installer:

1. Click on your mesh
2. Click "Add Agent" or the agent download button
3. Select your platform (Linux, Windows, macOS)
4. Download the installer

### Linux Agent Installation

```bash
# The installer is a self-extracting script
chmod +x meshagent_linux64
sudo ./meshagent_linux64

# The agent installs itself as a systemd service
sudo systemctl status meshagent
```

### Silent Linux Agent Install (for automation)

```bash
# Get the install link from the MeshCentral web interface
# It looks like: https://meshcentral.example.com/meshagents?...

# Install silently
curl -O "https://meshcentral.example.com/meshagents?id=XXXX&meshid=YYYY&action=5&filename=meshinstall.sh"
chmod +x meshinstall.sh
sudo ./meshinstall.sh install
```

## Using Remote Features

Once an agent connects:

### Remote Terminal

Click on a device, then "Terminal" for an interactive shell session directly in the browser.

### Remote Desktop

For Linux machines with a graphical desktop:
- Click "Remote Desktop" to access the machine's desktop via browser

For Windows machines:
- Uses native Windows RDP tunneled through the mesh agent

### File Management

The "Files" tab provides a browser-based file manager - upload, download, and manage files on remote machines.

### Remote Shell Scripts

Run scripts on multiple machines simultaneously through "Run Command":

```bash
# In the MeshCentral web interface:
# Select multiple devices -> Run Command -> Enter command
uname -a && df -h && free -h
```

## Configuring Email Notifications

Add email settings to `config.json`:

```json
{
    "smtp": {
        "host": "smtp.example.com",
        "port": 587,
        "from": "meshcentral@example.com",
        "user": "meshcentral@example.com",
        "pass": "smtp-password",
        "tls": false,
        "tlscert": false
    }
}
```

## Security Configuration

### Restricting User Permissions

In the MeshCentral web interface:
- Go to My Account -> Manage Accounts
- Create user accounts with appropriate permissions
- Assign users to specific meshes (device groups)

### Enabling Two-Factor Authentication

```json
{
    "domains": {
        "": {
            "twoFactorCookieDurationDays": 10,
            "_comment": "Require 2FA for all logins"
        }
    }
}
```

Users can enroll TOTP (Google Authenticator compatible) or hardware security keys through their account settings.

## Monitoring MeshCentral

```bash
# View real-time logs
sudo journalctl -u meshcentral -f

# Check connected agents
# MeshCentral web interface shows this in real-time

# Monitor resource usage
ps aux | grep meshcentral
netstat -tlnp | grep node
```

## Backing Up MeshCentral Data

```bash
# MeshCentral data is in /opt/meshcentral/meshcentral-data/
# Back up the entire directory

sudo systemctl stop meshcentral

sudo tar -czf /backup/meshcentral-$(date +%Y%m%d).tar.gz \
    /opt/meshcentral/meshcentral-data/

sudo systemctl start meshcentral
```

## Upgrading MeshCentral

```bash
# Stop the service
sudo systemctl stop meshcentral

# Update npm package
sudo -u meshcentral bash -c "cd /opt/meshcentral && npm install meshcentral"

# Restart
sudo systemctl start meshcentral

# Verify version
sudo -u meshcentral node /opt/meshcentral/node_modules/meshcentral --version
```

## Troubleshooting

**Agents not connecting:**

```bash
# Check that port 443 (or your configured port) is accessible
sudo ss -tlnp | grep node

# Check MeshCentral logs for errors
sudo journalctl -u meshcentral -n 100
```

**High memory usage:**

MeshCentral keeps all agent connections in memory. Each connected agent uses roughly 2-5MB. Plan accordingly for large deployments.

**Certificate errors after domain change:**

```bash
# Delete old certificates and restart to regenerate
sudo rm /opt/meshcentral/meshcentral-data/*.crt \
        /opt/meshcentral/meshcentral-data/*.key
sudo systemctl restart meshcentral
```

## Summary

MeshCentral provides a capable self-hosted platform for managing multiple Linux and Windows machines through a single web interface. The agent-based model works well through NAT and firewalls, making it suitable for managing remote machines that aren't directly accessible. The feature set - terminal, remote desktop, file management, and scripting - covers most day-to-day remote administration needs without requiring a commercial license.
