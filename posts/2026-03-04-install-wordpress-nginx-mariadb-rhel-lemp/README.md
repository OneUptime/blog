# How to Install WordPress with Nginx and MariaDB on RHEL (LEMP Stack)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, WordPress, Nginx, MariaDB, LEMP, PHP, Web Development

Description: Deploy WordPress on RHEL using the LEMP stack (Linux, Nginx, MariaDB, PHP-FPM) for better performance and lower memory usage than a traditional LAMP setup.

---

The LEMP stack replaces Apache with Nginx and MySQL with MariaDB for a lighter, often faster WordPress hosting environment. This guide covers the full setup on RHEL.

## Install LEMP Components

```bash
# Install Nginx, MariaDB, and PHP-FPM with extensions
sudo dnf install -y nginx mariadb-server php-fpm php-mysqlnd \
  php-json php-xml php-mbstring php-curl php-zip php-gd php-opcache

# Start and enable services
sudo systemctl enable --now nginx mariadb php-fpm
```

## Configure MariaDB

```bash
# Secure the MariaDB installation
sudo mysql_secure_installation

# Create the WordPress database and user
sudo mysql -u root -p -e "
CREATE DATABASE wordpress CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wpuser'@'localhost' IDENTIFIED BY 'SecurePass456!';
GRANT ALL PRIVILEGES ON wordpress.* TO 'wpuser'@'localhost';
FLUSH PRIVILEGES;
"
```

## Configure PHP-FPM for Nginx

```bash
# Edit the PHP-FPM pool to use nginx user
sudo sed -i 's/^user = apache/user = nginx/' /etc/php-fpm.d/www.conf
sudo sed -i 's/^group = apache/group = nginx/' /etc/php-fpm.d/www.conf
sudo sed -i 's/^listen.owner = nobody/listen.owner = nginx/' /etc/php-fpm.d/www.conf
sudo sed -i 's/^listen.group = nobody/listen.group = nginx/' /etc/php-fpm.d/www.conf

# Restart PHP-FPM
sudo systemctl restart php-fpm
```

## Download WordPress

```bash
cd /tmp
curl -O https://wordpress.org/latest.tar.gz
sudo tar xzf latest.tar.gz -C /var/www/
sudo chown -R nginx:nginx /var/www/wordpress

# Configure wp-config.php
cd /var/www/wordpress
sudo cp wp-config-sample.php wp-config.php
sudo sed -i "s/database_name_here/wordpress/" wp-config.php
sudo sed -i "s/username_here/wpuser/" wp-config.php
sudo sed -i "s/password_here/SecurePass456!/" wp-config.php
```

## Configure Nginx Server Block

```bash
sudo tee /etc/nginx/conf.d/wordpress.conf << 'CONF'
server {
    listen 80;
    server_name example.com;
    root /var/www/wordpress;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php-fpm/www.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to sensitive files
    location ~ /\.(ht|git) {
        deny all;
    }
}
CONF

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

## SELinux and Firewall

```bash
# Allow Nginx to read WordPress files and connect to the database
sudo setsebool -P httpd_can_network_connect_db 1
sudo chcon -R -t httpd_sys_rw_content_t /var/www/wordpress/wp-content

# Open HTTP port
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

Visit your server in a browser to complete the WordPress setup wizard.
