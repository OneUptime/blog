# How to Set Up a LAMP Stack on EC2

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, LAMP, PHP, MySQL

Description: Complete guide to setting up a Linux, Apache, MySQL, and PHP (LAMP) stack on an EC2 instance for hosting web applications and dynamic websites.

---

The LAMP stack - Linux, Apache, MySQL, and PHP - has been powering web applications for over two decades, and it's still a solid choice for many projects. Setting it up on EC2 gives you the flexibility of cloud infrastructure with the familiarity of a traditional web hosting environment.

Let's walk through setting up a production-ready LAMP stack from a fresh EC2 instance to a working web application.

## Launching the EC2 Instance

Start by launching an Amazon Linux 2023 instance. For a LAMP stack, a t3.small (2 vCPU, 2 GB RAM) is a good starting point for small to medium sites.

Launch the instance with the right security group:

```bash
# Create a security group for the LAMP server
aws ec2 create-security-group \
  --group-name lamp-server-sg \
  --description "LAMP stack security group" \
  --vpc-id vpc-0abc123

# Allow SSH, HTTP, and HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# Launch the instance
aws ec2 run-instances \
  --image-id ami-0abc123def456 \
  --instance-type t3.small \
  --key-name my-key \
  --security-group-ids sg-0abc123 \
  --subnet-id subnet-0abc123 \
  --associate-public-ip-address \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=lamp-server}]'
```

## Installing Apache

SSH into your instance and install the Apache web server.

Install and start Apache:

```bash
# Update the system
sudo yum update -y

# Install Apache
sudo yum install -y httpd

# Start Apache and enable it on boot
sudo systemctl start httpd
sudo systemctl enable httpd

# Verify Apache is running
sudo systemctl status httpd
```

At this point, you should be able to visit your instance's public IP in a browser and see the Apache test page.

## Installing MySQL (MariaDB)

Amazon Linux 2023 uses MariaDB as its MySQL-compatible database. It's a drop-in replacement that's fully compatible with MySQL clients and applications.

Install and secure MariaDB:

```bash
# Install MariaDB server
sudo yum install -y mariadb105-server

# Start and enable MariaDB
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Run the security script to set root password and remove defaults
sudo mysql_secure_installation
```

During the secure installation, you'll be prompted to:
- Set a root password (do this)
- Remove anonymous users (yes)
- Disallow root login remotely (yes)
- Remove test database (yes)
- Reload privilege tables (yes)

Create a database and user for your application:

```bash
# Log into MySQL
sudo mysql -u root -p

# Run these SQL commands:
```

```sql
-- Create a database for your application
CREATE DATABASE myapp;

-- Create a dedicated user (don't use root for applications)
CREATE USER 'myapp_user'@'localhost' IDENTIFIED BY 'strong_password_here';

-- Grant permissions
GRANT ALL PRIVILEGES ON myapp.* TO 'myapp_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
EXIT;
```

## Installing PHP

Now install PHP with the extensions commonly needed for web applications.

Install PHP and essential extensions:

```bash
# Install PHP and common extensions
sudo yum install -y php php-mysqlnd php-pdo php-gd php-mbstring \
  php-xml php-json php-opcache php-zip php-curl php-intl

# Verify PHP installation
php -v

# Check installed modules
php -m
```

Restart Apache to load the PHP module:

```bash
# Restart Apache to pick up PHP
sudo systemctl restart httpd
```

## Testing the LAMP Stack

Create a PHP test file to verify everything works together.

Create a test page:

```bash
# Create a PHP info page
sudo cat > /var/www/html/info.php << 'EOF'
<?php
phpinfo();
?>
EOF
```

Visit `http://your-instance-ip/info.php` in your browser. You should see the PHP info page showing all configuration details. Once you've confirmed it works, remove this file - it exposes sensitive server information.

```bash
# Remove the info page after testing
sudo rm /var/www/html/info.php
```

Test the database connection from PHP:

```bash
# Create a database connection test
sudo cat > /var/www/html/dbtest.php << 'EOF'
<?php
$host = 'localhost';
$dbname = 'myapp';
$username = 'myapp_user';
$password = 'strong_password_here';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Database connection successful!";
} catch(PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
}
?>
EOF
```

## Configuring Apache Virtual Hosts

For hosting actual applications, set up a virtual host instead of using the default document root.

Create a virtual host configuration:

```bash
# Create directory structure for your site
sudo mkdir -p /var/www/myapp/public
sudo mkdir -p /var/www/myapp/logs

# Set ownership
sudo chown -R apache:apache /var/www/myapp

# Create the virtual host config
sudo cat > /etc/httpd/conf.d/myapp.conf << 'EOF'
<VirtualHost *:80>
    ServerName myapp.example.com
    DocumentRoot /var/www/myapp/public

    <Directory /var/www/myapp/public>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog /var/www/myapp/logs/error.log
    CustomLog /var/www/myapp/logs/access.log combined
</VirtualHost>
EOF

# Test the configuration
sudo apachectl configtest

# Reload Apache
sudo systemctl reload httpd
```

## PHP Performance Tuning

The default PHP configuration is conservative. Tune it for better performance.

Adjust key PHP settings:

```bash
# Edit PHP configuration
sudo cat > /etc/php.d/99-custom.ini << 'EOF'
; Memory and execution limits
memory_limit = 256M
max_execution_time = 60
max_input_time = 60

; Upload settings
upload_max_filesize = 64M
post_max_size = 64M

; OPcache settings for production
opcache.enable = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 16
opcache.max_accelerated_files = 10000
opcache.revalidate_freq = 60
opcache.fast_shutdown = 1

; Session settings
session.save_handler = files
session.gc_maxlifetime = 1440

; Error logging (disable display in production)
display_errors = Off
log_errors = On
error_log = /var/log/php_errors.log
EOF

# Restart Apache to apply changes
sudo systemctl restart httpd
```

## MySQL Performance Tuning

Adjust MySQL settings based on your instance size.

Optimize MariaDB for a t3.small instance:

```bash
# Create custom MySQL configuration
sudo cat > /etc/my.cnf.d/custom.cnf << 'EOF'
[mysqld]
# Buffer pool - set to ~50-70% of available RAM
innodb_buffer_pool_size = 768M

# Log file size
innodb_log_file_size = 128M

# Connection limits
max_connections = 50

# Query cache (helpful for read-heavy workloads)
query_cache_type = 1
query_cache_size = 32M
query_cache_limit = 2M

# Slow query logging
slow_query_log = 1
slow_query_log_file = /var/log/mariadb/slow-queries.log
long_query_time = 2
EOF

# Restart MariaDB
sudo systemctl restart mariadb
```

## Setting Up SSL with Let's Encrypt

Every production site needs HTTPS. Let's Encrypt provides free SSL certificates.

Install and configure Certbot:

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-apache

# Obtain and install certificate (replace with your domain)
sudo certbot --apache -d myapp.example.com

# Verify auto-renewal is set up
sudo certbot renew --dry-run
```

Certbot automatically configures Apache for HTTPS and sets up a cron job for renewal.

## Security Hardening

A few essential security measures for a LAMP server:

```bash
# Disable Apache server signature (hides version info)
echo "ServerSignature Off" | sudo tee -a /etc/httpd/conf/httpd.conf
echo "ServerTokens Prod" | sudo tee -a /etc/httpd/conf/httpd.conf

# Disable directory listing
sudo sed -i 's/Options Indexes FollowSymLinks/Options FollowSymLinks/' /etc/httpd/conf/httpd.conf

# Set proper file permissions
sudo find /var/www/myapp -type d -exec chmod 755 {} \;
sudo find /var/www/myapp -type f -exec chmod 644 {} \;

# Enable ModSecurity (web application firewall) if needed
sudo yum install -y mod_security

# Restart Apache
sudo systemctl restart httpd
```

## Automated Backups

Set up automated database backups:

```bash
#!/bin/bash
# /usr/local/bin/backup-db.sh

BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="myapp"

mkdir -p $BACKUP_DIR

# Create backup
mysqldump -u root -p'your_root_password' $DB_NAME | gzip > $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# Remove backups older than 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: ${DB_NAME}_${DATE}.sql.gz"
```

Schedule it with cron:

```bash
# Run backup daily at 2 AM
echo "0 2 * * * /usr/local/bin/backup-db.sh >> /var/log/db-backup.log 2>&1" | sudo crontab -
```

For comprehensive monitoring of your LAMP stack, including Apache performance, MySQL query times, and PHP error rates, check out our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view).

## Wrapping Up

A LAMP stack on EC2 gives you a battle-tested web hosting environment with full control. The key steps are: install Apache, MariaDB, and PHP; configure virtual hosts; tune performance settings for your instance size; set up SSL; and implement backups. It's a setup that's been powering the web for decades, and it works just as well in the cloud as it does on bare metal.
