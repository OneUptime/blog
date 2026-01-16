# How to Set Up Bitwarden/Vaultwarden on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Bitwarden, Vaultwarden, Password Manager, Self-Hosted, Tutorial

Description: Complete guide to setting up Vaultwarden (Bitwarden-compatible) password manager on Ubuntu.

---

Password managers are essential for modern security hygiene. While cloud-hosted solutions are convenient, self-hosting gives you complete control over your credentials. This guide walks you through setting up Vaultwarden, a lightweight Bitwarden-compatible server, on Ubuntu.

## Bitwarden vs Vaultwarden: Understanding the Difference

Before diving in, it's important to understand what you're deploying.

**Bitwarden** is the official password manager with both cloud-hosted and self-hosted options. The official self-hosted version requires significant resources (multiple containers, Microsoft SQL Server or PostgreSQL, and substantial RAM).

**Vaultwarden** (formerly bitwarden_rs) is an unofficial, lightweight implementation written in Rust. It offers:

- **Minimal resources**: Runs on a Raspberry Pi with 512MB RAM
- **Full API compatibility**: Works with all official Bitwarden clients (browser extensions, mobile apps, desktop apps, CLI)
- **Premium features unlocked**: Organizations, attachments, Yubikey, FIDO2, and more - all without a subscription
- **Single container deployment**: One Docker container instead of six or more
- **SQLite support**: No external database required (PostgreSQL/MySQL optional)

The trade-off is that Vaultwarden is community-maintained and not officially supported by Bitwarden. For personal use and small teams, Vaultwarden is the practical choice.

## Prerequisites

Before starting, ensure you have:

- Ubuntu 22.04 LTS or newer (server or desktop)
- A user account with sudo privileges
- A domain name pointing to your server (required for HTTPS)
- At least 1GB RAM and 10GB disk space
- Ports 80 and 443 available (or custom ports with reverse proxy)

## Step 1: Update Your System

Start with a fresh system update.

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y

# Install essential utilities
sudo apt install -y curl wget gnupg lsb-release ca-certificates apt-transport-https
```

## Step 2: Install Docker

Docker simplifies Vaultwarden deployment significantly. Here's how to install the latest version.

```bash
# Remove any old Docker installations
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Docker Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to the docker group (avoids needing sudo for docker commands)
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

Log out and back in for the group membership to take effect.

## Step 3: Create Directory Structure

Organize your Vaultwarden deployment with a clean directory structure.

```bash
# Create the main directory for Vaultwarden
sudo mkdir -p /opt/vaultwarden/{data,ssl}

# Set appropriate ownership (replace 'your-user' with your actual username)
sudo chown -R $USER:$USER /opt/vaultwarden

# Navigate to the directory
cd /opt/vaultwarden
```

## Step 4: Create Docker Compose Configuration

Create a comprehensive Docker Compose file for Vaultwarden.

```bash
# Create the docker-compose.yml file
cat > /opt/vaultwarden/docker-compose.yml << 'EOF'
# Vaultwarden Docker Compose Configuration
# Compatible with all official Bitwarden clients
# Documentation: https://github.com/dani-garcia/vaultwarden

version: "3.8"

services:
  vaultwarden:
    # Use the official Vaultwarden image
    # The 'latest' tag tracks stable releases
    # For production, consider pinning to a specific version (e.g., 1.30.1)
    image: vaultwarden/server:latest
    container_name: vaultwarden

    # Restart policy: always restart unless manually stopped
    restart: unless-stopped

    # Environment variables configure Vaultwarden behavior
    # See .env file for actual values
    env_file:
      - .env

    volumes:
      # Persistent data storage (database, attachments, icons, RSA keys)
      # This directory contains your encrypted vault - BACK IT UP!
      - ./data:/data

      # Optional: Custom SSL certificates if not using reverse proxy
      # - ./ssl:/ssl:ro

    # Port mapping: host:container
    # When using a reverse proxy (recommended), you can use internal networking instead
    ports:
      # Web vault and API
      - "8080:80"
      # WebSocket notifications (real-time sync)
      - "3012:3012"

    # Security: Run as non-root user inside container
    # Vaultwarden drops privileges automatically, but this adds defense-in-depth
    # user: "1000:1000"

    # Resource limits (adjust based on your server capacity)
    # Vaultwarden is lightweight - these limits are generous
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 128M

    # Health check to verify the service is responding
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/alive"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

    # Logging configuration
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

# Optional: Define a custom network for better isolation
networks:
  default:
    name: vaultwarden-network
EOF
```

## Step 5: Configure Environment Variables

Create a comprehensive `.env` file with all configuration options.

```bash
# Create the .env configuration file
cat > /opt/vaultwarden/.env << 'EOF'
# =============================================================================
# VAULTWARDEN ENVIRONMENT CONFIGURATION
# =============================================================================
# Copy this file and modify values as needed
# Documentation: https://github.com/dani-garcia/vaultwarden/wiki

# -----------------------------------------------------------------------------
# DOMAIN CONFIGURATION (Required for HTTPS)
# -----------------------------------------------------------------------------
# The full URL where Vaultwarden is accessible
# Must include https:// for production use
DOMAIN=https://vault.yourdomain.com

# -----------------------------------------------------------------------------
# DATABASE CONFIGURATION
# -----------------------------------------------------------------------------
# SQLite (default) - No additional configuration needed
# Database file stored in /data/db.sqlite3

# PostgreSQL (optional) - Uncomment and configure if preferred
# DATABASE_URL=postgresql://vaultwarden:your-secure-password@postgres:5432/vaultwarden

# MySQL/MariaDB (optional) - Uncomment and configure if preferred
# DATABASE_URL=mysql://vaultwarden:your-secure-password@mysql:3306/vaultwarden

# -----------------------------------------------------------------------------
# ADMIN PANEL CONFIGURATION
# -----------------------------------------------------------------------------
# Generate a secure token: openssl rand -base64 48
# Access admin panel at: https://vault.yourdomain.com/admin
# WARNING: Use a strong, unique token - this grants full administrative access
ADMIN_TOKEN=your-very-secure-admin-token-here

# Disable admin panel entirely after initial setup (recommended for security)
# ADMIN_TOKEN=

# -----------------------------------------------------------------------------
# USER REGISTRATION SETTINGS
# -----------------------------------------------------------------------------
# Allow new user signups (disable after setting up your users)
SIGNUPS_ALLOWED=true

# Restrict signups to specific email domains
# SIGNUPS_DOMAINS_WHITELIST=yourdomain.com,company.com

# Require email verification before account activation
SIGNUPS_VERIFY=true

# Allow organization invitations even when signups are disabled
INVITATIONS_ALLOWED=true

# -----------------------------------------------------------------------------
# WEBSOCKET CONFIGURATION
# -----------------------------------------------------------------------------
# Enable WebSocket notifications for real-time sync across devices
WEBSOCKET_ENABLED=true

# WebSocket port (internal container port)
WEBSOCKET_PORT=3012

# -----------------------------------------------------------------------------
# SMTP EMAIL CONFIGURATION
# -----------------------------------------------------------------------------
# Required for email verification, password resets, and 2FA email codes
# Configure with your email provider's SMTP settings

# Enable SMTP
SMTP_HOST=smtp.yourmailprovider.com
SMTP_PORT=587
SMTP_SECURITY=starttls

# SMTP authentication
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password

# Sender details
SMTP_FROM=vaultwarden@yourdomain.com
SMTP_FROM_NAME=Vaultwarden

# Connection timeout in seconds
SMTP_TIMEOUT=15

# Accept invalid certificates (not recommended for production)
SMTP_ACCEPT_INVALID_CERTS=false
SMTP_ACCEPT_INVALID_HOSTNAMES=false

# -----------------------------------------------------------------------------
# SECURITY SETTINGS
# -----------------------------------------------------------------------------
# Show password hints (security vs convenience trade-off)
SHOW_PASSWORD_HINT=false

# Disable password hint API endpoint entirely
# DISABLE_PASSWORD_HINT=true

# Web vault enabled (disable to API-only mode)
WEB_VAULT_ENABLED=true

# Require HTTPS (should be true for production)
ROCKET_TLS={certs="/ssl/cert.pem",key="/ssl/key.pem"}

# IP header for logging behind reverse proxy
IP_HEADER=X-Forwarded-For

# Number of allowed login attempts before temporary lockout
LOGIN_RATELIMIT_MAX_BURST=10
LOGIN_RATELIMIT_SECONDS=60

# Admin login rate limiting
ADMIN_RATELIMIT_MAX_BURST=3
ADMIN_RATELIMIT_SECONDS=60

# -----------------------------------------------------------------------------
# YUBIKEY AND 2FA CONFIGURATION
# -----------------------------------------------------------------------------
# Yubico API credentials (get from https://upgrade.yubico.com/getapikey/)
# YUBICO_CLIENT_ID=your-client-id
# YUBICO_SECRET_KEY=your-secret-key

# Allow users to enable 2FA
# Supported: authenticator, yubikey, email, webauthn, duo
# All are enabled by default

# -----------------------------------------------------------------------------
# ORGANIZATION SETTINGS
# -----------------------------------------------------------------------------
# Enable organizations feature (team password sharing)
ORG_CREATION_USERS=all

# Attachment size limit per organization (in KB)
ORG_ATTACHMENT_LIMIT=

# -----------------------------------------------------------------------------
# ATTACHMENT AND ICON SETTINGS
# -----------------------------------------------------------------------------
# User attachment storage limit (in KB, empty = unlimited)
USER_ATTACHMENT_LIMIT=

# Enable icon downloading for login items
ICON_DOWNLOAD_TIMEOUT=10
ICON_CACHE_TTL=86400
ICON_CACHE_NEGTTL=3600

# Disable icon downloads entirely (saves bandwidth/storage)
# DISABLE_ICON_DOWNLOAD=true

# -----------------------------------------------------------------------------
# LOGGING CONFIGURATION
# -----------------------------------------------------------------------------
# Log level: trace, debug, info, warn, error, off
LOG_LEVEL=info

# Extended logging (includes timestamps, module paths)
EXTENDED_LOGGING=true

# Log to file (in addition to stdout)
LOG_FILE=/data/vaultwarden.log

# Use syslog
# USE_SYSLOG=true
# SYSLOG_NAME=vaultwarden

# -----------------------------------------------------------------------------
# PERFORMANCE AND RESOURCE SETTINGS
# -----------------------------------------------------------------------------
# Number of Rocket workers (default: CPU cores * 2)
# ROCKET_WORKERS=4

# Database connection pool size
# DATABASE_MAX_CONNS=10

# Emergency access
EMERGENCY_ACCESS_ALLOWED=true

# Send feature (secure file sharing)
SENDS_ALLOWED=true

# Hibp API key for password breach checking
# HIBP_API_KEY=your-hibp-api-key
EOF
```

## Step 6: Set Up Reverse Proxy with Nginx

A reverse proxy is essential for SSL termination and security. Install and configure Nginx.

```bash
# Install Nginx and Certbot for Let's Encrypt
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx configuration for Vaultwarden
sudo tee /etc/nginx/sites-available/vaultwarden << 'EOF'
# Vaultwarden Nginx Reverse Proxy Configuration
# Handles SSL termination and forwards requests to Docker container

# Rate limiting zone (protection against brute force attacks)
limit_req_zone $binary_remote_addr zone=vaultwarden_limit:10m rate=10r/s;

# Upstream definition for the Vaultwarden container
upstream vaultwarden {
    # Docker container address (adjust port if different)
    server 127.0.0.1:8080;
    keepalive 32;
}

upstream vaultwarden_ws {
    # WebSocket upstream for real-time notifications
    server 127.0.0.1:3012;
    keepalive 32;
}

# HTTP server - redirect all traffic to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name vault.yourdomain.com;

    # Allow Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other requests to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server - main configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name vault.yourdomain.com;

    # SSL certificate paths (will be managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/vault.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vault.yourdomain.com/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # OCSP stapling for faster SSL handshakes
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Client body size limit (for attachments)
    client_max_body_size 525M;

    # Proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket location block for real-time notifications
    location /notifications/hub {
        proxy_pass http://vaultwarden_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket-specific timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Negotiate endpoint for WebSocket
    location /notifications/hub/negotiate {
        proxy_pass http://vaultwarden;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin panel with rate limiting (extra protection)
    location /admin {
        # Apply rate limiting to admin panel
        limit_req zone=vaultwarden_limit burst=5 nodelay;

        proxy_pass http://vaultwarden;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Main application
    location / {
        # Apply general rate limiting
        limit_req zone=vaultwarden_limit burst=20 nodelay;

        proxy_pass http://vaultwarden;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/vaultwarden /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
```

## Step 7: Obtain SSL Certificate

Use Let's Encrypt for free SSL certificates.

```bash
# Temporarily allow HTTP for certificate verification
# Make sure your DNS is pointing to this server first!

# Obtain SSL certificate (replace with your domain)
sudo certbot --nginx -d vault.yourdomain.com

# Certbot will:
# 1. Verify domain ownership via HTTP challenge
# 2. Obtain certificate from Let's Encrypt
# 3. Configure Nginx automatically
# 4. Set up automatic renewal

# Verify automatic renewal is configured
sudo systemctl status certbot.timer

# Test renewal process (dry run)
sudo certbot renew --dry-run
```

## Step 8: Start Vaultwarden

Launch the Vaultwarden container.

```bash
# Navigate to the Vaultwarden directory
cd /opt/vaultwarden

# Pull the latest image
docker compose pull

# Start Vaultwarden in detached mode
docker compose up -d

# Check container status
docker compose ps

# View logs (follow mode)
docker compose logs -f vaultwarden

# Restart Nginx to apply changes
sudo systemctl restart nginx
```

## Step 9: Initial Configuration

Access the web vault and admin panel to complete setup.

### Web Vault Access

Navigate to `https://vault.yourdomain.com` and create your first account.

### Admin Panel Configuration

1. Access `https://vault.yourdomain.com/admin`
2. Enter your admin token from the `.env` file
3. Review and configure settings:
   - Verify SMTP is working (send test email)
   - Configure organization settings
   - Review security settings
   - Check user registrations

### Disable Signups (Recommended)

After creating your accounts, disable public registration.

```bash
# Edit the .env file
nano /opt/vaultwarden/.env

# Change this line:
# SIGNUPS_ALLOWED=true
# To:
SIGNUPS_ALLOWED=false

# Restart to apply changes
cd /opt/vaultwarden && docker compose restart
```

## Step 10: Backup Strategy

Your vault data is precious. Implement a robust backup strategy.

### Automatic Daily Backup Script

```bash
# Create backup script
sudo tee /opt/vaultwarden/backup.sh << 'EOF'
#!/bin/bash
# =============================================================================
# VAULTWARDEN BACKUP SCRIPT
# =============================================================================
# Backs up the entire Vaultwarden data directory including:
# - SQLite database (db.sqlite3)
# - RSA keys (rsa_key.* files)
# - Attachments
# - Icon cache
# - Configuration
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/vaultwarden/backups"
DATA_DIR="/opt/vaultwarden/data"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_NAME="vaultwarden-backup-${DATE}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting Vaultwarden backup..."

# Create a temporary directory for the backup
TEMP_DIR=$(mktemp -d)
trap "rm -rf ${TEMP_DIR}" EXIT

# Copy data directory to temp location
log "Copying data directory..."
cp -r "${DATA_DIR}" "${TEMP_DIR}/data"

# Create compressed archive with encryption (optional)
log "Creating compressed archive..."
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" -C "${TEMP_DIR}" data

# Optional: Encrypt the backup with GPG
# Uncomment the following lines and configure your GPG key
# log "Encrypting backup..."
# gpg --encrypt --recipient your-gpg-key-id "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
# rm "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Calculate checksum for integrity verification
log "Generating checksum..."
sha256sum "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" > "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz.sha256"

# Remove old backups
log "Cleaning old backups (older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "vaultwarden-backup-*.tar.gz*" -mtime +${RETENTION_DAYS} -delete

# Optional: Upload to remote storage
# Uncomment and configure for your preferred storage backend

# AWS S3
# log "Uploading to S3..."
# aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" s3://your-bucket/vaultwarden/

# Backblaze B2
# log "Uploading to B2..."
# b2 upload-file your-bucket "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "vaultwarden/${BACKUP_NAME}.tar.gz"

# Rsync to remote server
# log "Syncing to remote server..."
# rsync -avz --delete "${BACKUP_DIR}/" user@backup-server:/backups/vaultwarden/

log "Backup completed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
log "Backup size: $(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)"

# Verify backup integrity
log "Verifying backup integrity..."
if tar -tzf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" > /dev/null 2>&1; then
    log "Backup verification: PASSED"
else
    log "Backup verification: FAILED"
    exit 1
fi

log "Backup process complete!"
EOF

# Make the script executable
sudo chmod +x /opt/vaultwarden/backup.sh

# Test the backup script
/opt/vaultwarden/backup.sh
```

### Schedule Automatic Backups

```bash
# Add to crontab for daily backups at 3 AM
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/vaultwarden/backup.sh >> /var/log/vaultwarden-backup.log 2>&1") | crontab -

# Verify cron job
crontab -l
```

### Restore from Backup

```bash
# Stop Vaultwarden
cd /opt/vaultwarden && docker compose down

# Backup current data (just in case)
mv data data.old

# Extract backup
tar -xzf backups/vaultwarden-backup-YYYY-MM-DD_HH-MM-SS.tar.gz

# Start Vaultwarden
docker compose up -d
```

## Step 11: Updating Vaultwarden

Keep Vaultwarden updated for security patches and new features.

```bash
# Create update script
sudo tee /opt/vaultwarden/update.sh << 'EOF'
#!/bin/bash
# =============================================================================
# VAULTWARDEN UPDATE SCRIPT
# =============================================================================
# Safely updates Vaultwarden to the latest version
# Includes backup before update for rollback capability
# =============================================================================

set -euo pipefail

cd /opt/vaultwarden

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting Vaultwarden update process..."

# Step 1: Create backup before update
log "Creating pre-update backup..."
./backup.sh

# Step 2: Pull latest image
log "Pulling latest Vaultwarden image..."
docker compose pull

# Step 3: Get current and new image versions
CURRENT_IMAGE=$(docker compose images -q vaultwarden 2>/dev/null || echo "none")
NEW_IMAGE=$(docker compose config --images | grep vaultwarden)

log "Current image: ${CURRENT_IMAGE}"
log "New image: ${NEW_IMAGE}"

# Step 4: Stop current container
log "Stopping Vaultwarden..."
docker compose down

# Step 5: Start with new image
log "Starting updated Vaultwarden..."
docker compose up -d

# Step 6: Wait for health check
log "Waiting for health check..."
sleep 10

# Step 7: Verify container is healthy
if docker compose ps | grep -q "healthy"; then
    log "Update successful! Vaultwarden is healthy."
else
    log "WARNING: Container may not be healthy. Check logs."
    docker compose logs --tail=50 vaultwarden
fi

# Step 8: Clean up old images
log "Cleaning up old Docker images..."
docker image prune -f

log "Update process complete!"
EOF

chmod +x /opt/vaultwarden/update.sh
```

### Automatic Updates (Optional)

```bash
# Weekly updates every Sunday at 4 AM
(crontab -l 2>/dev/null; echo "0 4 * * 0 /opt/vaultwarden/update.sh >> /var/log/vaultwarden-update.log 2>&1") | crontab -
```

## Step 12: Security Hardening

Implement additional security measures for production deployment.

### Firewall Configuration

```bash
# Install and configure UFW (Uncomplicated Firewall)
sudo apt install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port if using non-standard)
sudo ufw allow 22/tcp comment 'SSH'

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### Fail2ban Protection

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Create Vaultwarden jail configuration
sudo tee /etc/fail2ban/jail.d/vaultwarden.local << 'EOF'
# Fail2ban configuration for Vaultwarden
# Protects against brute force login attempts

[vaultwarden]
enabled = true
port = 80,443
filter = vaultwarden
logpath = /opt/vaultwarden/data/vaultwarden.log
maxretry = 5
bantime = 3600
findtime = 600
action = iptables-allports[name=vaultwarden]
EOF

# Create filter definition
sudo tee /etc/fail2ban/filter.d/vaultwarden.conf << 'EOF'
# Fail2ban filter for Vaultwarden
# Matches failed login attempts in the log

[Definition]
failregex = ^.*Username or password is incorrect\. Try again\. IP: <HOST>\. Username:.*$
            ^.*Invalid admin token\. IP: <HOST>.*$
ignoreregex =
EOF

# Restart fail2ban
sudo systemctl restart fail2ban

# Check status
sudo fail2ban-client status vaultwarden
```

### Docker Security

```bash
# Create a dedicated system user for Vaultwarden
sudo useradd -r -s /bin/false vaultwarden

# Get the user ID
id vaultwarden

# Update docker-compose.yml to run as this user
# Add under the vaultwarden service:
# user: "1001:1001"  # Replace with actual UID:GID

# Set proper permissions on data directory
sudo chown -R vaultwarden:vaultwarden /opt/vaultwarden/data
```

### Additional Hardening

```bash
# Update .env with security-focused settings
cat >> /opt/vaultwarden/.env << 'EOF'

# =============================================================================
# ADDITIONAL SECURITY HARDENING
# =============================================================================

# Disable password hints entirely
SHOW_PASSWORD_HINT=false

# Strict rate limiting
LOGIN_RATELIMIT_MAX_BURST=5
LOGIN_RATELIMIT_SECONDS=60
ADMIN_RATELIMIT_MAX_BURST=2
ADMIN_RATELIMIT_SECONDS=60

# Disable admin panel after initial setup (uncomment to disable)
# ADMIN_TOKEN=

# Require strong master passwords (doesn't enforce, just recommendation)
# PASSWORD_ITERATIONS=600000

# Disable user signups
SIGNUPS_ALLOWED=false

# Only allow invited users from existing org members
INVITATIONS_ALLOWED=true
EOF
```

## SMTP Configuration Examples

Here are SMTP configurations for popular email providers.

### Gmail (App Password Required)

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Generate from Google Account settings
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Vaultwarden
```

### Amazon SES

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_USERNAME=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM=noreply@yourdomain.com  # Must be verified in SES
SMTP_FROM_NAME=Vaultwarden
```

### Mailgun

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_USERNAME=postmaster@yourdomain.mailgun.org
SMTP_PASSWORD=your-mailgun-smtp-password
SMTP_FROM=vaultwarden@yourdomain.com
SMTP_FROM_NAME=Vaultwarden
```

### Self-Hosted (Postfix)

```bash
SMTP_HOST=localhost
SMTP_PORT=25
SMTP_SECURITY=off
SMTP_FROM=vaultwarden@yourdomain.com
SMTP_FROM_NAME=Vaultwarden
# No username/password for local relay
```

## Troubleshooting Common Issues

### Container Won't Start

```bash
# Check logs for errors
docker compose logs vaultwarden

# Common issues:
# - Permission errors: Check data directory ownership
# - Port conflicts: Ensure ports 8080 and 3012 are free
# - Invalid environment variables: Validate .env syntax
```

### WebSocket Not Working

```bash
# Verify WebSocket is enabled
grep WEBSOCKET /opt/vaultwarden/.env

# Check Nginx WebSocket configuration
sudo nginx -t

# Test WebSocket connectivity
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" \
     -H "Sec-WebSocket-Version: 13" \
     https://vault.yourdomain.com/notifications/hub
```

### Email Not Sending

```bash
# Test SMTP from admin panel
# Or check logs for SMTP errors
docker compose logs vaultwarden | grep -i smtp

# Common issues:
# - Wrong port (use 587 for STARTTLS, 465 for SSL)
# - Authentication failed (check username/password)
# - Firewall blocking outbound SMTP
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Check Nginx SSL configuration
sudo nginx -t
```

## Monitoring Vaultwarden with OneUptime

For production deployments, monitoring your password manager is critical. OneUptime provides comprehensive monitoring to ensure your Vaultwarden instance remains healthy and accessible.

### What to Monitor

1. **Uptime Monitoring**: Set up HTTP(S) monitors to check your Vaultwarden web vault availability
2. **SSL Certificate Expiry**: Alert before certificates expire to prevent access issues
3. **Response Time**: Track performance degradation before users notice
4. **Container Health**: Monitor Docker container status and resource usage
5. **Backup Verification**: Alert if backups fail to complete

### Setting Up Monitoring

Create monitors in OneUptime for:

- `https://vault.yourdomain.com` - Main web vault endpoint
- `https://vault.yourdomain.com/alive` - Health check endpoint
- `https://vault.yourdomain.com/api/alive` - API health endpoint

Configure alerts for:
- Downtime events (immediate notification)
- SSL certificate expiration (7-day warning)
- Response time exceeding thresholds (> 2 seconds)
- Failed backup jobs (via custom webhooks)

With OneUptime's incident management, you can track outages, coordinate responses, and maintain a public status page for your users - all essential for a service as critical as your password manager.

---

Vaultwarden offers an excellent balance of features, resource efficiency, and ease of deployment. By following this guide, you have a production-ready password manager with proper security hardening, automated backups, and SSL encryption. Remember to regularly update your instance, test your backups, and monitor your service to ensure your credentials remain safe and accessible.
