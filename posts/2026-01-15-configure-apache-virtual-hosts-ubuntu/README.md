# How to Configure Apache Virtual Hosts on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Apache, Virtual Hosts, Web Server, Tutorial

Description: Complete guide to configuring Apache virtual hosts on Ubuntu for hosting multiple websites on a single server.

---

Apache Virtual Hosts allow you to run multiple websites on a single server. This is an essential skill for any system administrator or developer who needs to host multiple domains, subdomains, or web applications on a single Ubuntu server. In this comprehensive guide, we will walk through everything you need to know about configuring Apache virtual hosts.

## Table of Contents

1. [Understanding Virtual Hosts](#understanding-virtual-hosts)
2. [Prerequisites](#prerequisites)
3. [Name-Based vs IP-Based Virtual Hosts](#name-based-vs-ip-based-virtual-hosts)
4. [Directory Structure Setup](#directory-structure-setup)
5. [Creating Virtual Host Configuration Files](#creating-virtual-host-configuration-files)
6. [Enabling and Disabling Sites](#enabling-and-disabling-sites)
7. [ServerName and ServerAlias Directives](#servername-and-serveralias-directives)
8. [Document Root and Directory Permissions](#document-root-and-directory-permissions)
9. [SSL Virtual Hosts Configuration](#ssl-virtual-hosts-configuration)
10. [Wildcard and Default Virtual Hosts](#wildcard-and-default-virtual-hosts)
11. [.htaccess and AllowOverride Settings](#htaccess-and-allowoverride-settings)
12. [Logging Per Virtual Host](#logging-per-virtual-host)
13. [Testing and Troubleshooting](#testing-and-troubleshooting)
14. [Complete Configuration Examples](#complete-configuration-examples)
15. [Conclusion](#conclusion)

## Understanding Virtual Hosts

Virtual hosts enable Apache to serve different content based on the requested hostname or IP address. This means you can host `example.com`, `blog.example.com`, and `shop.example.com` all on the same server with different content for each.

Apache processes incoming requests and matches them against configured virtual hosts to determine which website content to serve. This matching can be based on:

- The hostname in the HTTP Host header (name-based)
- The IP address the request was received on (IP-based)
- A combination of both

## Prerequisites

Before configuring virtual hosts, ensure you have:

```bash
# Update your system packages
sudo apt update && sudo apt upgrade -y

# Install Apache if not already installed
sudo apt install apache2 -y

# Verify Apache is running
sudo systemctl status apache2

# Enable Apache to start on boot
sudo systemctl enable apache2
```

You should also have:

- Root or sudo access to your Ubuntu server
- Domain names pointed to your server's IP address (for production)
- Basic understanding of Linux command line

## Name-Based vs IP-Based Virtual Hosts

### Name-Based Virtual Hosts

Name-based virtual hosting is the most common and recommended approach. Multiple domains share the same IP address, and Apache uses the `Host` header from the HTTP request to determine which site to serve.

**Advantages:**
- Conserves IP addresses
- Easier to configure and manage
- Most cost-effective solution
- Works well for most use cases

**Example scenario:**
```
IP: 192.168.1.100
  - example.com
  - blog.example.com
  - shop.example.com
```

### IP-Based Virtual Hosts

IP-based virtual hosting assigns a unique IP address to each website. Apache determines which site to serve based on the destination IP address of the request.

**Advantages:**
- Required for certain SSL configurations (legacy)
- Can be useful for specific security requirements
- Works with protocols that do not support host headers

**Example scenario:**
```
IP: 192.168.1.100 -> example.com
IP: 192.168.1.101 -> blog.example.com
IP: 192.168.1.102 -> shop.example.com
```

**When to use IP-based:**
- Legacy SSL requirements (before SNI support)
- Specific compliance requirements
- When serving non-HTTP protocols

For most modern deployments, name-based virtual hosts are the preferred choice.

## Directory Structure Setup

A well-organized directory structure is crucial for managing multiple websites. Here is the recommended setup:

```bash
# Create the base directory structure for your websites
sudo mkdir -p /var/www/example.com/public_html
sudo mkdir -p /var/www/example.com/logs
sudo mkdir -p /var/www/blog.example.com/public_html
sudo mkdir -p /var/www/blog.example.com/logs

# Set ownership to the web server user
sudo chown -R www-data:www-data /var/www/example.com
sudo chown -R www-data:www-data /var/www/blog.example.com

# Set appropriate permissions
# Directories: 755 (rwxr-xr-x)
# Files: 644 (rw-r--r--)
sudo find /var/www/example.com -type d -exec chmod 755 {} \;
sudo find /var/www/example.com -type f -exec chmod 644 {} \;

# Create a test index.html for each site
echo "<html><head><title>Welcome to Example.com</title></head><body><h1>Example.com is working!</h1></body></html>" | sudo tee /var/www/example.com/public_html/index.html

echo "<html><head><title>Welcome to Blog</title></head><body><h1>Blog.example.com is working!</h1></body></html>" | sudo tee /var/www/blog.example.com/public_html/index.html
```

**Recommended directory structure:**

```
/var/www/
├── example.com/
│   ├── public_html/      # Document root (web files)
│   │   ├── index.html
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   ├── logs/             # Site-specific logs
│   │   ├── access.log
│   │   └── error.log
│   └── backups/          # Optional: site backups
├── blog.example.com/
│   ├── public_html/
│   ├── logs/
│   └── backups/
└── html/                 # Default Apache directory
    └── index.html
```

## Creating Virtual Host Configuration Files

Virtual host configuration files are stored in `/etc/apache2/sites-available/`. Each website should have its own configuration file.

### Basic Virtual Host Configuration

Create a configuration file for your first site:

```bash
sudo nano /etc/apache2/sites-available/example.com.conf
```

Add the following content:

```apache
# Virtual Host configuration for example.com
# This configuration serves the main website

<VirtualHost *:80>
    # Primary domain name for this virtual host
    ServerName example.com

    # Additional domain names that should serve the same content
    ServerAlias www.example.com

    # Administrator email for error pages
    ServerAdmin webmaster@example.com

    # Document root - where your website files are located
    DocumentRoot /var/www/example.com/public_html

    # Directory-specific settings
    <Directory /var/www/example.com/public_html>
        # Allow .htaccess files to override settings
        AllowOverride All

        # Grant access to this directory
        Require all granted

        # Enable directory indexes (optional - disable for security)
        Options -Indexes +FollowSymLinks
    </Directory>

    # Custom log file locations for this virtual host
    ErrorLog /var/www/example.com/logs/error.log
    CustomLog /var/www/example.com/logs/access.log combined

    # Log level (options: emerg, alert, crit, error, warn, notice, info, debug)
    LogLevel warn
</VirtualHost>
```

### Creating Multiple Virtual Host Files

For a subdomain or second website:

```bash
sudo nano /etc/apache2/sites-available/blog.example.com.conf
```

```apache
# Virtual Host configuration for blog.example.com
# This configuration serves the blog subdomain

<VirtualHost *:80>
    ServerName blog.example.com
    ServerAlias www.blog.example.com
    ServerAdmin webmaster@example.com
    DocumentRoot /var/www/blog.example.com/public_html

    <Directory /var/www/blog.example.com/public_html>
        AllowOverride All
        Require all granted
        Options -Indexes +FollowSymLinks
    </Directory>

    ErrorLog /var/www/blog.example.com/logs/error.log
    CustomLog /var/www/blog.example.com/logs/access.log combined
    LogLevel warn
</VirtualHost>
```

## Enabling and Disabling Sites

Ubuntu uses `a2ensite` and `a2dissite` commands to manage virtual hosts. These commands create or remove symbolic links in `/etc/apache2/sites-enabled/`.

### Enabling a Site

```bash
# Enable the example.com virtual host
sudo a2ensite example.com.conf

# Enable the blog subdomain
sudo a2ensite blog.example.com.conf

# Reload Apache to apply changes
sudo systemctl reload apache2
```

### Disabling a Site

```bash
# Disable the default Apache site (optional)
sudo a2dissite 000-default.conf

# Disable a specific site
sudo a2dissite example.com.conf

# Reload Apache to apply changes
sudo systemctl reload apache2
```

### Managing Sites Manually

You can also manage sites by creating/removing symbolic links directly:

```bash
# Enable a site manually
sudo ln -s /etc/apache2/sites-available/example.com.conf /etc/apache2/sites-enabled/

# Disable a site manually
sudo rm /etc/apache2/sites-enabled/example.com.conf
```

### Listing Enabled Sites

```bash
# List all available sites
ls -la /etc/apache2/sites-available/

# List all enabled sites
ls -la /etc/apache2/sites-enabled/

# Check which sites are currently active
apache2ctl -S
```

## ServerName and ServerAlias Directives

The `ServerName` and `ServerAlias` directives control how Apache matches incoming requests to virtual hosts.

### ServerName

The `ServerName` directive specifies the primary hostname for the virtual host:

```apache
# Primary domain for this virtual host
ServerName example.com
```

**Important considerations:**
- Should be a fully qualified domain name (FQDN)
- Only one `ServerName` per virtual host
- Apache uses this for self-referential URLs

### ServerAlias

The `ServerAlias` directive specifies additional hostnames that should be handled by this virtual host:

```apache
# Primary domain
ServerName example.com

# Additional domains/subdomains that serve the same content
ServerAlias www.example.com
ServerAlias example.net
ServerAlias www.example.net
```

Or combine multiple aliases on one line:

```apache
ServerAlias www.example.com example.net www.example.net *.example.org
```

### Wildcard ServerAlias

You can use wildcards to match multiple subdomains:

```apache
# Match all subdomains of example.com
ServerAlias *.example.com
```

### Setting Global ServerName

To avoid the "Could not reliably determine the server's fully qualified domain name" warning:

```bash
# Edit the main Apache configuration
sudo nano /etc/apache2/apache2.conf

# Add at the end of the file:
ServerName localhost
```

Or create a dedicated configuration file:

```bash
echo "ServerName localhost" | sudo tee /etc/apache2/conf-available/servername.conf
sudo a2enconf servername
sudo systemctl reload apache2
```

## Document Root and Directory Permissions

Proper permissions are essential for security and functionality.

### Setting Up Document Root

```apache
# Define where website files are located
DocumentRoot /var/www/example.com/public_html

# Configure directory access
<Directory /var/www/example.com/public_html>
    # Allow .htaccess to override server settings
    AllowOverride All

    # Allow access from all IP addresses
    Require all granted

    # Directory options
    # -Indexes: Prevent directory listing
    # +FollowSymLinks: Allow symbolic links
    # -ExecCGI: Disable CGI execution (enable if needed)
    Options -Indexes +FollowSymLinks -ExecCGI
</Directory>
```

### Permission Commands

```bash
# Set ownership to web server user
sudo chown -R www-data:www-data /var/www/example.com/public_html

# Allow your user to manage files (add to www-data group)
sudo usermod -aG www-data $USER

# Set directory permissions (755 = rwxr-xr-x)
sudo find /var/www/example.com/public_html -type d -exec chmod 755 {} \;

# Set file permissions (644 = rw-r--r--)
sudo find /var/www/example.com/public_html -type f -exec chmod 644 {} \;

# For directories that need write access (uploads, cache)
sudo chmod 775 /var/www/example.com/public_html/uploads
```

### Security Best Practices

```apache
# Restrict access to sensitive files
<Directory /var/www/example.com/public_html>
    # Deny access to hidden files (like .htaccess, .git)
    <FilesMatch "^\.">
        Require all denied
    </FilesMatch>
</Directory>

# Deny access to configuration files
<FilesMatch "\.(ini|log|conf|env)$">
    Require all denied
</FilesMatch>
```

## SSL Virtual Hosts Configuration

Securing your virtual hosts with SSL/TLS is essential for modern websites. We will use Let's Encrypt with Certbot for free SSL certificates.

### Installing Certbot

```bash
# Install Certbot and the Apache plugin
sudo apt install certbot python3-certbot-apache -y
```

### Obtaining SSL Certificates

```bash
# Obtain certificate for a single domain
sudo certbot --apache -d example.com -d www.example.com

# Obtain certificate for multiple domains
sudo certbot --apache -d example.com -d www.example.com -d blog.example.com

# Obtain certificate without modifying Apache config (certificate only)
sudo certbot certonly --apache -d example.com
```

### Manual SSL Virtual Host Configuration

If you prefer manual configuration or have existing certificates:

```bash
# Enable SSL module
sudo a2enmod ssl

# Enable headers module (for security headers)
sudo a2enmod headers

# Create SSL virtual host configuration
sudo nano /etc/apache2/sites-available/example.com-ssl.conf
```

```apache
# SSL Virtual Host configuration for example.com
# Serves HTTPS traffic on port 443

<VirtualHost *:443>
    ServerName example.com
    ServerAlias www.example.com
    ServerAdmin webmaster@example.com
    DocumentRoot /var/www/example.com/public_html

    # Directory configuration
    <Directory /var/www/example.com/public_html>
        AllowOverride All
        Require all granted
        Options -Indexes +FollowSymLinks
    </Directory>

    # SSL Engine configuration
    SSLEngine on

    # Path to SSL certificate files (Let's Encrypt locations)
    SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    # For certificates with separate chain file
    # SSLCertificateChainFile /etc/ssl/certs/chain.pem

    # SSL Protocol configuration (disable older, insecure protocols)
    SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1

    # Strong cipher suite
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384

    # Prefer server cipher order
    SSLHonorCipherOrder on

    # Security headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"

    # Logging
    ErrorLog /var/www/example.com/logs/ssl-error.log
    CustomLog /var/www/example.com/logs/ssl-access.log combined
    LogLevel warn
</VirtualHost>
```

### HTTP to HTTPS Redirect

Update your HTTP virtual host to redirect all traffic to HTTPS:

```apache
# HTTP Virtual Host - Redirects all traffic to HTTPS
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com

    # Redirect all HTTP requests to HTTPS
    # 301 = Permanent redirect (cached by browsers)
    Redirect permanent / https://example.com/

    # Alternative: Use RewriteEngine for more control
    # RewriteEngine On
    # RewriteCond %{HTTPS} off
    # RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>
```

### Auto-Renewal for Let's Encrypt

```bash
# Test automatic renewal
sudo certbot renew --dry-run

# Certbot automatically creates a systemd timer
# Check timer status
sudo systemctl status certbot.timer

# View renewal schedule
sudo systemctl list-timers | grep certbot
```

## Wildcard and Default Virtual Hosts

### Default Virtual Host

The default virtual host handles requests that do not match any other configured virtual host. This is important for security and catching misconfigured DNS.

```bash
sudo nano /etc/apache2/sites-available/000-default.conf
```

```apache
# Default Virtual Host
# Catches requests that don't match any other virtual host
# This should be the first virtual host loaded (hence 000- prefix)

<VirtualHost _default_:80>
    ServerName default.localhost
    ServerAdmin webmaster@localhost

    # Serve a generic page or redirect
    DocumentRoot /var/www/html

    <Directory /var/www/html>
        AllowOverride None
        Require all granted
    </Directory>

    # Option 1: Show a default page
    # Create /var/www/html/index.html with appropriate content

    # Option 2: Return 404 for unmatched hosts
    # Redirect permanent / http://www.yourmainsite.com/

    # Option 3: Return 403 Forbidden
    # <Location />
    #     Require all denied
    # </Location>

    ErrorLog ${APACHE_LOG_DIR}/default-error.log
    CustomLog ${APACHE_LOG_DIR}/default-access.log combined
</VirtualHost>
```

### Wildcard Virtual Host

Wildcard virtual hosts match multiple subdomains with a single configuration:

```apache
# Wildcard Virtual Host for all subdomains
# Matches *.example.com (any.example.com, test.example.com, etc.)

<VirtualHost *:80>
    ServerName example.com
    # Wildcard to match all subdomains
    ServerAlias *.example.com

    ServerAdmin webmaster@example.com

    # Option 1: Serve same content for all subdomains
    DocumentRoot /var/www/example.com/public_html

    # Option 2: Dynamic document root based on subdomain
    # Requires mod_vhost_alias
    # VirtualDocumentRoot /var/www/subdomains/%1/public_html

    <Directory /var/www/example.com/public_html>
        AllowOverride All
        Require all granted
        Options -Indexes +FollowSymLinks
    </Directory>

    ErrorLog /var/www/example.com/logs/wildcard-error.log
    CustomLog /var/www/example.com/logs/wildcard-access.log combined
</VirtualHost>
```

### Dynamic Virtual Hosts with mod_vhost_alias

For hosting many subdomains dynamically:

```bash
# Enable the vhost_alias module
sudo a2enmod vhost_alias
sudo systemctl restart apache2
```

```apache
# Dynamic Virtual Host configuration
# Automatically maps subdomains to directories

<VirtualHost *:80>
    ServerName example.com
    ServerAlias *.example.com

    # %1 = first part of hostname (subdomain)
    # blog.example.com -> /var/www/subdomains/blog/public_html
    VirtualDocumentRoot /var/www/subdomains/%1/public_html

    <Directory /var/www/subdomains/*/public_html>
        AllowOverride All
        Require all granted
        Options -Indexes +FollowSymLinks
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/subdomains-error.log
    CustomLog ${APACHE_LOG_DIR}/subdomains-access.log combined
</VirtualHost>
```

## .htaccess and AllowOverride Settings

The `.htaccess` file allows per-directory configuration without modifying the main configuration files.

### AllowOverride Directive

The `AllowOverride` directive controls what settings can be overridden in `.htaccess` files:

```apache
<Directory /var/www/example.com/public_html>
    # AllowOverride options:
    # None     - .htaccess files are ignored
    # All      - All directives can be overridden
    # AuthConfig - Allow authentication directives
    # FileInfo   - Allow document type directives
    # Indexes    - Allow directory indexing directives
    # Limit      - Allow access control directives
    # Options    - Allow Options directive

    # For most CMS (WordPress, Drupal, etc.), use All
    AllowOverride All

    # For static sites, None is more secure and faster
    # AllowOverride None
</Directory>
```

### Common .htaccess Examples

**Enable URL Rewriting (required for most CMS):**

```apache
# /var/www/example.com/public_html/.htaccess

# Enable the rewrite engine
RewriteEngine On

# WordPress-style permalinks
RewriteBase /
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
```

**Security Settings:**

```apache
# Deny access to sensitive files
<FilesMatch "^\.">
    Order allow,deny
    Deny from all
</FilesMatch>

# Protect wp-config.php (WordPress)
<Files wp-config.php>
    Order allow,deny
    Deny from all
</Files>

# Disable directory listing
Options -Indexes

# Disable server signature
ServerSignature Off
```

**Caching Headers:**

```apache
# Enable browser caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

**Custom Error Pages:**

```apache
# Custom error documents
ErrorDocument 400 /errors/400.html
ErrorDocument 401 /errors/401.html
ErrorDocument 403 /errors/403.html
ErrorDocument 404 /errors/404.html
ErrorDocument 500 /errors/500.html
```

### Enable Required Modules

```bash
# Enable mod_rewrite for URL rewriting
sudo a2enmod rewrite

# Enable mod_expires for caching
sudo a2enmod expires

# Enable mod_headers for custom headers
sudo a2enmod headers

# Restart Apache
sudo systemctl restart apache2
```

## Logging Per Virtual Host

Individual logs for each virtual host help with debugging and traffic analysis.

### Log Configuration

```apache
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/example.com/public_html

    # Error log - records server errors and warnings
    # Possible values: emerg, alert, crit, error, warn, notice, info, debug
    ErrorLog /var/www/example.com/logs/error.log
    LogLevel warn

    # Access log - records all requests
    # 'combined' format includes referrer and user-agent
    CustomLog /var/www/example.com/logs/access.log combined

    # Alternative log formats:
    # common   - Basic log format
    # combined - Includes referrer and user-agent
    # vhost_combined - Includes virtual host name

    # Custom log format example
    # LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\" %D" custom
    # CustomLog /var/www/example.com/logs/access.log custom
</VirtualHost>
```

### Log Format Reference

```apache
# Common log format variables:
# %h - Remote hostname/IP
# %l - Remote logname (usually -)
# %u - Remote user (from auth)
# %t - Time of request
# %r - First line of request
# %>s - Final status code
# %b - Response size in bytes
# %{Referer}i - Referrer header
# %{User-Agent}i - User agent string
# %D - Time to serve request (microseconds)
# %T - Time to serve request (seconds)

# Define custom format in apache2.conf or httpd.conf
LogFormat "%h %l %u %t \"%r\" %>s %b" common
LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined
LogFormat "%v:%p %h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" vhost_combined
```

### Log Rotation

Ubuntu uses `logrotate` to manage log files. Create a custom rotation config:

```bash
sudo nano /etc/logrotate.d/apache2-vhosts
```

```
/var/www/*/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/apache2/apache2.pid ]; then
            systemctl reload apache2 > /dev/null
        fi
    endscript
}
```

### Conditional Logging

```apache
# Don't log requests from monitoring tools
SetEnvIf User-Agent "^UptimeRobot" dontlog
SetEnvIf User-Agent "^OneUptime" dontlog
SetEnvIf Remote_Addr "127\.0\.0\.1" dontlog

CustomLog /var/www/example.com/logs/access.log combined env=!dontlog
```

## Testing and Troubleshooting

### Testing Configuration

```bash
# Test Apache configuration syntax
sudo apache2ctl configtest

# Alternative syntax check
sudo apachectl -t

# Check which virtual hosts are configured
sudo apache2ctl -S

# Display all loaded modules
sudo apache2ctl -M

# Display Apache version and compile settings
apache2 -V
```

### Testing Virtual Hosts Locally

Before DNS propagation, test using the hosts file:

```bash
# Edit hosts file
sudo nano /etc/hosts

# Add entries for testing
127.0.0.1 example.com www.example.com
127.0.0.1 blog.example.com
```

Or use curl with host header:

```bash
# Test specific virtual host
curl -H "Host: example.com" http://localhost/
curl -H "Host: blog.example.com" http://localhost/

# Test with verbose output
curl -v -H "Host: example.com" http://localhost/
```

### Common Issues and Solutions

**Issue: "Could not reliably determine the server's fully qualified domain name"**

```bash
# Solution: Set global ServerName
echo "ServerName localhost" | sudo tee /etc/apache2/conf-available/servername.conf
sudo a2enconf servername
sudo systemctl reload apache2
```

**Issue: Forbidden - "You don't have permission to access"**

```bash
# Check directory permissions
ls -la /var/www/example.com/

# Fix ownership
sudo chown -R www-data:www-data /var/www/example.com/public_html

# Fix permissions
sudo chmod 755 /var/www/example.com/public_html
sudo chmod 644 /var/www/example.com/public_html/*
```

**Issue: .htaccess not working**

```bash
# Ensure mod_rewrite is enabled
sudo a2enmod rewrite
sudo systemctl restart apache2

# Check AllowOverride in virtual host config
# Must be 'All' or 'FileInfo' for .htaccess to work
```

**Issue: SSL certificate errors**

```bash
# Check certificate validity
sudo openssl x509 -in /etc/letsencrypt/live/example.com/cert.pem -text -noout

# Verify certificate chain
openssl s_client -connect example.com:443 -servername example.com

# Renew certificate if expired
sudo certbot renew
```

### Useful Debugging Commands

```bash
# View Apache error log
sudo tail -f /var/log/apache2/error.log

# View site-specific error log
sudo tail -f /var/www/example.com/logs/error.log

# Check if Apache is listening on correct ports
sudo netstat -tlnp | grep apache2
sudo ss -tlnp | grep apache2

# Check Apache process status
ps aux | grep apache2

# Restart Apache with verbose error output
sudo apache2ctl -e debug -k restart
```

## Complete Configuration Examples

### Example 1: Full Production Setup

```apache
# /etc/apache2/sites-available/example.com.conf
# Production configuration for example.com

# HTTP - Redirect to HTTPS
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com

    # Redirect all traffic to HTTPS
    Redirect permanent / https://example.com/
</VirtualHost>

# HTTPS - Main configuration
<VirtualHost *:443>
    # =====================================
    # Server Identification
    # =====================================
    ServerName example.com
    ServerAlias www.example.com
    ServerAdmin admin@example.com

    # =====================================
    # Document Root Configuration
    # =====================================
    DocumentRoot /var/www/example.com/public_html

    <Directory /var/www/example.com/public_html>
        # Allow .htaccess overrides
        AllowOverride All

        # Grant access
        Require all granted

        # Security options
        Options -Indexes +FollowSymLinks -ExecCGI

        # Deny access to hidden files
        <FilesMatch "^\.">
            Require all denied
        </FilesMatch>
    </Directory>

    # =====================================
    # SSL Configuration
    # =====================================
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    # Modern SSL configuration
    SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder on
    SSLCompression off
    SSLSessionTickets off

    # =====================================
    # Security Headers
    # =====================================
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"

    # =====================================
    # Performance Configuration
    # =====================================
    # Enable compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css
        AddOutputFilterByType DEFLATE application/javascript application/json
    </IfModule>

    # Browser caching
    <IfModule mod_expires.c>
        ExpiresActive On
        ExpiresByType image/jpg "access plus 1 year"
        ExpiresByType image/jpeg "access plus 1 year"
        ExpiresByType image/png "access plus 1 year"
        ExpiresByType image/gif "access plus 1 year"
        ExpiresByType image/webp "access plus 1 year"
        ExpiresByType image/svg+xml "access plus 1 year"
        ExpiresByType text/css "access plus 1 month"
        ExpiresByType application/javascript "access plus 1 month"
        ExpiresByType font/woff2 "access plus 1 year"
    </IfModule>

    # =====================================
    # Logging Configuration
    # =====================================
    ErrorLog /var/www/example.com/logs/error.log
    CustomLog /var/www/example.com/logs/access.log combined
    LogLevel warn

    # Don't log health checks from monitoring
    SetEnvIf User-Agent "^OneUptime" dontlog
    SetEnvIf User-Agent "^UptimeRobot" dontlog
    SetEnvIf Request_URI "^/health" dontlog
    CustomLog /var/www/example.com/logs/access.log combined env=!dontlog
</VirtualHost>
```

### Example 2: WordPress Configuration

```apache
# /etc/apache2/sites-available/wordpress.example.com.conf
# Optimized configuration for WordPress sites

<VirtualHost *:80>
    ServerName wordpress.example.com
    Redirect permanent / https://wordpress.example.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName wordpress.example.com
    ServerAdmin admin@example.com
    DocumentRoot /var/www/wordpress.example.com/public_html

    # WordPress directory configuration
    <Directory /var/www/wordpress.example.com/public_html>
        AllowOverride All
        Require all granted
        Options -Indexes +FollowSymLinks

        # Protect wp-config.php
        <Files wp-config.php>
            Require all denied
        </Files>

        # Protect .htaccess
        <Files .htaccess>
            Require all denied
        </Files>

        # Block PHP execution in uploads directory
        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteRule ^wp-content/uploads/.*\.php$ - [F]
        </IfModule>
    </Directory>

    # Block access to sensitive WordPress files
    <FilesMatch "^(xmlrpc\.php|wp-trackback\.php)$">
        Require all denied
    </FilesMatch>

    # Protect wp-includes
    <Directory /var/www/wordpress.example.com/public_html/wp-includes>
        <Files *.php>
            Require all denied
        </Files>
    </Directory>

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/wordpress.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/wordpress.example.com/privkey.pem
    SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1

    # Security headers
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"

    # Logging
    ErrorLog /var/www/wordpress.example.com/logs/error.log
    CustomLog /var/www/wordpress.example.com/logs/access.log combined
</VirtualHost>
```

### Example 3: Multi-Site Configuration

```apache
# /etc/apache2/sites-available/multisite.conf
# Configuration for hosting multiple sites with shared resources

# Main site
<VirtualHost *:80>
    ServerName main.example.com
    DocumentRoot /var/www/sites/main/public_html

    <Directory /var/www/sites/main/public_html>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog /var/www/sites/main/logs/error.log
    CustomLog /var/www/sites/main/logs/access.log combined
</VirtualHost>

# Development site
<VirtualHost *:80>
    ServerName dev.example.com
    DocumentRoot /var/www/sites/dev/public_html

    # Restrict access to development site
    <Directory /var/www/sites/dev/public_html>
        AllowOverride All
        # Only allow access from specific IPs
        Require ip 192.168.1.0/24
        Require ip 10.0.0.0/8
    </Directory>

    # Enable directory listing for dev
    <Directory /var/www/sites/dev/public_html>
        Options +Indexes
    </Directory>

    ErrorLog /var/www/sites/dev/logs/error.log
    CustomLog /var/www/sites/dev/logs/access.log combined
</VirtualHost>

# Staging site
<VirtualHost *:80>
    ServerName staging.example.com
    DocumentRoot /var/www/sites/staging/public_html

    <Directory /var/www/sites/staging/public_html>
        AllowOverride All
        # Password protection for staging
        AuthType Basic
        AuthName "Staging Server"
        AuthUserFile /etc/apache2/.htpasswd
        Require valid-user
    </Directory>

    ErrorLog /var/www/sites/staging/logs/error.log
    CustomLog /var/www/sites/staging/logs/access.log combined
</VirtualHost>
```

### Quick Reference: Essential Commands

```bash
# Enable/disable sites
sudo a2ensite example.com.conf
sudo a2dissite example.com.conf

# Enable/disable modules
sudo a2enmod rewrite ssl headers expires deflate
sudo a2dismod autoindex

# Test configuration
sudo apache2ctl configtest
sudo apache2ctl -S

# Restart/reload Apache
sudo systemctl restart apache2
sudo systemctl reload apache2

# View logs
sudo tail -f /var/log/apache2/error.log
sudo tail -f /var/www/example.com/logs/access.log

# SSL certificate management
sudo certbot --apache -d example.com
sudo certbot renew --dry-run
```

## Conclusion

Configuring Apache virtual hosts on Ubuntu is a fundamental skill for hosting multiple websites on a single server. In this guide, we covered:

- The difference between name-based and IP-based virtual hosts
- Setting up proper directory structures
- Creating and managing virtual host configuration files
- SSL/TLS configuration with Let's Encrypt
- Wildcard and default virtual host setups
- .htaccess configuration and security settings
- Per-site logging and log rotation
- Troubleshooting common issues

By following these best practices, you can efficiently host multiple secure websites on your Ubuntu server while maintaining proper organization and security.

Remember to regularly update your server, monitor your logs for issues, and keep your SSL certificates current. Proper virtual host configuration is the foundation of a reliable web hosting setup.

---

## Monitor Your Apache Virtual Hosts with OneUptime

After setting up your Apache virtual hosts, it is crucial to monitor their availability and performance. [OneUptime](https://oneuptime.com) is a comprehensive observability platform that helps you:

- **Monitor Uptime**: Get instant alerts when any of your virtual hosts go down
- **Track Performance**: Monitor response times and identify slow-loading sites
- **SSL Certificate Monitoring**: Receive alerts before your SSL certificates expire
- **Custom Status Pages**: Create branded status pages for each of your hosted websites
- **Incident Management**: Coordinate incident response when issues arise
- **Log Management**: Centralize and analyze logs from all your virtual hosts

With OneUptime, you can ensure your Apache virtual hosts remain available and performant, giving you peace of mind and keeping your users happy. Sign up for a free trial at [oneuptime.com](https://oneuptime.com) and start monitoring your web infrastructure today.
