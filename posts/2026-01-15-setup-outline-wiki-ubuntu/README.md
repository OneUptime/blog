# How to Set Up Outline Wiki on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Outline, Wiki, Documentation, Self-Hosted, Tutorial

Description: Complete guide to setting up Outline knowledge base and wiki on Ubuntu.

---

Outline is a modern, open-source knowledge base and wiki designed for growing teams. It provides a beautiful, fast, and collaborative environment for documenting your team's knowledge. In this comprehensive guide, we will walk through setting up Outline on Ubuntu using Docker, complete with PostgreSQL, Redis, S3-compatible storage, and authentication providers.

## Outline Features Overview

Before diving into the installation, let's explore what makes Outline an excellent choice for team documentation:

### Core Features

- **Rich Markdown Editor**: Intuitive WYSIWYG editor with full Markdown support, slash commands, and real-time collaboration
- **Nested Collections**: Organize documents into hierarchical collections with drag-and-drop reordering
- **Full-Text Search**: Lightning-fast search across all documents with highlighted results
- **Real-Time Collaboration**: Multiple users can edit documents simultaneously with presence indicators
- **Version History**: Track all changes with complete revision history and restore capabilities
- **Public Sharing**: Share documents publicly with optional password protection
- **API Access**: Comprehensive REST API for integrations and automation
- **Dark Mode**: Built-in dark theme for comfortable reading in any environment
- **Localization**: Support for multiple languages out of the box
- **Import/Export**: Import from Notion, Confluence, and Markdown; export to various formats

### Why Self-Host Outline?

- Complete data ownership and privacy
- No subscription costs beyond infrastructure
- Customization possibilities
- Integration with internal authentication systems
- Compliance with data residency requirements

## Prerequisites

Before starting the installation, ensure you have the following:

### System Requirements

- Ubuntu 20.04 LTS or newer (22.04 or 24.04 recommended)
- Minimum 2 GB RAM (4 GB recommended)
- At least 20 GB of disk space
- A domain name pointing to your server
- Root or sudo access

### Software Requirements

- Docker Engine 20.10 or newer
- Docker Compose v2.0 or newer
- Nginx (for reverse proxy)
- Certbot (for SSL certificates)

### Authentication Provider

You will need at least one of the following:
- Slack workspace with admin access
- Google Cloud Platform account
- OpenID Connect (OIDC) provider
- Azure AD, Okta, or similar identity provider

## Step 1: System Preparation

First, update your system and install essential packages:

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y

# Install essential utilities
sudo apt install -y curl wget git apt-transport-https ca-certificates gnupg lsb-release
```

## Step 2: Docker and Docker Compose Setup

### Installing Docker Engine

```bash
# Remove any old Docker installations
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the Docker repository
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package lists and install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to the docker group (log out and back in for this to take effect)
sudo usermod -aG docker $USER

# Enable and start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Verify Docker installation
docker --version
docker compose version
```

### Creating the Project Directory

```bash
# Create directory structure for Outline
sudo mkdir -p /opt/outline
cd /opt/outline

# Set proper ownership
sudo chown -R $USER:$USER /opt/outline
```

## Step 3: PostgreSQL and Redis Configuration

PostgreSQL serves as Outline's primary database, while Redis handles caching and real-time features. Both will be configured in our Docker Compose setup.

### Generating Secure Credentials

Before creating the configuration, generate secure passwords and keys:

```bash
# Generate a secure secret key for Outline (32 bytes hex)
openssl rand -hex 32

# Generate a secure utility secret (32 bytes hex)
openssl rand -hex 32

# Generate a strong password for PostgreSQL
openssl rand -base64 24

# Generate a strong password for MinIO
openssl rand -base64 24
```

Save these values securely; you will need them for the environment configuration.

## Step 4: MinIO/S3 Configuration for File Storage

Outline requires S3-compatible storage for file uploads. We will use MinIO, an open-source S3-compatible object storage server.

MinIO will be included in our Docker Compose setup. The configuration allows Outline to store:
- Document attachments
- User avatars
- Imported files
- Exported archives

## Step 5: Authentication Setup

Outline supports multiple authentication providers. Choose the one that best fits your organization.

### Option A: Slack Authentication

Slack authentication is the simplest option if your team already uses Slack.

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click "Create New App" and select "From scratch"
3. Name your app (e.g., "Outline Wiki") and select your workspace
4. Navigate to "OAuth & Permissions"
5. Add the following redirect URL:
   ```
   https://your-domain.com/auth/slack.callback
   ```
6. Under "Scopes", add these Bot Token Scopes:
   - `identity.avatar`
   - `identity.basic`
   - `identity.email`
   - `identity.team`
7. Install the app to your workspace
8. Copy the Client ID and Client Secret

### Option B: Google Authentication

For Google authentication:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application"
6. Add authorized redirect URI:
   ```
   https://your-domain.com/auth/google.callback
   ```
7. Copy the Client ID and Client Secret

### Option C: OpenID Connect (OIDC)

For OIDC providers (Okta, Auth0, Keycloak, Azure AD):

1. Create a new application in your OIDC provider
2. Set the callback URL to:
   ```
   https://your-domain.com/auth/oidc.callback
   ```
3. Note the following values:
   - Client ID
   - Client Secret
   - Authorization URL
   - Token URL
   - Userinfo URL

## Step 6: Environment Variables Configuration

Create the environment file with all necessary configurations:

```bash
# Create the environment file
nano /opt/outline/.env
```

Add the following configuration (replace placeholder values with your actual credentials):

```bash
# =============================================================================
# OUTLINE WIKI ENVIRONMENT CONFIGURATION
# =============================================================================

# -----------------------------------------------------------------------------
# Required: Core Settings
# -----------------------------------------------------------------------------

# Generate with: openssl rand -hex 32
SECRET_KEY=your_secret_key_here

# Generate with: openssl rand -hex 32
UTILS_SECRET=your_utils_secret_here

# -----------------------------------------------------------------------------
# Database Configuration
# -----------------------------------------------------------------------------

# PostgreSQL connection string
DATABASE_URL=postgres://outline:your_postgres_password@postgres:5432/outline
DATABASE_CONNECTION_POOL_MIN=2
DATABASE_CONNECTION_POOL_MAX=10

# Redis connection string
REDIS_URL=redis://redis:6379

# -----------------------------------------------------------------------------
# Application URL
# -----------------------------------------------------------------------------

# The fully qualified URL where Outline will be accessible
URL=https://wiki.yourdomain.com

# Port for the Outline application (internal)
PORT=3000

# -----------------------------------------------------------------------------
# File Storage (MinIO/S3)
# -----------------------------------------------------------------------------

# S3-compatible storage configuration
AWS_ACCESS_KEY_ID=outline_minio_access_key
AWS_SECRET_ACCESS_KEY=your_minio_secret_key
AWS_REGION=us-east-1
AWS_S3_UPLOAD_BUCKET_URL=https://wiki.yourdomain.com
AWS_S3_UPLOAD_BUCKET_NAME=outline-data
AWS_S3_FORCE_PATH_STYLE=true
AWS_S3_ACL=private

# MinIO specific settings (for local S3-compatible storage)
MINIO_ROOT_USER=outline_minio_access_key
MINIO_ROOT_PASSWORD=your_minio_secret_key

# -----------------------------------------------------------------------------
# Authentication - Choose ONE provider and configure it
# -----------------------------------------------------------------------------

# --- Slack Authentication ---
# SLACK_CLIENT_ID=your_slack_client_id
# SLACK_CLIENT_SECRET=your_slack_client_secret

# --- Google Authentication ---
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret

# --- OIDC Authentication (Okta, Auth0, Keycloak, Azure AD) ---
# OIDC_CLIENT_ID=your_oidc_client_id
# OIDC_CLIENT_SECRET=your_oidc_client_secret
# OIDC_AUTH_URI=https://your-provider.com/authorize
# OIDC_TOKEN_URI=https://your-provider.com/oauth/token
# OIDC_USERINFO_URI=https://your-provider.com/userinfo
# OIDC_LOGOUT_URI=https://your-provider.com/logout
# OIDC_DISPLAY_NAME=SSO Login
# OIDC_SCOPES=openid profile email

# -----------------------------------------------------------------------------
# Email/SMTP Configuration
# -----------------------------------------------------------------------------

# SMTP server settings for sending emails (notifications, invites)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USERNAME=outline@yourdomain.com
SMTP_PASSWORD=your_smtp_password
SMTP_FROM_EMAIL=outline@yourdomain.com
SMTP_REPLY_EMAIL=support@yourdomain.com
SMTP_TLS_CIPHERS=
SMTP_SECURE=false

# -----------------------------------------------------------------------------
# Optional: Additional Settings
# -----------------------------------------------------------------------------

# Force HTTPS
FORCE_HTTPS=true

# Enable rate limiter (recommended for production)
RATE_LIMITER_ENABLED=true
RATE_LIMITER_REQUESTS=1000
RATE_LIMITER_DURATION_WINDOW=60

# Web security
WEB_CONCURRENCY=2

# Default interface language
DEFAULT_LANGUAGE=en_US

# Enable/disable new user signups
ENABLE_UPDATES=true

# Logging level (debug, info, warn, error)
LOG_LEVEL=info

# Allowed domains for new signups (optional, comma-separated)
# ALLOWED_DOMAINS=yourdomain.com

# Maximum import file size in bytes (default: 5MB)
FILE_STORAGE_IMPORT_MAX_SIZE=5242880

# Maximum upload file size in bytes (default: 25MB)
FILE_STORAGE_UPLOAD_MAX_SIZE=26214400

# -----------------------------------------------------------------------------
# Telemetry (Optional)
# -----------------------------------------------------------------------------

# Disable anonymous telemetry
ENABLE_UPDATES=false
```

## Step 7: Docker Compose Configuration

Create the Docker Compose file with all services:

```bash
nano /opt/outline/docker-compose.yml
```

Add the following well-commented configuration:

```yaml
# =============================================================================
# OUTLINE WIKI - DOCKER COMPOSE CONFIGURATION
# =============================================================================
# This configuration sets up a complete Outline Wiki installation with:
# - Outline application server
# - PostgreSQL database
# - Redis cache
# - MinIO S3-compatible storage
# =============================================================================

services:
  # ---------------------------------------------------------------------------
  # OUTLINE APPLICATION
  # ---------------------------------------------------------------------------
  # The main Outline wiki application
  # Handles web interface, API, and document management
  # ---------------------------------------------------------------------------
  outline:
    image: docker.getoutline.com/outlinewiki/outline:latest
    container_name: outline
    restart: unless-stopped
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_started
    networks:
      - outline-network
    ports:
      - "3000:3000"
    volumes:
      # Persistent storage for local data (optional, as we use MinIO)
      - outline-data:/var/lib/outline/data
    environment:
      # Override environment variables if needed
      - PGSSLMODE=disable
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/_health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # ---------------------------------------------------------------------------
  # POSTGRESQL DATABASE
  # ---------------------------------------------------------------------------
  # Primary database for Outline
  # Stores documents, users, collections, and all application data
  # ---------------------------------------------------------------------------
  postgres:
    image: postgres:15-alpine
    container_name: outline-postgres
    restart: unless-stopped
    networks:
      - outline-network
    volumes:
      # Persistent database storage
      - postgres-data:/var/lib/postgresql/data
    environment:
      # PostgreSQL configuration
      POSTGRES_USER: outline
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-your_postgres_password}
      POSTGRES_DB: outline
    healthcheck:
      # Verify PostgreSQL is ready to accept connections
      test: ["CMD-SHELL", "pg_isready -U outline -d outline"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  # ---------------------------------------------------------------------------
  # REDIS CACHE
  # ---------------------------------------------------------------------------
  # In-memory data store for caching and real-time features
  # Handles sessions, websockets, and background job queues
  # ---------------------------------------------------------------------------
  redis:
    image: redis:7-alpine
    container_name: outline-redis
    restart: unless-stopped
    networks:
      - outline-network
    volumes:
      # Persistent Redis data (for session persistence across restarts)
      - redis-data:/data
    command: >
      redis-server
      --appendonly yes
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
    healthcheck:
      # Verify Redis is responding to commands
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  # ---------------------------------------------------------------------------
  # MINIO OBJECT STORAGE
  # ---------------------------------------------------------------------------
  # S3-compatible object storage for file uploads
  # Stores document attachments, images, and exported files
  # ---------------------------------------------------------------------------
  minio:
    image: minio/minio:latest
    container_name: outline-minio
    restart: unless-stopped
    networks:
      - outline-network
    volumes:
      # Persistent object storage
      - minio-data:/data
    environment:
      # MinIO root credentials (match AWS credentials in .env)
      MINIO_ROOT_USER: ${AWS_ACCESS_KEY_ID:-outline_minio_access_key}
      MINIO_ROOT_PASSWORD: ${AWS_SECRET_ACCESS_KEY:-your_minio_secret_key}
      # MinIO browser configuration
      MINIO_BROWSER_REDIRECT_URL: https://wiki.yourdomain.com/minio/ui
    command: server /data --console-address ":9001"
    ports:
      # MinIO API port (internal use)
      - "9000:9000"
      # MinIO Console (optional, for management)
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # ---------------------------------------------------------------------------
  # MINIO SETUP (ONE-TIME INITIALIZATION)
  # ---------------------------------------------------------------------------
  # Creates the required bucket on first startup
  # Runs once and exits after bucket creation
  # ---------------------------------------------------------------------------
  minio-createbucket:
    image: minio/mc:latest
    container_name: outline-minio-createbucket
    depends_on:
      minio:
        condition: service_started
    networks:
      - outline-network
    entrypoint: >
      /bin/sh -c "
      sleep 10;
      /usr/bin/mc alias set myminio http://minio:9000 outline_minio_access_key your_minio_secret_key;
      /usr/bin/mc mb myminio/outline-data --ignore-existing;
      /usr/bin/mc anonymous set download myminio/outline-data/public;
      exit 0;
      "

# -----------------------------------------------------------------------------
# NETWORKS
# -----------------------------------------------------------------------------
# Internal network for service communication
# -----------------------------------------------------------------------------
networks:
  outline-network:
    driver: bridge
    name: outline-network

# -----------------------------------------------------------------------------
# VOLUMES
# -----------------------------------------------------------------------------
# Persistent data volumes for all services
# -----------------------------------------------------------------------------
volumes:
  # Outline application data
  outline-data:
    driver: local
    name: outline-data

  # PostgreSQL database files
  postgres-data:
    driver: local
    name: outline-postgres-data

  # Redis persistence
  redis-data:
    driver: local
    name: outline-redis-data

  # MinIO object storage
  minio-data:
    driver: local
    name: outline-minio-data
```

## Step 8: Nginx Reverse Proxy with SSL

### Installing Nginx and Certbot

```bash
# Install Nginx
sudo apt install -y nginx

# Install Certbot for Let's Encrypt SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Creating Nginx Configuration

```bash
# Create Nginx configuration for Outline
sudo nano /etc/nginx/sites-available/outline
```

Add the following configuration:

```nginx
# =============================================================================
# NGINX CONFIGURATION FOR OUTLINE WIKI
# =============================================================================
# This configuration provides:
# - SSL termination with Let's Encrypt
# - Reverse proxy to Outline application
# - WebSocket support for real-time collaboration
# - MinIO S3 endpoint proxy
# =============================================================================

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name wiki.yourdomain.com;

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Main HTTPS server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name wiki.yourdomain.com;

    # SSL certificate paths (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/wiki.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wiki.yourdomain.com/privkey.pem;

    # SSL configuration for security
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS (optional but recommended)
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/outline_access.log;
    error_log /var/log/nginx/outline_error.log;

    # Maximum upload size (match Outline's FILE_STORAGE_UPLOAD_MAX_SIZE)
    client_max_body_size 50M;

    # Proxy settings
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Proxy timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Main application
    location / {
        proxy_pass http://127.0.0.1:3000;

        # WebSocket support for real-time collaboration
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # MinIO S3 API endpoint for file uploads
    location /s3/ {
        proxy_pass http://127.0.0.1:9000/;

        # Required for MinIO
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering for streaming uploads
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # MinIO Console (optional, remove if not needed)
    location /minio/ui/ {
        proxy_pass http://127.0.0.1:9001/;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for MinIO Console
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint
    location /_health {
        proxy_pass http://127.0.0.1:3000/_health;
        access_log off;
    }
}
```

### Enabling the Configuration and Obtaining SSL

```bash
# Enable the Outline site configuration
sudo ln -s /etc/nginx/sites-available/outline /etc/nginx/sites-enabled/

# Remove default site if not needed
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx to apply changes
sudo systemctl reload nginx

# Obtain SSL certificate (ensure DNS is pointing to your server first)
sudo certbot --nginx -d wiki.yourdomain.com

# Verify automatic renewal is configured
sudo certbot renew --dry-run
```

## Step 9: Email/SMTP Configuration

Email functionality enables Outline to send notifications, password resets, and invite links. Here are configurations for popular email providers:

### Gmail SMTP

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_SECURE=false
```

Note: For Gmail, you need to create an App Password in your Google Account settings.

### Amazon SES

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_SECURE=false
```

### Mailgun

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USERNAME=postmaster@yourdomain.mailgun.org
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM_EMAIL=outline@yourdomain.com
SMTP_SECURE=false
```

### SendGrid

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=outline@yourdomain.com
SMTP_SECURE=false
```

## Step 10: Starting Outline

With all configurations in place, start the services:

```bash
# Navigate to the Outline directory
cd /opt/outline

# Start all services in detached mode
docker compose up -d

# View logs to monitor startup
docker compose logs -f outline

# Check the status of all services
docker compose ps
```

After successful startup, access Outline at `https://wiki.yourdomain.com`.

## Step 11: Customization Options

### Custom Branding

Outline supports several customization options through environment variables:

```bash
# Custom team name (shown in header)
DEFAULT_LANGUAGE=en_US

# Restrict signups to specific email domains
ALLOWED_DOMAINS=yourdomain.com,company.com

# Disable public document sharing
# This must be configured through the admin interface
```

### Custom CSS

You can add custom CSS through Outline's admin settings:

1. Log in as an admin
2. Go to Settings > Appearance
3. Add custom CSS in the designated field

Example custom CSS:

```css
/* Custom primary color */
:root {
  --theme-primary: #0366d6;
  --theme-accent: #0366d6;
}

/* Custom font */
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Hide specific elements */
.sidebar-footer {
  display: none;
}
```

### Document Templates

Create document templates through the Outline interface:

1. Create a new document with your template content
2. In the document menu, select "Save as template"
3. Templates become available when creating new documents

## Step 12: Backup and Restore

### Automated Backup Script

Create a comprehensive backup script:

```bash
sudo nano /opt/outline/backup.sh
```

Add the following content:

```bash
#!/bin/bash
# =============================================================================
# OUTLINE BACKUP SCRIPT
# =============================================================================
# Creates timestamped backups of PostgreSQL and MinIO data
# Run via cron: 0 2 * * * /opt/outline/backup.sh
# =============================================================================

# Configuration
BACKUP_DIR="/opt/outline/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="outline_backup_${TIMESTAMP}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup PostgreSQL database
echo "Backing up PostgreSQL database..."
docker exec outline-postgres pg_dump -U outline outline | gzip > "${BACKUP_DIR}/${BACKUP_NAME}_postgres.sql.gz"

# Backup MinIO data
echo "Backing up MinIO data..."
docker run --rm \
  --volumes-from outline-minio \
  -v "${BACKUP_DIR}:/backup" \
  alpine:latest \
  tar czf "/backup/${BACKUP_NAME}_minio.tar.gz" -C /data .

# Backup environment file
echo "Backing up configuration..."
cp /opt/outline/.env "${BACKUP_DIR}/${BACKUP_NAME}_env.bak"

# Create combined archive
echo "Creating combined backup archive..."
cd "${BACKUP_DIR}"
tar czf "${BACKUP_NAME}.tar.gz" \
  "${BACKUP_NAME}_postgres.sql.gz" \
  "${BACKUP_NAME}_minio.tar.gz" \
  "${BACKUP_NAME}_env.bak"

# Clean up individual files
rm -f "${BACKUP_NAME}_postgres.sql.gz" "${BACKUP_NAME}_minio.tar.gz" "${BACKUP_NAME}_env.bak"

# Remove old backups
echo "Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "outline_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
```

Make the script executable and schedule it:

```bash
# Make script executable
chmod +x /opt/outline/backup.sh

# Add to cron (runs daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/outline/backup.sh >> /var/log/outline-backup.log 2>&1") | crontab -
```

### Restore Procedure

To restore from a backup:

```bash
#!/bin/bash
# =============================================================================
# OUTLINE RESTORE SCRIPT
# =============================================================================
# Usage: ./restore.sh /path/to/outline_backup_YYYYMMDD_HHMMSS.tar.gz
# =============================================================================

BACKUP_FILE="$1"
RESTORE_DIR="/tmp/outline_restore"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 /path/to/backup.tar.gz"
    exit 1
fi

# Stop Outline
cd /opt/outline
docker compose down

# Extract backup
mkdir -p "${RESTORE_DIR}"
tar xzf "${BACKUP_FILE}" -C "${RESTORE_DIR}"

# Find the backup files
POSTGRES_BACKUP=$(find "${RESTORE_DIR}" -name "*_postgres.sql.gz" | head -1)
MINIO_BACKUP=$(find "${RESTORE_DIR}" -name "*_minio.tar.gz" | head -1)

# Start only database containers
docker compose up -d postgres redis

# Wait for PostgreSQL to be ready
sleep 10

# Restore PostgreSQL
echo "Restoring PostgreSQL database..."
gunzip -c "${POSTGRES_BACKUP}" | docker exec -i outline-postgres psql -U outline outline

# Restore MinIO data
echo "Restoring MinIO data..."
docker compose up -d minio
sleep 5
docker run --rm \
  --volumes-from outline-minio \
  -v "${RESTORE_DIR}:/backup" \
  alpine:latest \
  sh -c "rm -rf /data/* && tar xzf /backup/*_minio.tar.gz -C /data"

# Start all services
docker compose up -d

# Cleanup
rm -rf "${RESTORE_DIR}"

echo "Restore completed. Please verify your Outline installation."
```

## Step 13: Updating Outline

### Standard Update Procedure

```bash
cd /opt/outline

# Pull the latest images
docker compose pull

# Stop the current containers
docker compose down

# Start with the new images
docker compose up -d

# Monitor logs for any issues
docker compose logs -f outline
```

### Update Script with Backup

Create a safe update script:

```bash
sudo nano /opt/outline/update.sh
```

```bash
#!/bin/bash
# =============================================================================
# OUTLINE UPDATE SCRIPT
# =============================================================================
# Safely updates Outline with automatic backup
# =============================================================================

set -e

cd /opt/outline

echo "Creating pre-update backup..."
./backup.sh

echo "Pulling latest images..."
docker compose pull

echo "Stopping current containers..."
docker compose down

echo "Starting updated containers..."
docker compose up -d

echo "Waiting for services to start..."
sleep 30

# Check if Outline is healthy
if curl -sf http://localhost:3000/_health > /dev/null; then
    echo "Update completed successfully!"
else
    echo "Health check failed. Check logs with: docker compose logs outline"
    exit 1
fi
```

## Troubleshooting

### Common Issues and Solutions

**Issue: Outline container keeps restarting**

```bash
# Check container logs
docker compose logs outline

# Common causes:
# - Database connection issues
# - Missing or invalid SECRET_KEY
# - Authentication provider misconfiguration
```

**Issue: Cannot upload files**

```bash
# Verify MinIO is running and accessible
docker compose logs minio

# Check MinIO bucket exists
docker exec -it outline-minio mc ls local/outline-data

# Verify S3 credentials match in .env
```

**Issue: Authentication not working**

```bash
# Verify callback URLs match exactly
# Check authentication provider configuration
# Ensure HTTPS is properly configured

# View authentication errors
docker compose logs outline | grep -i auth
```

**Issue: WebSocket connection failed**

```bash
# Verify Nginx WebSocket headers
# Check proxy_set_header Upgrade and Connection settings
# Ensure firewall allows WebSocket connections
```

### Useful Commands

```bash
# View all container statuses
docker compose ps

# View real-time logs
docker compose logs -f

# Restart a specific service
docker compose restart outline

# Enter container shell for debugging
docker exec -it outline /bin/sh

# Check database connectivity
docker exec -it outline-postgres psql -U outline -c "SELECT 1"

# Check Redis connectivity
docker exec -it outline-redis redis-cli ping
```

## Security Best Practices

1. **Keep secrets secure**: Never commit `.env` files to version control
2. **Regular updates**: Subscribe to Outline releases and update promptly
3. **Network security**: Use firewall rules to limit access
4. **SSL/TLS**: Always use HTTPS in production
5. **Backup encryption**: Consider encrypting backup files
6. **Access control**: Use ALLOWED_DOMAINS to restrict signups
7. **Audit logs**: Monitor access logs regularly

## Monitoring Your Outline Installation with OneUptime

Once your Outline wiki is up and running, it is crucial to monitor its availability and performance. **OneUptime** is an open-source, comprehensive observability platform that can help you monitor your Outline installation effectively.

With OneUptime, you can:

- **Uptime Monitoring**: Set up HTTP monitors to check if your Outline instance is accessible and responding correctly
- **Performance Tracking**: Monitor response times and identify slow performance before users notice
- **Alert Notifications**: Receive instant alerts via email, Slack, SMS, or webhooks when issues occur
- **Status Pages**: Create public or private status pages to communicate service status to your team
- **Incident Management**: Track and manage incidents with built-in incident management workflows
- **Log Management**: Centralize logs from Outline and related services for easier debugging
- **Traces and Metrics**: Gain deep insights into application performance

To get started with OneUptime monitoring for your Outline wiki:

1. Sign up for OneUptime at [https://oneuptime.com](https://oneuptime.com)
2. Create a new monitor for your Outline URL (`https://wiki.yourdomain.com`)
3. Configure alerting rules based on your requirements
4. Set up a status page to keep your team informed

OneUptime is open-source and can be self-hosted alongside your Outline installation, giving you complete control over your monitoring infrastructure. Check out the OneUptime GitHub repository at [https://github.com/OneUptime/oneuptime](https://github.com/OneUptime/oneuptime) for self-hosting instructions.

## Conclusion

You have successfully set up Outline Wiki on Ubuntu with Docker, complete with PostgreSQL, Redis, MinIO storage, and SSL-secured Nginx reverse proxy. Your installation includes:

- A fully functional knowledge base accessible via HTTPS
- Persistent data storage with automated backups
- Authentication integrated with your chosen provider
- Email notifications for team collaboration
- A foundation for customization and scaling

Outline provides an excellent platform for team documentation and knowledge sharing. With proper monitoring through OneUptime and regular maintenance, your self-hosted Outline instance will serve your team reliably for years to come.

For more information and updates, refer to the official resources:
- [Outline Documentation](https://docs.getoutline.com)
- [Outline GitHub Repository](https://github.com/outline/outline)
- [Outline Docker Hub](https://hub.docker.com/r/outlinewiki/outline)
