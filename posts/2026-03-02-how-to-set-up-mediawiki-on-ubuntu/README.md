# How to Set Up MediaWiki on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Wiki, PHP, MySQL, Web Server

Description: Learn how to install and configure MediaWiki on Ubuntu with nginx, PHP-FPM, and MySQL to run your own Wikipedia-style wiki for team documentation or public content.

---

MediaWiki is the software that powers Wikipedia and thousands of other wikis. It's a mature, feature-rich PHP application that uses a relational database (MySQL or PostgreSQL) for content storage. Compared to simpler wiki software, MediaWiki offers robust versioning, templates, categories, media management, and a large extension ecosystem.

It's appropriate when you need something with Wikipedia's editing model - wiki markup (or VisualEditor for WYSIWYG), talk pages, user contributions tracking, and administrative tools. For a small team's internal documentation, it's heavier than necessary, but for a public-facing or large-scale knowledge base, it's a natural choice.

## Prerequisites

- Ubuntu 20.04 or 22.04
- At least 2 GB RAM (more for high-traffic wikis)
- Root access
- A domain name

## Installing Dependencies

```bash
sudo apt update
sudo apt install nginx php-fpm php-mysql php-xml php-mbstring php-gd \
    php-intl php-apcu php-curl php-zip mysql-server curl unzip

# Check PHP version
php -v

# Secure MySQL installation
sudo mysql_secure_installation
```

## Setting Up MySQL

```bash
# Connect to MySQL as root
sudo mysql

# Create database and user for MediaWiki
CREATE DATABASE mediawiki CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mediawikiuser'@'localhost' IDENTIFIED BY 'strong-password-here';
GRANT ALL PRIVILEGES ON mediawiki.* TO 'mediawikiuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Test the connection
mysql -u mediawikiuser -p mediawiki -e "SHOW TABLES;"
```

## Downloading MediaWiki

```bash
# Download the latest stable MediaWiki release
# Check https://www.mediawiki.org/wiki/Download for latest version
cd /tmp
curl -LO https://releases.wikimedia.org/mediawiki/1.41/mediawiki-1.41.1.tar.gz

# Create web directory
sudo mkdir -p /var/www/mediawiki

# Extract to the web directory
sudo tar xzf mediawiki-1.41.1.tar.gz -C /var/www/mediawiki --strip-components=1

# Set ownership
sudo chown -R www-data:www-data /var/www/mediawiki

# Set permissions
sudo find /var/www/mediawiki -type d -exec chmod 755 {} \;
sudo find /var/www/mediawiki -type f -exec chmod 644 {} \;

# The images directory needs write access for file uploads
sudo chmod -R 775 /var/www/mediawiki/images
```

## Configuring nginx

```bash
sudo tee /etc/nginx/sites-available/mediawiki << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name wiki.example.com;

    root /var/www/mediawiki;
    index index.php;

    # Logging
    access_log /var/log/nginx/mediawiki.access.log;
    error_log /var/log/nginx/mediawiki.error.log;

    # MediaWiki URL rewriting for clean URLs
    location / {
        try_files $uri $uri/ @rewrite;
    }

    location @rewrite {
        rewrite ^/(.*)$ /index.php?title=$1 last;
    }

    # PHP handling
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Security: deny access to sensitive files
    location ~ ^/(maintenance|skins|extensions|vendor)/.*\.php$ {
        deny all;
    }

    # Block dot files
    location ~ /\. {
        deny all;
    }

    # Cache static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|woff|woff2|ttf|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    client_max_body_size 100m;  # Allow large file uploads
}
EOF

sudo ln -s /etc/nginx/sites-available/mediawiki /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Running the Web Installer

Visit `http://your-server-ip/` in your browser. MediaWiki will detect that it's not configured and redirect you to the setup wizard.

Step through the wizard:
1. **Welcome** - verify environment checks pass (PHP extensions, etc.)
2. **Connect to database** - enter the MySQL credentials you created
3. **Database settings** - use the `mediawiki` database
4. **Name** - set your wiki name and admin account
5. **Options** - configure optional features
6. **Install** - complete the installation

At the end, the installer generates a `LocalSettings.php` file and asks you to download it. Download this file, then upload it to your server:

```bash
# Upload LocalSettings.php to the wiki root
# (do this from your local machine where you downloaded it)
scp LocalSettings.php user@your-server.com:/tmp/

# On the server, move it into place
sudo mv /tmp/LocalSettings.php /var/www/mediawiki/LocalSettings.php
sudo chown www-data:www-data /var/www/mediawiki/LocalSettings.php
sudo chmod 644 /var/www/mediawiki/LocalSettings.php
```

Now visit the wiki URL and you should see your new wiki.

## Configuring LocalSettings.php

The `LocalSettings.php` file controls MediaWiki's behavior. Key settings:

```bash
sudo nano /var/www/mediawiki/LocalSettings.php
```

```php
<?php
# Database settings (already configured by installer)
$wgDBtype = "mysql";
$wgDBserver = "localhost";
$wgDBname = "mediawiki";
$wgDBuser = "mediawikiuser";
$wgDBpassword = "your-db-password";

# Wiki title (set by installer)
$wgSitename = "My Company Wiki";

# Server URL
$wgServer = "https://wiki.example.com";
$wgScriptPath = "";

# Enable clean URLs
$wgArticlePath = "/$1";
$wgUsePathInfo = true;

# File uploads
$wgEnableUploads = true;
$wgUploadPath = "$wgScriptPath/images";
$wgMaxUploadSize = 100 * 1024 * 1024;  // 100 MB

# Who can edit (adjust for your use case)
# Restrict editing to registered users:
$wgGroupPermissions['*']['edit'] = false;
$wgGroupPermissions['user']['edit'] = true;

# Restrict reading to registered users (private wiki):
# $wgGroupPermissions['*']['read'] = false;

# Performance: enable caching with APCu
$wgMainCacheType = CACHE_ACCEL;
$wgMemCachedServers = [];

# Email configuration (for password resets, notifications)
$wgEnableEmail = true;
$wgEmergencyContact = "admin@example.com";
$wgPasswordSender = "wiki@example.com";

# SMTP configuration
$wgSMTP = [
    'host'     => 'smtp.example.com',
    'IDHost'   => 'example.com',
    'port'     => 587,
    'auth'     => true,
    'username' => 'wiki@example.com',
    'password' => 'smtp-password',
];
```

## Setting Up HTTPS

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d wiki.example.com

# Update $wgServer in LocalSettings.php
sudo sed -i 's|http://wiki.example.com|https://wiki.example.com|' \
    /var/www/mediawiki/LocalSettings.php
```

## Installing Extensions

MediaWiki extensions add functionality. Install the VisualEditor for WYSIWYG editing as an example:

```bash
# Download extensions to the extensions directory
cd /var/www/mediawiki/extensions

# Example: install the Cite extension (for footnotes)
sudo curl -LO https://extdist.wmflabs.org/dist/extensions/Cite-REL1_41-xxxxxx.tar.gz
sudo tar xzf Cite-REL1_41-*.tar.gz
sudo chown -R www-data:www-data Cite
```

Enable extensions in `LocalSettings.php`:

```php
# Enable extensions by adding to LocalSettings.php
wfLoadExtension( 'Cite' );
wfLoadExtension( 'ParserFunctions' );
wfLoadExtension( 'CategoryTree' );
wfLoadExtension( 'SyntaxHighlight_GeSHi' );
```

## Running Maintenance Scripts

MediaWiki has a set of maintenance scripts for administrative tasks:

```bash
# Update database after installing extensions or upgrading
sudo -u www-data php /var/www/mediawiki/maintenance/update.php

# Rebuild the search index
sudo -u www-data php /var/www/mediawiki/maintenance/rebuildrecentchanges.php

# Import a dump file (for migrating content)
sudo -u www-data php /var/www/mediawiki/maintenance/importDump.php < wiki-dump.xml

# Export the wiki content
sudo -u www-data php /var/www/mediawiki/maintenance/dumpBackup.php --full > wiki-dump.xml
```

## Backing Up MediaWiki

```bash
# Backup the database
sudo mysqldump mediawiki | gzip > /var/backups/mediawiki-db-$(date +%Y%m%d).sql.gz

# Backup uploaded files
sudo tar czf /var/backups/mediawiki-images-$(date +%Y%m%d).tar.gz \
    /var/www/mediawiki/images

# Backup configuration
sudo cp /var/www/mediawiki/LocalSettings.php \
    /var/backups/LocalSettings-$(date +%Y%m%d).php

# Schedule automated backups
sudo tee /etc/cron.d/mediawiki-backup << 'EOF'
0 3 * * * root mysqldump mediawiki | gzip > /var/backups/mediawiki-db-$(date +\%Y\%m\%d).sql.gz
EOF
```

## Troubleshooting

```bash
# Check nginx and PHP-FPM logs
sudo tail -f /var/log/nginx/mediawiki.error.log
sudo journalctl -u php8.1-fpm -f

# Run MediaWiki's built-in environment check
sudo -u www-data php /var/www/mediawiki/maintenance/checkSyntax.php

# Verify database connectivity
mysql -u mediawikiuser -p mediawiki -e "SHOW TABLES;" | head -20

# Check file permissions
ls -la /var/www/mediawiki/images/

# MediaWiki debug log (add to LocalSettings.php temporarily)
# $wgDebugLogFile = '/tmp/mediawiki-debug.log';
```

MediaWiki is well-tested software with decades of production use. The initial setup is more involved than simpler wiki solutions, but the feature set and extensibility are correspondingly greater. Once running, it's stable and relatively low-maintenance, with regular upstream releases providing security updates.
