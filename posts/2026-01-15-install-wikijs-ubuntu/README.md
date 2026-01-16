# How to Install Wiki.js on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Wiki.js, Documentation, Knowledge Base, Self-Hosted, Tutorial

Description: Complete guide to installing Wiki.js documentation platform on Ubuntu.

---

Wiki.js is a powerful, open-source wiki engine that provides a modern and intuitive way to create, organize, and share documentation. Built on Node.js, it offers a sleek interface, robust features, and excellent performance. This comprehensive guide walks you through installing Wiki.js on Ubuntu, from initial setup to production-ready deployment.

## Wiki.js Features Overview

Before diving into the installation, let's explore what makes Wiki.js an excellent choice for your documentation needs:

### Core Features

- **Modern WYSIWYG Editor**: Rich text editing with markdown support, visual editor, and raw HTML options
- **Multiple Storage Backends**: Git, AWS S3, Azure Blob Storage, Google Cloud Storage, and local filesystem
- **Full-Text Search**: Built-in search with support for Elasticsearch, PostgreSQL full-text, and Algolia
- **Authentication Providers**: Local, LDAP, OAuth2, SAML, Azure AD, Google, GitHub, and many more
- **Access Control**: Granular permissions with groups and page-level access rules
- **Multilingual Support**: Built-in internationalization with support for 40+ languages
- **API Access**: GraphQL API for programmatic access and integrations
- **Theming**: Customizable themes and branding options
- **Comments**: Built-in commenting system for collaboration
- **Page Analytics**: Track page views and user engagement

### Technical Highlights

- Built on Node.js for excellent performance
- PostgreSQL, MySQL, MariaDB, MS SQL Server, or SQLite database support
- Docker and Kubernetes ready
- Automatic SSL/TLS with Let's Encrypt integration
- Real-time collaborative editing

## Prerequisites

Before installing Wiki.js, ensure your Ubuntu server meets the following requirements:

### System Requirements

- Ubuntu 20.04 LTS, 22.04 LTS, or 24.04 LTS
- Minimum 1 GB RAM (2 GB+ recommended for production)
- 1 CPU core minimum (2+ recommended)
- 1 GB free disk space (more for content storage)

### Software Requirements

- Node.js 18.x or 20.x LTS
- PostgreSQL 11+ (recommended) or another supported database
- Nginx (for reverse proxy)
- Certbot (for SSL certificates)

### Update Your System

Start by updating your Ubuntu system:

```bash
# Update package lists
sudo apt update

# Upgrade existing packages
sudo apt upgrade -y

# Install essential utilities
sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates
```

## Installing Node.js

Wiki.js requires Node.js 18.x or 20.x. We'll install Node.js 20.x LTS using the NodeSource repository:

```bash
# Download and run the NodeSource setup script for Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify the installation
node --version
# Expected output: v20.x.x

npm --version
# Expected output: 10.x.x
```

## Database Setup (PostgreSQL)

PostgreSQL is the recommended database for Wiki.js due to its excellent full-text search capabilities and reliability.

### Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify PostgreSQL is running
sudo systemctl status postgresql
```

### Create Database and User

```bash
# Switch to the postgres user
sudo -i -u postgres

# Access PostgreSQL shell
psql
```

Execute the following SQL commands in the PostgreSQL shell:

```sql
-- Create a dedicated user for Wiki.js
-- Replace 'your_secure_password' with a strong password
CREATE USER wikijs WITH PASSWORD 'your_secure_password';

-- Create the Wiki.js database
CREATE DATABASE wikijs OWNER wikijs;

-- Grant all privileges on the database to the wikijs user
GRANT ALL PRIVILEGES ON DATABASE wikijs TO wikijs;

-- Connect to the wikijs database
\c wikijs

-- Grant schema privileges (required for PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO wikijs;

-- Exit PostgreSQL shell
\q
```

Exit the postgres user session:

```bash
exit
```

### Configure PostgreSQL Authentication

For enhanced security, configure PostgreSQL to use password authentication:

```bash
# Edit PostgreSQL authentication configuration
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Find the line for local connections and ensure it uses `scram-sha-256` or `md5`:

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   wikijs          wikijs                                  scram-sha-256
host    wikijs          wikijs          127.0.0.1/32            scram-sha-256
host    wikijs          wikijs          ::1/128                 scram-sha-256
```

Restart PostgreSQL to apply changes:

```bash
sudo systemctl restart postgresql
```

### Test Database Connection

```bash
# Test the connection with the wikijs user
psql -h localhost -U wikijs -d wikijs -c "SELECT version();"
# Enter the password when prompted
```

## Downloading and Installing Wiki.js

### Create Wiki.js User

For security, run Wiki.js under a dedicated system user:

```bash
# Create a system user for Wiki.js
sudo useradd -r -s /bin/false wikijs

# Create the Wiki.js directory
sudo mkdir -p /var/www/wikijs

# Set ownership
sudo chown wikijs:wikijs /var/www/wikijs
```

### Download Wiki.js

```bash
# Navigate to the Wiki.js directory
cd /var/www/wikijs

# Download the latest Wiki.js release
sudo -u wikijs wget https://github.com/Requarks/wiki/releases/latest/download/wiki-js.tar.gz

# Extract the archive
sudo -u wikijs tar xzf wiki-js.tar.gz

# Remove the archive
sudo rm wiki-js.tar.gz

# Verify the installation
ls -la /var/www/wikijs
```

## Configuration File Setup

Wiki.js uses a YAML configuration file for its settings:

```bash
# Create the configuration file from the sample
sudo -u wikijs cp /var/www/wikijs/config.sample.yml /var/www/wikijs/config.yml

# Edit the configuration file
sudo nano /var/www/wikijs/config.yml
```

Replace the contents with the following well-commented configuration:

```yaml
#######################################################################
# Wiki.js - CONFIGURATION                                             #
#######################################################################
# Full documentation: https://docs.requarks.io/install/config

# ---------------------------------------------------------------------
# Port Configuration
# ---------------------------------------------------------------------
# The port on which Wiki.js will listen
# Default: 3000
# Note: Use a reverse proxy (nginx) for production deployments
port: 3000

# ---------------------------------------------------------------------
# Database Configuration
# ---------------------------------------------------------------------
# Wiki.js supports PostgreSQL (recommended), MySQL, MariaDB, MS SQL Server, and SQLite
db:
  # Database type: postgres, mysql, mariadb, mssql, or sqlite
  type: postgres

  # PostgreSQL connection settings
  host: localhost
  port: 5432
  user: wikijs
  pass: your_secure_password  # Replace with your actual password
  db: wikijs

  # SSL/TLS connection (set to true if your database requires SSL)
  ssl: false

  # Connection pool settings for better performance
  # pool:
  #   min: 2
  #   max: 10

# ---------------------------------------------------------------------
# SSL/TLS Configuration (Direct)
# ---------------------------------------------------------------------
# Note: For production, use a reverse proxy with SSL instead
# ssl:
#   enabled: false
#   port: 3443
#   provider: custom  # or 'letsencrypt'
#
#   # For custom certificates:
#   # format: pem
#   # key: path/to/key.pem
#   # cert: path/to/cert.pem
#   # passphrase: ''
#   # dhparam: ''
#
#   # For Let's Encrypt:
#   # domain: wiki.yourdomain.com
#   # subscriberEmail: admin@yourdomain.com

# ---------------------------------------------------------------------
# Bind Address
# ---------------------------------------------------------------------
# Set to 127.0.0.1 when using a reverse proxy (recommended)
# Set to 0.0.0.0 to listen on all interfaces
bindIP: 127.0.0.1

# ---------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------
logLevel: info
# Available levels: error, warn, info, verbose, debug, silly

# Log format: default or json
logFormat: default

# ---------------------------------------------------------------------
# High Availability (HA) Mode
# ---------------------------------------------------------------------
# Enable for multi-instance deployments
# ha: false

# ---------------------------------------------------------------------
# Data Path
# ---------------------------------------------------------------------
# Path where Wiki.js stores temporary data, cache, etc.
dataPath: /var/www/wikijs/data

# ---------------------------------------------------------------------
# Offline Mode
# ---------------------------------------------------------------------
# Set to true to disable telemetry and external connections
offline: false

# ---------------------------------------------------------------------
# Trust Proxy
# ---------------------------------------------------------------------
# Enable when behind a reverse proxy
trustProxy: true
```

Set proper permissions on the configuration file:

```bash
# Secure the configuration file (contains database password)
sudo chmod 600 /var/www/wikijs/config.yml
sudo chown wikijs:wikijs /var/www/wikijs/config.yml
```

## Creating Systemd Service

Create a systemd service file to manage Wiki.js:

```bash
sudo nano /etc/systemd/system/wikijs.service
```

Add the following content:

```ini
#######################################################################
# Wiki.js - Systemd Service Configuration                             #
#######################################################################
# This service file manages the Wiki.js application lifecycle

[Unit]
# Service description
Description=Wiki.js Documentation Platform

# Start after network and database are available
After=network.target postgresql.service

# Optional: Require PostgreSQL to be running
Wants=postgresql.service

[Service]
# Service type - simple is appropriate for Node.js applications
Type=simple

# Run as the dedicated wikijs user for security
User=wikijs
Group=wikijs

# Working directory where Wiki.js is installed
WorkingDirectory=/var/www/wikijs

# Command to start Wiki.js
ExecStart=/usr/bin/node server

# Restart policy - always restart on failure
Restart=always
RestartSec=10

# Environment variables
Environment=NODE_ENV=production

# Security hardening options
# Prevent the service from gaining new privileges
NoNewPrivileges=true

# Protect system directories
ProtectSystem=strict

# Protect home directories
ProtectHome=true

# Allow write access to Wiki.js data directory
ReadWritePaths=/var/www/wikijs

# Private /tmp directory
PrivateTmp=true

# Limit file descriptor count
LimitNOFILE=65535

# Standard output and error logging
StandardOutput=journal
StandardError=journal

# Identify logs in journalctl
SyslogIdentifier=wikijs

[Install]
# Start on multi-user runlevel
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable Wiki.js to start on boot
sudo systemctl enable wikijs

# Start Wiki.js
sudo systemctl start wikijs

# Check the service status
sudo systemctl status wikijs

# View logs if needed
sudo journalctl -u wikijs -f
```

## Nginx Reverse Proxy Configuration

Setting up Nginx as a reverse proxy provides better security, SSL termination, and performance.

### Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Create Nginx Configuration

```bash
# Create a new Nginx configuration for Wiki.js
sudo nano /etc/nginx/sites-available/wikijs
```

Add the following configuration:

```nginx
#######################################################################
# Wiki.js - Nginx Reverse Proxy Configuration                         #
#######################################################################
# This configuration proxies requests to the Wiki.js application

# Upstream definition for Wiki.js
upstream wikijs {
    # Wiki.js server address and port
    server 127.0.0.1:3000;

    # Keep connections alive for better performance
    keepalive 32;
}

# HTTP server block - redirects to HTTPS
server {
    # Listen on port 80 (HTTP)
    listen 80;
    listen [::]:80;

    # Your domain name(s)
    server_name wiki.yourdomain.com;

    # Redirect all HTTP traffic to HTTPS
    # This will be modified by Certbot during SSL setup
    location / {
        return 301 https://$server_name$request_uri;
    }

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}

# HTTPS server block
server {
    # Listen on port 443 (HTTPS) with HTTP/2 support
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    # Your domain name(s)
    server_name wiki.yourdomain.com;

    # SSL certificate paths (will be configured by Certbot)
    # ssl_certificate /etc/letsencrypt/live/wiki.yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/wiki.yourdomain.com/privkey.pem;

    # Temporary self-signed certificate (replace with Let's Encrypt)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;

    # SSL/TLS configuration for security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_ecdh_curve secp384r1;

    # SSL session settings
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # OCSP Stapling (uncomment after setting up Let's Encrypt)
    # ssl_stapling on;
    # ssl_stapling_verify on;
    # ssl_trusted_certificate /etc/letsencrypt/live/wiki.yourdomain.com/chain.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # HSTS (uncomment after confirming HTTPS works)
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging configuration
    access_log /var/log/nginx/wikijs_access.log;
    error_log /var/log/nginx/wikijs_error.log;

    # Maximum upload size (for file uploads in Wiki.js)
    client_max_body_size 100M;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_vary on;
    gzip_min_length 1000;

    # Proxy settings for Wiki.js
    location / {
        # Pass requests to Wiki.js upstream
        proxy_pass http://wikijs;

        # HTTP version for upstream connection
        proxy_http_version 1.1;

        # Headers for WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Pass original client information
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;

        # Cache settings for static assets
        proxy_cache_bypass $http_upgrade;
    }

    # Static asset caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://wikijs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        # Cache static assets for 1 year
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the configuration:

```bash
# Enable the Wiki.js site configuration
sudo ln -s /etc/nginx/sites-available/wikijs /etc/nginx/sites-enabled/

# Remove the default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## SSL/TLS Configuration with Let's Encrypt

Secure your Wiki.js installation with a free SSL certificate from Let's Encrypt:

### Install Certbot

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain SSL Certificate

```bash
# Obtain and install SSL certificate
# Replace wiki.yourdomain.com with your actual domain
sudo certbot --nginx -d wiki.yourdomain.com

# Follow the prompts:
# 1. Enter your email address for renewal notifications
# 2. Agree to the Terms of Service
# 3. Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

### Automatic Certificate Renewal

Certbot automatically installs a systemd timer for certificate renewal. Verify it's active:

```bash
# Check the Certbot timer status
sudo systemctl status certbot.timer

# Test automatic renewal
sudo certbot renew --dry-run
```

### Update Nginx Configuration After SSL

After Certbot configures SSL, update the Nginx configuration to enable additional security features:

```bash
sudo nano /etc/nginx/sites-available/wikijs
```

Uncomment the HSTS and OCSP Stapling lines:

```nginx
# HSTS - Force HTTPS for all future visits
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/letsencrypt/live/wiki.yourdomain.com/chain.pem;
```

Reload Nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Initial Setup Wizard

After completing the installation, access Wiki.js through your web browser:

1. Navigate to `https://wiki.yourdomain.com`
2. The initial setup wizard will appear

### Administrator Account Setup

The first screen prompts you to create an administrator account:

- **Administrator Email**: Enter a valid email address (used for login and notifications)
- **Password**: Choose a strong password (minimum 8 characters)
- **Site URL**: Confirm your site URL (e.g., `https://wiki.yourdomain.com`)

### Site Configuration

Configure your wiki's basic settings:

- **Site Title**: The name of your wiki (appears in browser tab and headers)
- **Site Description**: A brief description of your wiki's purpose
- **Site Logo**: Upload a custom logo (optional)
- **Default Language**: Select your preferred language

### Completing Setup

Click "Install" to complete the setup. Wiki.js will:

1. Initialize the database schema
2. Create the administrator account
3. Configure default settings
4. Redirect you to the login page

Log in with your administrator credentials to access the administration panel.

## Authentication Providers

Wiki.js supports numerous authentication methods. Configure them through the Administration Panel.

### Accessing Authentication Settings

1. Log in as administrator
2. Click on "Administration" (gear icon)
3. Navigate to "Authentication" in the left sidebar

### Local Authentication

Local authentication is enabled by default and stores credentials in the database:

```
# Local authentication settings (configured via admin panel)
Strategy: Local
Self-registration: Enable/Disable as needed
Minimum Password Length: 8 (recommended: 12+)
Allow Password Reset: Yes
```

### OAuth2 Providers

Wiki.js supports many OAuth2 providers. Here's how to configure common ones:

#### GitHub Authentication

1. Create a GitHub OAuth App at: `https://github.com/settings/developers`
2. Set Authorization callback URL: `https://wiki.yourdomain.com/login/github/callback`
3. In Wiki.js admin panel:
   - Strategy: GitHub
   - Client ID: Your GitHub OAuth App client ID
   - Client Secret: Your GitHub OAuth App client secret
   - Allow self-registration: As desired

#### Google Authentication

1. Create credentials in Google Cloud Console: `https://console.cloud.google.com/apis/credentials`
2. Set Authorized redirect URI: `https://wiki.yourdomain.com/login/google/callback`
3. In Wiki.js admin panel:
   - Strategy: Google
   - Client ID: Your Google OAuth client ID
   - Client Secret: Your Google OAuth client secret

#### Azure AD / Microsoft

1. Register an application in Azure Portal: `https://portal.azure.com`
2. Set Redirect URI: `https://wiki.yourdomain.com/login/azure/callback`
3. In Wiki.js admin panel:
   - Strategy: Azure AD
   - Application (Client) ID: From Azure app registration
   - Client Secret: Create one in Azure
   - Tenant ID: Your Azure AD tenant ID

### LDAP Authentication

For enterprise environments using Active Directory or OpenLDAP:

```
Strategy: LDAP
Server URL: ldap://ldap.yourdomain.com:389 (or ldaps:// for SSL)
Bind DN: cn=wikijs,ou=service-accounts,dc=yourdomain,dc=com
Bind Password: [Service account password]
Search Base: ou=users,dc=yourdomain,dc=com
Search Filter: (sAMAccountName={{username}}) (for AD)
              (uid={{username}}) (for OpenLDAP)
TLS: Enable if using LDAPS
```

### SAML 2.0

For Single Sign-On with SAML identity providers:

```
Strategy: SAML
Entry Point: https://idp.yourdomain.com/saml/sso
Issuer: wiki.yourdomain.com
Audience: https://wiki.yourdomain.com
Certificate: [IdP's public certificate]
Private Key: [Your private key if required]
Signature Algorithm: SHA-256
```

## Storage Modules

Wiki.js can sync content with various storage backends for version control and backup.

### Accessing Storage Settings

1. Go to Administration > Storage
2. Select your desired storage module

### Git Storage (Recommended)

Sync your wiki content with a Git repository:

```yaml
# Git Storage Configuration
Module: Git
Authentication Type: SSH or Basic

# For SSH authentication:
Repository URL: git@github.com:yourusername/wiki-content.git
Branch: main
SSH Private Key: [Your private key content]

# For HTTPS authentication:
Repository URL: https://github.com/yourusername/wiki-content.git
Branch: main
Username: your-github-username
Password/Token: [Personal Access Token]

# Sync settings:
Sync Direction: Bi-directional (push and pull)
Sync Interval: 5 minutes
```

Setting up Git storage:

```bash
# Generate SSH key for Wiki.js (on server)
sudo -u wikijs ssh-keygen -t ed25519 -C "wikijs@yourdomain.com" -f /var/www/wikijs/.ssh/id_ed25519 -N ""

# Create .ssh directory if it doesn't exist
sudo mkdir -p /var/www/wikijs/.ssh
sudo chown -R wikijs:wikijs /var/www/wikijs/.ssh
sudo chmod 700 /var/www/wikijs/.ssh

# Display the public key to add to GitHub/GitLab
sudo cat /var/www/wikijs/.ssh/id_ed25519.pub
```

### AWS S3 Storage

Store wiki assets in Amazon S3:

```yaml
# S3 Storage Configuration
Module: AWS S3
Region: us-east-1
Bucket: your-wikijs-bucket
Access Key ID: AKIAXXXXXXXXXXXXXXXX
Secret Access Key: [Your secret key]
Path Prefix: wiki/ (optional, for organizing content)
```

### Azure Blob Storage

```yaml
# Azure Blob Storage Configuration
Module: Azure Blob Storage
Account Name: yourstorageaccount
Account Key: [Your storage account key]
Container Name: wikijs-content
```

### Google Cloud Storage

```yaml
# Google Cloud Storage Configuration
Module: Google Cloud Storage
Bucket: your-wikijs-bucket
Service Account Key: [JSON key file content]
```

### Local Filesystem Storage

For simple deployments or when using external backup solutions:

```yaml
# Local Storage Configuration
Module: Local File System
Path: /var/www/wikijs/data/repo
Create Daily Backups: Yes
```

## Search Engine Configuration

Wiki.js supports multiple search engines for finding content.

### Accessing Search Settings

1. Go to Administration > Search
2. Select your preferred search engine

### PostgreSQL Full-Text Search (Default)

When using PostgreSQL, the built-in full-text search is automatically available:

```yaml
# PostgreSQL Search Configuration
Engine: Database - PostgreSQL
# No additional configuration needed
# Uses the same database connection as Wiki.js
```

### Elasticsearch

For large wikis with advanced search requirements:

```bash
# Install Elasticsearch on Ubuntu
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update && sudo apt install -y elasticsearch

# Start Elasticsearch
sudo systemctl start elasticsearch
sudo systemctl enable elasticsearch
```

Configure in Wiki.js:

```yaml
# Elasticsearch Configuration
Engine: Elasticsearch
Hostname: localhost
Port: 9200
Index Prefix: wiki
Sniff on Start: No
SSL: No (enable if using SSL)
# For Elasticsearch 8.x with security:
API Key: [Your Elasticsearch API key]
```

### Algolia

For cloud-hosted search with excellent performance:

```yaml
# Algolia Configuration
Engine: Algolia
Application ID: [Your Algolia App ID]
Admin API Key: [Your Algolia Admin API Key]
Index Name: wiki-pages
```

### Rebuilding Search Index

After changing search engines or if search isn't working:

1. Go to Administration > Search
2. Click "Rebuild Index"
3. Wait for the indexing to complete

## Backup Strategies

Implementing a robust backup strategy is crucial for protecting your wiki content.

### Database Backups

Create automated PostgreSQL backups:

```bash
# Create backup directory
sudo mkdir -p /var/backups/wikijs
sudo chown postgres:postgres /var/backups/wikijs

# Create backup script
sudo nano /usr/local/bin/backup-wikijs.sh
```

Add the following script:

```bash
#!/bin/bash
#######################################################################
# Wiki.js Database Backup Script                                       #
#######################################################################

# Configuration
BACKUP_DIR="/var/backups/wikijs"
DB_NAME="wikijs"
DB_USER="wikijs"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/wikijs_${DATE}.sql.gz"
RETENTION_DAYS=30

# Export password for pg_dump (alternative: use .pgpass file)
export PGPASSWORD="your_secure_password"

# Create backup with compression
pg_dump -h localhost -U ${DB_USER} ${DB_NAME} | gzip > ${BACKUP_FILE}

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup created successfully: ${BACKUP_FILE}"

    # Set proper permissions
    chmod 600 ${BACKUP_FILE}

    # Remove backups older than retention period
    find ${BACKUP_DIR} -name "wikijs_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

    echo "Old backups cleaned up (retention: ${RETENTION_DAYS} days)"
else
    echo "Backup failed!"
    exit 1
fi

# Unset password
unset PGPASSWORD
```

Make the script executable and schedule it:

```bash
# Make script executable
sudo chmod +x /usr/local/bin/backup-wikijs.sh

# Create a cron job for daily backups
sudo crontab -e
```

Add the following line for daily backups at 2 AM:

```
0 2 * * * /usr/local/bin/backup-wikijs.sh >> /var/log/wikijs-backup.log 2>&1
```

### Application Data Backup

Back up Wiki.js configuration and data:

```bash
# Create comprehensive backup script
sudo nano /usr/local/bin/backup-wikijs-full.sh
```

```bash
#!/bin/bash
#######################################################################
# Wiki.js Full Backup Script (Database + Files)                        #
#######################################################################

BACKUP_DIR="/var/backups/wikijs"
DATE=$(date +%Y%m%d_%H%M%S)
FULL_BACKUP="${BACKUP_DIR}/wikijs_full_${DATE}.tar.gz"

# Create database backup first
/usr/local/bin/backup-wikijs.sh

# Backup Wiki.js files (config and data)
tar -czf ${FULL_BACKUP} \
    --exclude='/var/www/wikijs/node_modules' \
    --exclude='/var/www/wikijs/*.tar.gz' \
    /var/www/wikijs/config.yml \
    /var/www/wikijs/data \
    ${BACKUP_DIR}/wikijs_${DATE}.sql.gz

# Set permissions
chmod 600 ${FULL_BACKUP}

echo "Full backup created: ${FULL_BACKUP}"
```

### Remote Backup with Rclone

For off-site backups, use rclone to sync to cloud storage:

```bash
# Install rclone
sudo apt install -y rclone

# Configure rclone (interactive setup)
rclone config

# Example: Sync backups to S3
rclone sync /var/backups/wikijs remote:wikijs-backups --transfers 4
```

Add to the backup script:

```bash
# Add to backup script for automatic cloud sync
rclone copy ${FULL_BACKUP} remote:wikijs-backups/$(date +%Y/%m)/ --log-file=/var/log/rclone-wikijs.log
```

### Restore Procedures

Document your restore procedures:

```bash
# Restore database from backup
gunzip < /var/backups/wikijs/wikijs_YYYYMMDD_HHMMSS.sql.gz | psql -h localhost -U wikijs -d wikijs

# Or restore to a new database
createdb -h localhost -U postgres wikijs_restored
gunzip < /var/backups/wikijs/wikijs_YYYYMMDD_HHMMSS.sql.gz | psql -h localhost -U wikijs -d wikijs_restored

# Restore configuration files
tar -xzf /var/backups/wikijs/wikijs_full_YYYYMMDD_HHMMSS.tar.gz -C /

# Restart Wiki.js after restore
sudo systemctl restart wikijs
```

## Performance Tuning

Optimize Wiki.js for better performance:

### PostgreSQL Tuning

Edit PostgreSQL configuration:

```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Recommended settings for a server with 4GB RAM:

```ini
# Memory Configuration
shared_buffers = 1GB                    # 25% of RAM
effective_cache_size = 3GB              # 75% of RAM
work_mem = 64MB                         # Per-operation memory
maintenance_work_mem = 256MB            # For maintenance operations

# Write Ahead Log
wal_buffers = 64MB
checkpoint_completion_target = 0.9

# Query Planner
random_page_cost = 1.1                  # For SSD storage
effective_io_concurrency = 200          # For SSD storage

# Connection Settings
max_connections = 100
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### Node.js Memory Limits

For large wikis, increase Node.js memory limit:

```bash
# Edit the systemd service
sudo nano /etc/systemd/system/wikijs.service
```

Add memory limit to Environment:

```ini
Environment=NODE_ENV=production NODE_OPTIONS="--max-old-space-size=2048"
```

Reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart wikijs
```

## Security Hardening

Implement additional security measures:

### Firewall Configuration

```bash
# Install UFW if not present
sudo apt install -y ufw

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### Fail2Ban for Nginx

Protect against brute-force attacks:

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Create Wiki.js jail configuration
sudo nano /etc/fail2ban/jail.d/wikijs.conf
```

```ini
[wikijs]
enabled = true
port = http,https
filter = wikijs
logpath = /var/log/nginx/wikijs_access.log
maxretry = 5
bantime = 3600
findtime = 600
```

Create filter:

```bash
sudo nano /etc/fail2ban/filter.d/wikijs.conf
```

```ini
[Definition]
failregex = ^<HOST> .* "POST /login.* HTTP/.*" 401
ignoreregex =
```

Restart Fail2Ban:

```bash
sudo systemctl restart fail2ban
```

## Troubleshooting

Common issues and solutions:

### Wiki.js Won't Start

```bash
# Check service status and logs
sudo systemctl status wikijs
sudo journalctl -u wikijs -n 100 --no-pager

# Common issues:
# 1. Database connection failed - verify PostgreSQL is running
# 2. Port already in use - check with: sudo lsof -i :3000
# 3. Permission issues - verify ownership of /var/www/wikijs
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U wikijs -d wikijs -c "SELECT 1;"

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log

# Verify PostgreSQL is listening
sudo ss -tlnp | grep 5432
```

### Nginx Proxy Issues

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/wikijs_error.log

# Verify Wiki.js is running and listening
curl -I http://127.0.0.1:3000
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Force certificate renewal
sudo certbot renew --force-renewal

# Check certificate expiration
echo | openssl s_client -servername wiki.yourdomain.com -connect wiki.yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

## Updating Wiki.js

Keep Wiki.js updated for security and new features:

```bash
# Stop Wiki.js
sudo systemctl stop wikijs

# Backup current installation
sudo tar -czf /var/backups/wikijs/wikijs_pre_update_$(date +%Y%m%d).tar.gz /var/www/wikijs

# Download latest version
cd /var/www/wikijs
sudo -u wikijs wget https://github.com/Requarks/wiki/releases/latest/download/wiki-js.tar.gz

# Extract (overwrite existing files)
sudo -u wikijs tar xzf wiki-js.tar.gz --overwrite

# Remove archive
sudo rm wiki-js.tar.gz

# Start Wiki.js
sudo systemctl start wikijs

# Check status
sudo systemctl status wikijs
```

## Monitoring Your Wiki.js Instance with OneUptime

After successfully deploying Wiki.js, it's crucial to monitor your instance to ensure optimal performance and availability. OneUptime provides comprehensive monitoring capabilities that are perfect for keeping your documentation platform running smoothly.

With OneUptime, you can:

- **Uptime Monitoring**: Set up HTTP monitors to track your Wiki.js availability and receive instant alerts when your wiki becomes unreachable
- **Performance Monitoring**: Track response times and identify performance degradation before it impacts users
- **SSL Certificate Monitoring**: Get notified before your Let's Encrypt certificates expire
- **Custom Status Pages**: Create public or private status pages to communicate wiki availability to your team
- **Incident Management**: Streamline incident response with built-in alerting via email, SMS, Slack, and other channels
- **Log Management**: Centralize and analyze logs from Wiki.js and Nginx for troubleshooting
- **Server Monitoring**: Monitor CPU, memory, and disk usage on your Ubuntu server

To get started with OneUptime monitoring for your Wiki.js instance, visit [https://oneuptime.com](https://oneuptime.com) and create a free account. Within minutes, you can have comprehensive monitoring in place to ensure your documentation platform remains highly available for your team.

---

Congratulations! You now have a fully functional Wiki.js installation on Ubuntu with PostgreSQL, Nginx reverse proxy, SSL/TLS encryption, and a comprehensive backup strategy. Your documentation platform is ready to serve your team with a modern, feature-rich wiki experience.
