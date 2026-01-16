# How to Configure Roundcube Webmail on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Roundcube, Webmail, Email, Tutorial

Description: Complete guide to installing and configuring Roundcube webmail on Ubuntu.

---

Roundcube is a browser-based IMAP client with a polished interface that rivals desktop email applications. It gives your users anywhere-access to their mailboxes without installing software. This guide walks through installing Roundcube on Ubuntu, connecting it to your mail server, securing the setup with SSL/TLS, and tuning it for production use.

## 1. Understanding Roundcube

Roundcube is an open-source webmail client written in PHP. It connects to any IMAP server and provides features like:

- **AJAX-powered interface** - responsive, desktop-like user experience
- **MIME support** - handles attachments, inline images, and HTML emails
- **Address book** - local contacts plus LDAP integration
- **Search** - full-text search across messages
- **Spell checking** - multiple language support
- **Plugin architecture** - extend functionality without modifying core code
- **Skins/themes** - customizable appearance

Roundcube acts as a bridge between users and your existing mail infrastructure. It does not store emails itself - it reads from and writes to your IMAP/SMTP server.

## 2. Prerequisites

Before installing Roundcube, ensure you have:

### Mail Server

You need a working mail server with IMAP and SMTP access. Common options include:

- **Postfix + Dovecot** - the classic Linux mail stack
- **Mail-in-a-Box** - all-in-one mail server solution
- **iRedMail** - full-featured mail server bundle
- **External provider** - Gmail, Microsoft 365, or any IMAP-capable service

Verify your mail server is working:

```bash
# Test IMAP connectivity (replace mail.example.com with your server)
# This attempts a TLS connection to the IMAP port
openssl s_client -connect mail.example.com:993 -quiet

# Test SMTP connectivity
# This attempts a STARTTLS connection to the submission port
openssl s_client -connect mail.example.com:587 -starttls smtp -quiet
```

### Web Server

Roundcube requires a web server with PHP support:

- **Apache** with mod_php or PHP-FPM
- **Nginx** with PHP-FPM

### Database

Roundcube stores user preferences, contacts, and identities in a database:

- **MySQL/MariaDB** - most common choice
- **PostgreSQL** - excellent alternative
- **SQLite** - suitable for single-user or testing

### PHP Requirements

Roundcube requires PHP 7.4 or later (PHP 8.x recommended) with these extensions:

- php-json
- php-xml
- php-mbstring
- php-intl
- php-curl (for external HTTP requests)
- php-gd or php-imagick (for image handling)
- php-zip (for attachment downloads)
- Database driver (php-mysql or php-pgsql)

## 3. Installing Roundcube

### Option A: Install from Ubuntu Repositories

The simplest method uses Ubuntu's package manager:

```bash
# Update package lists
sudo apt update

# Install Roundcube and dependencies
# This pulls in Apache, PHP, and MySQL client libraries automatically
sudo apt install roundcube roundcube-mysql roundcube-plugins

# The installer will prompt for:
# - Database configuration (choose 'yes' to configure with dbconfig-common)
# - MySQL application password (generate a strong one)
```

The package installs to `/usr/share/roundcube` with configuration in `/etc/roundcube`.

### Option B: Install from Source (Latest Version)

For the newest features and security patches, install from the official release:

```bash
# Install dependencies first
sudo apt update
sudo apt install apache2 php php-mysql php-xml php-mbstring php-intl \
    php-curl php-gd php-zip php-imagick mariadb-server unzip

# Download the latest stable release
cd /tmp
wget https://github.com/roundcube/roundcubemail/releases/download/1.6.9/roundcubemail-1.6.9-complete.tar.gz

# Extract to web directory
sudo tar xzf roundcubemail-1.6.9-complete.tar.gz
sudo mv roundcubemail-1.6.9 /var/www/roundcube

# Set ownership - Apache needs read access, www-data needs write for temp/logs
sudo chown -R www-data:www-data /var/www/roundcube
sudo chmod -R 755 /var/www/roundcube

# Create writable directories for logs and temporary files
sudo chmod -R 775 /var/www/roundcube/temp
sudo chmod -R 775 /var/www/roundcube/logs
```

## 4. Database Configuration

### MySQL/MariaDB Setup

Create a dedicated database and user for Roundcube:

```bash
# Log into MySQL as root
sudo mysql -u root -p
```

```sql
-- Create the Roundcube database with UTF-8 support
CREATE DATABASE roundcubemail
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Create a dedicated user with a strong password
-- Replace 'YourSecurePassword123!' with an actual secure password
CREATE USER 'roundcube'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';

-- Grant all privileges on the Roundcube database only
GRANT ALL PRIVILEGES ON roundcubemail.* TO 'roundcube'@'localhost';

-- Apply the privilege changes
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

Import the Roundcube schema:

```bash
# For package installation, schema is at:
sudo mysql -u roundcube -p roundcubemail < /usr/share/roundcube/SQL/mysql.initial.sql

# For source installation:
sudo mysql -u roundcube -p roundcubemail < /var/www/roundcube/SQL/mysql.initial.sql
```

### PostgreSQL Setup

If you prefer PostgreSQL:

```bash
# Install PostgreSQL and PHP driver
sudo apt install postgresql php-pgsql

# Switch to postgres user and create database
sudo -u postgres psql
```

```sql
-- Create the database
CREATE DATABASE roundcubemail
    ENCODING 'UTF8'
    LC_COLLATE='en_US.UTF-8'
    LC_CTYPE='en_US.UTF-8';

-- Create user with password
CREATE USER roundcube WITH PASSWORD 'YourSecurePassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE roundcubemail TO roundcube;

-- Connect to the new database
\c roundcubemail

-- Grant schema privileges (required for PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO roundcube;

-- Exit
\q
```

Import the schema:

```bash
# Import PostgreSQL schema
sudo -u postgres psql roundcubemail < /var/www/roundcube/SQL/postgres.initial.sql
```

## 5. Apache Configuration

Create a virtual host configuration for Roundcube:

```bash
# Create Apache virtual host configuration
sudo nano /etc/apache2/sites-available/roundcube.conf
```

Add the following configuration:

```apache
# Roundcube Webmail Virtual Host Configuration
# This configuration sets up Roundcube at webmail.example.com

<VirtualHost *:80>
    # Server identification
    ServerName webmail.example.com
    ServerAdmin admin@example.com

    # Document root - adjust based on installation method
    # Package install: /usr/share/roundcube
    # Source install: /var/www/roundcube
    DocumentRoot /var/www/roundcube

    # Directory permissions
    <Directory /var/www/roundcube>
        # Allow .htaccess overrides for Roundcube's own rules
        AllowOverride All

        # Modern Apache 2.4+ access control
        Require all granted

        # Enable URL rewriting if mod_rewrite is available
        <IfModule mod_rewrite.c>
            RewriteEngine On
            # Redirect to HTTPS (uncomment after SSL is configured)
            # RewriteCond %{HTTPS} off
            # RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
        </IfModule>
    </Directory>

    # Block access to sensitive directories
    # These directories should never be web-accessible
    <Directory /var/www/roundcube/config>
        Require all denied
    </Directory>

    <Directory /var/www/roundcube/temp>
        Require all denied
    </Directory>

    <Directory /var/www/roundcube/logs>
        Require all denied
    </Directory>

    # Logging configuration
    ErrorLog ${APACHE_LOG_DIR}/roundcube_error.log
    CustomLog ${APACHE_LOG_DIR}/roundcube_access.log combined
</VirtualHost>
```

Enable the site and required modules:

```bash
# Enable required Apache modules
sudo a2enmod rewrite    # URL rewriting for clean URLs
sudo a2enmod headers    # Security headers
sudo a2enmod ssl        # SSL/TLS support (for later)

# Enable the Roundcube site
sudo a2ensite roundcube.conf

# Disable default site if not needed
sudo a2dissite 000-default.conf

# Test configuration for syntax errors
sudo apache2ctl configtest

# Reload Apache to apply changes
sudo systemctl reload apache2
```

## 6. Nginx Configuration

If you prefer Nginx over Apache:

```bash
# Install Nginx and PHP-FPM
sudo apt install nginx php-fpm

# Create Nginx server block
sudo nano /etc/nginx/sites-available/roundcube
```

Add this configuration:

```nginx
# Roundcube Webmail Nginx Configuration
# Serves Roundcube at webmail.example.com

server {
    # Listen on port 80 (HTTP)
    listen 80;
    listen [::]:80;

    # Server name - replace with your domain
    server_name webmail.example.com;

    # Document root
    root /var/www/roundcube;
    index index.php;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Deny access to sensitive files and directories
    location ~ ^/(config|temp|logs)/ {
        deny all;
        return 404;
    }

    # Block access to hidden files (like .htaccess)
    location ~ /\. {
        deny all;
        return 404;
    }

    # Block access to sensitive file types
    location ~* \.(log|sql|inc|bak)$ {
        deny all;
        return 404;
    }

    # Main location block - try files, then directories, then PHP
    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    # PHP processing via PHP-FPM
    location ~ \.php$ {
        # Prevent execution of PHP in uploads directory
        fastcgi_split_path_info ^(.+\.php)(/.+)$;

        # Check that the PHP file exists before passing to FPM
        try_files $uri =404;

        # PHP-FPM socket - adjust version number as needed
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;

        # FastCGI parameters
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;

        # Timeouts for slow operations (large attachments)
        fastcgi_read_timeout 300;
    }

    # Static file caching
    location ~* \.(jpg|jpeg|gif|png|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/roundcube /etc/nginx/sites-enabled/

# Remove default site if not needed
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 7. Roundcube Configuration (config.inc.php)

The main configuration file controls all aspects of Roundcube. Create it from the sample:

```bash
# Copy sample configuration
# Package install:
sudo cp /etc/roundcube/config.inc.php.sample /etc/roundcube/config.inc.php

# Source install:
sudo cp /var/www/roundcube/config/config.inc.php.sample /var/www/roundcube/config/config.inc.php
```

Edit the configuration file:

```bash
sudo nano /var/www/roundcube/config/config.inc.php
```

Here is a comprehensive configuration with detailed comments:

```php
<?php

/*
 * Roundcube Webmail Configuration
 *
 * This file contains all settings for your Roundcube installation.
 * Each option is documented to explain its purpose.
 */

// ============================================
// DATABASE CONFIGURATION
// ============================================

// Database connection string (DSN)
// Format: driver://user:password@host/database
// Supported drivers: mysql, mysqli, pgsql, sqlite
$config['db_dsnw'] = 'mysql://roundcube:YourSecurePassword123!@localhost/roundcubemail';

// Read-only replica for SELECT queries (optional, improves performance)
// $config['db_dsnr'] = 'mysql://roundcube_ro:password@replica.local/roundcubemail';

// Database table prefix (useful if sharing database with other apps)
$config['db_prefix'] = '';

// ============================================
// IMAP SERVER CONFIGURATION
// ============================================

// IMAP server address
// Use ssl:// prefix for implicit SSL (port 993)
// Use tls:// prefix for STARTTLS (port 143)
// %h = user's domain (from email address)
// %n = hostname from HTTP request
// %d = domain from email address
$config['imap_host'] = 'ssl://mail.example.com:993';

// Authentication type for IMAP
// Options: 'CHECK', 'PLAIN', 'LOGIN', 'DIGEST-MD5', 'CRAM-MD5', 'NTLM', 'GSSAPI', 'XOAUTH2'
$config['imap_auth_type'] = 'PLAIN';

// IMAP connection timeout in seconds
$config['imap_timeout'] = 30;

// Enable IMAP debugging (writes to logs/imap - disable in production)
$config['imap_debug'] = false;

// ============================================
// SMTP SERVER CONFIGURATION
// ============================================

// SMTP server address for sending mail
// Use tls:// for STARTTLS on port 587
// Use ssl:// for implicit SSL on port 465
$config['smtp_host'] = 'tls://mail.example.com:587';

// SMTP authentication credentials
// Use '%u' to pass the IMAP username
// Use '%p' to pass the IMAP password
$config['smtp_user'] = '%u';
$config['smtp_pass'] = '%p';

// SMTP authentication type
$config['smtp_auth_type'] = 'PLAIN';

// SMTP connection timeout
$config['smtp_timeout'] = 30;

// Enable SMTP debugging (disable in production)
$config['smtp_debug'] = false;

// ============================================
// SYSTEM CONFIGURATION
// ============================================

// Product name displayed to users
$config['product_name'] = 'Webmail';

// Support URL shown in error messages
$config['support_url'] = 'https://support.example.com';

// Path to Roundcube installation (auto-detected if empty)
$config['base_url'] = '';

// DES key for encrypting IMAP password in session
// MUST be exactly 24 characters - generate a random string
// This is critical for security - change the default!
$config['des_key'] = 'rcmail-!24BytesSecretKey!';

// Enable installer script (DISABLE after initial setup!)
$config['enable_installer'] = false;

// Default language (user can change in preferences)
$config['language'] = 'en_US';

// Timezone (auto-detect from browser if empty)
$config['timezone'] = 'UTC';

// ============================================
// LOGGING
// ============================================

// Log driver: 'file', 'syslog', or 'stdout'
$config['log_driver'] = 'file';

// Log directory (relative to Roundcube root or absolute path)
$config['log_dir'] = '/var/www/roundcube/logs/';

// Date format for log entries
$config['log_date_format'] = 'Y-m-d H:i:s T';

// Log successful logins
$config['log_logins'] = true;

// Log session data (useful for debugging, disable in production)
$config['log_session'] = false;

// Per-user logging directory (uses username as subdirectory)
$config['per_user_logging'] = false;

// ============================================
// USER INTERFACE
// ============================================

// Default skin/theme
$config['skin'] = 'elastic';

// Skins available to users (empty array = all installed skins)
$config['skins_allowed'] = ['elastic', 'larry'];

// Page title format
$config['html_title'] = 'Roundcube Webmail';

// Default address book view
$config['addressbook_view'] = 'table';

// Refresh interval for checking new messages (in seconds, minimum 60)
$config['refresh_interval'] = 60;

// Number of messages to display per page
$config['mail_pagesize'] = 50;

// Number of contacts to display per page
$config['addressbook_pagesize'] = 50;

// Prefer HTML or plain text when both are available
$config['prefer_html'] = true;

// Display remote images in HTML emails
// 0 = never, 1 = from known senders, 2 = always
$config['show_images'] = 1;

// ============================================
// MESSAGE COMPOSITION
// ============================================

// Default compose mode: 'html' or 'plain'
$config['htmleditor'] = 'always';

// Draft auto-save interval in seconds (0 = disabled)
$config['draft_autosave'] = 300;

// Maximum size of uploaded attachments (in bytes)
// This should match or be lower than PHP's upload_max_filesize
$config['max_message_size'] = '25M';

// MIME type detection: 'mime_content_type', 'file', or 'finfo'
$config['mime_magic'] = '/usr/share/misc/magic';

// Spell check engine: 'googie' (Google API), 'pspell', 'enchant', or 'atd'
$config['spellcheck_engine'] = 'pspell';

// Languages available for spell checking
$config['spellcheck_languages'] = ['en', 'es', 'fr', 'de'];

// ============================================
// SECURITY
// ============================================

// Use HTTPS for all operations (force secure cookies)
$config['use_https'] = true;

// Session lifetime in minutes (0 = until browser closes)
$config['session_lifetime'] = 30;

// Enable CSRF protection
$config['request_csrf_protection'] = true;

// IP address checking for session validation
// 0 = disabled, 1-4 = number of octets to check
$config['ip_check'] = 4;

// Deny access from these IP addresses
$config['login_rate_limit'] = 5;

// Password minimum length
$config['password_minimum_length'] = 8;

// Brute force protection - delay between failed login attempts (seconds)
$config['login_rate_limit'] = 5;

// ============================================
// PLUGINS
// ============================================

// Active plugins (order matters for some plugins)
$config['plugins'] = [
    'archive',              // Archive messages button
    'zipdownload',          // Download attachments as ZIP
    'managesieve',          // Sieve mail filtering
    'password',             // Password change functionality
    'markasjunk',           // Mark as spam button
    'newmail_notifier',     // Desktop notifications for new mail
    'emoticons',            // Emoji support in compose
    'vcard_attachments',    // Handle vCard attachments
    'attachment_reminder',  // Warn about forgotten attachments
];

// ============================================
// FOLDER CONFIGURATION
// ============================================

// Special folders - map to your IMAP server's naming convention
$config['drafts_mbox'] = 'Drafts';
$config['junk_mbox'] = 'Junk';
$config['sent_mbox'] = 'Sent';
$config['trash_mbox'] = 'Trash';
$config['archive_mbox'] = 'Archive';

// Folders to display by default (in addition to INBOX)
$config['default_folders'] = ['INBOX', 'Drafts', 'Sent', 'Junk', 'Trash', 'Archive'];

// Auto-create special folders if they don't exist
$config['create_default_folders'] = true;

// ============================================
// ADDRESSBOOK
// ============================================

// Default addressbook source for new contacts
$config['default_addressbook'] = '0';

// Autocomplete from these address sources
$config['autocomplete_addressbooks'] = ['sql'];

// Minimum characters before triggering autocomplete
$config['autocomplete_min_length'] = 2;

// LDAP addressbook configuration (optional)
// Uncomment and configure for corporate directory integration
/*
$config['ldap_public'] = [
    'corporate' => [
        'name'              => 'Corporate Directory',
        'hosts'             => ['ldap.example.com'],
        'port'              => 389,
        'use_tls'           => true,
        'base_dn'           => 'ou=People,dc=example,dc=com',
        'bind_dn'           => 'cn=readonly,dc=example,dc=com',
        'bind_pass'         => 'ldap_password',
        'search_fields'     => ['mail', 'cn', 'sn', 'givenName'],
        'name_field'        => 'cn',
        'email_field'       => 'mail',
        'groups'            => false,
    ],
];
*/
```

Set proper permissions on the configuration file:

```bash
# Restrict access to configuration file
sudo chmod 640 /var/www/roundcube/config/config.inc.php
sudo chown www-data:www-data /var/www/roundcube/config/config.inc.php
```

## 8. SSL/TLS Setup

### Using Let's Encrypt with Certbot

Install and configure SSL for secure access:

```bash
# Install Certbot for Apache
sudo apt install certbot python3-certbot-apache

# Or for Nginx
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (Apache)
# Certbot will automatically configure Apache virtual host
sudo certbot --apache -d webmail.example.com

# Or for Nginx
sudo certbot --nginx -d webmail.example.com

# Certbot will:
# 1. Verify domain ownership via HTTP challenge
# 2. Obtain certificate from Let's Encrypt
# 3. Configure web server for HTTPS
# 4. Set up automatic renewal
```

### Manual SSL Configuration for Apache

If you have your own certificates:

```bash
# Create SSL virtual host
sudo nano /etc/apache2/sites-available/roundcube-ssl.conf
```

```apache
# HTTPS Virtual Host for Roundcube
<VirtualHost *:443>
    ServerName webmail.example.com
    ServerAdmin admin@example.com
    DocumentRoot /var/www/roundcube

    # SSL Engine
    SSLEngine on

    # Certificate files
    SSLCertificateFile /etc/ssl/certs/webmail.example.com.crt
    SSLCertificateKeyFile /etc/ssl/private/webmail.example.com.key
    SSLCertificateChainFile /etc/ssl/certs/ca-bundle.crt

    # Modern SSL configuration (TLS 1.2+ only)
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder off

    # HSTS header - force HTTPS for 1 year
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

    # Directory configuration (same as HTTP)
    <Directory /var/www/roundcube>
        AllowOverride All
        Require all granted
    </Directory>

    # Block sensitive directories
    <Directory /var/www/roundcube/config>
        Require all denied
    </Directory>
    <Directory /var/www/roundcube/temp>
        Require all denied
    </Directory>
    <Directory /var/www/roundcube/logs>
        Require all denied
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/roundcube_ssl_error.log
    CustomLog ${APACHE_LOG_DIR}/roundcube_ssl_access.log combined
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName webmail.example.com
    Redirect permanent / https://webmail.example.com/
</VirtualHost>
```

Enable the SSL site:

```bash
# Enable SSL module and site
sudo a2enmod ssl
sudo a2ensite roundcube-ssl.conf

# Disable the HTTP-only site
sudo a2dissite roundcube.conf

# Test and reload
sudo apache2ctl configtest
sudo systemctl reload apache2
```

### Verify Certificate Renewal

```bash
# Test automatic renewal (dry run)
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

## 9. Plugins Configuration

### Managesieve Plugin (Mail Filtering)

Managesieve allows users to create server-side email filters:

```bash
# Create plugin configuration
sudo nano /var/www/roundcube/plugins/managesieve/config.inc.php
```

```php
<?php
/*
 * Managesieve Plugin Configuration
 * Enables server-side mail filtering via Sieve scripts
 */

// Sieve server hostname
// Uses IMAP host if empty, or specify separate sieve server
$config['managesieve_host'] = 'localhost';

// Sieve port (default: 4190 for STARTTLS, 2000 for legacy)
$config['managesieve_port'] = 4190;

// Use TLS connection
$config['managesieve_usetls'] = true;

// Authentication type: 'PLAIN', 'CRAM-MD5', 'DIGEST-MD5'
$config['managesieve_auth_type'] = 'PLAIN';

// Use IMAP credentials for Sieve authentication
$config['managesieve_auth_cid'] = null;
$config['managesieve_auth_pw'] = null;

// Default sieve script name
$config['managesieve_script_name'] = 'roundcube';

// Enable vacation (out-of-office) responses
$config['managesieve_vacation'] = 1;

// Vacation message character limit
$config['managesieve_vacation_maxlength'] = 500;

// Forward addresses limit
$config['managesieve_forward'] = 1;

// Enable filter sets feature
$config['managesieve_filter_sets'] = true;

// Predefined headers for conditions
$config['managesieve_headers'] = [
    'Subject',
    'From',
    'To',
    'Cc',
    'Reply-To',
    'List-Id',
    'X-Spam-Flag',
];

// Available actions for rules
$config['managesieve_actions'] = [
    'fileinto',     // Move to folder
    'redirect',     // Forward to address
    'vacation',     // Auto-reply
    'reject',       // Bounce message
    'discard',      // Delete silently
    'keep',         // Keep in inbox
    'stop',         // Stop processing
];
```

### Calendar Plugin

Add calendar functionality with the calendar plugin:

```bash
# The calendar plugin is not included by default
# Download from GitHub
cd /var/www/roundcube/plugins
sudo git clone https://github.com/kolab-roundcube-plugins-mirror/calendar.git
sudo git clone https://github.com/kolab-roundcube-plugins-mirror/libcalendaring.git
sudo git clone https://github.com/kolab-roundcube-plugins-mirror/libkolab.git

# Set permissions
sudo chown -R www-data:www-data calendar libcalendaring libkolab
```

Create calendar configuration:

```bash
sudo nano /var/www/roundcube/plugins/calendar/config.inc.php
```

```php
<?php
/*
 * Calendar Plugin Configuration
 * Provides calendar functionality within Roundcube
 */

// Default calendar view: 'day', 'week', 'month', 'agenda'
$config['calendar_default_view'] = 'month';

// First day of week: 0 = Sunday, 1 = Monday
$config['calendar_first_day'] = 1;

// Working hours
$config['calendar_first_hour'] = 9;
$config['calendar_work_start'] = 9;
$config['calendar_work_end'] = 18;

// Event duration defaults (in minutes)
$config['calendar_default_alarm_type'] = 'DISPLAY';
$config['calendar_default_alarm_offset'] = '-15M';

// Calendar backends: 'database', 'caldav', 'ical'
$config['calendar_driver'] = 'database';

// CalDAV settings (if using external calendar server)
/*
$config['calendar_caldav_url'] = 'https://caldav.example.com/%u/calendar/';
$config['calendar_caldav_user'] = '%u';
$config['calendar_caldav_pass'] = '%p';
*/

// Enable birthday calendar from contacts
$config['calendar_birthday_adressbooks'] = ['0'];

// Date format for events
$config['calendar_date_format'] = 'Y-m-d';
$config['calendar_time_format'] = 'H:i';

// iCal feed token (enables external calendar subscriptions)
$config['calendar_itip_smtp_server'] = '';
```

### Password Plugin

Allow users to change their passwords:

```bash
sudo nano /var/www/roundcube/plugins/password/config.inc.php
```

```php
<?php
/*
 * Password Plugin Configuration
 * Allows users to change their mail password
 */

// Minimum password length
$config['password_minimum_length'] = 8;

// Require at least one number
$config['password_require_nonalpha'] = true;

// Password strength check (uses dictionary)
$config['password_check_strength'] = true;

// Confirm current password before changing
$config['password_confirm_current'] = true;

// Password driver - depends on your mail server setup
// Options: 'sql', 'ldap', 'dovecot', 'hmail', etc.
$config['password_driver'] = 'sql';

// SQL driver settings
$config['password_db_dsn'] = 'mysql://mailadmin:password@localhost/mailserver';

// SQL query to update password
// %p = new password (encrypted)
// %o = old password
// %u = username
// %l = local part of email
// %d = domain part of email
// %h = IMAP host
$config['password_query'] = "UPDATE mailbox SET password=%p WHERE username=%u";

// Password hashing algorithm
// Options: 'clear', 'crypt', 'md5', 'sha', 'sha256', 'sha512', 'blowfish'
$config['password_algorithm'] = 'sha512-crypt';

// Salt length for crypt algorithms
$config['password_crypt_hash_length'] = 16;

// For Dovecot integration
// $config['password_driver'] = 'dovecot';
// $config['password_dovecot_socket'] = '/var/run/dovecot/auth-master';
```

Enable plugins in main config:

```php
// Add to config.inc.php
$config['plugins'] = [
    'archive',
    'zipdownload',
    'managesieve',
    'password',
    'calendar',
    'markasjunk',
    'newmail_notifier',
    'attachment_reminder',
];
```

## 10. Themes and Customization

### Available Skins

Roundcube includes several built-in skins:

```php
// config.inc.php - set default skin
$config['skin'] = 'elastic';  // Modern responsive skin (default)
// $config['skin'] = 'larry';  // Classic skin

// Restrict available skins (empty = all available)
$config['skins_allowed'] = ['elastic', 'larry'];
```

### Custom Logo and Branding

Customize the appearance for your organization:

```bash
# Create custom skin based on elastic
cd /var/www/roundcube/skins
sudo cp -r elastic custom
sudo chown -R www-data:www-data custom
```

Edit the skin configuration:

```bash
sudo nano /var/www/roundcube/skins/custom/meta.json
```

```json
{
    "name": "Custom Theme",
    "author": "Your Organization",
    "license": "GPLv3",
    "extends": "elastic"
}
```

Add custom CSS:

```bash
sudo nano /var/www/roundcube/skins/custom/styles/custom.css
```

```css
/* Custom Theme Overrides */

/* Custom logo */
.logo {
    background-image: url('/path/to/your-logo.png') !important;
    background-size: contain;
    background-repeat: no-repeat;
}

/* Header color customization */
.header {
    background-color: #2c3e50 !important;
}

/* Primary button color */
.btn-primary {
    background-color: #3498db !important;
    border-color: #2980b9 !important;
}

/* Link colors */
a {
    color: #3498db;
}

a:hover {
    color: #2980b9;
}

/* Folder list highlighting */
.mailbox.selected {
    background-color: #ecf0f1 !important;
}
```

Update config to use custom skin:

```php
$config['skin'] = 'custom';
```

### Custom Login Page

Create a custom login page template:

```bash
# Override login template
sudo mkdir -p /var/www/roundcube/skins/custom/templates
sudo nano /var/www/roundcube/skins/custom/templates/login.html
```

## 11. Performance Optimization

### PHP-FPM Tuning

Optimize PHP-FPM for better performance:

```bash
sudo nano /etc/php/8.1/fpm/pool.d/www.conf
```

```ini
; PHP-FPM Pool Configuration for Roundcube

; Process manager - dynamic adjusts to load
pm = dynamic

; Maximum child processes (adjust based on RAM)
; Formula: (Total RAM - 2GB) / 50MB per process
pm.max_children = 50

; Start with this many processes
pm.start_servers = 10

; Minimum idle processes
pm.min_spare_servers = 5

; Maximum idle processes
pm.max_spare_servers = 20

; Process timeout (seconds)
pm.process_idle_timeout = 30s

; Requests before respawning (prevents memory leaks)
pm.max_requests = 500

; Enable slow log for debugging
slowlog = /var/log/php-fpm/roundcube-slow.log
request_slowlog_timeout = 5s
```

Tune PHP settings:

```bash
sudo nano /etc/php/8.1/fpm/conf.d/99-roundcube.ini
```

```ini
; PHP Optimization for Roundcube

; Memory limit per script (increase for large attachments)
memory_limit = 256M

; Maximum upload size (must be >= max_message_size in Roundcube)
upload_max_filesize = 25M
post_max_size = 30M

; Maximum execution time
max_execution_time = 120

; Session settings
session.gc_maxlifetime = 1800
session.cookie_httponly = 1
session.cookie_secure = 1
session.cookie_samesite = Strict

; OPcache settings (dramatically improves PHP performance)
opcache.enable = 1
opcache.memory_consumption = 128
opcache.max_accelerated_files = 10000
opcache.validate_timestamps = 0
opcache.revalidate_freq = 0
```

Restart PHP-FPM:

```bash
sudo systemctl restart php8.1-fpm
```

### MySQL Optimization

Tune MySQL for Roundcube workloads:

```bash
sudo nano /etc/mysql/mysql.conf.d/roundcube.cnf
```

```ini
[mysqld]
# InnoDB buffer pool - set to 70% of available RAM for dedicated server
innodb_buffer_pool_size = 1G

# InnoDB log file size - larger = better write performance
innodb_log_file_size = 256M

# Query cache (deprecated in MySQL 8, remove if using 8.x)
# query_cache_type = 1
# query_cache_size = 64M

# Connection limits
max_connections = 100

# Table cache
table_open_cache = 1000

# Thread pool
thread_cache_size = 50
```

Add database indexes for better query performance:

```sql
-- Run these on the roundcubemail database
-- Improves contact and message lookup speed

-- Index for faster message searches
ALTER TABLE cache_messages ADD INDEX idx_user_mailbox (user_id, mailbox);

-- Index for contact autocomplete
ALTER TABLE contacts ADD INDEX idx_user_email (user_id, email);

-- Index for session cleanup
ALTER TABLE session ADD INDEX idx_changed (changed);
```

### Caching Configuration

Enable Roundcube's caching features:

```php
// config.inc.php caching settings

// Message cache type: 'db', 'memcache', 'redis', or false
$config['messages_cache'] = 'db';

// Message cache expiration (in seconds)
$config['messages_cache_ttl'] = '7d';

// Enable IMAP connection caching
$config['imap_cache'] = 'db';

// Cache IMAP folder lists
$config['imap_cache_ttl'] = '1d';

// Use Redis for caching (recommended for production)
/*
$config['redis_hosts'] = ['localhost:6379'];
$config['messages_cache'] = 'redis';
$config['imap_cache'] = 'redis';
$config['session_storage'] = 'redis';
*/

// Use Memcached for caching
/*
$config['memcache_hosts'] = ['localhost:11211'];
$config['messages_cache'] = 'memcache';
$config['imap_cache'] = 'memcache';
*/
```

## 12. Security Hardening

### Secure File Permissions

Lock down Roundcube directories:

```bash
# Set ownership
sudo chown -R root:www-data /var/www/roundcube

# Default permissions - no world access
sudo find /var/www/roundcube -type d -exec chmod 750 {} \;
sudo find /var/www/roundcube -type f -exec chmod 640 {} \;

# Config directory - extra restrictive
sudo chmod 750 /var/www/roundcube/config
sudo chmod 640 /var/www/roundcube/config/config.inc.php

# Writable directories for www-data
sudo chmod 770 /var/www/roundcube/temp
sudo chmod 770 /var/www/roundcube/logs
sudo chown www-data:www-data /var/www/roundcube/temp
sudo chown www-data:www-data /var/www/roundcube/logs
```

### Security Headers

Add security headers in Apache:

```apache
# Add to virtual host configuration
<IfModule mod_headers.c>
    # Prevent clickjacking
    Header always set X-Frame-Options "SAMEORIGIN"

    # Prevent MIME type sniffing
    Header always set X-Content-Type-Options "nosniff"

    # XSS protection
    Header always set X-XSS-Protection "1; mode=block"

    # Content Security Policy
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; frame-ancestors 'self'"

    # Referrer Policy
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # Permissions Policy (formerly Feature Policy)
    Header always set Permissions-Policy "geolocation=(), camera=(), microphone=()"
</IfModule>
```

### Fail2Ban Integration

Protect against brute force attacks:

```bash
# Create Roundcube filter
sudo nano /etc/fail2ban/filter.d/roundcube.conf
```

```ini
# Fail2Ban filter for Roundcube authentication failures
[Definition]

# Match failed login attempts in Roundcube log
failregex = ^.*IMAP Error: Login failed for .* from <HOST>\..*$
            ^.*Auth failed for .* \(ID: .*\) from <HOST>.*$

# Ignore successful logins
ignoreregex =
```

Create the jail configuration:

```bash
sudo nano /etc/fail2ban/jail.d/roundcube.conf
```

```ini
[roundcube]
enabled = true
port = http,https
filter = roundcube
logpath = /var/www/roundcube/logs/errors.log
maxretry = 5
bantime = 3600
findtime = 600
```

Restart Fail2Ban:

```bash
sudo systemctl restart fail2ban

# Verify jail is active
sudo fail2ban-client status roundcube
```

### Additional Security Settings

Add to config.inc.php:

```php
// Security hardening options

// Force HTTPS
$config['use_https'] = true;

// Secure session cookie settings
$config['session_domain'] = '';
$config['session_path'] = '/';
$config['session_samesite'] = 'Strict';

// Session timeout (minutes)
$config['session_lifetime'] = 30;

// CSRF protection
$config['request_csrf_protection'] = true;

// IP checking for sessions (4 = full IP must match)
$config['ip_check'] = 4;

// Login rate limiting
$config['login_rate_limit'] = 5;

// Disable installer (CRITICAL - always disable in production)
$config['enable_installer'] = false;

// Hide server information
$config['smtp_helo_host'] = 'webmail.example.com';

// Disable auto-login feature
$config['auto_create_user'] = true;

// Log all login attempts
$config['log_logins'] = true;

// Prevent username enumeration
$config['login_username_filter'] = 'email';
```

## 13. Troubleshooting

### Common Issues and Solutions

**Issue: Cannot connect to IMAP server**

```bash
# Test IMAP connectivity from the server
telnet mail.example.com 993

# Check if SSL is required
openssl s_client -connect mail.example.com:993

# Verify in Roundcube logs
sudo tail -f /var/www/roundcube/logs/errors.log
```

Solution: Check IMAP host configuration in config.inc.php:

```php
// Try different connection formats
$config['imap_host'] = 'ssl://mail.example.com:993';    // Implicit SSL
$config['imap_host'] = 'tls://mail.example.com:143';    // STARTTLS
$config['imap_host'] = 'mail.example.com';               // Plain (insecure)
```

**Issue: SMTP sending fails**

```bash
# Test SMTP connectivity
openssl s_client -connect mail.example.com:587 -starttls smtp

# Check Roundcube SMTP debug log
# Enable in config: $config['smtp_debug'] = true;
sudo tail -f /var/www/roundcube/logs/smtp.log
```

Solution: Verify SMTP configuration:

```php
// Common SMTP configurations
$config['smtp_host'] = 'tls://mail.example.com:587';  // STARTTLS (recommended)
$config['smtp_host'] = 'ssl://mail.example.com:465';  // Implicit SSL
$config['smtp_user'] = '%u';  // Use login username
$config['smtp_pass'] = '%p';  // Use login password
```

**Issue: Session errors or random logouts**

```bash
# Check PHP session directory permissions
ls -la /var/lib/php/sessions/

# Check session configuration
php -i | grep session

# Monitor session files
watch -n 1 'ls -la /var/lib/php/sessions/ | wc -l'
```

Solution: Fix session settings:

```php
// In config.inc.php
$config['session_lifetime'] = 30;  // Increase if needed
$config['session_storage'] = 'db'; // Use database for sessions

// In PHP config
session.gc_maxlifetime = 1800
session.save_path = /var/lib/php/sessions
```

**Issue: "DB Error: Connection failed"**

```bash
# Test database connection manually
mysql -u roundcube -p -h localhost roundcubemail

# Check MySQL is running
sudo systemctl status mysql

# Verify database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'roundcubemail';"
```

Solution: Verify database DSN in config:

```php
// Check format carefully
$config['db_dsnw'] = 'mysql://roundcube:password@localhost/roundcubemail';

// For socket connection
$config['db_dsnw'] = 'mysql://roundcube:password@unix(/var/run/mysqld/mysqld.sock)/roundcubemail';
```

**Issue: Attachments fail to upload**

```bash
# Check PHP upload limits
php -i | grep -E "(upload_max_filesize|post_max_size|memory_limit)"

# Check web server client body size (Nginx)
grep client_max_body_size /etc/nginx/nginx.conf
```

Solution: Increase limits:

```bash
# PHP settings
sudo nano /etc/php/8.1/fpm/php.ini
upload_max_filesize = 25M
post_max_size = 30M
memory_limit = 256M

# Nginx settings
sudo nano /etc/nginx/nginx.conf
client_max_body_size 30M;

# Roundcube setting
$config['max_message_size'] = '25M';
```

**Issue: Slow performance**

```bash
# Check PHP OPcache status
php -i | grep opcache

# Monitor MySQL slow queries
sudo tail -f /var/log/mysql/mysql-slow.log

# Check PHP-FPM status
curl http://localhost/status
```

Solution: Enable caching and optimize:

```php
// Enable message caching
$config['messages_cache'] = 'db';
$config['imap_cache'] = 'db';

// Reduce refresh interval
$config['refresh_interval'] = 120;
```

### Log File Locations

```bash
# Roundcube logs
/var/www/roundcube/logs/errors.log     # General errors
/var/www/roundcube/logs/imap.log       # IMAP debug (if enabled)
/var/www/roundcube/logs/smtp.log       # SMTP debug (if enabled)
/var/www/roundcube/logs/sql.log        # Database queries (if enabled)

# Web server logs
/var/log/apache2/roundcube_error.log   # Apache errors
/var/log/apache2/roundcube_access.log  # Apache access
/var/log/nginx/error.log               # Nginx errors

# PHP logs
/var/log/php8.1-fpm.log                # PHP-FPM errors

# System logs
/var/log/syslog                        # General system messages
/var/log/auth.log                      # Authentication events
```

### Enable Debug Mode

For troubleshooting, temporarily enable debug logging:

```php
// Add to config.inc.php (REMOVE in production!)
$config['debug_level'] = 1;
$config['imap_debug'] = true;
$config['smtp_debug'] = true;
$config['sql_debug'] = true;
$config['log_session'] = true;
```

### Database Maintenance

Keep the database healthy:

```bash
# Clean up old sessions (run as cron job)
mysql -u roundcube -p roundcubemail -e "DELETE FROM session WHERE changed < DATE_SUB(NOW(), INTERVAL 7 DAY);"

# Clean up cache (run weekly)
mysql -u roundcube -p roundcubemail -e "DELETE FROM cache WHERE expires < NOW();"
mysql -u roundcube -p roundcubemail -e "DELETE FROM cache_messages WHERE expires < NOW();"
mysql -u roundcube -p roundcubemail -e "DELETE FROM cache_index WHERE expires < NOW();"

# Optimize tables (run monthly)
mysql -u roundcube -p roundcubemail -e "OPTIMIZE TABLE session, cache, cache_messages, cache_index, contacts, contactgroups, identities;"
```

Add to crontab:

```bash
# Edit root crontab
sudo crontab -e

# Add maintenance jobs
# Clean sessions daily at 3 AM
0 3 * * * mysql -u roundcube -p'password' roundcubemail -e "DELETE FROM session WHERE changed < DATE_SUB(NOW(), INTERVAL 7 DAY);"

# Clean cache weekly on Sunday at 4 AM
0 4 * * 0 mysql -u roundcube -p'password' roundcubemail -e "DELETE FROM cache WHERE expires < NOW(); DELETE FROM cache_messages WHERE expires < NOW();"
```

---

Setting up Roundcube provides your users with a professional, feature-rich webmail experience. The combination of IMAP flexibility, plugin extensibility, and modern interface makes it an excellent choice for organizations of any size.

Remember to keep Roundcube updated for security patches, monitor your logs for issues, and regularly backup the database. With proper configuration and maintenance, Roundcube delivers reliable webmail access for years.

For comprehensive monitoring of your Roundcube installation and mail infrastructure, consider using [OneUptime](https://oneuptime.com). OneUptime can monitor your webmail server's availability, track IMAP/SMTP service health, alert you to SSL certificate expiration, and provide insights into performance metrics. With OneUptime's alerting capabilities, you will be notified immediately if your mail services experience issues, ensuring your users always have access to their email.
