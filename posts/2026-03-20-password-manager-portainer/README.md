# How to Self-Host a Password Manager with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Self-Hosted, Security, Vaultwarden, Password Manager

Description: Deploy Vaultwarden, a lightweight self-hosted Bitwarden-compatible password manager, using Portainer with full SSL support.

## Introduction

Self-hosting your password manager gives you full control over your sensitive credentials. Vaultwarden (formerly Bitwarden_RS) is a lightweight, self-hosted implementation of the Bitwarden API, compatible with all official Bitwarden clients. This guide shows you how to deploy it securely using Portainer.

## Prerequisites

- Portainer installed and running
- A domain name (required for HTTPS, which is required by Bitwarden clients)
- Traefik or Nginx Proxy Manager for SSL termination

## Why Self-Host Your Password Manager?

- Your passwords never leave your infrastructure
- No subscription fees
- Full audit capability
- Works with all Bitwarden clients (browser extensions, mobile apps, desktop apps)

## Step 1: Prepare the Environment

```bash
# Create data directory

sudo mkdir -p /opt/vaultwarden/data
sudo chown -R 1000:1000 /opt/vaultwarden
```

## Step 2: Deploy Vaultwarden Stack in Portainer

Navigate to **Stacks** > **Add stack** and paste this compose file:

```yaml
# docker-compose.yml - Vaultwarden Password Manager
version: "3.8"

networks:
  # Use an existing proxy network if you have Traefik
  proxy:
    external: true

services:
  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    restart: unless-stopped
    ports:
      - "8888:80"   # HTTP port (reverse proxy will handle HTTPS)
    environment:
      # Admin token - generate with: openssl rand -base64 48
      - ADMIN_TOKEN=your-secure-admin-token-here

      # Domain - REQUIRED for Bitwarden clients
      - DOMAIN=https://vault.yourdomain.com

      # Enable signups - set to false after creating your account
      - SIGNUPS_ALLOWED=true

      # Email configuration for 2FA and invitations
      - SMTP_HOST=smtp.gmail.com
      - SMTP_FROM=your-email@gmail.com
      - SMTP_PORT=587
      - SMTP_SECURITY=starttls
      - SMTP_USERNAME=your-email@gmail.com
      - SMTP_PASSWORD=your-app-password

      # Enable 2FA via email
      - SMTP_FROM_NAME=Vaultwarden

      # Log level
      - LOG_LEVEL=warn

      # Enable web notifications
      - ENABLE_WEBSOCKET=true
    volumes:
      # Persistent data storage
      - /opt/vaultwarden/data:/data
    networks:
      - proxy
    labels:
      # Traefik configuration
      # Since Vaultwarden 1.29.0, WebSocket traffic is served on the
      # same HTTP port as the API, so no separate WebSocket router is needed.
      - "traefik.enable=true"
      - "traefik.http.routers.vaultwarden.rule=Host(`vault.yourdomain.com`)"
      - "traefik.http.routers.vaultwarden.entrypoints=websecure"
      - "traefik.http.routers.vaultwarden.tls.certresolver=letsencrypt"
      - "traefik.http.services.vaultwarden.loadbalancer.server.port=80"
```

## Step 3: Configure Nginx Proxy Manager (Alternative to Traefik)

If using Nginx Proxy Manager instead:

```nginx
# Advanced Nginx configuration for Vaultwarden
# Add in the "Advanced" tab of NPM

# Enable WebSocket support
# Since Vaultwarden 1.29.0, WebSocket traffic is served on the same
# HTTP port as the API (80), so it proxies to the same upstream.
location /notifications/hub {
    proxy_pass http://vaultwarden:80;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

location /notifications/hub/negotiate {
    proxy_pass http://vaultwarden:80;
}

# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
```

## Step 4: Initial Setup

1. Access `https://vault.yourdomain.com`
2. Click **Create Account** and register your first user
3. **Immediately** disable signups in your environment variables:
   ```yaml
   - SIGNUPS_ALLOWED=false
   ```
4. Redeploy the stack in Portainer

### Access the Admin Panel

```bash
# Navigate to the admin panel
# https://vault.yourdomain.com/admin
# Use your ADMIN_TOKEN to log in
```

## Step 5: Set Up Automated Backups

```bash
#!/bin/bash
# /usr/local/bin/backup-vaultwarden.sh
# Run this script to backup Vaultwarden data

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/vaultwarden"
DATA_DIR="/opt/vaultwarden/data"

mkdir -p $BACKUP_DIR

# Create compressed backup
tar -czf "$BACKUP_DIR/vaultwarden_$DATE.tar.gz" -C "$DATA_DIR" .

# Keep only last 30 backups
ls -t "$BACKUP_DIR"/vaultwarden_*.tar.gz | tail -n +31 | xargs rm -f

echo "Backup created: vaultwarden_$DATE.tar.gz"
```

```bash
# Add to crontab for daily backups at 3 AM
echo "0 3 * * * /usr/local/bin/backup-vaultwarden.sh" | crontab -
chmod +x /usr/local/bin/backup-vaultwarden.sh
```

## Step 6: Connect Bitwarden Clients

### Browser Extension
1. Install the Bitwarden extension for your browser
2. Click the extension icon and click the gear icon
3. Change **Server URL** to `https://vault.yourdomain.com`
4. Log in with your credentials

### Mobile App
1. Install the Bitwarden app
2. Tap the region selector and choose **Self-hosted**
3. Enter `https://vault.yourdomain.com`

## Security Hardening

```yaml
# Additional security environment variables
environment:
  # Limit failed login attempts
  - LOGIN_RATELIMIT_MAX_BURST=10
  - LOGIN_RATELIMIT_SECONDS=60
  - ADMIN_RATELIMIT_MAX_BURST=3
  - ADMIN_RATELIMIT_SECONDS=300

  # Require 2FA for admin
  - REQUIRE_DEVICE_EMAIL=true

  # Disable organization creation
  - ORG_CREATION_USERS=admin@yourdomain.com

  # Limit how long an admin panel session stays active (minutes)
  - ADMIN_SESSION_LIFETIME=20
```

## Monitoring Vaultwarden

In Portainer, you can monitor:
- Container resource usage (CPU/Memory)
- Container logs for failed login attempts
- Volume usage for the data directory

```bash
# Check for failed login attempts in logs
docker logs vaultwarden 2>&1 | grep "Username or password is incorrect"
```

## Conclusion

You now have a secure, self-hosted password manager running with Vaultwarden and Portainer. Your credentials are stored entirely on your own infrastructure, giving you complete privacy and control. Remember to enable regular backups, keep Vaultwarden updated via Portainer's image update feature, and disable public signups immediately after creating your account.
