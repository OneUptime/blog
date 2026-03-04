# How to Install PHP 8.2 on RHEL Using the Remi Repository

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PHP, Remi, Web Development, Linux

Description: Install PHP 8.2 on RHEL using the Remi repository to get the latest PHP features and security updates beyond what the default AppStream provides.

---

RHEL's default AppStream repository may not ship the latest PHP version. The Remi repository maintained by Remi Collet provides up-to-date PHP packages for RHEL. This guide covers installing PHP 8.2 from Remi.

## Enable Required Repositories

```bash
# Install EPEL (required dependency for Remi)
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# Install the Remi repository
sudo dnf install -y https://rpms.remirepo.net/enterprise/remi-release-9.rpm
```

## Install PHP 8.2

```bash
# List available PHP module streams
sudo dnf module list php

# Reset any existing PHP module stream
sudo dnf module reset php -y

# Enable the Remi PHP 8.2 module stream
sudo dnf module enable php:remi-8.2 -y

# Install PHP 8.2 with common extensions
sudo dnf install -y php php-cli php-common php-fpm \
  php-mysqlnd php-pgsql php-opcache php-curl \
  php-xml php-mbstring php-json php-zip php-gd \
  php-intl php-bcmath php-soap
```

## Verify the Installation

```bash
# Check PHP version
php -v
# Expected output: PHP 8.2.x (cli) ...

# List installed PHP modules
php -m

# Check PHP configuration
php --ini
```

## Configure PHP-FPM

```bash
# Edit PHP-FPM pool configuration
sudo vi /etc/php-fpm.d/www.conf

# Key settings to adjust:
# user = nginx         (or apache, depending on your web server)
# group = nginx
# listen = /run/php-fpm/www.sock
# listen.owner = nginx
# listen.group = nginx
```

Start and enable PHP-FPM:

```bash
# Start PHP-FPM
sudo systemctl enable --now php-fpm

# Verify it is running
sudo systemctl status php-fpm
```

## Test PHP with a Web Server

```bash
# Create a PHP info page
echo '<?php phpinfo(); ?>' | sudo tee /var/www/html/info.php

# Set correct SELinux context
sudo restorecon -Rv /var/www/html/

# Test from the command line
php /var/www/html/info.php | head -5
```

## Update PHP via Remi

```bash
# Update PHP and all extensions
sudo dnf update -y php*
```

Remember to remove the `info.php` file after testing, as it exposes sensitive server information. With Remi, you can stay current with PHP releases and receive timely security patches.
