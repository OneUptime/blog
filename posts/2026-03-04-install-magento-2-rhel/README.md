# How to Install Magento 2 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Magento, PHP, Nginx, MySQL, E-Commerce, Linux

Description: Install Magento 2 Open Source on RHEL with Nginx, PHP-FPM, MySQL, and Elasticsearch for a production-ready e-commerce platform.

---

Magento 2 is a feature-rich e-commerce platform. Its installation requires multiple components working together. This guide covers setting up Magento 2 on RHEL 9.

## Install Prerequisites

```bash
# Install Nginx and MariaDB 10.11

sudo dnf install -y nginx
sudo dnf module install -y mariadb:10.11/server

# Install PHP 8.2 with Magento-required extensions
sudo dnf module reset php -y
sudo dnf module enable php:8.2 -y

sudo dnf install -y php-fpm php-cli php-mysqlnd php-gd php-curl \
  php-xml php-mbstring php-zip php-intl php-bcmath php-soap \
  php-opcache php-sodium

# Install OpenSearch (required by Magento 2.4+)
sudo curl -SL https://artifacts.opensearch.org/releases/bundle/opensearch/2.x/opensearch-2.x.repo \
  -o /etc/yum.repos.d/opensearch-2.x.repo

sudo env OPENSEARCH_INITIAL_ADMIN_PASSWORD='OpenSearchPass789!' dnf install -y opensearch
```

## Configure Services

```bash
# Configure MariaDB
sudo systemctl enable --now mariadb
sudo mariadb-secure-installation

sudo mariadb -u root -p << 'SQL'
CREATE DATABASE magento CHARACTER SET utf8mb4;
CREATE USER 'magento'@'localhost' IDENTIFIED BY 'MagentoPass789!';
GRANT ALL PRIVILEGES ON magento.* TO 'magento'@'localhost';
FLUSH PRIVILEGES;
SQL

# Configure OpenSearch
sudo tee -a /etc/opensearch/opensearch.yml << 'YAML'
discovery.type: single-node
plugins.security.disabled: true
YAML

sudo systemctl enable --now opensearch

# Verify OpenSearch is running
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
  magento/project-community-edition=2.4.7-p10 magento2

# Set file permissions
sudo chown -R nginx:nginx /var/www/magento2
sudo find /var/www/magento2 -type d -exec chmod 755 {} \;
sudo find /var/www/magento2 -type f -exec chmod 644 {} \;
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
  --use-rewrites=1 \
  --search-engine=opensearch --opensearch-host=localhost \
  --opensearch-port=9200
```

After installation, run `bin/magento setup:di:compile` and `bin/magento setup:static-content:deploy` for production readiness.
