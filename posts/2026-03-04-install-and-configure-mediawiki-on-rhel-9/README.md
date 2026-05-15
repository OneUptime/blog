# How to Install and Configure MediaWiki on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Wiki, Linux

Description: Step-by-step guide on install and configure mediawiki using Red Hat Enterprise Linux 9.

---

MediaWiki can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# Install PHP 8.2, which is required by current MediaWiki releases
sudo dnf -y module install php:8.2

# Install Apache, MariaDB, PHP extensions, and download tools
sudo dnf install -y httpd mariadb-server php-cli php-curl php-gd php-intl php-mbstring php-mysqlnd php-opcache php-xml tar wget

# Download and extract MediaWiki
cd /tmp
wget https://releases.wikimedia.org/mediawiki/1.45/mediawiki-1.45.3.tar.gz
sudo tar -xzf mediawiki-1.45.3.tar.gz -C /var/www
sudo ln -s /var/www/mediawiki-1.45.3 /var/www/html/mediawiki
sudo chown -R apache:apache /var/www/mediawiki-1.45.3
sudo restorecon -Rv /var/www/mediawiki-1.45.3 /var/www/html/mediawiki
```

## Step 2: Configure the Service

Create a MariaDB database and user for MediaWiki:

```bash
# Start MariaDB before creating the database
sudo systemctl enable --now mariadb
sudo mysql_secure_installation

# Log in to MariaDB
sudo mariadb -u root -p
```

Run these SQL statements at the MariaDB prompt:

```sql
CREATE DATABASE wikidatabase CHARACTER SET binary;
CREATE USER 'wiki'@'localhost' IDENTIFIED BY 'THISpasswordSHOULDbeCHANGED';
GRANT ALL PRIVILEGES ON wikidatabase.* TO 'wiki'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 3: Enable and Start the Service

```bash
# Enable and start Apache and PHP-FPM
sudo systemctl enable --now httpd php-fpm

# Restart Apache after installing MediaWiki files
sudo systemctl restart httpd

# Open HTTP traffic if firewalld is running
sudo systemctl is-active --quiet firewalld && sudo firewall-cmd --permanent --add-service=http
sudo systemctl is-active --quiet firewalld && sudo firewall-cmd --reload
```

Open `http://<server-ip-or-hostname>/mediawiki/mw-config/` in a browser and complete the MediaWiki installer. When the installer generates `LocalSettings.php`, copy it to the MediaWiki installation directory:

```bash
sudo install -o apache -g apache -m 640 /path/to/LocalSettings.php /var/www/mediawiki-1.45.3/LocalSettings.php
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status httpd php-fpm mariadb

# Review recent logs
sudo journalctl -u httpd -u php-fpm -u mariadb --no-pager -n 20
```

## Troubleshooting

- If Apache, PHP-FPM, or MariaDB fails to start, check the logs with `sudo journalctl -u httpd -u php-fpm -u mariadb -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep -E 'httpd|mariadb-server|php'`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
