# How to Set Up Laravel with Nginx on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Laravel, PHP, Nginx, Web Development, Framework

Description: Deploy a Laravel PHP application on RHEL with Nginx and PHP-FPM, including proper file permissions, Nginx configuration, and SELinux settings.

---

Laravel is a popular PHP framework for building web applications. This guide covers deploying Laravel on RHEL with Nginx serving as the web server.

## Install Dependencies

```bash
# Install Nginx, PHP 8.2 with Laravel-required extensions
sudo dnf install -y nginx php-fpm php-cli php-mysqlnd php-pgsql \
  php-xml php-mbstring php-curl php-zip php-gd php-bcmath \
  php-intl php-opcache php-tokenizer unzip

# Install Composer
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php --install-dir=/usr/local/bin --filename=composer
rm composer-setup.php
```

## Create the Laravel Project

```bash
# Create a new Laravel project
cd /var/www
sudo composer create-project laravel/laravel myapp

# Set proper ownership and permissions
sudo chown -R nginx:nginx /var/www/myapp
sudo chmod -R 755 /var/www/myapp
sudo chmod -R 775 /var/www/myapp/storage /var/www/myapp/bootstrap/cache
```

## Configure Nginx

```bash
sudo tee /etc/nginx/conf.d/laravel.conf << 'CONF'
server {
    listen 80;
    server_name app.example.com;
    root /var/www/myapp/public;

    index index.php;

    # Handle Laravel routing
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Pass PHP requests to PHP-FPM
    location ~ \.php$ {
        fastcgi_pass unix:/run/php-fpm/www.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to dotfiles
    location ~ /\.(?!well-known) {
        deny all;
    }
}
CONF

sudo nginx -t
```

## Configure PHP-FPM

```bash
# Set PHP-FPM to use the nginx user
sudo sed -i 's/^user = apache/user = nginx/' /etc/php-fpm.d/www.conf
sudo sed -i 's/^group = apache/group = nginx/' /etc/php-fpm.d/www.conf

sudo systemctl restart php-fpm
```

## Configure Environment

```bash
# Copy and edit the .env file
cd /var/www/myapp
sudo cp .env.example .env
sudo php artisan key:generate

# Edit .env with your database credentials
sudo vi .env
# Set DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD
```

## SELinux Configuration

```bash
# Allow Nginx to read Laravel files
sudo chcon -R -t httpd_sys_content_t /var/www/myapp
sudo chcon -R -t httpd_sys_rw_content_t /var/www/myapp/storage
sudo chcon -R -t httpd_sys_rw_content_t /var/www/myapp/bootstrap/cache

# Allow Nginx to connect to the database
sudo setsebool -P httpd_can_network_connect_db 1

# Open firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

## Start Services

```bash
sudo systemctl enable --now nginx php-fpm

# Run database migrations
cd /var/www/myapp
sudo -u nginx php artisan migrate

# Cache configuration for production
sudo -u nginx php artisan config:cache
sudo -u nginx php artisan route:cache
sudo -u nginx php artisan view:cache
```

Visit your server URL to see the Laravel welcome page.
