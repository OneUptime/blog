# How to Install and Configure Apache Web Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Apache, Web Server, HTTP, Configuration, Tutorial

Description: Complete guide to installing, configuring, and securing Apache HTTP Server on Ubuntu with virtual hosts, SSL, and performance tuning.

---

Apache HTTP Server (httpd) is the world's most popular web server, powering millions of websites. This guide covers installing Apache on Ubuntu, configuring virtual hosts for multiple sites, enabling SSL/TLS, and optimizing performance.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Root or sudo access
- Domain name (for SSL configuration)

## Installing Apache

```bash
# Update package lists
sudo apt update

# Install Apache2
sudo apt install apache2 -y

# Verify installation
apache2 -v

# Check Apache status
sudo systemctl status apache2
```

Apache starts automatically after installation. Visit `http://your_server_ip` to see the default page.

## Managing Apache Service

```bash
# Start Apache
sudo systemctl start apache2

# Stop Apache
sudo systemctl stop apache2

# Restart Apache (full restart)
sudo systemctl restart apache2

# Reload configuration (graceful, no downtime)
sudo systemctl reload apache2

# Enable Apache to start on boot
sudo systemctl enable apache2

# Disable auto-start
sudo systemctl disable apache2
```

## Understanding Apache Directory Structure

```
/etc/apache2/
├── apache2.conf          # Main configuration file
├── ports.conf            # Port configuration
├── envvars               # Environment variables
├── sites-available/      # Virtual host configs (available)
├── sites-enabled/        # Virtual host configs (active - symlinks)
├── mods-available/       # Module configs (available)
├── mods-enabled/         # Module configs (active - symlinks)
├── conf-available/       # Additional configs (available)
└── conf-enabled/         # Additional configs (active - symlinks)

/var/www/                 # Default web root
/var/log/apache2/         # Log files
```

## Basic Configuration

### Main Configuration File

```bash
# Edit main configuration
sudo nano /etc/apache2/apache2.conf
```

Key settings to understand:

```apache
# Server-wide timeout for receiving and sending
Timeout 300

# Seconds to wait for subsequent requests on persistent connections
KeepAlive On
MaxKeepAliveRequests 100
KeepAliveTimeout 5

# Server name (prevents startup warnings)
ServerName localhost
```

### Configure Server Name

```bash
# Add ServerName to prevent warnings
echo "ServerName localhost" | sudo tee /etc/apache2/conf-available/servername.conf

# Enable the configuration
sudo a2enconf servername

# Reload Apache
sudo systemctl reload apache2
```

## Virtual Hosts

Virtual hosts allow hosting multiple websites on one server.

### Create Website Directory

```bash
# Create directory structure for your site
sudo mkdir -p /var/www/example.com/public_html

# Create a sample index page
sudo nano /var/www/example.com/public_html/index.html
```

Add sample content:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Welcome to Example.com</title>
</head>
<body>
    <h1>Example.com is working!</h1>
</body>
</html>
```

### Set Permissions

```bash
# Set ownership to web server user
sudo chown -R www-data:www-data /var/www/example.com

# Set directory permissions
sudo chmod -R 755 /var/www/example.com
```

### Create Virtual Host Configuration

```bash
# Create virtual host config file
sudo nano /etc/apache2/sites-available/example.com.conf
```

Add this configuration:

```apache
<VirtualHost *:80>
    # Server identification
    ServerAdmin admin@example.com
    ServerName example.com
    ServerAlias www.example.com

    # Document root
    DocumentRoot /var/www/example.com/public_html

    # Directory settings
    <Directory /var/www/example.com/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/example.com_error.log
    CustomLog ${APACHE_LOG_DIR}/example.com_access.log combined
</VirtualHost>
```

### Enable the Site

```bash
# Enable the virtual host
sudo a2ensite example.com.conf

# Disable default site (optional)
sudo a2dissite 000-default.conf

# Test configuration for syntax errors
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2
```

## Enabling Modules

Apache uses modules to extend functionality.

### Common Modules

```bash
# Enable rewrite module (for clean URLs, .htaccess rules)
sudo a2enmod rewrite

# Enable SSL module (for HTTPS)
sudo a2enmod ssl

# Enable headers module (for security headers)
sudo a2enmod headers

# Enable deflate module (for compression)
sudo a2enmod deflate

# Enable expires module (for cache control)
sudo a2enmod expires

# Enable proxy modules (for reverse proxy)
sudo a2enmod proxy proxy_http proxy_balancer lbmethod_byrequests

# Restart Apache after enabling modules
sudo systemctl restart apache2
```

### List Enabled Modules

```bash
# Show all enabled modules
apache2ctl -M

# Or
apachectl -t -D DUMP_MODULES
```

## Setting Up SSL/HTTPS

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-apache -y

# Obtain and install certificate
sudo certbot --apache -d example.com -d www.example.com

# Follow the prompts to configure HTTPS
```

Certbot automatically:
- Obtains SSL certificate
- Configures Apache virtual host
- Sets up auto-renewal

### Manual SSL Configuration

If you have existing certificates:

```bash
# Enable SSL module
sudo a2enmod ssl

# Create SSL virtual host
sudo nano /etc/apache2/sites-available/example.com-ssl.conf
```

```apache
<VirtualHost *:443>
    ServerAdmin admin@example.com
    ServerName example.com
    ServerAlias www.example.com
    DocumentRoot /var/www/example.com/public_html

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/example.com.crt
    SSLCertificateKeyFile /etc/ssl/private/example.com.key
    SSLCertificateChainFile /etc/ssl/certs/example.com-chain.crt

    # Modern SSL settings
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    SSLHonorCipherOrder off

    <Directory /var/www/example.com/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/example.com_ssl_error.log
    CustomLog ${APACHE_LOG_DIR}/example.com_ssl_access.log combined
</VirtualHost>
```

### Force HTTPS Redirect

Add to your HTTP virtual host:

```apache
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com

    # Redirect all HTTP traffic to HTTPS
    Redirect permanent / https://example.com/
</VirtualHost>
```

Or use mod_rewrite:

```apache
<VirtualHost *:80>
    ServerName example.com
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>
```

## Security Hardening

### Hide Server Information

```bash
# Edit security configuration
sudo nano /etc/apache2/conf-available/security.conf
```

```apache
# Hide Apache version and OS
ServerTokens Prod
ServerSignature Off

# Disable TRACE method
TraceEnable Off
```

### Security Headers

Add to your virtual host:

```apache
<VirtualHost *:443>
    # ... other config ...

    # Security Headers
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Content-Security-Policy "default-src 'self';"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</VirtualHost>
```

### Restrict Directory Access

```apache
# Deny access to sensitive files
<FilesMatch "^\.ht">
    Require all denied
</FilesMatch>

# Deny access to specific file types
<FilesMatch "\.(env|ini|log|sh|sql)$">
    Require all denied
</FilesMatch>
```

## Performance Tuning

### Enable Compression

```bash
# Enable deflate module
sudo a2enmod deflate
```

Add to configuration:

```apache
<IfModule mod_deflate.c>
    # Compress HTML, CSS, JavaScript, Text, XML and fonts
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/json
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/javascript
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/xml
</IfModule>
```

### Browser Caching

```bash
# Enable expires module
sudo a2enmod expires
```

```apache
<IfModule mod_expires.c>
    ExpiresActive On

    # Default expiration
    ExpiresDefault "access plus 1 month"

    # HTML - no cache
    ExpiresByType text/html "access plus 0 seconds"

    # CSS and JavaScript
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"

    # Images
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>
```

### MPM Configuration

Apache uses Multi-Processing Modules. Check which is active:

```bash
# Check current MPM
apachectl -V | grep MPM
```

For high-traffic sites, tune the event MPM:

```bash
# Edit MPM configuration
sudo nano /etc/apache2/mods-available/mpm_event.conf
```

```apache
<IfModule mpm_event_module>
    StartServers            4
    MinSpareThreads         75
    MaxSpareThreads         250
    ThreadLimit             64
    ThreadsPerChild         25
    MaxRequestWorkers       400
    MaxConnectionsPerChild  10000
</IfModule>
```

## Firewall Configuration

```bash
# Allow HTTP traffic
sudo ufw allow 80/tcp

# Allow HTTPS traffic
sudo ufw allow 443/tcp

# Or use Apache's UFW profile
sudo ufw allow "Apache Full"

# Check status
sudo ufw status
```

## Log Management

### View Logs

```bash
# Access log (successful requests)
sudo tail -f /var/log/apache2/access.log

# Error log (errors and warnings)
sudo tail -f /var/log/apache2/error.log

# Site-specific logs
sudo tail -f /var/log/apache2/example.com_error.log
```

### Custom Log Formats

```apache
# Define custom log format
LogFormat "%h %l %u %t \"%r\" %>s %O \"%{Referer}i\" \"%{User-Agent}i\" %D" detailed

# Use custom format
CustomLog ${APACHE_LOG_DIR}/access.log detailed
```

## Troubleshooting

### Configuration Syntax Check

```bash
# Test configuration before applying
sudo apache2ctl configtest
# Output: Syntax OK
```

### Common Errors

**403 Forbidden:**
```bash
# Check directory permissions
ls -la /var/www/example.com/

# Check Apache config for Require directives
grep -r "Require" /etc/apache2/sites-enabled/
```

**500 Internal Server Error:**
```bash
# Check error log for details
sudo tail -50 /var/log/apache2/error.log

# Check .htaccess for errors
sudo apache2ctl -t
```

**Site Not Loading:**
```bash
# Verify site is enabled
ls -la /etc/apache2/sites-enabled/

# Check Apache is listening
sudo netstat -tlpn | grep apache2
```

---

Apache is highly configurable and powers everything from small personal sites to enterprise applications. Start with basic configuration and gradually add features like SSL, compression, and caching as your needs grow. Regular log monitoring and security updates will keep your server running smoothly.
