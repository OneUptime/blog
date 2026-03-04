# How to Install Drupal 10 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Drupal, PHP, Apache, MySQL, CMS, Web Development

Description: Install and configure Drupal 10 CMS on RHEL with Apache, PHP, and MySQL for a powerful content management solution.

---

Drupal 10 is a robust CMS suitable for enterprise websites. This guide covers installing Drupal 10 on RHEL with all required dependencies.

## Install Prerequisites

```bash
# Install Apache, PHP 8.2 (via Remi), and MySQL
sudo dnf install -y httpd mysql-server

# Enable Remi for PHP 8.2 (Drupal 10 requires PHP 8.1+)
sudo dnf install -y https://rpms.remirepo.net/enterprise/remi-release-9.rpm
sudo dnf module reset php -y
sudo dnf module enable php:remi-8.2 -y

# Install PHP with Drupal-required extensions
sudo dnf install -y php php-cli php-fpm php-mysqlnd php-gd \
  php-xml php-mbstring php-json php-opcache php-curl php-zip \
  php-pdo php-intl php-apcu
```

## Configure MySQL

```bash
sudo systemctl enable --now mysqld
sudo mysql_secure_installation

# Create the Drupal database
sudo mysql -u root -p << 'SQL'
CREATE DATABASE drupal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'drupaluser'@'localhost' IDENTIFIED BY 'DrupalPass789!';
GRANT ALL PRIVILEGES ON drupal.* TO 'drupaluser'@'localhost';
FLUSH PRIVILEGES;
SQL
```

## Install Composer and Drupal

```bash
# Install Composer
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php --install-dir=/usr/local/bin --filename=composer

# Create the Drupal project via Composer
cd /var/www
sudo -u apache composer create-project drupal/recommended-project drupal

# Set file permissions
sudo chown -R apache:apache /var/www/drupal
sudo chmod -R 755 /var/www/drupal/web/sites/default
sudo cp /var/www/drupal/web/sites/default/default.settings.php \
  /var/www/drupal/web/sites/default/settings.php
sudo chown apache:apache /var/www/drupal/web/sites/default/settings.php
```

## Configure Apache

```bash
sudo tee /etc/httpd/conf.d/drupal.conf << 'CONF'
<VirtualHost *:80>
    ServerName drupal.example.com
    DocumentRoot /var/www/drupal/web

    <Directory /var/www/drupal/web>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
CONF

sudo systemctl enable --now httpd
```

## SELinux and Firewall

```bash
# Allow Apache to write to Drupal directories
sudo setsebool -P httpd_unified 1
sudo chcon -R -t httpd_sys_rw_content_t /var/www/drupal/web/sites

# Open HTTP port
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

## Adjust PHP Settings

```bash
# Increase memory and upload limits for Drupal
sudo tee /etc/php.d/99-drupal.ini << 'INI'
memory_limit = 256M
upload_max_filesize = 64M
post_max_size = 64M
max_execution_time = 300
INI

sudo systemctl restart php-fpm httpd
```

Navigate to your server's URL to complete the Drupal installation wizard. Select the database credentials you configured earlier.
