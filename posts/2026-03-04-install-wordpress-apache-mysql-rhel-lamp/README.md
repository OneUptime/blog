# How to Install WordPress with Apache and MySQL on RHEL (LAMP Stack)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, WordPress, Apache, MySQL, LAMP, PHP, Web Development

Description: Set up a complete WordPress site on RHEL using the classic LAMP stack with Apache, MySQL, and PHP for a production-ready web server.

---

The LAMP stack (Linux, Apache, MySQL, PHP) is the classic foundation for hosting WordPress. This guide walks through a complete WordPress installation on RHEL.

## Install the LAMP Stack

```bash
# Install Apache, MySQL, and PHP with required extensions
sudo dnf install -y httpd mysql-server php php-mysqlnd \
  php-json php-xml php-mbstring php-curl php-zip php-gd php-intl

# Start and enable all services
sudo systemctl enable --now httpd mysqld
```

## Configure MySQL

```bash
# Run the secure installation script
sudo mysql_secure_installation

# Log into MySQL and create the WordPress database
sudo mysql -u root -p << 'SQL'
CREATE DATABASE wordpress DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wpuser'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON wordpress.* TO 'wpuser'@'localhost';
FLUSH PRIVILEGES;
SQL
```

## Download and Configure WordPress

```bash
# Download the latest WordPress
cd /tmp
curl -O https://wordpress.org/latest.tar.gz

# Extract to the web root
sudo tar xzf latest.tar.gz -C /var/www/html/
sudo mv /var/www/html/wordpress/* /var/www/html/

# Set ownership
sudo chown -R apache:apache /var/www/html/

# Create wp-config.php from the sample
cd /var/www/html
sudo cp wp-config-sample.php wp-config.php

# Update database settings
sudo sed -i "s/database_name_here/wordpress/" wp-config.php
sudo sed -i "s/username_here/wpuser/" wp-config.php
sudo sed -i "s/password_here/StrongPassword123!/" wp-config.php
```

Generate unique salt keys:

```bash
# Fetch fresh salt keys from the WordPress API
curl -s https://api.wordpress.org/secret-key/1.1/salt/
# Copy the output and replace the placeholder lines in wp-config.php
```

## Configure Apache Virtual Host

```bash
sudo tee /etc/httpd/conf.d/wordpress.conf << 'CONF'
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/html

    <Directory /var/www/html>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
CONF

# Enable mod_rewrite for permalinks
sudo httpd -M | grep rewrite
# If not loaded, it should be enabled by default on RHEL
```

## SELinux and Firewall

```bash
# Allow Apache to write to WordPress directories
sudo setsebool -P httpd_can_network_connect 1
sudo setsebool -P httpd_unified 1

# Set SELinux context for WordPress files
sudo chcon -R -t httpd_sys_rw_content_t /var/www/html/wp-content

# Open firewall for HTTP
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload

# Restart Apache
sudo systemctl restart httpd
```

Navigate to your server's IP address in a browser to complete the WordPress installation wizard.
