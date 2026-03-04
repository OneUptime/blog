# How to Install Magento 2 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Magento, PHP, Nginx, MySQL, E-Commerce, Linux

Description: Install Magento 2 Open Source on RHEL with Nginx, PHP-FPM, MySQL, and Elasticsearch for a production-ready e-commerce platform.

---

Magento 2 is a feature-rich e-commerce platform. Its installation requires multiple components working together. This guide covers setting up Magento 2 on RHEL.

## Install Prerequisites

```bash
# Install Nginx and MySQL
sudo dnf install -y nginx mysql-server

# Install PHP 8.2 via Remi with Magento-required extensions
sudo dnf install -y https://rpms.remirepo.net/enterprise/remi-release-9.rpm
sudo dnf module reset php -y && sudo dnf module enable php:remi-8.2 -y

sudo dnf install -y php-fpm php-cli php-mysqlnd php-gd php-curl \
  php-xml php-mbstring php-zip php-intl php-bcmath php-soap \
  php-opcache php-sodium

# Install Elasticsearch (required by Magento 2.4+)
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch
sudo tee /etc/yum.repos.d/elasticsearch.repo << 'REPO'
[elasticsearch]
name=Elasticsearch repository
baseurl=https://artifacts.elastic.co/packages/7.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
REPO

sudo dnf install -y elasticsearch
```

## Configure Services

```bash
# Configure MySQL
sudo systemctl enable --now mysqld
sudo mysql_secure_installation

sudo mysql -u root -p << 'SQL'
CREATE DATABASE magento CHARACTER SET utf8mb4;
CREATE USER 'magento'@'localhost' IDENTIFIED BY 'MagentoPass789!';
GRANT ALL PRIVILEGES ON magento.* TO 'magento'@'localhost';
FLUSH PRIVILEGES;
SQL

# Configure Elasticsearch
sudo systemctl enable --now elasticsearch

# Verify Elasticsearch is running
curl -s http://localhost:9200
```

## Install Composer and Magento

```bash
# Install Composer if not already present
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php --install-dir=/usr/local/bin --filename=composer

# Create the Magento project
# You will need Magento authentication keys from marketplace.magento.com
cd /var/www
sudo composer create-project --repository-url=https://repo.magento.com/ \
  magento/project-community-edition magento2

# Set file permissions
sudo chown -R nginx:nginx /var/www/magento2
find /var/www/magento2 -type d -exec chmod 755 {} \;
find /var/www/magento2 -type f -exec chmod 644 {} \;
sudo chmod -R 775 /var/www/magento2/{var,generated,pub/static,pub/media,app/etc}
```

## Configure Nginx

```bash
# Copy the Magento Nginx config template
sudo cp /var/www/magento2/nginx.conf.sample /etc/nginx/conf.d/magento.conf.inc

sudo tee /etc/nginx/conf.d/magento.conf << 'CONF'
upstream fastcgi_backend {
    server unix:/run/php-fpm/www.sock;
}
server {
    listen 80;
    server_name shop.example.com;
    set $MAGE_ROOT /var/www/magento2;
    include /etc/nginx/conf.d/magento.conf.inc;
}
CONF

sudo nginx -t && sudo systemctl enable --now nginx php-fpm
```

## Run the Magento Installer

```bash
cd /var/www/magento2
sudo -u nginx bin/magento setup:install \
  --base-url=http://shop.example.com \
  --db-host=localhost --db-name=magento \
  --db-user=magento --db-password=MagentoPass789! \
  --admin-firstname=Admin --admin-lastname=User \
  --admin-email=admin@example.com \
  --admin-user=admin --admin-password=Admin123! \
  --language=en_US --currency=USD --timezone=America/New_York \
  --search-engine=elasticsearch7 --elasticsearch-host=localhost
```

After installation, run `bin/magento setup:di:compile` and `bin/magento setup:static-content:deploy` for production readiness.
