# How to Enable and Disable Apache Modules on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, Web Server, Linux

Description: Manage Apache2 modules on Ubuntu using a2enmod and a2dismod, including commonly used modules, how modules work, and troubleshooting tips.

---

Apache's functionality is built from modules. The core handles basic HTTP requests, while modules add features like URL rewriting, SSL, compression, authentication, and proxying. On Ubuntu, Apache's module system is cleanly managed through `a2enmod` and `a2dismod` commands that create and remove symlinks, keeping the configuration organized.

## How Apache Modules Work on Ubuntu

Module files live in `/etc/apache2/mods-available/`. Each module typically has two files:

- `.load` - contains the `LoadModule` directive that loads the shared library
- `.conf` - contains configuration for the module (not all modules have this)

Enabling a module creates symlinks to these files in `/etc/apache2/mods-enabled/`. Apache reads everything in `mods-enabled/` at startup.

```bash
# List all available modules
ls /etc/apache2/mods-available/

# List currently enabled modules
ls /etc/apache2/mods-enabled/

# List modules loaded into the running Apache instance
sudo apache2ctl -M
# or
sudo apache2ctl -t -D DUMP_MODULES
```

## Enabling Modules

```bash
# Enable a module
sudo a2enmod module-name

# Examples:
sudo a2enmod rewrite      # URL rewriting
sudo a2enmod ssl          # HTTPS/TLS
sudo a2enmod headers      # HTTP header manipulation
sudo a2enmod proxy        # Reverse proxy
sudo a2enmod deflate      # Gzip compression

# After enabling, reload Apache to apply changes
sudo systemctl reload apache2

# Or for modules that need a full restart (rare)
sudo systemctl restart apache2
```

`a2enmod` handles dependencies automatically. For example, enabling `proxy_http` automatically enables `proxy` if it isn't already enabled.

## Disabling Modules

```bash
# Disable a module
sudo a2dismod module-name

# Examples:
sudo a2dismod autoindex   # Disables directory listing
sudo a2dismod status      # Disables server status page

# Reload after disabling
sudo systemctl reload apache2
```

## Commonly Used Modules

### mod_rewrite - URL Rewriting

```bash
sudo a2enmod rewrite
sudo systemctl reload apache2
```

Required for:
- WordPress pretty permalinks
- Laravel, Symfony, Django URL routing
- SEO-friendly URLs
- HTTPS redirect rules

Example use in VirtualHost or `.htaccess`:

```apache
RewriteEngine On
# Redirect non-www to www
RewriteCond %{HTTP_HOST} !^www\.
RewriteRule ^(.*)$ https://www.%{HTTP_HOST}/$1 [R=301,L]
```

### mod_ssl - HTTPS Support

```bash
sudo a2enmod ssl
sudo systemctl reload apache2
```

Required for HTTPS. Apache won't serve SSL connections without this module. Certbot enables it automatically.

### mod_headers - HTTP Header Control

```bash
sudo a2enmod headers
sudo systemctl reload apache2
```

Allows adding, modifying, or removing HTTP response headers:

```apache
# Security headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
```

### mod_deflate - Gzip Compression

```bash
sudo a2enmod deflate
sudo systemctl reload apache2
```

Compresses responses to reduce bandwidth:

```apache
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml
    AddOutputFilterByType DEFLATE text/css application/javascript
    AddOutputFilterByType DEFLATE application/json application/xml
</IfModule>
```

### mod_expires - Browser Caching

```bash
sudo a2enmod expires
sudo systemctl reload apache2
```

Controls `Cache-Control` and `Expires` headers:

```apache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresDefault "access plus 1 week"
</IfModule>
```

### mod_proxy and mod_proxy_http - Reverse Proxy

```bash
sudo a2enmod proxy proxy_http
sudo systemctl reload apache2
```

Use Apache as a reverse proxy in front of another server:

```apache
<VirtualHost *:80>
    ServerName app.example.com

    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
</VirtualHost>
```

### mod_proxy_balancer and mod_lbmethod_byrequests - Load Balancing

```bash
sudo a2enmod proxy proxy_http proxy_balancer lbmethod_byrequests
sudo systemctl reload apache2
```

```apache
<Proxy balancer://mycluster>
    BalancerMember http://backend1:8080
    BalancerMember http://backend2:8080
    ProxySet lbmethod=byrequests
</Proxy>

ProxyPass / balancer://mycluster/
ProxyPassReverse / balancer://mycluster/
```

### mod_security - Web Application Firewall

```bash
sudo apt install libapache2-mod-security2
sudo a2enmod security2
sudo systemctl reload apache2
```

### mod_evasive - DDoS Protection

```bash
sudo apt install libapache2-mod-evasive
sudo a2enmod evasive
sudo systemctl reload apache2
```

### mod_php vs mod_fcgid vs mod_proxy_fcgi

Modern Ubuntu deployments typically use PHP-FPM rather than `mod_php`:

```bash
# The old way (don't use for new setups)
# sudo a2enmod php8.1   # mod_php

# The modern way - use PHP-FPM via proxy_fcgi
sudo a2enmod proxy_fcgi setenvif
sudo a2enconf php8.1-fpm    # Enable PHP-FPM config
sudo systemctl reload apache2
```

### mod_status - Server Status Page

```bash
sudo a2enmod status
sudo systemctl reload apache2
```

Configure in `/etc/apache2/conf-available/`:

```apache
<Location /server-status>
    SetHandler server-status
    # Restrict to localhost and monitoring IPs only
    Require local
    Require ip 192.168.1.100
</Location>
```

Access the status page:

```bash
curl http://localhost/server-status
curl http://localhost/server-status?auto   # Machine-readable format
```

### mod_userdir - User Home Directories

```bash
sudo a2enmod userdir
sudo systemctl reload apache2
```

Serves content from users' `~/public_html` directories at `http://server/~username/`.

Disable it if you don't need this feature:

```bash
sudo a2dismod userdir
sudo systemctl reload apache2
```

### mod_autoindex - Directory Listing

```bash
# Enable directory listing (enabled by default)
sudo a2enmod autoindex

# Disable directory listing globally
sudo a2dismod autoindex
sudo systemctl reload apache2

# Or disable per-directory in config
# Options -Indexes
```

## Checking if a Module is Loaded

```bash
# Check if rewrite module is loaded
sudo apache2ctl -M | grep rewrite

# Check if ssl is loaded
sudo apache2ctl -M 2>/dev/null | grep ssl

# Get the full list
sudo apache2ctl -M 2>/dev/null | sort
```

## Modules That Need a Full Restart

Most modules can be loaded with a simple reload (`systemctl reload`). However, some modules require a full restart:

```bash
# These typically need a full restart:
sudo a2enmod mpm_event   # MPM changes require restart
sudo a2enmod mpm_prefork
sudo systemctl restart apache2   # Full restart, not reload
```

## Module Configuration Files

Some modules have separate configuration files in `/etc/apache2/conf-available/`:

```bash
# List available configurations
ls /etc/apache2/conf-available/

# Enable a module's configuration
sudo a2enconf security
sudo a2enconf php8.1-fpm

# Disable a module's configuration
sudo a2disconf serve-cgi-bin

# Reload after changes
sudo systemctl reload apache2
```

## Troubleshooting Module Issues

### Module Not Loading

```bash
# Check for syntax errors after enabling a module
sudo apache2ctl configtest

# If there's an error, check the error log
sudo journalctl -u apache2 -n 50

# Or check the error log file
sudo tail -20 /var/log/apache2/error.log
```

### Module Conflict

Some modules conflict with each other. The most common example is MPM modules - only one can be active at a time:

```bash
# Can't have both prefork and event active
sudo a2dismod mpm_prefork
sudo a2enmod mpm_event
sudo systemctl restart apache2

# Check which MPM is active
sudo apache2ctl -M | grep mpm
```

### Module Not Found

If `a2enmod` says a module doesn't exist:

```bash
# Check if it's available
ls /etc/apache2/mods-available/ | grep module-name

# Some modules need to be installed first
sudo apt search libapache2-mod-
sudo apt install libapache2-mod-security2
```

### Checking Module State After a Package Update

After updating Apache packages, sometimes modules get reset. Verify your modules are still enabled:

```bash
# Quick sanity check
ls /etc/apache2/mods-enabled/ | sort

# Test configuration
sudo apache2ctl configtest

# Reload if everything looks right
sudo systemctl reload apache2
```

Apache's module system on Ubuntu keeps the complexity manageable. The key habit is always running `sudo apache2ctl configtest` before reloading to catch syntax errors before they take down the server.
