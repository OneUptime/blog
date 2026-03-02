# How to Set Up Bitwarden/Vaultwarden Password Manager on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Vaultwarden, Security, Self-Hosted, Password Manager

Description: Install Vaultwarden (the self-hosted Bitwarden-compatible server) on Ubuntu using Docker, configure HTTPS with Nginx, and connect Bitwarden browser extensions and mobile apps to your self-hosted instance.

---

Vaultwarden is a lightweight, open-source reimplementation of the Bitwarden server API written in Rust. It's fully compatible with all official Bitwarden clients - browser extensions, desktop apps, and mobile apps - while being far easier to self-host than the official Bitwarden server (which requires .NET and a complex multi-container setup). For individuals and small teams that want to self-host their password manager, Vaultwarden on Ubuntu is the practical choice.

## Why Vaultwarden Instead of Official Bitwarden Server

The official Bitwarden server has significant infrastructure requirements: SQL Server, .NET runtime, and multiple microservices. Vaultwarden handles the same client API with a single Docker container and an SQLite or PostgreSQL database. For most self-hosters, the two are functionally identical from the client's perspective.

Note: Vaultwarden is not affiliated with Bitwarden, Inc. It reimplements the public Bitwarden API as a community project.

## Prerequisites

```bash
# Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose-plugin

sudo systemctl enable --now docker

# Install Nginx for reverse proxying
sudo apt install -y nginx

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

## Setting Up Vaultwarden with Docker Compose

```bash
# Create directory for Vaultwarden
sudo mkdir -p /opt/vaultwarden/data
sudo chown $USER:$USER /opt/vaultwarden
cd /opt/vaultwarden
```

Create `docker-compose.yml`:

```yaml
# Docker Compose for Vaultwarden
version: "3.8"

services:
  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    restart: unless-stopped
    volumes:
      # Persistent data storage (contains vault data, attachments, RSA keys)
      - ./data:/data
    environment:
      # Domain where Vaultwarden will be accessible (must be HTTPS)
      - DOMAIN=https://vault.example.com

      # Disable new user registrations after initial setup
      # Set to true initially, then change to false after creating your accounts
      - SIGNUPS_ALLOWED=true

      # Enable admin panel (generate a token: openssl rand -base64 48)
      - ADMIN_TOKEN=your-admin-token-here

      # Send invitations from this address
      - INVITATION_ORG_NAME=My Vault

      # SMTP for email verification and notifications (optional but recommended)
      - SMTP_HOST=smtp.example.com
      - SMTP_FROM=vault@example.com
      - SMTP_PORT=587
      - SMTP_SECURITY=starttls
      - SMTP_USERNAME=vault@example.com
      - SMTP_PASSWORD=smtp-password

      # Emergency access and account recovery features
      - EMERGENCY_ACCESS_ALLOWED=true

      # Show password hint after failed login attempts (false for security)
      - SHOW_PASSWORD_HINT=false

      # Enable WebSocket notifications for real-time sync
      - WEBSOCKET_ENABLED=true

      # Log level: trace, debug, info, warn, error
      - LOG_LEVEL=warn
      - EXTENDED_LOGGING=true

    ports:
      # HTTP and WebSocket ports (proxied by Nginx - not exposed to public)
      - "127.0.0.1:8080:80"
      - "127.0.0.1:3012:3012"
```

Generate the admin token:

```bash
# Generate a secure admin token
openssl rand -base64 48
# Copy the output and put it in ADMIN_TOKEN in docker-compose.yml
```

```bash
# Start Vaultwarden
docker compose up -d

# Verify it's running
docker compose ps
docker compose logs vaultwarden
```

## Nginx Configuration with HTTPS

Vaultwarden requires HTTPS to function - the official Bitwarden clients refuse to connect to non-HTTPS servers.

```bash
# Get SSL certificate first
sudo certbot certonly --nginx -d vault.example.com

sudo nano /etc/nginx/sites-available/vaultwarden
```

```nginx
# Vaultwarden Nginx reverse proxy configuration
# WebSocket upstream for real-time sync
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

upstream vaultwarden-default {
    zone vaultwarden-default 64k;
    server 127.0.0.1:8080;
    keepalive 2;
}

upstream vaultwarden-ws {
    zone vaultwarden-ws 64k;
    server 127.0.0.1:3012;
    keepalive 2;
}

server {
    listen 80;
    server_name vault.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name vault.example.com;

    ssl_certificate     /etc/letsencrypt/live/vault.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vault.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;

    # Strict security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";

    # Allow larger file uploads (attachments)
    client_max_body_size 525m;

    # Vaultwarden API and web interface
    location / {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_pass http://vaultwarden-default;
    }

    # WebSocket endpoint for real-time notifications
    location /notifications/hub {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_pass http://vaultwarden-ws;
    }

    location /notifications/hub/negotiate {
        proxy_http_version 1.1;
        proxy_pass http://vaultwarden-default;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/vaultwarden /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Initial Setup

Visit `https://vault.example.com` and create your account. Then:

1. Access the admin panel at `https://vault.example.com/admin` using the admin token
2. Configure SMTP settings if you want email verification
3. After creating all needed accounts, disable new registrations:

```bash
# Edit docker-compose.yml and change:
# SIGNUPS_ALLOWED=false
# Then apply:
docker compose up -d
```

## Connecting Bitwarden Clients

All official Bitwarden clients can connect to a custom server.

### Browser Extension

1. Open the Bitwarden extension
2. Click the region selector (globe icon or gear icon)
3. Select "Self-hosted" or enter custom server URL
4. Enter `https://vault.example.com`
5. Log in with your account credentials

### Desktop App (Windows/macOS/Linux)

1. Open Bitwarden desktop app
2. Click the region selector at the top of the login screen
3. Choose "Self-hosted"
4. Set Server URL to `https://vault.example.com`
5. Log in

### Mobile App (iOS/Android)

1. Open the Bitwarden app
2. Tap the region selector on the login screen
3. Set Server URL to `https://vault.example.com`
4. Log in

## Enabling Organizations and Sharing

Vaultwarden supports Bitwarden's organization features for sharing passwords within a team.

In the admin panel (`/admin`):
- Enable Organizations
- Configure organization limits

Creating an organization:
1. Log into the web vault at `https://vault.example.com`
2. Go to Organizations > New Organization
3. Invite team members by email
4. Create collections and assign items to share

## Backup Strategy

Vaultwarden stores everything in `/opt/vaultwarden/data/`. The critical file is `db.sqlite3`.

```bash
# Create backup script
cat > /opt/vaultwarden/backup.sh << 'EOF'
#!/bin/bash
# Backup Vaultwarden data
BACKUP_DIR="/backup/vaultwarden"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

# Stop Vaultwarden temporarily for consistent backup
docker compose -f /opt/vaultwarden/docker-compose.yml stop vaultwarden

# Backup the data directory
tar -czf "$BACKUP_DIR/vaultwarden-${DATE}.tar.gz" /opt/vaultwarden/data/

# Restart Vaultwarden
docker compose -f /opt/vaultwarden/docker-compose.yml start vaultwarden

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "vaultwarden-*.tar.gz" -mtime +30 -delete

echo "Backup completed: vaultwarden-${DATE}.tar.gz"
EOF
chmod +x /opt/vaultwarden/backup.sh

# Schedule daily backups
echo "0 2 * * * root /opt/vaultwarden/backup.sh >> /var/log/vaultwarden-backup.log 2>&1" | \
  sudo tee /etc/cron.d/vaultwarden-backup
```

## Using PostgreSQL Instead of SQLite

For better performance with multiple users or larger vaults:

```bash
# Install PostgreSQL
sudo apt install -y postgresql

sudo -u postgres psql << 'EOF'
CREATE USER vaultwarden WITH PASSWORD 'db-password';
CREATE DATABASE vaultwarden OWNER vaultwarden;
\q
EOF
```

Update `docker-compose.yml`:

```yaml
environment:
  # Replace SQLite with PostgreSQL
  - DATABASE_URL=postgresql://vaultwarden:db-password@host.docker.internal:5432/vaultwarden
```

```bash
docker compose down
docker compose up -d
# Vaultwarden creates its schema on first start
```

## Monitoring and Troubleshooting

```bash
# View Vaultwarden logs
docker compose logs -f vaultwarden

# Check if WebSocket is working (needed for real-time sync)
curl -s -o /dev/null -w "%{http_code}" https://vault.example.com/notifications/hub/negotiate

# Test the API health endpoint
curl https://vault.example.com/api/alive
# Should return HTTP 200

# Update Vaultwarden to latest version
docker compose pull
docker compose up -d
```

**Common issue - clients show "Invalid client" error:**
This usually means the client version is newer than what Vaultwarden supports. Update Vaultwarden to the latest version.

**2FA not working:**
Ensure your server's clock is synchronized - TOTP codes are time-based.

```bash
# Check time sync
timedatectl status
sudo apt install -y ntp && sudo systemctl enable --now ntp
```

## Summary

Vaultwarden on Ubuntu provides a fully functional self-hosted password manager with a single lightweight container. All official Bitwarden clients connect to it transparently - users get the same experience as the cloud service. The key operational tasks are keeping the software updated, backing up the data directory regularly, and maintaining a valid SSL certificate. For teams, organizations and collections make shared credential management practical without sacrificing the security of end-to-end encryption.
