# How to Install Mattermost (Self-Hosted Slack Alternative) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Mattermost, Self-Hosted, Team Collaboration, Communication

Description: Install Mattermost Team Edition on Ubuntu with PostgreSQL, configure Nginx with SSL, set up email notifications, and connect desktop and mobile clients for self-hosted team communication.

---

Mattermost is an open-source team messaging platform compatible with Slack's interface model - channels, direct messages, threads, file sharing, and integrations. The Team Edition (free, self-hosted) covers everything most teams need. Hosting it yourself means your message data stays on your hardware, which matters for security-conscious organizations, regulated industries, or teams that simply prefer not to rely on third-party SaaS for internal communication.

## System Requirements

- Ubuntu 22.04 or 24.04
- At least 2GB RAM (4GB+ recommended for 50+ users)
- PostgreSQL 14+
- Nginx
- 10GB storage (scales with message history and file uploads)

## Installing PostgreSQL

```bash
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

sudo systemctl enable --now postgresql

# Create Mattermost database user and database
sudo -u postgres psql << 'EOF'
CREATE USER mmuser WITH PASSWORD 'strong-password-here';
CREATE DATABASE mattermost OWNER mmuser;
GRANT ALL PRIVILEGES ON DATABASE mattermost TO mmuser;
\c mattermost
GRANT ALL ON SCHEMA public TO mmuser;
\q
EOF

# Verify connection
sudo -u postgres psql -U mmuser -d mattermost -c "SELECT version();"
```

## Installing Mattermost

Mattermost provides a binary package for Ubuntu.

```bash
# Create mattermost user
sudo useradd -r -m -s /bin/bash -d /opt/mattermost mattermost

# Download Mattermost Team Edition (check mattermost.com for current version)
MATTERMOST_VERSION="9.4.0"
cd /tmp
wget "https://releases.mattermost.com/${MATTERMOST_VERSION}/mattermost-${MATTERMOST_VERSION}-linux-amd64.tar.gz"

# Extract to /opt
sudo tar -xzf "mattermost-${MATTERMOST_VERSION}-linux-amd64.tar.gz" -C /opt

# Create data directory
sudo mkdir -p /opt/mattermost/data
sudo mkdir -p /opt/mattermost/logs
sudo mkdir -p /opt/mattermost/plugins

# Set ownership
sudo chown -R mattermost:mattermost /opt/mattermost
sudo chmod -R g+w /opt/mattermost

# Verify the binary
/opt/mattermost/bin/mattermost version
```

## Configuring Mattermost

```bash
# Edit the main configuration file
sudo -u mattermost nano /opt/mattermost/config/config.json
```

Key configuration sections to modify:

```json
{
    "ServiceSettings": {
        "SiteURL": "https://chat.example.com",
        "ListenAddress": ":8065",
        "TLSEnable": false,
        "ReadTimeout": 300,
        "WriteTimeout": 300
    },
    "SqlSettings": {
        "DriverName": "postgres",
        "DataSource": "postgres://mmuser:strong-password-here@localhost:5432/mattermost?sslmode=disable&connect_timeout=10",
        "MaxIdleConns": 10,
        "MaxOpenConns": 100,
        "Trace": false
    },
    "FileSettings": {
        "DriverName": "local",
        "Directory": "/opt/mattermost/data/",
        "MaxFileSize": 52428800
    },
    "LogSettings": {
        "EnableConsole": false,
        "EnableFile": true,
        "FileLocation": "/opt/mattermost/logs/",
        "FileLevel": "INFO"
    },
    "EmailSettings": {
        "EnableSignUpWithEmail": true,
        "EnableSignInWithEmail": true,
        "SendEmailNotifications": true,
        "UseChannelInEmailNotifications": true,
        "RequireEmailVerification": true,
        "SMTPUsername": "mattermost@example.com",
        "SMTPPassword": "smtp-password",
        "SMTPServer": "smtp.example.com",
        "SMTPPort": "587",
        "ConnectionSecurity": "STARTTLS",
        "FeedbackEmail": "mattermost@example.com",
        "FeedbackName": "Mattermost Notifications",
        "ReplyToAddress": "mattermost@example.com"
    },
    "TeamSettings": {
        "SiteName": "My Company Chat",
        "MaxUsersPerTeam": 1000,
        "EnableTeamCreation": true,
        "EnableUserCreation": true,
        "EnableOpenServer": false,
        "RestrictCreationToDomains": "",
        "EnableCustomBrand": false
    },
    "RateLimitSettings": {
        "Enable": true,
        "PerSec": 10,
        "MaxBurst": 100,
        "MemoryStoreSize": 10000
    }
}
```

## Creating the systemd Service

```bash
sudo nano /etc/systemd/system/mattermost.service
```

```ini
[Unit]
Description=Mattermost
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=notify
ExecStart=/opt/mattermost/bin/mattermost
TimeoutStartSec=3600
KillMode=mixed
Restart=on-failure
RestartSec=10
WorkingDirectory=/opt/mattermost
User=mattermost
Group=mattermost
LimitNOFILE=49152

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mattermost

# Check status
sudo systemctl status mattermost

# View logs
sudo journalctl -u mattermost -f

# Verify Mattermost is listening
sudo ss -tlpn | grep 8065
```

## Setting Up Nginx with SSL

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --nginx -d chat.example.com

sudo nano /etc/nginx/sites-available/mattermost
```

```nginx
# Mattermost Nginx reverse proxy configuration
upstream mattermost {
    server 127.0.0.1:8065;
    keepalive 32;
}

# Map for WebSocket upgrade
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name chat.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chat.example.com;

    ssl_certificate     /etc/letsencrypt/live/chat.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;

    # Allow large file uploads
    client_max_body_size 50m;

    location / {
        proxy_pass http://mattermost;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;

        # Mattermost requires these
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_read_timeout 600s;
    }

    # Push notifications and WebSocket
    location ~ /api/v[0-9]+/(users/)?websocket$ {
        proxy_pass http://mattermost;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;

        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;  # Long timeout for persistent WebSocket connections
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mattermost /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Creating the First Admin Account

```bash
# Create the initial admin user via command line
sudo -u mattermost /opt/mattermost/bin/mattermost user create \
  --email admin@example.com \
  --username admin \
  --password "StrongPassword123!" \
  --system-admin

# Verify the user was created
sudo -u mattermost /opt/mattermost/bin/mattermost user search admin
```

Or visit `https://chat.example.com` and use the web interface to create the first account.

## Configuring Mattermost via the Admin Console

Log in as admin and access the System Console at `https://chat.example.com/admin_console`:

### Important Settings

**Authentication > Signup:**
- Enable Email/Password sign-in
- Disable open registration if you want invite-only access

**Site Configuration > Users and Teams:**
- Restrict team creation to admins
- Set default user settings

**Integrations > Incoming Webhooks:**
- Enable incoming webhooks for alerts from monitoring systems, CI/CD tools

**Integrations > Slash Commands:**
- Enable custom slash commands for workflow automation

## Desktop and Mobile Clients

Download official clients from mattermost.com/download:
- **Desktop**: Windows, macOS, Linux (AppImage or deb package)
- **Mobile**: iOS and Android

Connection: Use `https://chat.example.com` as the server URL.

The Linux desktop client:

```bash
# Download and install Mattermost desktop for Ubuntu
wget "https://releases.mattermost.com/desktop/latest/mattermost-desktop-linux-x64.AppImage"
chmod +x mattermost-desktop-linux-x64.AppImage

# Or install via apt (if you've added the Mattermost repository)
sudo apt install -y mattermost-desktop
```

## Setting Up Incoming Webhooks for Alerts

Integrate Mattermost with other tools using incoming webhooks:

1. Go to: Integrations > Incoming Webhooks > Add Incoming Webhook
2. Choose a channel (e.g., #alerts)
3. Copy the webhook URL

Use the webhook to send alerts from scripts:

```bash
# Send a message to Mattermost from a script
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "**Alert**: Disk usage on web-01 is above 90%",
    "username": "monitoring-bot",
    "channel": "alerts",
    "attachments": [{
      "color": "#FF0000",
      "title": "Disk Alert",
      "text": "Device /dev/sda1 is 92% full",
      "fields": [
        {"short": true, "title": "Server", "value": "web-01"},
        {"short": true, "title": "Usage", "value": "92%"}
      ]
    }]
  }' \
  https://chat.example.com/hooks/your-webhook-token
```

## Backup and Maintenance

```bash
# Backup script for Mattermost
cat > /opt/mattermost/backup.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/backup/mattermost"
DATE=$(date +%Y%m%d)

mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL database
sudo -u postgres pg_dump mattermost | gzip > "$BACKUP_DIR/mattermost-db-${DATE}.sql.gz"

# Backup uploaded files
tar -czf "$BACKUP_DIR/mattermost-data-${DATE}.tar.gz" /opt/mattermost/data/

# Backup configuration
cp /opt/mattermost/config/config.json "$BACKUP_DIR/config-${DATE}.json"

# Remove backups older than 30 days
find "$BACKUP_DIR" -mtime +30 -delete

echo "Backup completed: $(date)"
SCRIPT
chmod +x /opt/mattermost/backup.sh

echo "0 2 * * * root /opt/mattermost/backup.sh >> /var/log/mattermost-backup.log 2>&1" | \
  sudo tee /etc/cron.d/mattermost-backup
```

### Updating Mattermost

```bash
# Download the new version
NEW_VERSION="9.5.0"
wget "https://releases.mattermost.com/${NEW_VERSION}/mattermost-${NEW_VERSION}-linux-amd64.tar.gz" -P /tmp

# Stop Mattermost
sudo systemctl stop mattermost

# Backup current installation
sudo cp -r /opt/mattermost /opt/mattermost-backup-$(date +%Y%m%d)

# Extract new version
sudo tar -xzf "/tmp/mattermost-${NEW_VERSION}-linux-amd64.tar.gz" -C /tmp
sudo rsync -a --exclude='config' --exclude='data' --exclude='logs' --exclude='plugins' \
  /tmp/mattermost/ /opt/mattermost/

# Fix permissions
sudo chown -R mattermost:mattermost /opt/mattermost

# Start and verify
sudo systemctl start mattermost
sudo systemctl status mattermost
```

## Summary

Mattermost on Ubuntu provides a capable Slack-alternative with full data ownership. The PostgreSQL backend scales to thousands of users, the Nginx reverse proxy handles SSL and WebSocket connections, and the desktop and mobile clients give the same real-time communication experience as commercial alternatives. The webhook integration makes it practical for engineering teams to route CI/CD notifications, monitoring alerts, and deployment events into dedicated channels for team visibility.
