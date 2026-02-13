# How to Set Up WordPress on EC2

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, WordPress, PHP, MySQL

Description: Complete guide to installing and configuring WordPress on an EC2 instance with Apache, PHP, MySQL, SSL, and production-ready performance optimizations.

---

WordPress powers over 40% of the web, and running it on EC2 gives you far more control than shared hosting while being more cost-effective than managed WordPress hosting for many use cases. You get root access, full configuration control, and the ability to scale your infrastructure as your site grows.

Let's set up WordPress from scratch on an EC2 instance, covering everything from the initial server setup to performance optimization.

## Instance Selection and Setup

For a WordPress site getting modest traffic (up to a few thousand visitors per day), a t3.small (2 vCPU, 2 GB RAM) is a good starting point. If you're expecting more traffic or running WooCommerce, go with a t3.medium or larger.

Launch the instance:

```bash
# Create security group
aws ec2 create-security-group \
  --group-name wordpress-sg \
  --description "WordPress server" \
  --vpc-id vpc-0abc123

# Allow HTTP, HTTPS, and SSH
for PORT in 22 80 443; do
  aws ec2 authorize-security-group-ingress \
    --group-id sg-0abc123 \
    --protocol tcp --port $PORT --cidr 0.0.0.0/0
done

# Launch the instance
aws ec2 run-instances \
  --image-id ami-0abc123def456 \
  --instance-type t3.small \
  --key-name my-key \
  --security-group-ids sg-0abc123 \
  --subnet-id subnet-0abc123 \
  --associate-public-ip-address \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=wordpress}]'
```

## Installing the LAMP Stack

WordPress needs Apache, PHP, and MySQL. Let's install everything.

Install the complete stack:

```bash
# Update system
sudo yum update -y

# Install Apache
sudo yum install -y httpd
sudo systemctl start httpd
sudo systemctl enable httpd

# Install MariaDB
sudo yum install -y mariadb105-server
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Install PHP with WordPress-required extensions
sudo yum install -y php php-mysqlnd php-gd php-xml php-mbstring \
  php-json php-opcache php-zip php-curl php-intl php-imagick
```

For a more detailed walkthrough of the LAMP stack setup, see our guide on [setting up LAMP on EC2](https://oneuptime.com/blog/post/2026-02-12-lamp-stack-ec2/view).

## Creating the WordPress Database

Set up a dedicated database and user for WordPress.

Create the database:

```bash
# Secure the MySQL installation first
sudo mysql_secure_installation

# Create WordPress database and user
sudo mysql -u root -p << 'EOF'
CREATE DATABASE wordpress;
CREATE USER 'wp_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON wordpress.* TO 'wp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF
```

## Downloading and Installing WordPress

Download WordPress and set it up in the web root.

Install WordPress:

```bash
# Download the latest WordPress
cd /tmp
curl -O https://wordpress.org/latest.tar.gz

# Extract to the web root
sudo tar -xzf latest.tar.gz -C /var/www/html/ --strip-components=1

# Set proper ownership
sudo chown -R apache:apache /var/www/html/

# Set directory permissions
sudo find /var/www/html/ -type d -exec chmod 755 {} \;
sudo find /var/www/html/ -type f -exec chmod 644 {} \;
```

## Configuring WordPress

Create the WordPress configuration file with your database credentials and security keys.

Set up wp-config.php:

```bash
# Copy the sample config
cd /var/www/html
sudo cp wp-config-sample.php wp-config.php

# Generate security keys (use the WordPress API)
SALT_KEYS=$(curl -s https://api.wordpress.org/secret-key/1.1/salt/)

# Update database settings
sudo sed -i "s/database_name_here/wordpress/" wp-config.php
sudo sed -i "s/username_here/wp_user/" wp-config.php
sudo sed -i "s/password_here/your_strong_password/" wp-config.php
```

You'll also want to add these performance and security settings to wp-config.php:

```php
// Add these lines to wp-config.php before "That's all, stop editing!"

// File system method - direct for better performance
define('FS_METHOD', 'direct');

// Increase memory limit
define('WP_MEMORY_LIMIT', '256M');

// Limit post revisions to save database space
define('WP_POST_REVISIONS', 5);

// Auto-save interval (seconds)
define('AUTOSAVE_INTERVAL', 120);

// Disable file editing from admin panel (security)
define('DISALLOW_FILE_EDIT', true);
```

## Apache Configuration for WordPress

Configure Apache with pretty permalinks and proper caching.

Create the Apache virtual host:

```bash
sudo cat > /etc/httpd/conf.d/wordpress.conf << 'EOF'
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com
    DocumentRoot /var/www/html

    <Directory /var/www/html>
        AllowOverride All
        Require all granted
    </Directory>

    # Enable mod_rewrite for pretty permalinks
    <IfModule mod_rewrite.c>
        RewriteEngine On
    </IfModule>

    # Browser caching for static assets
    <IfModule mod_expires.c>
        ExpiresActive On
        ExpiresByType image/jpg "access plus 1 year"
        ExpiresByType image/jpeg "access plus 1 year"
        ExpiresByType image/png "access plus 1 year"
        ExpiresByType image/gif "access plus 1 year"
        ExpiresByType text/css "access plus 1 month"
        ExpiresByType application/javascript "access plus 1 month"
    </IfModule>

    ErrorLog /var/log/httpd/wordpress_error.log
    CustomLog /var/log/httpd/wordpress_access.log combined
</VirtualHost>
EOF

# Enable mod_rewrite
sudo sed -i 's/#LoadModule rewrite_module/LoadModule rewrite_module/' /etc/httpd/conf.modules.d/00-base.conf

# Test and restart
sudo apachectl configtest
sudo systemctl restart httpd
```

## Setting Up SSL

Secure your WordPress site with a free Let's Encrypt certificate.

Install and configure SSL:

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-apache

# Obtain certificate
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

After SSL is set up, add this to wp-config.php to force HTTPS:

```php
// Force SSL for admin and login
define('FORCE_SSL_ADMIN', true);

// If behind a load balancer or proxy
if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
    $_SERVER['HTTPS'] = 'on';
}
```

## PHP Performance Tuning

Optimize PHP for WordPress performance.

Create a custom PHP configuration:

```bash
sudo cat > /etc/php.d/99-wordpress.ini << 'EOF'
; Memory and limits
memory_limit = 256M
max_execution_time = 300
max_input_vars = 3000
upload_max_filesize = 64M
post_max_size = 64M

; OPcache - critical for WordPress performance
opcache.enable = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 16
opcache.max_accelerated_files = 10000
opcache.revalidate_freq = 60
opcache.fast_shutdown = 1
opcache.save_comments = 1

; Disable display errors in production
display_errors = Off
log_errors = On
error_log = /var/log/php_errors.log
EOF

sudo systemctl restart httpd
```

## MySQL Tuning for WordPress

Optimize MariaDB settings for WordPress workloads.

Tune the database:

```bash
sudo cat > /etc/my.cnf.d/wordpress.cnf << 'EOF'
[mysqld]
# InnoDB settings
innodb_buffer_pool_size = 512M
innodb_log_file_size = 64M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# Query cache
query_cache_type = 1
query_cache_size = 32M
query_cache_limit = 2M

# Connection settings
max_connections = 50
wait_timeout = 300

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/log/mariadb/slow-queries.log
long_query_time = 1
EOF

sudo systemctl restart mariadb
```

## Object Caching with Redis

Redis dramatically improves WordPress performance by caching database queries in memory.

Install and configure Redis:

```bash
# Install Redis
sudo yum install -y redis6
sudo systemctl start redis6
sudo systemctl enable redis6

# Verify Redis is running
redis6-cli ping
```

Install the Redis Object Cache plugin via WP-CLI:

```bash
# Install WP-CLI
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
sudo mv wp-cli.phar /usr/local/bin/wp

# Install and activate Redis plugin
cd /var/www/html
sudo -u apache wp plugin install redis-cache --activate
sudo -u apache wp redis enable
```

## Automated Backups

Set up daily backups of both the database and files.

Create a backup script:

```bash
#!/bin/bash
# /usr/local/bin/backup-wordpress.sh
BACKUP_DIR="/var/backups/wordpress"
DATE=$(date +%Y%m%d)
WP_DIR="/var/www/html"

mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u wp_user -p'your_strong_password' wordpress | \
  gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Files backup (uploads only - code should be in version control)
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz \
  -C $WP_DIR wp-content/uploads

# Sync to S3
aws s3 sync $BACKUP_DIR s3://my-wp-backups/ --delete

# Clean up local backups older than 3 days
find $BACKUP_DIR -mtime +3 -delete
```

Schedule it:

```bash
echo "0 3 * * * /usr/local/bin/backup-wordpress.sh >> /var/log/wp-backup.log 2>&1" | sudo crontab -
```

## Security Hardening

WordPress is a frequent target for attacks. Take these security measures.

Essential security steps:

```bash
# Protect wp-config.php
sudo chmod 600 /var/www/html/wp-config.php

# Block access to sensitive files via .htaccess
sudo cat > /var/www/html/.htaccess << 'HTEOF'
# WordPress permalink rules
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
RewriteBase /
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>

# Block access to wp-config.php
<files wp-config.php>
order allow,deny
deny from all
</files>

# Disable XML-RPC (common attack vector)
<files xmlrpc.php>
order allow,deny
deny from all
</files>

# Block access to .htaccess
<files .htaccess>
order allow,deny
deny from all
</files>
HTEOF

sudo chown apache:apache /var/www/html/.htaccess
```

Install security plugins via WP-CLI:

```bash
# Install and activate Wordfence for security
cd /var/www/html
sudo -u apache wp plugin install wordfence --activate
```

## Monitoring WordPress

Monitor your WordPress site for uptime, performance, and errors. Track page load times, PHP error rates, and database query performance. For a complete monitoring approach, check out our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view).

## Wrapping Up

Running WordPress on EC2 gives you full control over every layer of the stack. The essential components are: Apache for serving PHP, MariaDB for the database, PHP with OPcache for performance, Redis for object caching, SSL for security, and automated backups for peace of mind. This setup can comfortably handle thousands of daily visitors on a t3.small instance, and you can scale up by increasing the instance size or adding a CDN as your traffic grows.
