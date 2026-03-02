# How to Install DokuWiki on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Wiki, Web Server, PHP, Documentation

Description: Step-by-step guide to installing DokuWiki on Ubuntu with nginx and PHP-FPM, a flat-file wiki that requires no database and is ideal for team documentation.

---

DokuWiki is a wiki software that stands out for one reason: it uses plain text files for storage instead of a database. There's no MySQL or PostgreSQL to manage, no schema migrations, no database backups. Your wiki content is just files in a directory. This makes DokuWiki easy to set up, backup, and move between servers.

The plain text storage also means content is version-controlled by DokuWiki's own revisioning system, and you can inspect or modify content with standard text tools. For team documentation, project wikis, or internal knowledge bases, DokuWiki is a reliable choice that has been actively maintained since 2004.

## Prerequisites

- Ubuntu 20.04 or 22.04
- Root access
- A domain name or server IP

## Installing PHP and nginx

DokuWiki runs on PHP. Install nginx and PHP-FPM:

```bash
sudo apt update
sudo apt install nginx php-fpm php-xml php-mbstring php-gd php-zip unzip curl

# Verify PHP is installed
php -v

# Check which PHP-FPM version is running
systemctl status php*-fpm
```

Note the PHP version (e.g., `php8.1-fpm`) as you'll need it for the nginx config.

## Downloading DokuWiki

```bash
# Create the web directory
sudo mkdir -p /var/www/dokuwiki

# Download the latest stable release
# Check https://download.dokuwiki.org for the latest version
cd /tmp
curl -LO https://download.dokuwiki.org/src/dokuwiki/dokuwiki-stable.tgz

# Extract to the web directory
sudo tar xzf /tmp/dokuwiki-stable.tgz -C /var/www/dokuwiki --strip-components=1

# Set ownership to the web server user
sudo chown -R www-data:www-data /var/www/dokuwiki

# Set appropriate permissions
# DokuWiki needs write access to data, conf, and lib/plugins directories
sudo find /var/www/dokuwiki -type d -exec chmod 755 {} \;
sudo find /var/www/dokuwiki -type f -exec chmod 644 {} \;

# The data directory needs write access
sudo chmod -R 775 /var/www/dokuwiki/data
sudo chmod -R 775 /var/www/dokuwiki/conf
sudo chmod -R 775 /var/www/dokuwiki/lib/plugins
sudo chmod -R 775 /var/www/dokuwiki/lib/tpl
```

## Configuring nginx

Create the nginx virtual host:

```bash
sudo tee /etc/nginx/sites-available/dokuwiki << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name wiki.example.com;  # Replace with your domain

    root /var/www/dokuwiki;
    index index.php index.html;

    # Redirect HTTP to HTTPS
    # Remove this block if not using SSL yet
    # return 301 https://$host$request_uri;

    # DokuWiki security: protect sensitive directories and files
    location ~ /(data|conf|bin|inc|vendor)/ {
        deny all;
    }

    # Block hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Main location block
    location / {
        try_files $uri $uri/ @rewrite;
    }

    # DokuWiki URL rewriting
    location @rewrite {
        rewrite ^/(.*)$ /doku.php?id=$1 last;
    }

    # PHP-FPM configuration
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        # Adjust the PHP-FPM socket path for your PHP version
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to DokuWiki install script after initial setup
    location ~ /install\.php {
        deny all;
    }

    # Logging
    access_log /var/log/nginx/dokuwiki.access.log;
    error_log /var/log/nginx/dokuwiki.error.log;
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/dokuwiki /etc/nginx/sites-enabled/

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

## Running the Web Installer

Access the install script in your browser:

```
http://your-server-ip/install.php
```

Fill in the installer form:
- **Wiki Name**: Your wiki's title (e.g., "Team Knowledge Base")
- **Superuser Login**: Admin username
- **Real Name**: Admin's display name
- **Email**: Admin email
- **Password**: Strong admin password
- **Initial ACL Policy**: Choose based on your needs:
  - Open wiki - anyone can read and edit
  - Public wiki - anyone can read, only registered users can edit
  - Closed wiki - only registered users can read and edit

After completing the installer, the `install.php` file should be removed:

```bash
# Remove or disable the installer (important for security)
sudo rm /var/www/dokuwiki/install.php

# Verify it's gone
ls /var/www/dokuwiki/install.php
```

## Setting Up HTTPS with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get a certificate
sudo certbot --nginx -d wiki.example.com

# Certbot modifies the nginx config automatically
# Verify it works
curl -I https://wiki.example.com
```

## Configuring DokuWiki

DokuWiki's configuration is in `/var/www/dokuwiki/conf/local.php`. The web admin interface (Admin -> Configuration Settings) is the preferred way to change most settings, but you can also edit the files directly:

```bash
# View the local configuration
sudo cat /var/www/dokuwiki/conf/local.php

# Example settings that might be useful to set:
sudo tee -a /var/www/dokuwiki/conf/local.php << 'EOF'
$conf['title'] = 'Team Knowledge Base';
$conf['lang'] = 'en';
$conf['license'] = '';
$conf['savedir'] = './data';
$conf['updatecheck'] = 0;  // Disable update checks for air-gapped environments
$conf['userewrite'] = 1;   // Enable URL rewriting (nicer URLs)
EOF
```

## Managing Users

From the admin interface (Admin -> User Manager), you can add, edit, and delete users. To add a user from the command line:

```bash
# DokuWiki users are stored in conf/users.auth.php
# Format: username:password_hash:Full Name:email:groups

# Generate a password hash
php -r 'echo password_hash("newpassword", PASSWORD_BCRYPT) . "\n";'

# Add user to the file (use the web UI instead - this is just for reference)
# echo "newuser:HASH:New User:user@example.com:user" >> /var/www/dokuwiki/conf/users.auth.php
```

The web UI is much easier for user management. Go to Admin -> User Manager -> Add User.

## Installing Plugins

DokuWiki has a large plugin library. Install through the web UI (Admin -> Extension Manager) or manually:

```bash
# Manual plugin installation
cd /var/www/dokuwiki/lib/plugins

# Download a plugin (example: the discussion plugin)
sudo wget https://github.com/dokuteamrepo/discussion/archive/refs/heads/master.tar.gz \
    -O discussion.tar.gz

sudo tar xzf discussion.tar.gz
sudo mv discussion-master discussion
sudo chown -R www-data:www-data discussion
sudo rm discussion.tar.gz
```

Popular plugins:
- **Tag** - add tags to pages
- **Pagelist** - list pages with metadata
- **Discussion** - add comments to pages
- **Backup** - automated backups

## Backing Up DokuWiki

Since everything is in files, backup is straightforward:

```bash
# Simple tarball backup of the entire DokuWiki data
sudo tar czf /var/backups/dokuwiki-$(date +%Y%m%d).tar.gz \
    -C /var/www/dokuwiki \
    data conf lib/plugins

# Or just the data directory (contains all wiki content)
sudo tar czf /var/backups/dokuwiki-data-$(date +%Y%m%d).tar.gz \
    /var/www/dokuwiki/data

# Schedule via cron
echo "0 2 * * * root tar czf /var/backups/dokuwiki-\$(date +\%Y\%m\%d).tar.gz /var/www/dokuwiki/data" | \
    sudo tee /etc/cron.d/dokuwiki-backup
```

## Troubleshooting

```bash
# Check nginx error log
sudo tail -f /var/log/nginx/dokuwiki.error.log

# Check PHP-FPM logs
sudo journalctl -u php8.1-fpm -f

# Verify file permissions
ls -la /var/www/dokuwiki/data/
ls -la /var/www/dokuwiki/conf/

# Check if DokuWiki can write to data directory
sudo -u www-data touch /var/www/dokuwiki/data/test.txt && \
    echo "Write works" && \
    sudo rm /var/www/dokuwiki/data/test.txt

# PHP configuration check
php -m | grep -E "xml|mbstring|gd|zip"
```

DokuWiki is a mature, well-supported wiki that's hard to break. The flat-file approach means disaster recovery is a copy-paste operation, and the lack of a database removes an entire category of maintenance overhead. For documentation that needs to be writable by a team but doesn't need the complexity of a full CMS, it's a practical default choice.
