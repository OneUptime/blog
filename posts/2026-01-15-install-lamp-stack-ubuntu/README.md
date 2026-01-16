# How to Install a LAMP Stack (Linux, Apache, MySQL, PHP) on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, LAMP, Apache, MySQL, PHP, Web Server, Tutorial

Description: A comprehensive guide to installing and configuring a complete LAMP stack on Ubuntu for hosting dynamic web applications.

---

The LAMP stack (Linux, Apache, MySQL, PHP) is one of the most popular web server configurations for hosting dynamic websites and web applications. This guide walks you through installing and configuring each component on Ubuntu.

## Prerequisites

- Ubuntu 22.04 or 24.04 LTS
- Root or sudo access
- A terminal connection

## Step 1: Update Your System

Before installing any packages, update your system's package index.

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y
```

## Step 2: Install Apache Web Server

Apache is the web server component that handles HTTP requests.

```bash
# Install Apache2 web server
sudo apt install apache2 -y

# Start Apache and enable it to start on boot
sudo systemctl start apache2
sudo systemctl enable apache2

# Verify Apache is running
sudo systemctl status apache2
```

Test your installation by opening `http://your_server_ip` in a browser. You should see the Apache2 Ubuntu Default Page.

### Configure Firewall

If you have UFW enabled, allow HTTP and HTTPS traffic:

```bash
# Allow Apache through the firewall
sudo ufw allow in "Apache Full"

# Verify the rule was added
sudo ufw status
```

## Step 3: Install MySQL Database Server

MySQL stores your application data.

```bash
# Install MySQL server
sudo apt install mysql-server -y

# Start MySQL and enable it on boot
sudo systemctl start mysql
sudo systemctl enable mysql

# Verify MySQL is running
sudo systemctl status mysql
```

### Secure MySQL Installation

Run the security script to set a root password and remove insecure defaults:

```bash
# Run MySQL secure installation wizard
sudo mysql_secure_installation
```

Follow the prompts to:
- Set up the VALIDATE PASSWORD component (optional)
- Set a root password
- Remove anonymous users
- Disallow root login remotely
- Remove test database
- Reload privilege tables

### Test MySQL Access

```bash
# Log into MySQL as root
sudo mysql

# Once inside MySQL, check the version
SELECT VERSION();

# Exit MySQL
exit
```

## Step 4: Install PHP

PHP processes dynamic content and connects to MySQL.

```bash
# Install PHP and common modules for web development
sudo apt install php libapache2-mod-php php-mysql php-cli php-curl php-gd php-mbstring php-xml php-zip -y

# Verify PHP installation
php -v
```

### Configure PHP with Apache

Apache needs to prioritize PHP files. Edit the directory index configuration:

```bash
# Edit Apache's directory index configuration
sudo nano /etc/apache2/mods-enabled/dir.conf
```

Move `index.php` to the front of the list:

```apache
<IfModule mod_dir.c>
    DirectoryIndex index.php index.html index.cgi index.pl index.xhtml index.htm
</IfModule>
```

Restart Apache to apply changes:

```bash
# Restart Apache to load PHP module
sudo systemctl restart apache2
```

## Step 5: Test Your LAMP Stack

Create a PHP info file to verify everything works together.

```bash
# Create a PHP test file in the web root
sudo nano /var/www/html/info.php
```

Add this content:

```php
<?php
// Display PHP configuration information
phpinfo();
?>
```

Visit `http://your_server_ip/info.php` in your browser. You should see the PHP information page showing version, modules, and configuration.

**Security Note:** Remove this file after testing:

```bash
# Remove the info.php file - it exposes sensitive server information
sudo rm /var/www/html/info.php
```

## Step 6: Test Database Connectivity

Create a simple PHP script to test MySQL connectivity.

```bash
# Create a database connection test file
sudo nano /var/www/html/db_test.php
```

Add this content (replace credentials with your own):

```php
<?php
// Database connection test script
$servername = "localhost";
$username = "root";
$password = "your_mysql_password";

// Create connection using mysqli
$conn = new mysqli($servername, $username, $password);

// Check if connection was successful
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
echo "Connected successfully to MySQL!";

// Close the connection
$conn->close();
?>
```

Test by visiting `http://your_server_ip/db_test.php`, then remove the file:

```bash
# Remove test file after verification
sudo rm /var/www/html/db_test.php
```

## Step 7: Create a MySQL User for Applications

Never use root for application database access. Create a dedicated user:

```bash
# Log into MySQL
sudo mysql
```

Run these SQL commands to create a new database and user:

```sql
-- Create a new database for your application
CREATE DATABASE myapp_db;

-- Create a new user with a strong password
CREATE USER 'myapp_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';

-- Grant all privileges on the application database to the new user
GRANT ALL PRIVILEGES ON myapp_db.* TO 'myapp_user'@'localhost';

-- Apply the privilege changes
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

## Virtual Hosts (Optional)

To host multiple websites, create virtual hosts:

```bash
# Create directory structure for your site
sudo mkdir -p /var/www/mysite.com/public_html

# Set ownership to the web server user
sudo chown -R www-data:www-data /var/www/mysite.com

# Create virtual host configuration file
sudo nano /etc/apache2/sites-available/mysite.com.conf
```

Add this configuration:

```apache
<VirtualHost *:80>
    ServerAdmin admin@mysite.com
    ServerName mysite.com
    ServerAlias www.mysite.com
    DocumentRoot /var/www/mysite.com/public_html

    <Directory /var/www/mysite.com/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/mysite.com_error.log
    CustomLog ${APACHE_LOG_DIR}/mysite.com_access.log combined
</VirtualHost>
```

Enable the site and reload Apache:

```bash
# Enable the new virtual host
sudo a2ensite mysite.com.conf

# Enable mod_rewrite for clean URLs
sudo a2enmod rewrite

# Test Apache configuration for syntax errors
sudo apache2ctl configtest

# Reload Apache to apply changes
sudo systemctl reload apache2
```

## Troubleshooting

### Apache Won't Start
```bash
# Check Apache error logs
sudo tail -f /var/log/apache2/error.log

# Test configuration syntax
sudo apache2ctl configtest
```

### MySQL Connection Issues
```bash
# Check MySQL status and logs
sudo systemctl status mysql
sudo tail -f /var/log/mysql/error.log
```

### PHP Not Processing
```bash
# Verify PHP module is enabled
sudo a2enmod php8.1  # or php8.3 depending on your version

# Restart Apache after enabling
sudo systemctl restart apache2
```

## Security Best Practices

1. **Keep packages updated**: Run `sudo apt update && sudo apt upgrade` regularly
2. **Use strong passwords**: Especially for MySQL root and application users
3. **Enable HTTPS**: Use Let's Encrypt for free SSL certificates
4. **Configure firewall**: Only allow necessary ports (80, 443, 22)
5. **Disable directory listing**: Add `Options -Indexes` to Apache configs
6. **Hide server version**: Add `ServerTokens Prod` to `/etc/apache2/apache2.conf`

---

Your LAMP stack is now ready to host PHP applications like WordPress, Laravel, or custom web apps. For production environments, consider adding SSL certificates with Let's Encrypt and implementing additional security hardening measures.
