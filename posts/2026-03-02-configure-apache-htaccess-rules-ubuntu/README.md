# How to Configure Apache .htaccess Rules on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, Web Server, Configuration

Description: Learn how to use Apache .htaccess files on Ubuntu for URL rewriting, access control, caching, redirects, and custom error pages with practical examples.

---

`.htaccess` files let you configure Apache on a per-directory basis without modifying the main server configuration. They're especially useful for shared hosting environments and for web applications that need to manage their own routing rules (like WordPress or Laravel).

This guide covers the most useful `.htaccess` directives with real examples.

## Enabling .htaccess Support

Before `.htaccess` files work, Apache must be configured to allow them. This is controlled by the `AllowOverride` directive in the VirtualHost configuration.

```bash
# Edit your virtual host configuration
sudo nano /etc/apache2/sites-available/example.com.conf
```

```apache
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/example.com/public_html

    <Directory /var/www/example.com/public_html>
        # Allow .htaccess to override these directive types
        AllowOverride All
        # Or limit what can be overridden:
        # AllowOverride FileInfo Options AuthConfig Limit
        Require all granted
    </Directory>
</VirtualHost>
```

Also make sure `mod_rewrite` is enabled:

```bash
sudo a2enmod rewrite
sudo systemctl reload apache2
```

## Basic .htaccess File Structure

Create a `.htaccess` file in the directory you want to configure:

```bash
# Create .htaccess in the document root
sudo nano /var/www/example.com/public_html/.htaccess
```

The file contains Apache directives, one per line. Comments start with `#`.

## URL Rewriting with mod_rewrite

### WordPress Pretty Permalinks

```apache
# Enable rewrite engine
RewriteEngine On

# If request is for an existing file or directory, serve it directly
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Otherwise, send to WordPress index.php
RewriteRule . /index.php [L]
```

### Laravel / Symfony Routing

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On

    # Handle Authorization header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect trailing slashes
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Route all requests through index.php
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
```

### Force HTTPS

```apache
RewriteEngine On

# Check that the connection is not already HTTPS
RewriteCond %{HTTPS} off

# Redirect to HTTPS version
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### Remove www

```apache
RewriteEngine On
RewriteCond %{HTTP_HOST} ^www\.(.+)$ [NC]
RewriteRule ^ https://%1%{REQUEST_URI} [R=301,L]
```

### Add www

```apache
RewriteEngine On
RewriteCond %{HTTP_HOST} !^www\. [NC]
RewriteRule ^ https://www.%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
```

### Clean URL Extension Removal

```apache
# Remove .html extension from URLs
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME}.html -f
RewriteRule ^(.+)$ $1.html [L,QSA]
```

### Custom 301 Redirect for Moved Pages

```apache
# Permanent redirect for a specific page that moved
Redirect 301 /old-page.html /new-page/

# Redirect an entire old directory to a new location
Redirect 301 /old-section/ /new-section/
```

## Access Control

### Block Specific IP Addresses

```apache
# Block a single IP
Require all granted
Require not ip 192.168.1.100

# Block multiple IPs or subnets
Require all granted
Require not ip 10.0.0.5
Require not ip 192.168.0.0/24
```

### Allow Only Specific IPs

```apache
# Only allow access from specific IPs
Require ip 192.168.1.0/24
Require ip 10.0.0.5
```

### Password Protection with .htpasswd

```bash
# Create a password file (outside web root)
sudo htpasswd -c /etc/apache2/.htpasswd username
# Enter password when prompted

# Add more users (omit -c to avoid recreating the file)
sudo htpasswd /etc/apache2/.htpasswd anotheruser
```

```apache
# Protect the directory with basic auth
AuthType Basic
AuthName "Restricted Area"
AuthUserFile /etc/apache2/.htpasswd
Require valid-user
```

### Restrict Access to File Types

```apache
# Block direct access to sensitive file types
<FilesMatch "\.(env|log|sql|bak|zip|tar|gz|cfg|config)$">
    Require all denied
</FilesMatch>

# Block access to hidden files (starting with .)
<FilesMatch "^\.">
    Require all denied
</FilesMatch>

# Protect the .htaccess file itself
<Files ".htaccess">
    Require all denied
</Files>
```

## Security Headers

```apache
# Security headers - requires mod_headers
<IfModule mod_headers.c>
    # Prevent clickjacking
    Header always set X-Frame-Options "SAMEORIGIN"

    # Prevent MIME type sniffing
    Header always set X-Content-Type-Options "nosniff"

    # XSS protection (legacy browsers)
    Header always set X-XSS-Protection "1; mode=block"

    # HTTP Strict Transport Security (HTTPS only)
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

    # Referrer policy
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # Content Security Policy (customize for your app)
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
</IfModule>
```

## Browser Caching

```apache
<IfModule mod_expires.c>
    ExpiresActive On

    # Default expiry
    ExpiresDefault "access plus 1 day"

    # Images
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType image/x-icon "access plus 1 year"

    # Fonts
    ExpiresByType font/ttf "access plus 1 year"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"

    # CSS and JavaScript
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType text/javascript "access plus 1 month"

    # HTML - short cache time
    ExpiresByType text/html "access plus 1 hour"

    # Data files - don't cache
    ExpiresByType application/json "access plus 0 seconds"
</IfModule>
```

## Compression

```apache
<IfModule mod_deflate.c>
    # Compress text-based content types
    AddOutputFilterByType DEFLATE text/html text/plain text/xml
    AddOutputFilterByType DEFLATE text/css text/javascript
    AddOutputFilterByType DEFLATE application/javascript application/json
    AddOutputFilterByType DEFLATE application/xml application/xhtml+xml
    AddOutputFilterByType DEFLATE font/ttf font/otf image/svg+xml

    # Don't compress already-compressed formats
    SetEnvIfNoCase Request_URI \.(?:gif|jpe?g|png|webp|zip|gz|bz2)$ no-gzip dont-vary
</IfModule>
```

## Custom Error Pages

```apache
# Custom error pages
ErrorDocument 400 /errors/400.html
ErrorDocument 401 /errors/401.html
ErrorDocument 403 /errors/403.html
ErrorDocument 404 /errors/404.html
ErrorDocument 500 /errors/500.html
ErrorDocument 503 /errors/503.html
```

Create the error page files:

```bash
sudo mkdir -p /var/www/example.com/public_html/errors
sudo nano /var/www/example.com/public_html/errors/404.html
```

## PHP Configuration Override

```apache
# Override PHP settings per directory (requires mod_php or appropriate handler)
php_value upload_max_filesize 64M
php_value post_max_size 64M
php_value max_execution_time 300
php_value memory_limit 256M
php_flag display_errors Off
php_flag log_errors On
```

## CORS Headers

```apache
# Allow cross-origin requests from specific domains
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "https://trusted-site.com"
    Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</IfModule>
```

## Directory Options

```apache
# Disable directory listing
Options -Indexes

# Enable directory listing (not recommended for production)
Options +Indexes

# Follow symbolic links
Options +FollowSymLinks

# Disable CGI execution
Options -ExecCGI

# Multiple options at once
Options -Indexes -ExecCGI +FollowSymLinks
```

## Testing .htaccess Rules

```bash
# Test Apache configuration syntax (includes .htaccess parsing)
sudo apache2ctl configtest

# Test rewrite rules with verbose output
# Enable rewrite logging (use carefully - generates a lot of output)
# Add to main Apache config, not .htaccess:
# LogLevel alert rewrite:trace3

# Check error log for .htaccess issues
sudo tail -f /var/log/apache2/error.log

# Test a URL redirect
curl -I http://example.com/old-page.html
```

## Common .htaccess Mistakes

**Missing RewriteEngine On** - Every file that uses RewriteRule must have this line first.

**Wrong RewriteRule anchors** - Remember that `.htaccess` rewrite rules don't include the leading `/` in the pattern because they're relative to the directory:

```apache
# Wrong in .htaccess:
RewriteRule ^/page$ /index.php

# Correct in .htaccess:
RewriteRule ^page$ index.php
```

**AllowOverride not set** - If `.htaccess` seems to be ignored, check that `AllowOverride All` (or the specific directives you need) is set in the VirtualHost config.

**mod_rewrite not enabled** - Run `sudo a2enmod rewrite && sudo systemctl reload apache2`.

Performance note: `.htaccess` files are read on every request. For high-traffic production sites, moving the rules into the VirtualHost configuration is more efficient because Apache parses them once at startup rather than on every request.
