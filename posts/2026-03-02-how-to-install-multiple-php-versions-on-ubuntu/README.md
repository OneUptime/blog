# How to Install Multiple PHP Versions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PHP, Web Server, Development

Description: Install and run multiple PHP versions simultaneously on Ubuntu using the Ondrej Sury PPA, enabling different applications to use different PHP versions.

---

Running multiple PHP versions on the same server is a common requirement when you host applications that have different PHP version requirements. An older WordPress plugin might need PHP 7.4, while a new Laravel application requires PHP 8.2. Ubuntu makes this manageable through the Ondrej Sury PPA, which provides multiple PHP versions through the same package repository.

## Setting Up the PPA

The official Ubuntu repositories only provide one PHP version per Ubuntu release. The Ondrej Sury PPA provides multiple versions simultaneously:

```bash
sudo apt update
sudo apt install software-properties-common ca-certificates apt-transport-https -y
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
```

Verify the PPA is active:

```bash
apt-cache policy php8.3
apt-cache policy php8.2
apt-cache policy php7.4
```

You should see PPA entries in the output for each version.

## Installing Multiple PHP Versions

Install each version you need along with PHP-FPM:

```bash
# Install PHP 8.3
sudo apt install php8.3 php8.3-fpm php8.3-cli \
    php8.3-mysql php8.3-redis php8.3-curl \
    php8.3-gd php8.3-mbstring php8.3-xml \
    php8.3-zip php8.3-opcache -y

# Install PHP 8.2
sudo apt install php8.2 php8.2-fpm php8.2-cli \
    php8.2-mysql php8.2-redis php8.2-curl \
    php8.2-gd php8.2-mbstring php8.2-xml \
    php8.2-zip php8.2-opcache -y

# Install PHP 7.4 (for legacy applications)
sudo apt install php7.4 php7.4-fpm php7.4-cli \
    php7.4-mysql php7.4-curl \
    php7.4-gd php7.4-mbstring php7.4-xml \
    php7.4-zip php7.4-opcache -y
```

## Verifying Installation

Each version runs as a separate PHP-FPM service with its own socket:

```bash
# Check installed versions
php7.4 --version
php8.2 --version
php8.3 --version

# Check FPM services
sudo systemctl status php7.4-fpm
sudo systemctl status php8.2-fpm
sudo systemctl status php8.3-fpm

# Check sockets
ls -la /run/php/
# Should show php7.4-fpm.sock, php8.2-fpm.sock, php8.3-fpm.sock
```

## Configuration File Locations

Each PHP version has its own independent configuration tree:

```bash
# PHP 7.4
/etc/php/7.4/fpm/php.ini      # FPM configuration
/etc/php/7.4/cli/php.ini      # CLI configuration
/etc/php/7.4/fpm/pool.d/www.conf  # FPM pool configuration

# PHP 8.2
/etc/php/8.2/fpm/php.ini
/etc/php/8.2/cli/php.ini
/etc/php/8.2/fpm/pool.d/www.conf

# PHP 8.3
/etc/php/8.3/fpm/php.ini
/etc/php/8.3/cli/php.ini
/etc/php/8.3/fpm/pool.d/www.conf
```

Configure each version independently:

```bash
# Edit PHP 8.3 settings
sudo nano /etc/php/8.3/fpm/php.ini

# Edit PHP 7.4 settings (might need different memory limits for legacy apps)
sudo nano /etc/php/7.4/fpm/php.ini
```

## Assigning PHP Versions to Nginx Virtual Hosts

Each virtual host can use a different PHP version by pointing to the appropriate FPM socket:

```nginx
# /etc/nginx/sites-available/app-php83 - Uses PHP 8.3
server {
    listen 80;
    server_name newapp.example.com;
    root /var/www/newapp;

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

```nginx
# /etc/nginx/sites-available/app-php74 - Uses PHP 7.4
server {
    listen 80;
    server_name legacyapp.example.com;
    root /var/www/legacyapp;

    location ~ \.php$ {
        # Point to PHP 7.4 FPM socket
        fastcgi_pass unix:/run/php/php7.4-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

Enable both sites:

```bash
sudo ln -s /etc/nginx/sites-available/app-php83 /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/app-php74 /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Assigning PHP Versions to Apache Virtual Hosts

With Apache and PHP-FPM, assign versions per virtual host:

```apache
# /etc/apache2/sites-available/newapp.conf - PHP 8.3
<VirtualHost *:80>
    ServerName newapp.example.com
    DocumentRoot /var/www/newapp

    <FilesMatch \.php$>
        SetHandler "proxy:unix:/run/php/php8.3-fpm.sock|fcgi://localhost"
    </FilesMatch>
</VirtualHost>
```

```apache
# /etc/apache2/sites-available/legacyapp.conf - PHP 7.4
<VirtualHost *:80>
    ServerName legacyapp.example.com
    DocumentRoot /var/www/legacyapp

    <FilesMatch \.php$>
        SetHandler "proxy:unix:/run/php/php7.4-fpm.sock|fcgi://localhost"
    </FilesMatch>
</VirtualHost>
```

## Installing Extensions for Specific Versions

Extensions must be installed separately for each PHP version:

```bash
# Install Redis extension for PHP 8.3 only
sudo apt install php8.3-redis -y

# Install imagick for PHP 7.4 only
sudo apt install php7.4-imagick -y

# Check extensions for a specific version
php8.3 -m | grep redis
php7.4 -m | sort
```

## Managing FPM Services

Each version's FPM service is independent:

```bash
# Enable all versions to start at boot
sudo systemctl enable php7.4-fpm
sudo systemctl enable php8.2-fpm
sudo systemctl enable php8.3-fpm

# Restart a specific version after config changes
sudo systemctl restart php8.3-fpm

# Check status of all FPM versions at once
for v in 7.4 8.2 8.3; do
    echo "=== PHP $v FPM ==="
    sudo systemctl is-active php${v}-fpm
done
```

## Upgrading Applications Between Versions

When migrating an application from PHP 7.4 to PHP 8.3:

```bash
# 1. Test the application with the new PHP version first
# Add a temporary test virtual host pointing to php8.3-fpm.sock

# 2. Check for compatibility issues using the CLI
php8.3 -l /var/www/myapp/index.php

# 3. Run your application's test suite against PHP 8.3
php8.3 vendor/bin/phpunit

# 4. When ready, update the nginx configuration to use php8.3-fpm.sock
# 5. Reload nginx
sudo systemctl reload nginx

# 6. Optionally stop the old FPM version if no longer needed
sudo systemctl stop php7.4-fpm
sudo systemctl disable php7.4-fpm
```

## Listing All Installed PHP Versions

```bash
# Using update-alternatives
update-alternatives --list php

# Check all installed php packages
dpkg -l | grep "php[0-9]" | awk '{print $2}' | sort -u

# Find all php.ini files
find /etc/php -name "php.ini" 2>/dev/null
```

Having multiple PHP versions running simultaneously gives you the flexibility to maintain legacy applications without blocking adoption of newer PHP features. The key is keeping track of which version each application uses and ensuring extension parity across versions when an application is migrated.
