# How to Set Up iRedMail on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, iRedMail, Mail Server, Email, Tutorial

Description: Complete guide to setting up iRedMail all-in-one mail server solution on Ubuntu.

---

## Introduction

Setting up your own mail server can be a daunting task, involving the configuration of multiple components like SMTP, IMAP, spam filtering, and webmail interfaces. iRedMail simplifies this process by providing an all-in-one solution that bundles Postfix, Dovecot, Amavisd, SpamAssassin, ClamAV, and more into a single, easy-to-install package.

This comprehensive guide will walk you through setting up iRedMail on Ubuntu, from initial preparation to advanced configuration and maintenance.

---

## Understanding iRedMail

iRedMail is a free, open-source mail server solution that automates the installation and configuration of a complete mail server stack. It includes:

- **Postfix**: SMTP server for sending and receiving emails
- **Dovecot**: IMAP/POP3 server for email retrieval
- **Roundcube/SOGo**: Webmail interfaces
- **iRedAdmin**: Web-based administration panel
- **Amavisd-new**: Content filter for spam and virus scanning
- **SpamAssassin**: Spam detection engine
- **ClamAV**: Antivirus scanner
- **Fail2ban**: Intrusion prevention
- **Nginx/Apache**: Web server for webmail and admin interfaces

### Why Choose iRedMail?

1. **All-in-one solution**: Everything you need for a production mail server
2. **Easy installation**: Automated setup process
3. **Security-focused**: Built-in SSL/TLS, spam filtering, and antivirus
4. **Multiple backend options**: MySQL, MariaDB, PostgreSQL, or OpenLDAP
5. **Active development**: Regular updates and security patches

---

## Prerequisites

Before installing iRedMail, ensure you have the following:

### System Requirements

- A clean Ubuntu installation (20.04 LTS, 22.04 LTS, or 24.04 LTS recommended)
- Minimum 4 GB RAM (8 GB recommended for production)
- At least 20 GB disk space
- Root or sudo access
- A static public IP address

### DNS Configuration

Proper DNS configuration is critical for mail delivery. You need to set up the following records:

```bash
# Example DNS records for domain: example.com
# Mail server hostname: mail.example.com
# Server IP: 203.0.113.10

# A Record - Points your mail server hostname to its IP
mail.example.com.    IN    A       203.0.113.10

# MX Record - Specifies the mail server for your domain
example.com.         IN    MX  10  mail.example.com.

# PTR Record (Reverse DNS) - Set through your hosting provider
# Maps IP back to hostname for spam prevention
203.0.113.10         IN    PTR     mail.example.com.

# SPF Record - Authorizes your server to send mail for your domain
example.com.         IN    TXT     "v=spf1 mx ip4:203.0.113.10 -all"

# DKIM Record - Added after iRedMail installation
# (iRedMail generates this during setup)

# DMARC Record - Policy for handling failed authentication
_dmarc.example.com.  IN    TXT     "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"
```

### Hostname Configuration

Set your server's hostname before installation:

```bash
# Set the hostname to your mail server's fully qualified domain name (FQDN)
# This is crucial - iRedMail uses this hostname during installation
sudo hostnamectl set-hostname mail.example.com

# Verify the hostname was set correctly
hostname -f
# Output should be: mail.example.com
```

Edit the `/etc/hosts` file:

```bash
# Open the hosts file for editing
sudo nano /etc/hosts
```

Add the following entries:

```
# /etc/hosts
# Format: IP_ADDRESS    FQDN    SHORT_HOSTNAME

127.0.0.1       localhost
203.0.113.10    mail.example.com    mail

# The second line maps your public IP to the FQDN and short hostname
# Replace 203.0.113.10 with your actual server IP
```

---

## Downloading iRedMail

### Step 1: Update Your System

```bash
# Update package lists and upgrade existing packages
# This ensures your system has the latest security patches
sudo apt update && sudo apt upgrade -y

# Install required utilities
# wget: for downloading files
# bzip2: for extracting the iRedMail archive
sudo apt install -y wget bzip2
```

### Step 2: Download the Latest iRedMail Release

```bash
# Navigate to a temporary directory for the download
cd /tmp

# Download the latest iRedMail version
# Check https://www.iredmail.org/download.html for the current version
IREDMAIL_VERSION="1.7.1"
wget "https://github.com/iredmail/iRedMail/archive/refs/tags/${IREDMAIL_VERSION}.tar.gz"

# Extract the downloaded archive
# -x: extract, -z: gunzip, -f: specify filename
tar -xzf "${IREDMAIL_VERSION}.tar.gz"

# Navigate to the extracted directory
cd "iRedMail-${IREDMAIL_VERSION}"
```

### Step 3: Prepare for Installation

```bash
# Make the installation script executable
chmod +x iRedMail.sh

# Verify you're ready for installation
# Check that you're in the correct directory
pwd
# Output: /tmp/iRedMail-1.7.1

# List the contents to confirm extraction was successful
ls -la
# You should see iRedMail.sh and other configuration files
```

---

## Running the Installer

### Step 1: Start the Installation

```bash
# Run the installer as root
# The installer will present an interactive menu for configuration
sudo bash iRedMail.sh
```

### Step 2: Installation Wizard Options

During installation, you'll be prompted for several configuration options:

1. **Mail storage path**: Default is `/var/vmail` - this is where all emails are stored
2. **Web server**: Choose Nginx (recommended) or Apache
3. **Database backend**:
   - MariaDB: Best for single-server setups
   - PostgreSQL: Good for larger deployments
   - OpenLDAP: Best for enterprise environments with directory services
4. **First mail domain**: Enter your domain (e.g., `example.com`)
5. **Admin password**: Set a strong password for the postmaster account
6. **Optional components**:
   - Roundcube: Lightweight webmail (recommended)
   - SOGo: Full groupware with calendar and contacts
   - netdata: System monitoring
   - Fail2ban: Intrusion prevention (highly recommended)

### Step 3: Review Configuration

```bash
# The installer will show a summary of your choices
# Example summary:

# *********************** Review your settings *********************
#
# * Storage base directory:     /var/vmail
# * Mailboxes:                  /var/vmail/vmail1
# * Daily backup of SQL/LDAP:   /var/vmail/backup
# * Web server:                 Nginx
# * Database server:            MariaDB
# * Database name:              vmail
# * First mail domain name:     example.com
# * Mail domain admin:          postmaster@example.com
# * Additional components:      Roundcube SOGo netdata Fail2ban
#
# ******************************************************************

# Type 'y' or 'Y' to confirm and start installation
# Type 'n' or 'N' to abort and reconfigure
```

### Step 4: Complete Installation

The installation process takes 10-30 minutes depending on your server's resources. After completion:

```bash
# The installer creates a file with important information
# This file contains passwords and access URLs
cat /root/iRedMail-${IREDMAIL_VERSION}/iRedMail.tips

# IMPORTANT: Save this file securely and then delete it
# It contains sensitive credentials
sudo cp /root/iRedMail-${IREDMAIL_VERSION}/iRedMail.tips ~/iredmail-credentials.txt
sudo chmod 600 ~/iredmail-credentials.txt
```

### Step 5: Reboot the Server

```bash
# A reboot is required to apply all changes
# This ensures all services start correctly
sudo reboot
```

---

## Post-Installation Setup

### Verify Services Are Running

After reboot, verify all mail services are operational:

```bash
# Check the status of critical mail services
# All services should show "active (running)"

# Postfix - SMTP server
sudo systemctl status postfix
# Look for: Active: active (running)

# Dovecot - IMAP/POP3 server
sudo systemctl status dovecot
# Look for: Active: active (running)

# Nginx - Web server (if selected during installation)
sudo systemctl status nginx
# Look for: Active: active (running)

# MariaDB - Database server (if selected)
sudo systemctl status mariadb
# Look for: Active: active (running)

# Amavisd - Content filter
sudo systemctl status amavis
# Look for: Active: active (running)

# ClamAV - Antivirus
sudo systemctl status clamav-daemon
# Look for: Active: active (running)

# Check all services at once with a simple loop
for service in postfix dovecot nginx mariadb amavis clamav-daemon; do
    echo "=== $service ==="
    sudo systemctl is-active $service
done
```

### Verify Ports Are Open

```bash
# Check that mail-related ports are listening
# This command shows all listening TCP ports
sudo ss -tlnp | grep -E ':(25|587|465|993|995|80|443|110|143)'

# Expected output shows these ports:
# 25   - SMTP (receiving mail from other servers)
# 587  - Submission (authenticated sending)
# 465  - SMTPS (SMTP over SSL)
# 993  - IMAPS (IMAP over SSL)
# 995  - POP3S (POP3 over SSL)
# 80   - HTTP (webmail, redirects to HTTPS)
# 443  - HTTPS (webmail and admin panel)
# 110  - POP3 (optional, unencrypted)
# 143  - IMAP (optional, unencrypted)
```

### Configure Firewall

```bash
# If using UFW (Uncomplicated Firewall), open required ports
# UFW is the default firewall on Ubuntu

# Allow SSH (always do this first to avoid lockout)
sudo ufw allow 22/tcp comment 'SSH'

# Allow mail-related ports
sudo ufw allow 25/tcp comment 'SMTP'
sudo ufw allow 587/tcp comment 'Submission'
sudo ufw allow 465/tcp comment 'SMTPS'
sudo ufw allow 993/tcp comment 'IMAPS'
sudo ufw allow 995/tcp comment 'POP3S'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Enable the firewall (if not already enabled)
sudo ufw enable

# Verify the firewall rules
sudo ufw status verbose
```

---

## Admin Panel (iRedAdmin)

iRedAdmin is the web-based administration panel for managing your mail server.

### Accessing iRedAdmin

```bash
# iRedAdmin is accessible at:
# https://mail.example.com/iredadmin

# Default login credentials:
# Username: postmaster@example.com
# Password: (the password you set during installation)
```

### iRedAdmin Features

The admin panel allows you to:

1. **Manage domains**: Add, edit, or delete mail domains
2. **Manage users**: Create mailboxes, set quotas, enable/disable accounts
3. **Manage aliases**: Set up email aliases and forwarding
4. **View statistics**: Monitor mail server activity
5. **Global settings**: Configure server-wide policies

### Adding a New Admin User

```bash
# Connect to the MariaDB database
# You'll need the database password from iRedMail.tips
sudo mysql -u root -p

# Use the vmail database
USE vmail;

# Create a new domain admin
# This SQL creates an admin for a specific domain
INSERT INTO admin (username, password, name, language, created, active)
VALUES (
    'admin@example.com',                               -- Admin email
    '{SSHA512}YOUR_HASHED_PASSWORD',                   -- Hashed password
    'Domain Administrator',                             -- Display name
    'en_US',                                           -- Language preference
    NOW(),                                             -- Creation timestamp
    1                                                  -- Active status (1=active)
);

# Grant domain management rights
INSERT INTO domain_admins (username, domain, created, active)
VALUES ('admin@example.com', 'example.com', NOW(), 1);

# Exit the database
EXIT;
```

To generate a hashed password for the database:

```bash
# Use doveadm to generate a SSHA512 hash
# This is the same format iRedMail uses for passwords
doveadm pw -s SSHA512

# You'll be prompted to enter and confirm the password
# Copy the output (starts with {SSHA512}) into the SQL statement above
```

---

## Webmail Access (Roundcube/SOGo)

iRedMail includes two webmail options: Roundcube (lightweight) and SOGo (full groupware).

### Roundcube Webmail

```bash
# Roundcube is accessible at:
# https://mail.example.com/mail

# Login with any valid mailbox credentials:
# Username: user@example.com (full email address)
# Password: user's mailbox password
```

Roundcube features:
- Clean, responsive interface
- Contact management
- Folder organization
- Search functionality
- Multiple identities support

### SOGo Groupware

```bash
# SOGo is accessible at:
# https://mail.example.com/SOGo

# Login with the same credentials as Roundcube
```

SOGo features:
- Email, calendar, and contacts
- Shared calendars and address books
- ActiveSync support for mobile devices
- CardDAV and CalDAV protocols
- Resource booking

### Configuring Roundcube

```bash
# Roundcube configuration file location
sudo nano /opt/www/roundcubemail/config/config.inc.php

# Common customizations:

# Change the product name shown in the interface
$config['product_name'] = 'My Company Webmail';

# Set the default language
$config['language'] = 'en_US';

# Configure the timezone
$config['timezone'] = 'America/New_York';

# Enable additional plugins (array of plugin names)
$config['plugins'] = array(
    'archive',           # Archive button for messages
    'zipdownload',       # Download attachments as ZIP
    'managesieve',       # Server-side mail filtering
    'password',          # Allow users to change passwords
    'markasjunk',        # Mark as spam button
);

# After making changes, restart Nginx
sudo systemctl restart nginx
```

### Configuring SOGo

```bash
# SOGo configuration file location
sudo nano /etc/sogo/sogo.conf

# Key configuration options:

# Example SOGo configuration snippet
{
    // General settings
    SOGoTimeZone = "America/New_York";
    SOGoLanguage = English;

    // Mail settings
    SOGoMailDomain = "example.com";
    SOGoForceExternalLoginWithEmail = YES;

    // Calendar settings
    SOGoEnablePublicAccess = NO;
    SOGoCalendarDefaultRoles = (
        PublicDAndTViewer,
        ConfidentialDAndTViewer
    );

    // ActiveSync settings (for mobile devices)
    SOGoEASyncEnable = YES;
}

# After making changes, restart SOGo
sudo systemctl restart sogo
```

---

## Adding Domains and Users

### Adding a New Domain via Command Line

```bash
# Connect to the MariaDB database
sudo mysql -u root -p

USE vmail;

# Add a new mail domain
# This SQL statement creates a new domain entry
INSERT INTO domain (
    domain,           -- Domain name
    description,      -- Human-readable description
    transport,        -- Mail transport method
    maxquota,         -- Maximum quota per user (MB), 0 = unlimited
    quota,            -- Total domain quota (MB), 0 = unlimited
    backupmx,         -- Is this a backup MX? (0 = no)
    created,          -- Creation timestamp
    active            -- Is domain active? (1 = yes)
)
VALUES (
    'newdomain.com',
    'New Domain for Company',
    'virtual',
    2048,             -- 2GB max quota per user
    0,                -- Unlimited total domain quota
    0,
    NOW(),
    1
);

# Verify the domain was added
SELECT domain, description, active FROM domain;

EXIT;
```

### Adding a New User via Command Line

```bash
# First, generate a password hash
# Save this output for the next step
doveadm pw -s SSHA512 -p 'UserPassword123!'

# Connect to the database
sudo mysql -u root -p

USE vmail;

# Add a new mailbox user
INSERT INTO mailbox (
    username,         -- Full email address
    password,         -- Hashed password (from doveadm output)
    name,             -- Display name
    maildir,          -- Mail storage path (relative to /var/vmail/vmail1)
    quota,            -- Mailbox quota in bytes (1073741824 = 1GB)
    domain,           -- Domain this user belongs to
    local_part,       -- Part before @ in email
    created,          -- Creation timestamp
    active            -- Is account active? (1 = yes)
)
VALUES (
    'john@example.com',
    '{SSHA512}YOUR_GENERATED_HASH_HERE',
    'John Smith',
    'example.com/j/o/h/john-2026.01.15.10.30.00/',
    1073741824,
    'example.com',
    'john',
    NOW(),
    1
);

# Add the user to the forwardings table for local delivery
INSERT INTO forwardings (
    address,
    forwarding,
    domain,
    dest_domain,
    is_forwarding,
    active
)
VALUES (
    'john@example.com',
    'john@example.com',
    'example.com',
    'example.com',
    0,
    1
);

EXIT;

# Create the maildir structure
# This directory will be created automatically on first email
# but you can create it manually if needed:
sudo mkdir -p /var/vmail/vmail1/example.com/j/o/h/john-2026.01.15.10.30.00/
sudo chown -R vmail:vmail /var/vmail/vmail1/example.com/
```

### Adding Email Aliases

```bash
# Connect to the database
sudo mysql -u root -p

USE vmail;

# Create an alias that forwards to another address
# This forwards all mail from info@example.com to john@example.com
INSERT INTO alias (
    address,          -- The alias address
    goto,             -- Where to forward (can be multiple, comma-separated)
    domain,           -- Domain of the alias
    created,          -- Creation timestamp
    active            -- Is alias active?
)
VALUES (
    'info@example.com',
    'john@example.com',
    'example.com',
    NOW(),
    1
);

# Create an alias that forwards to multiple addresses
INSERT INTO alias (address, goto, domain, created, active)
VALUES (
    'sales@example.com',
    'john@example.com,jane@example.com,manager@example.com',
    'example.com',
    NOW(),
    1
);

# Create a catch-all alias (receives all mail to non-existent addresses)
# Use with caution - this can attract spam
INSERT INTO alias (address, goto, domain, created, active)
VALUES (
    '@example.com',           -- @ prefix makes it a catch-all
    'postmaster@example.com',
    'example.com',
    NOW(),
    1
);

EXIT;
```

---

## SSL/TLS Configuration

iRedMail includes self-signed certificates by default, but for production use, you should use certificates from a trusted Certificate Authority.

### Installing Let's Encrypt Certificates

```bash
# Install Certbot for Let's Encrypt certificates
sudo apt install -y certbot

# Stop Nginx temporarily (required for standalone verification)
sudo systemctl stop nginx

# Request certificates for your mail server hostname
# Certbot will verify domain ownership via HTTP challenge
sudo certbot certonly --standalone \
    -d mail.example.com \
    --agree-tos \
    --email admin@example.com \
    --non-interactive

# The certificates will be stored in:
# /etc/letsencrypt/live/mail.example.com/fullchain.pem (certificate + chain)
# /etc/letsencrypt/live/mail.example.com/privkey.pem (private key)
```

### Configuring Postfix for SSL

```bash
# Edit Postfix main configuration
sudo nano /etc/postfix/main.cf

# Update SSL certificate paths
# Find and replace the existing certificate settings:

smtpd_tls_cert_file = /etc/letsencrypt/live/mail.example.com/fullchain.pem
smtpd_tls_key_file = /etc/letsencrypt/live/mail.example.com/privkey.pem
smtpd_tls_CAfile = /etc/letsencrypt/live/mail.example.com/chain.pem

# Security settings for TLS
smtpd_tls_security_level = may
smtpd_tls_loglevel = 1
smtpd_tls_session_cache_database = btree:${data_directory}/smtpd_scache

# Require TLS for authenticated connections
smtpd_tls_auth_only = yes

# Modern TLS protocols only (disable SSLv3 and older)
smtpd_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtpd_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
```

### Configuring Dovecot for SSL

```bash
# Edit Dovecot SSL configuration
sudo nano /etc/dovecot/conf.d/10-ssl.conf

# Update SSL certificate paths
ssl_cert = </etc/letsencrypt/live/mail.example.com/fullchain.pem
ssl_key = </etc/letsencrypt/live/mail.example.com/privkey.pem

# SSL/TLS settings
ssl = required
ssl_min_protocol = TLSv1.2
ssl_prefer_server_ciphers = yes
```

### Configuring Nginx for SSL

```bash
# Edit Nginx SSL configuration
sudo nano /etc/nginx/sites-available/00-default-ssl.conf

# Update SSL certificate paths in the server block
server {
    listen 443 ssl http2;
    server_name mail.example.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/mail.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mail.example.com/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS (optional but recommended)
    add_header Strict-Transport-Security "max-age=31536000" always;

    # ... rest of configuration
}
```

### Restart Services

```bash
# After updating certificates, restart all affected services
sudo systemctl restart postfix dovecot nginx

# Verify services are running
sudo systemctl status postfix dovecot nginx

# Test SSL certificate
# This command shows certificate details and verifies the chain
openssl s_client -connect mail.example.com:993 -servername mail.example.com </dev/null 2>/dev/null | openssl x509 -noout -dates -subject
```

### Auto-Renewal Setup

```bash
# Create a renewal script that also restarts services
sudo nano /etc/letsencrypt/renewal-hooks/deploy/restart-mail-services.sh

# Add the following content:
#!/bin/bash
# This script runs after certificate renewal
# Restart services to pick up new certificates

systemctl restart postfix
systemctl restart dovecot
systemctl restart nginx

# Make the script executable
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/restart-mail-services.sh

# Test automatic renewal (dry run)
sudo certbot renew --dry-run

# Certbot automatically creates a cron job or systemd timer
# Verify it exists:
sudo systemctl list-timers | grep certbot
```

---

## Anti-Spam Settings

iRedMail includes SpamAssassin and Amavisd for spam filtering. Here's how to customize them.

### SpamAssassin Configuration

```bash
# Main SpamAssassin configuration file
sudo nano /etc/spamassassin/local.cf

# Add or modify these settings:

# Score threshold for marking as spam
# Lower = more aggressive, Higher = more lenient
# Default is 5.0, recommended range is 4.0-6.0
required_score 5.0

# What to do with spam headers
rewrite_header Subject [SPAM]

# Enable Bayes learning (learns from user-marked spam)
use_bayes 1
bayes_auto_learn 1

# Trust specific networks (your local network)
# Add your server's IP to prevent self-flagging
trusted_networks 127.0.0.1
trusted_networks 203.0.113.0/24

# Whitelist specific senders (use sparingly)
whitelist_from *@trustedpartner.com
whitelist_from newsletter@company.com

# Blacklist known spam senders
blacklist_from spam@spammer.com

# Enable/disable specific tests
# Positive score = more likely spam, Negative = less likely spam
score URIBL_BLOCKED 0.001     # Reduce score if URIBL lookups fail
score RCVD_IN_DNSWL_HI -5     # Reduce score for whitelisted senders

# DNS blacklist configuration
skip_rbl_checks 0
use_razor2 1
use_pyzor 1

# Save and exit
# After making changes, restart SpamAssassin
sudo systemctl restart spamassassin
```

### Amavisd Configuration

```bash
# Amavisd main configuration file
sudo nano /etc/amavis/conf.d/50-user

# Key settings to customize:

# Spam score settings
# Tag level: Add spam info headers (informational)
$sa_tag_level_deflt = -999;

# Tag2 level: Add spam headers and potentially modify subject
$sa_tag2_level_deflt = 5;

# Kill level: Quarantine or reject the message
$sa_kill_level_deflt = 10;

# What to do with spam
# D_PASS: Deliver anyway (with headers)
# D_BOUNCE: Bounce back to sender (not recommended)
# D_DISCARD: Silently discard
# D_REJECT: Reject with SMTP error
$final_spam_destiny = D_PASS;
$final_virus_destiny = D_DISCARD;
$final_banned_destiny = D_BOUNCE;

# Quarantine settings
$spam_quarantine_to = 'spam-quarantine';
$virus_quarantine_to = 'virus-quarantine';

# Banned file extensions (block dangerous attachments)
$banned_filename_re = new_RE(
    qr'\.[a-zA-Z][a-zA-Z0-9]{0,3}\.(exe|vbs|pif|scr|bat|cmd|com|cpl)$'i,
    qr'.\.(exe|vbs|pif|scr|bat|cmd|com|cpl|dll)$'i,
);

# After making changes, restart Amavisd
sudo systemctl restart amavis
```

### Training SpamAssassin with Bayes

```bash
# Train SpamAssassin to recognize spam using sample messages
# This improves accuracy over time

# Learn from a folder of known spam messages
sudo sa-learn --spam /path/to/spam/folder/

# Learn from a folder of known good messages (ham)
sudo sa-learn --ham /path/to/ham/folder/

# Check Bayes database statistics
sudo sa-learn --dump magic

# Example: Train from user's spam folder
# First, find a user's spam folder
sudo sa-learn --spam /var/vmail/vmail1/example.com/j/o/h/john/Maildir/.Junk/cur/

# Clear Bayes database if needed (start fresh)
sudo sa-learn --clear
```

### DKIM Configuration

```bash
# DKIM is configured automatically by iRedMail
# View your DKIM public key for DNS:
sudo amavisd-new showkeys

# Output will look like:
# dkim._domainkey.example.com. 3600 TXT (
#   "v=DKIM1; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
# )

# Add this TXT record to your DNS
# The key should be added as a single TXT record
# Some DNS providers require you to remove quotes and parentheses

# Test DKIM signing is working
sudo amavisd-new testkeys
# Expected output: TESTING#1: dkim._domainkey.example.com => pass
```

### Greylisting Configuration

```bash
# iRedMail uses iRedAPD for greylisting
# Configuration file:
sudo nano /opt/iredapd/settings.py

# Enable or disable greylisting
# Greylisting temporarily rejects unknown senders
# Legitimate servers retry, spam bots usually don't
ENABLE_GREYLISTING = True

# Greylist duration in seconds (default: 5 minutes)
GREYLISTING_DELAY = 300

# Whitelist domains from greylisting (trusted senders)
GREYLISTING_WHITELIST_DOMAINS = [
    'gmail.com',
    'outlook.com',
    'yahoo.com',
]

# Restart iRedAPD after changes
sudo systemctl restart iredapd
```

---

## Backup and Restore

Regular backups are essential for mail server recovery.

### Automated Backup Script

```bash
# iRedMail includes a backup script at /var/vmail/backup/
# View the backup configuration:
cat /var/vmail/backup/backup_mysql.sh

# The default cron job runs daily
# Check the cron configuration:
sudo crontab -l | grep backup
```

### Creating a Comprehensive Backup Script

```bash
# Create a custom backup script
sudo nano /root/mail-backup.sh
```

Add the following content:

```bash
#!/bin/bash
# iRedMail Comprehensive Backup Script
# This script backs up all critical mail server components

# Configuration variables
BACKUP_DIR="/var/backups/iredmail"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Database credentials (from iRedMail installation)
DB_USER="root"
DB_PASS="YOUR_DATABASE_PASSWORD"

# Create backup directory structure
mkdir -p "${BACKUP_DIR}/${DATE}"
cd "${BACKUP_DIR}/${DATE}"

echo "Starting backup at $(date)"

# 1. Backup MySQL/MariaDB databases
echo "Backing up databases..."
mysqldump -u${DB_USER} -p${DB_PASS} --all-databases > all_databases.sql
# Compress the SQL dump
gzip all_databases.sql

# 2. Backup mail storage
echo "Backing up mail storage (this may take a while)..."
# Use tar with compression, preserving permissions
tar -czf mailboxes.tar.gz /var/vmail/vmail1/

# 3. Backup configuration files
echo "Backing up configuration files..."
tar -czf configs.tar.gz \
    /etc/postfix/ \
    /etc/dovecot/ \
    /etc/amavis/ \
    /etc/spamassassin/ \
    /etc/nginx/ \
    /opt/www/roundcubemail/config/ \
    /etc/sogo/ \
    /opt/iredapd/settings.py \
    /opt/iredmail/

# 4. Backup SSL certificates
echo "Backing up SSL certificates..."
tar -czf ssl_certs.tar.gz /etc/letsencrypt/

# 5. Backup DKIM keys
echo "Backing up DKIM keys..."
tar -czf dkim_keys.tar.gz /var/lib/dkim/

# 6. Create a manifest file
echo "Creating backup manifest..."
cat > manifest.txt << EOF
iRedMail Backup Manifest
========================
Date: $(date)
Hostname: $(hostname -f)
iRedMail Version: $(cat /opt/iredmail/.iredmail_version 2>/dev/null || echo "Unknown")

Files in this backup:
$(ls -la)

Disk usage:
$(du -sh *)
EOF

# 7. Clean up old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -maxdepth 1 -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \;

# 8. Calculate total backup size
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}/${DATE}" | cut -f1)
echo "Backup completed at $(date)"
echo "Backup size: ${TOTAL_SIZE}"
echo "Backup location: ${BACKUP_DIR}/${DATE}"
```

Make the script executable and schedule it:

```bash
# Make script executable
sudo chmod +x /root/mail-backup.sh

# Test the script
sudo /root/mail-backup.sh

# Add to cron for daily execution (runs at 2 AM)
sudo crontab -e
# Add this line:
0 2 * * * /root/mail-backup.sh >> /var/log/mail-backup.log 2>&1
```

### Restore Procedures

```bash
# Restore from backup
# IMPORTANT: Test restores regularly to ensure backups are valid

# 1. Stop mail services before restore
sudo systemctl stop postfix dovecot amavis nginx

# 2. Restore databases
cd /var/backups/iredmail/BACKUP_DATE/
gunzip all_databases.sql.gz
mysql -u root -p < all_databases.sql

# 3. Restore mail storage
# WARNING: This will overwrite existing mail
sudo tar -xzf mailboxes.tar.gz -C /

# 4. Restore configurations
sudo tar -xzf configs.tar.gz -C /

# 5. Restore DKIM keys
sudo tar -xzf dkim_keys.tar.gz -C /

# 6. Fix permissions after restore
sudo chown -R vmail:vmail /var/vmail/
sudo chown -R amavis:amavis /var/lib/dkim/

# 7. Restart services
sudo systemctl start mariadb postfix dovecot amavis nginx

# 8. Verify services are working
sudo systemctl status postfix dovecot
```

### Remote Backup with rsync

```bash
# Sync backups to a remote server for disaster recovery
# Set up SSH key authentication first

# Create SSH key for backup user
sudo ssh-keygen -t ed25519 -f /root/.ssh/backup_key -N ""

# Copy key to remote backup server
sudo ssh-copy-id -i /root/.ssh/backup_key.pub backup@remote-server.com

# Add rsync to backup script
rsync -avz --delete \
    -e "ssh -i /root/.ssh/backup_key" \
    "${BACKUP_DIR}/" \
    backup@remote-server.com:/backups/mail-server/
```

---

## Troubleshooting

### Common Issues and Solutions

#### Mail Not Sending or Receiving

```bash
# Check Postfix mail queue for stuck messages
sudo postqueue -p

# View detailed queue information
sudo mailq

# Check Postfix logs for errors
sudo tail -f /var/log/mail.log

# Test SMTP connection locally
telnet localhost 25
# Type: EHLO localhost
# You should see a list of SMTP extensions

# Check if ports are open externally
# Run from a different machine:
nc -zv mail.example.com 25
nc -zv mail.example.com 587
```

#### Authentication Failures

```bash
# Check Dovecot authentication logs
sudo tail -f /var/log/dovecot/dovecot.log

# Test authentication manually with doveadm
sudo doveadm auth test user@example.com
# Enter password when prompted

# Check password hash in database
sudo mysql -u root -p -e "SELECT username, password FROM vmail.mailbox WHERE username='user@example.com';"

# Verify Dovecot authentication settings
sudo doveconf -n | grep -i auth
```

#### SSL/TLS Certificate Issues

```bash
# Test SSL certificate for SMTP
openssl s_client -connect mail.example.com:587 -starttls smtp

# Test SSL certificate for IMAP
openssl s_client -connect mail.example.com:993

# Check certificate expiration dates
sudo certbot certificates

# Verify certificate chain
openssl verify -CAfile /etc/letsencrypt/live/mail.example.com/chain.pem \
    /etc/letsencrypt/live/mail.example.com/cert.pem
```

#### Spam Filter Issues

```bash
# Check Amavisd status and logs
sudo systemctl status amavis
sudo tail -f /var/log/amavis/amavis.log

# Test SpamAssassin directly on a message
sudo spamassassin -t < /path/to/test/message.eml

# Check SpamAssassin rules
sudo spamassassin --lint

# View Bayes statistics
sudo sa-learn --dump magic
```

#### Disk Space Issues

```bash
# Check disk usage
df -h

# Find large mailboxes
sudo du -sh /var/vmail/vmail1/*/* | sort -rh | head -20

# Check mail queue size
sudo du -sh /var/spool/postfix/

# Clear deferred mail queue (use with caution)
sudo postsuper -d ALL deferred
```

### Log File Locations

```bash
# Important log files for troubleshooting

# Main mail log (Postfix and Dovecot)
/var/log/mail.log

# Postfix-specific logs
/var/log/mail.err
/var/log/mail.warn

# Dovecot logs
/var/log/dovecot/dovecot.log
/var/log/dovecot/lda.log

# Amavisd (spam/virus filtering)
/var/log/amavis/amavis.log

# Nginx access and error logs
/var/log/nginx/access.log
/var/log/nginx/error.log

# iRedAPD (policy daemon)
/var/log/iredapd/iredapd.log

# Fail2ban
/var/log/fail2ban.log

# View all mail-related logs in real-time
sudo tail -f /var/log/mail.log /var/log/dovecot/dovecot.log /var/log/amavis/amavis.log
```

### Testing Email Delivery

```bash
# Send a test email from command line
echo "Test email body" | mail -s "Test Subject" recipient@example.com

# Send test with specific from address
echo "Test email body" | mail -s "Test Subject" -r sender@example.com recipient@example.com

# Check if email was processed
sudo grep "Test Subject" /var/log/mail.log

# Test email delivery to external services
# Use online tools like:
# - mail-tester.com (checks spam score)
# - mxtoolbox.com (checks DNS and blacklists)
# - dkimvalidator.com (verifies DKIM signing)
```

### Performance Optimization

```bash
# Check current resource usage
htop

# Monitor mail server processes
ps aux | grep -E "(postfix|dovecot|amavis|clam)"

# Check Postfix performance
sudo postconf | grep -E "(process_limit|default_process_limit)"

# Optimize MariaDB for mail server
# Edit /etc/mysql/mariadb.conf.d/50-server.cnf

# Increase connection limits if needed
max_connections = 200
innodb_buffer_pool_size = 1G  # Adjust based on available RAM

# Restart MariaDB after changes
sudo systemctl restart mariadb
```

---

## Summary

Setting up iRedMail on Ubuntu provides you with a complete, production-ready mail server solution. Here's a quick recap of what we covered:

1. **Prerequisites**: Clean Ubuntu installation, proper DNS configuration, and hostname setup
2. **Installation**: Downloaded and ran the iRedMail installer with your preferred options
3. **Post-installation**: Verified services, configured firewall, and noted important credentials
4. **Administration**: Used iRedAdmin for domain and user management
5. **Webmail**: Configured Roundcube and/or SOGo for web-based email access
6. **Security**: Implemented Let's Encrypt SSL certificates
7. **Anti-spam**: Customized SpamAssassin and Amavisd settings
8. **Backup**: Created comprehensive backup and restore procedures
9. **Troubleshooting**: Learned to diagnose and fix common issues

### Best Practices Checklist

- [ ] Keep Ubuntu and iRedMail packages updated regularly
- [ ] Monitor disk space and mail queue size
- [ ] Review logs periodically for security issues
- [ ] Test backups by performing regular restore drills
- [ ] Monitor SSL certificate expiration
- [ ] Keep DNS records (SPF, DKIM, DMARC) properly configured
- [ ] Document all custom configurations for future reference

---

## Monitor Your Mail Server with OneUptime

Once your iRedMail server is up and running, it's crucial to ensure it stays operational 24/7. Email is a critical service, and even brief outages can impact your business communications.

**[OneUptime](https://oneuptime.com)** provides comprehensive monitoring for your mail server:

- **SMTP Monitoring**: Verify your mail server accepts connections and processes emails
- **IMAP/POP3 Monitoring**: Ensure users can access their mailboxes
- **SSL Certificate Monitoring**: Get alerts before certificates expire
- **Port Monitoring**: Track availability of all mail-related ports (25, 587, 993, etc.)
- **Server Resource Monitoring**: Monitor CPU, memory, and disk usage
- **Custom Alerts**: Receive notifications via email, SMS, Slack, or webhooks
- **Status Pages**: Keep users informed about service status
- **Incident Management**: Track and resolve issues efficiently

With OneUptime, you can catch problems before they affect your users and maintain the reliability your business depends on. Set up monitoring today to ensure your iRedMail server delivers peak performance around the clock.
