# How to Install and Configure Apache2 on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, Web Server, Linux

Description: Complete guide to installing Apache2 on Ubuntu, configuring virtual hosts, setting up SSL, and managing the web server with practical examples.

---

Apache2 is the most widely deployed web server on the internet. On Ubuntu, it's well-integrated with the operating system through a clean directory structure and helper tools that make managing multiple websites straightforward. This guide covers a full Apache2 setup from installation to running a production-ready virtual host.

## Installing Apache2

```bash
# Update package list
sudo apt update

# Install Apache2
sudo apt install apache2

# Verify installation
apache2 -version
# Example output: Server version: Apache/2.4.52 (Ubuntu)

# Check if it's running
sudo systemctl status apache2
```

Apache starts automatically after installation. Opening `http://your-server-ip` in a browser should show the Apache default page.

## Ubuntu's Apache2 Directory Structure

Understanding the directory structure is essential for managing Apache on Ubuntu:

```
/etc/apache2/
├── apache2.conf          # Main configuration file
├── ports.conf            # Port configuration (Listen directives)
├── conf-available/       # Available configuration snippets
├── conf-enabled/         # Active configs (symlinks to conf-available/)
├── mods-available/       # Available modules
├── mods-enabled/         # Active modules (symlinks to mods-available/)
├── sites-available/      # Available virtual host configs
└── sites-enabled/        # Active virtual hosts (symlinks to sites-available/)
```

The `available/` vs `enabled/` pattern means you can configure sites and modules without activating them. Symlinks in the `enabled/` directories point to configs in `available/`.

## Apache2 Management Commands

```bash
# Start Apache
sudo systemctl start apache2

# Stop Apache
sudo systemctl stop apache2

# Restart Apache (full stop and start - drops connections briefly)
sudo systemctl restart apache2

# Reload configuration without dropping connections
sudo systemctl reload apache2

# Enable Apache to start at boot
sudo systemctl enable apache2

# Test configuration syntax before applying
sudo apache2ctl configtest
# Should output: Syntax OK
```

## Configuring a Virtual Host

Virtual hosts allow a single Apache server to serve multiple websites.

### Create the Website Directory

```bash
# Create a directory for your site
sudo mkdir -p /var/www/example.com/public_html

# Create a sample index page
sudo tee /var/www/example.com/public_html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>Welcome to Example.com</title></head>
<body><h1>It works!</h1></body>
</html>
EOF

# Set proper ownership (www-data is Apache's user)
sudo chown -R www-data:www-data /var/www/example.com
sudo chmod -R 755 /var/www/example.com
```

### Create the Virtual Host Configuration

```bash
sudo nano /etc/apache2/sites-available/example.com.conf
```

```apache
<VirtualHost *:80>
    # Server identification
    ServerName example.com
    ServerAlias www.example.com

    # Document root
    DocumentRoot /var/www/example.com/public_html

    # Webmaster email (appears in error pages)
    ServerAdmin webmaster@example.com

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/example.com-error.log
    CustomLog ${APACHE_LOG_DIR}/example.com-access.log combined

    # Directory permissions
    <Directory /var/www/example.com/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### Enable the Site

```bash
# Enable the virtual host (creates symlink in sites-enabled)
sudo a2ensite example.com.conf

# Disable the default site (optional)
sudo a2dissite 000-default.conf

# Test configuration
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2
```

## Setting Up SSL with Let's Encrypt

For production use, configure HTTPS:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-apache

# Obtain and install a certificate
sudo certbot --apache -d example.com -d www.example.com

# Certbot automatically modifies your Apache config to enable HTTPS
# and adds a HTTP -> HTTPS redirect

# Test certificate auto-renewal
sudo certbot renew --dry-run

# Certbot installs a systemd timer for automatic renewal
sudo systemctl status certbot.timer
```

After Certbot runs, your virtual host configuration will have a new HTTPS section added automatically.

## Manual SSL Configuration

If you have your own certificate:

```bash
# Enable the SSL module
sudo a2enmod ssl
sudo systemctl reload apache2

# Create the SSL virtual host
sudo nano /etc/apache2/sites-available/example.com-ssl.conf
```

```apache
<VirtualHost *:443>
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
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder off

    # Security headers
    Header always set Strict-Transport-Security "max-age=63072000"

    ErrorLog ${APACHE_LOG_DIR}/example.com-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/example.com-ssl-access.log combined

    <Directory /var/www/example.com/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com
    Redirect permanent / https://example.com/
</VirtualHost>
```

```bash
# Enable headers module (needed for HSTS header)
sudo a2enmod headers

# Enable the SSL site
sudo a2ensite example.com-ssl.conf

# Test and reload
sudo apache2ctl configtest
sudo systemctl reload apache2
```

## Firewall Configuration

```bash
# Allow HTTP and HTTPS through UFW
sudo ufw allow 'Apache'    # Only HTTP
sudo ufw allow 'Apache Full'  # HTTP and HTTPS
sudo ufw allow 'Apache Secure'  # Only HTTPS

# Verify
sudo ufw status
```

## Common Configuration Directives

```apache
# Directory listing options
Options -Indexes                # Disable directory listing
Options +FollowSymLinks         # Follow symbolic links

# Override settings with .htaccess files
AllowOverride All               # Allow all directives in .htaccess
AllowOverride None              # No .htaccess files
AllowOverride FileInfo Options  # Only specific directives allowed

# Access control
Require all granted             # Allow all access
Require ip 192.168.1.0/24       # Allow only this subnet
Require not ip 10.0.0.1         # Block specific IP

# Enable compression
SetOutputFilter DEFLATE
```

## Useful Apache2 Tool Commands

```bash
# Enable a module
sudo a2enmod rewrite
sudo a2enmod ssl
sudo a2enmod headers
sudo a2enmod proxy

# Disable a module
sudo a2dismod autoindex   # Disables directory listing module

# List enabled modules
sudo apache2ctl -M

# Enable a site
sudo a2ensite example.com.conf

# Disable a site
sudo a2dissite example.com.conf

# List enabled sites
ls -la /etc/apache2/sites-enabled/
```

## Log Management

```bash
# View real-time access log
sudo tail -f /var/log/apache2/access.log

# View real-time error log
sudo tail -f /var/log/apache2/error.log

# View a specific site's logs (if configured per-site)
sudo tail -f /var/log/apache2/example.com-error.log

# Apache log format variables:
# %h - remote host
# %l - identd lookup
# %u - username if authenticated
# %t - time
# %r - request line
# %s - status code
# %b - bytes sent
# "%{Referer}i" - referrer header
# "%{User-agent}i" - user agent
```

## Performance Settings

```bash
# Set server tokens (what Apache reveals in headers)
sudo nano /etc/apache2/conf-available/security.conf

# Change:
ServerTokens Prod     # Show only "Apache" not the version
ServerSignature Off   # No server signature on error pages

# Enable file caching
sudo a2enmod expires
```

```apache
# Cache control - add to VirtualHost or global config
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
    ExpiresByType text/html "access plus 1 day"
    ExpiresByType text/css "access plus 1 week"
    ExpiresByType application/javascript "access plus 1 week"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
</IfModule>
```

```bash
# Enable compression
sudo a2enmod deflate
```

```apache
# Add to config for compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css
    AddOutputFilterByType DEFLATE application/json application/javascript
</IfModule>
```

## Checking Server Status

```bash
# Enable the status module
sudo a2enmod status
sudo systemctl reload apache2

# Access server status (restrict to localhost)
curl http://localhost/server-status?auto

# Full status with mod_status configured
# Add to config:
# <Location /server-status>
#     SetHandler server-status
#     Require local
# </Location>
```

Apache2 on Ubuntu is a mature, reliable web server. The `a2ensite`, `a2dissite`, `a2enmod`, and `a2dismod` tools make configuration management clean and auditable, since every active config is visible as a symlink in the `enabled/` directories. Starting with a clean virtual host per domain and adding SSL through Certbot covers the majority of use cases.
