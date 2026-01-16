# How to Set Up Mattermost on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Mattermost, Team Chat, Collaboration, Self-Hosted, Tutorial

Description: Complete guide to setting up Mattermost team messaging platform on Ubuntu.

---

Mattermost is an open-source, self-hosted alternative to Slack that provides secure team messaging and collaboration. Organizations choose Mattermost for its flexibility, data control, and enterprise-grade features. This comprehensive guide walks you through setting up a production-ready Mattermost server on Ubuntu.

## Mattermost Features Overview

Mattermost offers a rich set of features for team collaboration:

### Core Messaging Features
- **Channels**: Organize conversations by topic, project, or team with public and private channels
- **Direct Messages**: One-on-one and group messaging for private conversations
- **Threaded Discussions**: Keep conversations organized with message threading
- **File Sharing**: Share files up to 100MB with drag-and-drop support
- **Search**: Full-text search across all messages and files
- **Reactions**: Express feedback with emoji reactions

### Collaboration Tools
- **Markdown Support**: Format messages with rich text, code blocks, and tables
- **Integrations**: Connect with over 700+ tools via webhooks and plugins
- **Voice and Video Calls**: Built-in calling capabilities with plugins
- **Screen Sharing**: Share your screen during calls
- **Guest Accounts**: Invite external collaborators with limited access

### Enterprise Features
- **Single Sign-On (SSO)**: Integrate with SAML 2.0, OAuth 2.0, and LDAP
- **High Availability**: Deploy across multiple nodes for redundancy
- **Compliance**: Message export, data retention policies, and audit logs
- **Mobile Apps**: Native iOS and Android applications
- **Desktop Apps**: Native applications for Windows, macOS, and Linux

## Prerequisites

Before installing Mattermost, ensure your system meets these requirements:

### System Requirements
- Ubuntu 22.04 LTS or Ubuntu 24.04 LTS
- Minimum 2 CPU cores (4 recommended for production)
- Minimum 4GB RAM (8GB recommended for production)
- 20GB+ storage for the application and database
- Root or sudo access

### Network Requirements
- A domain name pointing to your server (e.g., chat.example.com)
- Ports 80 and 443 open for HTTP/HTTPS traffic
- Port 8065 for direct Mattermost access (optional)

### Software Requirements
- PostgreSQL 12 or higher (recommended) or MySQL 8.0+
- Nginx for reverse proxy
- Certbot for SSL certificates

Let's start by updating the system and installing the necessary packages:

```bash
# Update system packages to the latest versions
sudo apt update && sudo apt upgrade -y

# Install essential utilities
sudo apt install -y curl wget gnupg2 software-properties-common
```

## Database Setup (PostgreSQL)

Mattermost works best with PostgreSQL. Let's set up a dedicated database for our installation.

### Installing PostgreSQL

```bash
# Install PostgreSQL and contrib package
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify PostgreSQL is running
sudo systemctl status postgresql
```

### Creating the Mattermost Database and User

```bash
# Switch to the postgres user
sudo -u postgres psql

# Inside the PostgreSQL prompt, run these commands:
```

```sql
-- Create a dedicated user for Mattermost
-- Use a strong, unique password in production
CREATE USER mmuser WITH PASSWORD 'your_secure_password_here';

-- Create the Mattermost database
CREATE DATABASE mattermost;

-- Grant all privileges on the database to the Mattermost user
GRANT ALL PRIVILEGES ON DATABASE mattermost TO mmuser;

-- Connect to the mattermost database to set schema permissions
\c mattermost

-- Grant schema permissions (required for PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO mmuser;

-- Exit PostgreSQL
\q
```

### Configuring PostgreSQL for Mattermost

Edit the PostgreSQL configuration to allow local connections:

```bash
# Find your PostgreSQL version
ls /etc/postgresql/

# Edit pg_hba.conf (adjust version number as needed)
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

Add or modify the following line to allow password authentication:

```conf
# PostgreSQL Client Authentication Configuration File
# ===================================================
# This file controls which hosts can connect, how clients are authenticated,
# and which PostgreSQL user names they can use.

# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections for the mattermost user
# "local" is for Unix domain socket connections only
local   mattermost      mmuser                                  md5

# IPv4 local connections
# This allows connections from localhost using password authentication
host    mattermost      mmuser          127.0.0.1/32            md5

# IPv6 local connections
host    mattermost      mmuser          ::1/128                 md5
```

Apply the configuration changes:

```bash
# Restart PostgreSQL to apply changes
sudo systemctl restart postgresql

# Test the database connection
psql -U mmuser -d mattermost -h localhost -W
# Enter the password when prompted, then type \q to exit
```

## Downloading and Installing Mattermost

### Creating the Mattermost User

For security, Mattermost should run under its own system user:

```bash
# Create a system user for Mattermost
# -r creates a system account
# -s /bin/false prevents interactive login
sudo useradd --system --user-group --no-create-home --shell /bin/false mattermost
```

### Downloading Mattermost

Download the latest version of Mattermost from the official releases:

```bash
# Set the Mattermost version to install
# Check https://mattermost.com/download/ for the latest version
MATTERMOST_VERSION="9.11.0"

# Download Mattermost Server
wget https://releases.mattermost.com/${MATTERMOST_VERSION}/mattermost-${MATTERMOST_VERSION}-linux-amd64.tar.gz

# Extract the archive
tar -xzf mattermost-${MATTERMOST_VERSION}-linux-amd64.tar.gz

# Move Mattermost to the installation directory
sudo mv mattermost /opt/

# Create the data directory for file storage
sudo mkdir -p /opt/mattermost/data

# Set ownership to the mattermost user
sudo chown -R mattermost:mattermost /opt/mattermost

# Set appropriate permissions
# 750 allows owner full access, group read/execute, others no access
sudo chmod -R 750 /opt/mattermost
```

### Configuring Mattermost

Edit the main configuration file:

```bash
# Open the configuration file
sudo nano /opt/mattermost/config/config.json
```

Here's a comprehensive configuration with detailed comments:

```json
{
    "ServiceSettings": {
        // The URL users will use to access Mattermost
        // Must match your domain and protocol (https for production)
        "SiteURL": "https://chat.example.com",

        // Port Mattermost listens on (Nginx will proxy to this)
        "ListenAddress": ":8065",

        // Connection security for the Mattermost port
        // Empty string when using Nginx as reverse proxy
        "ConnectionSecurity": "",

        // Enable local mode for CLI operations
        "EnableLocalMode": true,

        // Enable outgoing webhooks
        "EnableOutgoingWebhooks": true,

        // Enable incoming webhooks for integrations
        "EnableIncomingWebhooks": true,

        // Enable slash commands
        "EnableCommands": true,

        // Enable OAuth 2.0 service provider
        "EnableOAuthServiceProvider": true,

        // Enable post searching
        "EnablePostSearch": true,

        // Enable user searching
        "EnableUserTypingMessages": true,

        // Session length for web clients in hours
        "SessionLengthWebInHours": 720,

        // Session length for mobile clients in hours
        "SessionLengthMobileInHours": 720,

        // Session length for SSO in hours
        "SessionLengthSSOInHours": 720,

        // Websocket URL (usually auto-detected)
        "WebsocketURL": "",

        // Allow CORS from any origin (set specific origins in production)
        "AllowCorsFrom": "",

        // Enable API version 4
        "EnableAPIv4": true
    },

    "TeamSettings": {
        // Site name displayed in the UI
        "SiteName": "Your Company Chat",

        // Maximum users per team
        "MaxUsersPerTeam": 50000,

        // Enable team creation by regular users
        "EnableTeamCreation": true,

        // Enable user creation (set false for LDAP-only)
        "EnableUserCreation": true,

        // Enable open server (anyone can join)
        // Set to false for private deployments
        "EnableOpenServer": false,

        // Restrict team creation to specific domains
        "RestrictCreationToDomains": "",

        // Restrict team invite by email domain
        "RestrictTeamInvite": "all",

        // User status away timeout in seconds
        "UserStatusAwayTimeout": 300,

        // Maximum channels per team
        "MaxChannelsPerTeam": 50000,

        // Maximum notifications per channel
        "MaxNotificationsPerChannel": 1000000
    },

    "SqlSettings": {
        // Database driver: postgres or mysql
        "DriverName": "postgres",

        // PostgreSQL connection string
        // Format: postgres://user:password@host:port/database?sslmode=disable
        "DataSource": "postgres://mmuser:your_secure_password_here@localhost:5432/mattermost?sslmode=disable&connect_timeout=10",

        // Maximum idle database connections
        "MaxIdleConns": 20,

        // Maximum open database connections
        "MaxOpenConns": 300,

        // Enable database tracing (disable in production)
        "Trace": false,

        // Connection timeout in seconds
        "QueryTimeout": 30
    },

    "LogSettings": {
        // Enable console logging
        "EnableConsole": true,

        // Console log level: DEBUG, INFO, WARN, ERROR
        "ConsoleLevel": "INFO",

        // Enable JSON formatting for logs
        "ConsoleJson": true,

        // Enable file logging
        "EnableFile": true,

        // File log level
        "FileLevel": "INFO",

        // Log file location
        "FileLocation": "/opt/mattermost/logs",

        // Enable JSON formatting for file logs
        "FileJson": true,

        // Enable webhook debugging
        "EnableWebhookDebugging": false
    },

    "FileSettings": {
        // Maximum file size in bytes (100MB)
        "MaxFileSize": 104857600,

        // File storage driver: local or amazons3
        "DriverName": "local",

        // Local storage directory
        "Directory": "/opt/mattermost/data/",

        // Enable public links for file sharing
        "EnablePublicLink": true,

        // Public link salt (auto-generated, keep secret)
        "PublicLinkSalt": ""
    },

    "EmailSettings": {
        // Enable email sending
        "EnableSignUpWithEmail": true,

        // Enable email verification
        "RequireEmailVerification": false,

        // Feedback name shown in emails
        "FeedbackName": "Mattermost",

        // Feedback email address
        "FeedbackEmail": "noreply@example.com",

        // Reply-to email address
        "ReplyToAddress": "noreply@example.com",

        // SMTP server hostname
        "SMTPServer": "smtp.example.com",

        // SMTP server port (587 for TLS, 465 for SSL, 25 for plain)
        "SMTPPort": "587",

        // SMTP authentication username
        "SMTPUsername": "your_smtp_username",

        // SMTP authentication password
        "SMTPPassword": "your_smtp_password",

        // Connection security: empty, TLS, or STARTTLS
        "ConnectionSecurity": "STARTTLS",

        // Skip certificate verification (not recommended)
        "SkipServerCertificateVerification": false,

        // Enable SMTP authentication
        "EnableSMTPAuth": true,

        // Notification email subject
        "EmailNotificationContentsType": "full"
    },

    "RateLimitSettings": {
        // Enable rate limiting
        "Enable": true,

        // Requests per second limit
        "PerSec": 10,

        // Maximum burst size
        "MaxBurst": 100,

        // Memory store size
        "MemoryStoreSize": 10000,

        // Vary rate limit by remote address
        "VaryByRemoteAddr": true,

        // Vary rate limit by user
        "VaryByUser": true,

        // Custom header for rate limiting (useful behind proxy)
        "VaryByHeader": ""
    },

    "PrivacySettings": {
        // Show email addresses to other users
        "ShowEmailAddress": false,

        // Show full name to other users
        "ShowFullName": true
    },

    "SupportSettings": {
        // Terms of service link
        "TermsOfServiceLink": "https://mattermost.com/terms-of-service/",

        // Privacy policy link
        "PrivacyPolicyLink": "https://mattermost.com/privacy-policy/",

        // Help link
        "HelpLink": "https://docs.mattermost.com/",

        // Support email address
        "SupportEmail": "support@example.com"
    },

    "PluginSettings": {
        // Enable plugins
        "Enable": true,

        // Enable uploading plugins
        "EnableUploads": true,

        // Enable remote plugin marketplace
        "EnableMarketplace": true,

        // Marketplace URL
        "MarketplaceUrl": "https://api.integrations.mattermost.com",

        // Plugin directory
        "Directory": "/opt/mattermost/plugins",

        // Client plugin directory
        "ClientDirectory": "/opt/mattermost/client/plugins"
    }
}
```

Set the correct permissions on the configuration file:

```bash
# Restrict access to the config file (contains sensitive data)
sudo chmod 600 /opt/mattermost/config/config.json
sudo chown mattermost:mattermost /opt/mattermost/config/config.json
```

## Systemd Service Configuration

Create a systemd service file for automatic startup and management:

```bash
# Create the systemd service file
sudo nano /etc/systemd/system/mattermost.service
```

Add the following content:

```ini
# Mattermost Systemd Service File
# ================================
# This file manages the Mattermost service lifecycle

[Unit]
# Service description
Description=Mattermost Team Collaboration Server

# Start after these services are ready
After=network.target postgresql.service

# Bind to PostgreSQL - restart if it restarts
BindsTo=postgresql.service

[Service]
# Type of service - notify indicates the service will signal when ready
Type=notify

# User and group to run the service as
User=mattermost
Group=mattermost

# Working directory for the service
WorkingDirectory=/opt/mattermost

# Command to start Mattermost
# -c specifies the config file location
ExecStart=/opt/mattermost/bin/mattermost

# Time to wait for startup
TimeoutStartSec=3600

# Restart policy - always restart on failure
Restart=always
RestartSec=10

# Resource limits
# Maximum number of open file descriptors
LimitNOFILE=49152

# Standard output and error logging
StandardOutput=journal
StandardError=journal

# Environment variables
# Suppress go runtime warnings
Environment="MM_CONFIG=/opt/mattermost/config/config.json"

# Security hardening options
# Protect system directories
ProtectSystem=full

# Make /home, /root, and /run/user inaccessible
ProtectHome=true

# Create private /tmp and /var/tmp
PrivateTmp=true

# Prevent gaining new privileges
NoNewPrivileges=true

[Install]
# Start on multi-user target (normal boot)
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable Mattermost to start on boot
sudo systemctl enable mattermost

# Start the Mattermost service
sudo systemctl start mattermost

# Check the service status
sudo systemctl status mattermost

# View logs if needed
sudo journalctl -u mattermost -f
```

## Nginx Reverse Proxy Setup

Nginx acts as a reverse proxy, handling SSL termination and load balancing.

### Installing Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configuring Nginx for Mattermost

Create a new server block configuration:

```bash
# Create the Nginx configuration file
sudo nano /etc/nginx/sites-available/mattermost
```

Add the following comprehensive configuration:

```nginx
# Mattermost Nginx Configuration
# ==============================
# This configuration provides reverse proxy with SSL termination

# Upstream definition for Mattermost backend
# Use this for load balancing multiple Mattermost servers
upstream mattermost_backend {
    # Mattermost application server
    # Add multiple servers here for high availability
    server 127.0.0.1:8065;

    # Keepalive connections to the backend
    # Improves performance by reusing connections
    keepalive 64;
}

# HTTP server block - redirects to HTTPS
server {
    # Listen on port 80 for IPv4 and IPv6
    listen 80;
    listen [::]:80;

    # Server name - your domain
    server_name chat.example.com;

    # Redirect all HTTP requests to HTTPS
    # 301 permanent redirect for SEO
    return 301 https://$server_name$request_uri;
}

# HTTPS server block - main configuration
server {
    # Listen on port 443 with SSL and HTTP/2
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    # Server name - your domain
    server_name chat.example.com;

    # SSL certificate paths (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/chat.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.example.com/privkey.pem;

    # SSL configuration for security
    # Use modern TLS protocols only
    ssl_protocols TLSv1.2 TLSv1.3;

    # Prefer server cipher suites
    ssl_prefer_server_ciphers on;

    # Strong cipher suites
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;

    # SSL session configuration
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # OCSP Stapling for faster SSL handshakes
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/chat.example.com/chain.pem;

    # DNS resolver for OCSP stapling
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Security headers
    # Prevent clickjacking attacks
    add_header X-Frame-Options SAMEORIGIN always;

    # Prevent MIME type sniffing
    add_header X-Content-Type-Options nosniff always;

    # Enable XSS filter
    add_header X-XSS-Protection "1; mode=block" always;

    # HTTP Strict Transport Security (HSTS)
    # max-age is in seconds (31536000 = 1 year)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging configuration
    access_log /var/log/nginx/mattermost_access.log;
    error_log /var/log/nginx/mattermost_error.log;

    # Client body size limit (for file uploads)
    # Should match MaxFileSize in Mattermost config
    client_max_body_size 100M;

    # Proxy timeouts
    proxy_connect_timeout 90;
    proxy_send_timeout 300;
    proxy_read_timeout 300;

    # Main location block
    location / {
        # Proxy to Mattermost backend
        proxy_pass http://mattermost_backend;

        # HTTP version for upstream connection
        proxy_http_version 1.1;

        # Headers for proper proxying
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support headers
        # Required for real-time messaging
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Disable proxy buffering for WebSocket
        proxy_buffering off;

        # Cache settings
        proxy_cache_bypass $http_upgrade;
    }

    # API location with specific settings
    location /api {
        proxy_pass http://mattermost_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Longer timeouts for API calls
        proxy_read_timeout 600;
    }

    # Static files location
    location /static {
        proxy_pass http://mattermost_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        # Cache static files
        proxy_cache_valid 200 1d;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # Plugin assets
    location /plugins {
        proxy_pass http://mattermost_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and test:

```bash
# Enable the site by creating a symbolic link
sudo ln -s /etc/nginx/sites-available/mattermost /etc/nginx/sites-enabled/

# Remove the default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx to apply changes
sudo systemctl reload nginx
```

## SSL/TLS with Let's Encrypt

Secure your Mattermost installation with free SSL certificates from Let's Encrypt.

### Installing Certbot

```bash
# Install Certbot with Nginx plugin
sudo apt install -y certbot python3-certbot-nginx
```

### Obtaining SSL Certificates

Before running Certbot, temporarily modify the Nginx config to allow HTTP access for verification:

```bash
# Obtain SSL certificate
# Certbot will automatically configure Nginx
sudo certbot --nginx -d chat.example.com

# Follow the interactive prompts:
# 1. Enter your email address for renewal notifications
# 2. Agree to the terms of service
# 3. Choose whether to redirect HTTP to HTTPS (recommended: yes)
```

### Automatic Certificate Renewal

Let's Encrypt certificates expire after 90 days. Certbot sets up automatic renewal:

```bash
# Test automatic renewal
sudo certbot renew --dry-run

# View renewal timer
sudo systemctl status certbot.timer

# Manual renewal command (if needed)
sudo certbot renew
```

Create a renewal hook to reload Nginx after certificate renewal:

```bash
# Create renewal hook script
sudo nano /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
```

```bash
#!/bin/bash
# Reload Nginx after certificate renewal
# This ensures the new certificate is loaded

systemctl reload nginx
```

```bash
# Make the script executable
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
```

## Initial Configuration

After completing the installation, access your Mattermost instance to finish setup.

### First-Time Setup

1. Open your browser and navigate to `https://chat.example.com`
2. Create the first administrator account
3. Create your first team
4. Configure system settings via System Console

### System Console Configuration

Access the System Console at `https://chat.example.com/admin_console`:

```bash
# Key settings to configure:

# Site Configuration > Customization
# - Site Name: Your organization name
# - Site Description: Brief description
# - Custom Branding: Upload logo and customize colors

# Authentication > Email
# - Enable account creation with email
# - Require email verification (recommended)

# Authentication > Password
# - Minimum length: 10 characters (recommended)
# - Require lowercase, uppercase, number, symbol

# Site Configuration > Notifications
# - Enable email notifications
# - Configure push notification server

# Integrations > Bot Accounts
# - Enable bot account creation
# - Configure integration settings
```

### Creating Teams and Channels

```bash
# Via CLI (optional)
cd /opt/mattermost/bin

# Create a new team
sudo -u mattermost ./mattermost team create --name engineering --display_name "Engineering Team"

# Create a channel
sudo -u mattermost ./mattermost channel create --team engineering --name general --display_name "General"

# Add a user to a team
sudo -u mattermost ./mattermost team add engineering user@example.com

# Promote user to team admin
sudo -u mattermost ./mattermost roles member user@example.com
```

## SMTP Email Configuration

Email is essential for notifications, password resets, and invitations.

### Example SMTP Configurations

#### Gmail SMTP

```json
{
    "EmailSettings": {
        "EnableSignUpWithEmail": true,
        "RequireEmailVerification": true,
        "FeedbackName": "Mattermost",
        "FeedbackEmail": "your-email@gmail.com",
        "ReplyToAddress": "your-email@gmail.com",
        "SMTPServer": "smtp.gmail.com",
        "SMTPPort": "587",
        "SMTPUsername": "your-email@gmail.com",
        "SMTPPassword": "your-app-password",
        "ConnectionSecurity": "STARTTLS",
        "EnableSMTPAuth": true
    }
}
```

#### Amazon SES

```json
{
    "EmailSettings": {
        "EnableSignUpWithEmail": true,
        "RequireEmailVerification": true,
        "FeedbackName": "Mattermost",
        "FeedbackEmail": "noreply@example.com",
        "ReplyToAddress": "support@example.com",
        "SMTPServer": "email-smtp.us-east-1.amazonaws.com",
        "SMTPPort": "587",
        "SMTPUsername": "YOUR_SES_ACCESS_KEY_ID",
        "SMTPPassword": "YOUR_SES_SECRET_ACCESS_KEY",
        "ConnectionSecurity": "STARTTLS",
        "EnableSMTPAuth": true
    }
}
```

#### SendGrid

```json
{
    "EmailSettings": {
        "EnableSignUpWithEmail": true,
        "RequireEmailVerification": true,
        "FeedbackName": "Mattermost",
        "FeedbackEmail": "noreply@example.com",
        "ReplyToAddress": "support@example.com",
        "SMTPServer": "smtp.sendgrid.net",
        "SMTPPort": "587",
        "SMTPUsername": "apikey",
        "SMTPPassword": "YOUR_SENDGRID_API_KEY",
        "ConnectionSecurity": "STARTTLS",
        "EnableSMTPAuth": true
    }
}
```

### Testing Email Configuration

```bash
# Test email via CLI
cd /opt/mattermost/bin
sudo -u mattermost ./mattermost email test
```

## LDAP/AD Integration

Integrate Mattermost with your organization's directory service for centralized user management.

### LDAP Configuration

Add the following to your `config.json`:

```json
{
    "LdapSettings": {
        // Enable LDAP authentication
        "Enable": true,

        // LDAP server hostname
        "LdapServer": "ldap.example.com",

        // LDAP server port (389 for LDAP, 636 for LDAPS)
        "LdapPort": 389,

        // Connection security: empty, TLS, or STARTTLS
        "ConnectionSecurity": "STARTTLS",

        // Base DN for user searches
        "BaseDN": "dc=example,dc=com",

        // Bind username (service account)
        "BindUsername": "cn=mattermost,ou=service-accounts,dc=example,dc=com",

        // Bind password
        "BindPassword": "your_ldap_bind_password",

        // User filter to find users
        // This example finds users in the "employees" OU
        "UserFilter": "(objectClass=person)",

        // Group filter for team/channel sync
        "GroupFilter": "(objectClass=group)",

        // LDAP attribute mappings
        // Map LDAP attributes to Mattermost user fields

        // Unique user identifier attribute
        "IdAttribute": "sAMAccountName",

        // Username attribute
        "UsernameAttribute": "sAMAccountName",

        // Email attribute
        "EmailAttribute": "mail",

        // First name attribute
        "FirstNameAttribute": "givenName",

        // Last name attribute
        "LastNameAttribute": "sn",

        // Nickname attribute (optional)
        "NicknameAttribute": "",

        // Position/title attribute
        "PositionAttribute": "title",

        // Login ID attribute
        "LoginIdAttribute": "sAMAccountName",

        // Synchronization settings
        // Sync interval in minutes (60 = hourly)
        "SyncIntervalMinutes": 60,

        // Skip certificate verification (not recommended)
        "SkipCertificateVerification": false,

        // Maximum page size for LDAP queries
        "MaxPageSize": 1000,

        // Login field name shown to users
        "LoginFieldName": "AD/LDAP Username"
    }
}
```

### Active Directory Specific Configuration

```json
{
    "LdapSettings": {
        "Enable": true,
        "LdapServer": "ad.example.com",
        "LdapPort": 636,
        "ConnectionSecurity": "",
        "BaseDN": "dc=example,dc=com",
        "BindUsername": "mattermost@example.com",
        "BindPassword": "your_ad_password",

        // Active Directory specific filter
        // Only get enabled user accounts
        "UserFilter": "(&(objectCategory=Person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))",

        // Group filter for AD groups
        "GroupFilter": "(objectClass=group)",

        // AD attribute mappings
        "IdAttribute": "objectGUID",
        "UsernameAttribute": "sAMAccountName",
        "EmailAttribute": "userPrincipalName",
        "FirstNameAttribute": "givenName",
        "LastNameAttribute": "sn",
        "PositionAttribute": "title",
        "LoginIdAttribute": "sAMAccountName",

        // Picture attribute for profile photos
        "PictureAttribute": "thumbnailPhoto",

        // Enable profile sync from LDAP
        "EnableSync": true,
        "SyncIntervalMinutes": 60
    }
}
```

### LDAP Group Sync (Enterprise Feature)

```json
{
    "LdapSettings": {
        // Group sync settings
        "GroupDisplayNameAttribute": "cn",
        "GroupIdAttribute": "objectGUID",

        // Enable admin group filter
        "EnableAdminFilter": true,
        "AdminFilter": "(memberOf=cn=MattermostAdmins,ou=Groups,dc=example,dc=com)"
    }
}
```

## Plugin System

Mattermost's plugin system extends functionality with integrations and custom features.

### Enabling Plugins

Ensure plugins are enabled in your configuration:

```json
{
    "PluginSettings": {
        // Enable plugin functionality
        "Enable": true,

        // Allow uploading plugins via System Console
        "EnableUploads": true,

        // Enable the plugin marketplace
        "EnableMarketplace": true,

        // Plugin marketplace URL
        "MarketplaceUrl": "https://api.integrations.mattermost.com",

        // Automatic prepackaged plugins
        "AutomaticPrepackagedPlugins": true,

        // Plugin directories
        "Directory": "/opt/mattermost/plugins",
        "ClientDirectory": "/opt/mattermost/client/plugins",

        // Signature verification (Enterprise)
        "RequirePluginSignature": false
    }
}
```

### Installing Plugins via CLI

```bash
# Navigate to Mattermost directory
cd /opt/mattermost/bin

# Install a plugin from the marketplace
sudo -u mattermost ./mattermost plugin marketplace install jitsi

# List installed plugins
sudo -u mattermost ./mattermost plugin list

# Enable a plugin
sudo -u mattermost ./mattermost plugin enable com.mattermost.jitsi

# Disable a plugin
sudo -u mattermost ./mattermost plugin disable com.mattermost.jitsi
```

### Popular Plugins

#### Jitsi Video Conferencing

```bash
# Install Jitsi plugin
sudo -u mattermost ./mattermost plugin marketplace install jitsi

# Configure in config.json or System Console
```

Configuration in `config.json`:

```json
{
    "PluginSettings": {
        "Plugins": {
            "jitsi": {
                "jitsiurl": "https://meet.jit.si",
                "jitsiembedded": false,
                "jitsinamingscheme": "mattermost",
                "jitsijwt": false
            }
        }
    }
}
```

#### GitHub Integration

```json
{
    "PluginSettings": {
        "Plugins": {
            "github": {
                "githuborganizations": "your-org",
                "githuboauthclientid": "your-client-id",
                "githuboauthclientsecret": "your-client-secret",
                "webhooksecret": "your-webhook-secret",
                "enableprivaterepo": true
            }
        }
    }
}
```

#### Custom Welcome Bot

```json
{
    "PluginSettings": {
        "Plugins": {
            "com.mattermost.welcomebot": {
                "welcomemessages": [
                    {
                        "teamname": "engineering",
                        "message": "Welcome to the Engineering team! Please review our guidelines in ~guidelines."
                    }
                ]
            }
        }
    }
}
```

## High Availability Setup

For production environments requiring zero downtime, deploy Mattermost in high availability mode.

### Architecture Overview

```
                    Load Balancer
                         |
         +---------------+---------------+
         |               |               |
   Mattermost 1    Mattermost 2    Mattermost 3
         |               |               |
         +---------------+---------------+
                         |
              PostgreSQL (Primary)
                         |
              PostgreSQL (Replica)
```

### Cluster Configuration

Each Mattermost node requires cluster settings in `config.json`:

```json
{
    "ClusterSettings": {
        // Enable high availability mode
        "Enable": true,

        // Cluster name (must be same across all nodes)
        "ClusterName": "mattermost-production",

        // Override hostname (use actual server hostname)
        "OverrideHostname": "mm-node-1.internal",

        // Network interface to bind to
        "NetworkInterface": "",

        // Bind address for inter-node communication
        "BindAddress": "",

        // Advertise address for other nodes
        "AdvertiseAddress": "",

        // Use IP address instead of hostname
        "UseIpAddress": true,

        // Gossip port for cluster communication
        "GossipPort": 8074,

        // Enable experimental gossip encryption
        "EnableGossipCompression": true,

        // Read-only configuration (recommended for HA)
        "ReadOnlyConfig": true
    },

    "ServiceSettings": {
        // Must be unique per node
        "SiteURL": "https://chat.example.com",

        // Enable cluster-aware search
        "EnableClusterAwareSearch": true
    }
}
```

### Shared File Storage (Amazon S3)

For HA deployments, use shared storage:

```json
{
    "FileSettings": {
        // Use Amazon S3 for file storage
        "DriverName": "amazons3",

        // S3 bucket name
        "AmazonS3Bucket": "mattermost-files",

        // AWS region
        "AmazonS3Region": "us-east-1",

        // S3 endpoint (leave empty for AWS, set for MinIO)
        "AmazonS3Endpoint": "",

        // Access key ID
        "AmazonS3AccessKeyId": "YOUR_ACCESS_KEY_ID",

        // Secret access key
        "AmazonS3SecretAccessKey": "YOUR_SECRET_ACCESS_KEY",

        // Use SSL for S3
        "AmazonS3SSL": true,

        // Enable S3 server-side encryption
        "AmazonS3SSE": true,

        // S3 path prefix
        "AmazonS3PathPrefix": "",

        // Use IAM role instead of access keys (recommended)
        "AmazonS3IAM": false
    }
}
```

### Load Balancer Configuration (HAProxy)

```haproxy
# HAProxy Configuration for Mattermost HA
# =========================================

global
    log /dev/log local0
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # SSL configuration
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
    log global
    mode http
    option httplog
    option dontlognull
    timeout connect 5000
    timeout client 50000
    timeout server 50000

# Frontend configuration
frontend mattermost_frontend
    bind *:443 ssl crt /etc/haproxy/certs/chat.example.com.pem

    # Force HTTPS
    http-request redirect scheme https unless { ssl_fc }

    # Default backend
    default_backend mattermost_backend

# Backend configuration
backend mattermost_backend
    balance roundrobin
    option httpchk GET /api/v4/system/ping

    # Health check configuration
    http-check expect status 200

    # Cookie-based session persistence
    cookie SERVERID insert indirect nocache

    # Mattermost servers
    server mm1 192.168.1.10:8065 check cookie mm1
    server mm2 192.168.1.11:8065 check cookie mm2
    server mm3 192.168.1.12:8065 check cookie mm3

# Stats page
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    stats admin if TRUE
```

### Database Replication (PostgreSQL)

Primary server (`/etc/postgresql/16/main/postgresql.conf`):

```conf
# Replication settings for primary server
# =======================================

# Enable WAL archiving
wal_level = replica
max_wal_senders = 10
wal_keep_size = 1GB

# Synchronous replication (for zero data loss)
synchronous_commit = on
synchronous_standby_names = 'mm_replica'

# Connection settings
listen_addresses = '*'
```

## Backup and Restore

Regular backups are critical for disaster recovery.

### Database Backup Script

Create a backup script:

```bash
# Create backup script
sudo nano /opt/mattermost/scripts/backup.sh
```

```bash
#!/bin/bash
# =============================================================================
# Mattermost Backup Script
# =============================================================================
# This script creates a complete backup of Mattermost including:
# - PostgreSQL database
# - Configuration files
# - Data directory (uploaded files)
# - Plugins
#
# Usage: ./backup.sh [backup_directory]
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${1:-/var/backups/mattermost}"
MATTERMOST_DIR="/opt/mattermost"
DB_NAME="mattermost"
DB_USER="mmuser"
DB_HOST="localhost"
RETENTION_DAYS=30

# Timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mattermost_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root or with sudo"
fi

# Create backup directory
log "Creating backup directory: ${BACKUP_PATH}"
mkdir -p "${BACKUP_PATH}"

# Backup PostgreSQL database
log "Backing up PostgreSQL database..."
PGPASSWORD="${DB_PASSWORD:-}" pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
    --format=custom \
    --compress=9 \
    --file="${BACKUP_PATH}/database.dump"

if [[ $? -eq 0 ]]; then
    log "Database backup completed successfully"
else
    error "Database backup failed"
fi

# Backup configuration files
log "Backing up configuration files..."
cp -r "${MATTERMOST_DIR}/config" "${BACKUP_PATH}/config"

# Remove sensitive data from backup config (optional)
# sed -i 's/"Password": ".*"/"Password": "REDACTED"/g' "${BACKUP_PATH}/config/config.json"

# Backup data directory (uploaded files)
log "Backing up data directory..."
if [[ -d "${MATTERMOST_DIR}/data" ]]; then
    tar -czf "${BACKUP_PATH}/data.tar.gz" -C "${MATTERMOST_DIR}" data
    log "Data directory backup completed"
else
    warn "Data directory not found, skipping..."
fi

# Backup plugins
log "Backing up plugins..."
if [[ -d "${MATTERMOST_DIR}/plugins" ]]; then
    tar -czf "${BACKUP_PATH}/plugins.tar.gz" -C "${MATTERMOST_DIR}" plugins
    log "Plugins backup completed"
else
    warn "Plugins directory not found, skipping..."
fi

# Create final archive
log "Creating final backup archive..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_PATH}"

# Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
log "Backup completed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz (${BACKUP_SIZE})"

# Clean up old backups
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "mattermost_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete

# List remaining backups
log "Current backups:"
ls -lh "${BACKUP_DIR}"/mattermost_backup_*.tar.gz 2>/dev/null || echo "No backups found"

log "Backup process completed successfully!"
```

Make it executable and set up automated backups:

```bash
# Make script executable
sudo chmod +x /opt/mattermost/scripts/backup.sh

# Create a cron job for daily backups at 2 AM
echo "0 2 * * * root /opt/mattermost/scripts/backup.sh >> /var/log/mattermost_backup.log 2>&1" | sudo tee /etc/cron.d/mattermost-backup
```

### Restore Script

Create a restore script:

```bash
# Create restore script
sudo nano /opt/mattermost/scripts/restore.sh
```

```bash
#!/bin/bash
# =============================================================================
# Mattermost Restore Script
# =============================================================================
# This script restores a Mattermost backup including:
# - PostgreSQL database
# - Configuration files
# - Data directory (uploaded files)
# - Plugins
#
# Usage: ./restore.sh <backup_file.tar.gz>
# =============================================================================

set -euo pipefail

# Configuration
MATTERMOST_DIR="/opt/mattermost"
DB_NAME="mattermost"
DB_USER="mmuser"
DB_HOST="localhost"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Check arguments
if [[ $# -ne 1 ]]; then
    error "Usage: $0 <backup_file.tar.gz>"
fi

BACKUP_FILE="$1"

# Validate backup file
if [[ ! -f "${BACKUP_FILE}" ]]; then
    error "Backup file not found: ${BACKUP_FILE}"
fi

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root or with sudo"
fi

# Confirmation prompt
echo -e "${YELLOW}WARNING: This will restore Mattermost from backup.${NC}"
echo "Current data will be overwritten!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM
if [[ "${CONFIRM}" != "yes" ]]; then
    log "Restore cancelled"
    exit 0
fi

# Stop Mattermost service
log "Stopping Mattermost service..."
systemctl stop mattermost

# Create temporary extraction directory
TEMP_DIR=$(mktemp -d)
log "Extracting backup to ${TEMP_DIR}..."
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"
BACKUP_DIR=$(ls "${TEMP_DIR}")

# Restore database
log "Restoring PostgreSQL database..."
if [[ -f "${TEMP_DIR}/${BACKUP_DIR}/database.dump" ]]; then
    # Drop and recreate database
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};"
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

    # Restore from dump
    PGPASSWORD="${DB_PASSWORD:-}" pg_restore -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
        --no-owner --no-privileges "${TEMP_DIR}/${BACKUP_DIR}/database.dump"
    log "Database restored successfully"
else
    error "Database dump not found in backup"
fi

# Restore configuration
log "Restoring configuration files..."
if [[ -d "${TEMP_DIR}/${BACKUP_DIR}/config" ]]; then
    rm -rf "${MATTERMOST_DIR}/config"
    cp -r "${TEMP_DIR}/${BACKUP_DIR}/config" "${MATTERMOST_DIR}/config"
    chown -R mattermost:mattermost "${MATTERMOST_DIR}/config"
    chmod 600 "${MATTERMOST_DIR}/config/config.json"
    log "Configuration restored successfully"
else
    warn "Configuration not found in backup, skipping..."
fi

# Restore data directory
log "Restoring data directory..."
if [[ -f "${TEMP_DIR}/${BACKUP_DIR}/data.tar.gz" ]]; then
    rm -rf "${MATTERMOST_DIR}/data"
    tar -xzf "${TEMP_DIR}/${BACKUP_DIR}/data.tar.gz" -C "${MATTERMOST_DIR}"
    chown -R mattermost:mattermost "${MATTERMOST_DIR}/data"
    log "Data directory restored successfully"
else
    warn "Data archive not found in backup, skipping..."
fi

# Restore plugins
log "Restoring plugins..."
if [[ -f "${TEMP_DIR}/${BACKUP_DIR}/plugins.tar.gz" ]]; then
    rm -rf "${MATTERMOST_DIR}/plugins"
    tar -xzf "${TEMP_DIR}/${BACKUP_DIR}/plugins.tar.gz" -C "${MATTERMOST_DIR}"
    chown -R mattermost:mattermost "${MATTERMOST_DIR}/plugins"
    log "Plugins restored successfully"
else
    warn "Plugins archive not found in backup, skipping..."
fi

# Clean up
log "Cleaning up temporary files..."
rm -rf "${TEMP_DIR}"

# Start Mattermost service
log "Starting Mattermost service..."
systemctl start mattermost

# Wait for service to start
sleep 5

# Check service status
if systemctl is-active --quiet mattermost; then
    log "Mattermost service started successfully"
else
    error "Mattermost service failed to start. Check logs: journalctl -u mattermost"
fi

log "Restore completed successfully!"
echo ""
echo "Please verify the restore by:"
echo "  1. Accessing the web interface"
echo "  2. Checking user accounts and channels"
echo "  3. Verifying file uploads"
```

```bash
# Make restore script executable
sudo chmod +x /opt/mattermost/scripts/restore.sh
```

### Manual Backup Commands

```bash
# Quick database backup
sudo -u postgres pg_dump mattermost > /backup/mattermost_db_$(date +%Y%m%d).sql

# Quick database restore
sudo -u postgres psql mattermost < /backup/mattermost_db_20260115.sql

# Backup specific tables
sudo -u postgres pg_dump -t Posts -t Channels mattermost > /backup/mattermost_posts_channels.sql
```

## Troubleshooting

### Common Issues and Solutions

#### Mattermost Won't Start

```bash
# Check service status and logs
sudo systemctl status mattermost
sudo journalctl -u mattermost -n 100 --no-pager

# Check configuration syntax
cd /opt/mattermost/bin
sudo -u mattermost ./mattermost config validate

# Check file permissions
ls -la /opt/mattermost/
ls -la /opt/mattermost/config/
```

#### Database Connection Issues

```bash
# Test database connection
psql -U mmuser -d mattermost -h localhost -W

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log

# Verify database settings in config
grep -A 10 '"SqlSettings"' /opt/mattermost/config/config.json
```

#### WebSocket Connection Errors

```bash
# Check Nginx configuration
sudo nginx -t

# Verify WebSocket headers in Nginx config
grep -A 5 "Upgrade" /etc/nginx/sites-available/mattermost

# Check for firewall issues
sudo ufw status
```

#### Performance Issues

```bash
# Monitor system resources
htop
iostat -x 1

# Check database performance
sudo -u postgres psql -d mattermost -c "SELECT * FROM pg_stat_activity;"

# Analyze slow queries
sudo -u postgres psql -d mattermost -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

## Security Hardening

### Additional Security Measures

```bash
# Enable firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban for brute force protection
sudo apt install -y fail2ban
sudo systemctl enable fail2ban

# Secure shared memory
echo "tmpfs /run/shm tmpfs defaults,noexec,nosuid 0 0" | sudo tee -a /etc/fstab
```

### Security Configuration

```json
{
    "ServiceSettings": {
        // Enable secure cookies
        "WebserverMode": "gzip",
        "EnableSecurityFixAlert": true,

        // Session security
        "ExtendSessionLengthWithActivity": true,
        "SessionIdleTimeoutInMinutes": 43200,

        // Disable development features
        "EnableDeveloper": false,
        "EnableTesting": false
    },

    "PasswordSettings": {
        // Strong password requirements
        "MinimumLength": 10,
        "Lowercase": true,
        "Number": true,
        "Uppercase": true,
        "Symbol": true
    },

    "RateLimitSettings": {
        "Enable": true,
        "PerSec": 10,
        "MaxBurst": 100,
        "MemoryStoreSize": 10000
    }
}
```

## Monitoring with OneUptime

After setting up your Mattermost server, it's essential to monitor its health and performance. [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your Mattermost deployment.

### What OneUptime Can Monitor

- **Uptime Monitoring**: Track your Mattermost server availability with HTTP/HTTPS checks
- **SSL Certificate Monitoring**: Get alerts before your SSL certificates expire
- **Performance Monitoring**: Monitor response times and identify slowdowns
- **Database Monitoring**: Track PostgreSQL performance metrics
- **Custom Metrics**: Monitor Mattermost-specific metrics via API endpoints
- **Incident Management**: Automatically create incidents when issues are detected
- **Status Pages**: Keep your team informed with public or private status pages

### Setting Up OneUptime Monitoring

1. Create an account at [OneUptime](https://oneuptime.com)
2. Add your Mattermost URL as an HTTP monitor
3. Configure the health check endpoint: `https://chat.example.com/api/v4/system/ping`
4. Set up alert notifications via email, Slack, or webhook
5. Create a status page for your team to check service status

OneUptime's comprehensive monitoring ensures you're immediately notified of any issues with your Mattermost deployment, minimizing downtime and maintaining team productivity.

## Conclusion

You have successfully set up a production-ready Mattermost server on Ubuntu. This deployment includes:

- Secure PostgreSQL database backend
- Nginx reverse proxy with SSL/TLS encryption
- Systemd service management for reliability
- Email configuration for notifications
- LDAP/AD integration options for enterprise environments
- Plugin system for extended functionality
- High availability architecture for zero downtime
- Comprehensive backup and restore procedures

Remember to regularly update Mattermost to receive security patches and new features. Monitor your deployment with OneUptime to ensure maximum uptime and performance for your team collaboration platform.

For additional resources, visit:
- [Mattermost Documentation](https://docs.mattermost.com/)
- [Mattermost Community Forum](https://forum.mattermost.com/)
- [Mattermost GitHub Repository](https://github.com/mattermost/mattermost-server)
