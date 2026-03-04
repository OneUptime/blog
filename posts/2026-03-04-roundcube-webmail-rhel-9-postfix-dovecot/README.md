# How to Set Up Roundcube Webmail on RHEL 9 with Postfix and Dovecot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Roundcube, Webmail, Postfix, Dovecot, Linux

Description: Install and configure Roundcube webmail on RHEL 9 to give users browser-based access to their email served by Postfix and Dovecot.

---

## Why Roundcube?

Not everyone wants to configure a mail client. Roundcube gives your users a clean, responsive webmail interface that works in any browser. It connects to Dovecot for IMAP access and Postfix for sending mail. Once set up, users can read, compose, and manage email from anywhere without installing anything.

## Architecture

```mermaid
graph LR
    A[Browser] -->|HTTPS| B[Apache/Nginx]
    B --> C[Roundcube PHP]
    C -->|IMAP| D[Dovecot]
    C -->|SMTP| E[Postfix]
    C -->|SQL| F[MariaDB]
```

## Prerequisites

- RHEL 9 with Postfix and Dovecot configured and running
- Apache or Nginx web server
- PHP 8.x
- MariaDB or PostgreSQL for Roundcube's database
- A TLS certificate for the webmail hostname

## Step 1: Install Dependencies

```bash
# Install Apache, PHP, and MariaDB
sudo dnf install -y httpd php php-mysqlnd php-xml php-mbstring php-intl php-zip php-gd php-json php-curl mariadb-server

# Enable and start MariaDB
sudo systemctl enable --now mariadb

# Enable and start Apache
sudo systemctl enable --now httpd
```

## Step 2: Set Up the Database

```bash
# Secure MariaDB installation
sudo mysql_secure_installation
```

Create the Roundcube database:

```bash
# Log into MariaDB
sudo mysql -u root -p
```

```sql
-- Create database and user for Roundcube
CREATE DATABASE roundcubemail CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'roundcube'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON roundcubemail.* TO 'roundcube'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 3: Download and Install Roundcube

```bash
# Download Roundcube (check for latest version at roundcube.net)
cd /tmp
curl -LO https://github.com/roundcube/roundcubemail/releases/download/1.6.9/roundcubemail-1.6.9-complete.tar.gz

# Extract to web directory
sudo tar xzf roundcubemail-1.6.9-complete.tar.gz
sudo mv roundcubemail-1.6.9 /var/www/roundcube

# Set ownership
sudo chown -R apache:apache /var/www/roundcube
```

## Step 4: Initialize the Database Schema

```bash
# Import the initial database schema
sudo mysql -u roundcube -p roundcubemail < /var/www/roundcube/SQL/mysql.initial.sql
```

## Step 5: Configure Roundcube

Copy the sample configuration and edit it:

```bash
sudo cp /var/www/roundcube/config/config.inc.php.sample /var/www/roundcube/config/config.inc.php
sudo vi /var/www/roundcube/config/config.inc.php
```

Key settings:

```php
<?php
// Database connection
$config['db_dsnw'] = 'mysql://roundcube:your_secure_password@localhost/roundcubemail';

// IMAP server (Dovecot)
$config['imap_host'] = 'ssl://localhost:993';

// SMTP server (Postfix)
$config['smtp_host'] = 'tls://localhost:587';
$config['smtp_user'] = '%u';
$config['smtp_pass'] = '%p';

// System settings
$config['support_url'] = '';
$config['product_name'] = 'Webmail';
$config['des_key'] = 'change_this_to_a_random_24char_string';

// Default IMAP folders
$config['drafts_mbox'] = 'Drafts';
$config['junk_mbox'] = 'Junk';
$config['sent_mbox'] = 'Sent';
$config['trash_mbox'] = 'Trash';

// Plugins
$config['plugins'] = [
    'archive',
    'zipdownload',
    'managesieve',
];

// Session lifetime (10 minutes)
$config['session_lifetime'] = 10;

// Upload size limit (25 MB)
$config['max_message_size'] = '25M';
```

## Step 6: Configure Apache Virtual Host

Create `/etc/httpd/conf.d/roundcube.conf`:

```apache
<VirtualHost *:443>
    ServerName webmail.example.com
    DocumentRoot /var/www/roundcube/public_html

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/webmail.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/webmail.example.com/privkey.pem

    <Directory /var/www/roundcube/public_html>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>

    # Block access to sensitive directories
    <Directory /var/www/roundcube/config>
        Require all denied
    </Directory>
    <Directory /var/www/roundcube/temp>
        Require all denied
    </Directory>
    <Directory /var/www/roundcube/logs>
        Require all denied
    </Directory>

    ErrorLog /var/log/httpd/roundcube-error.log
    CustomLog /var/log/httpd/roundcube-access.log combined
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName webmail.example.com
    Redirect permanent / https://webmail.example.com/
</VirtualHost>
```

If Roundcube does not have a `public_html` directory (depends on version), use the main directory and add deny rules:

```bash
# Check if public_html exists
ls /var/www/roundcube/public_html/
```

If not, set `DocumentRoot` to `/var/www/roundcube` and add the directory deny rules shown above.

## Step 7: PHP Configuration

Edit `/etc/php.ini` for Roundcube:

```
# Increase upload size for attachments
upload_max_filesize = 25M
post_max_size = 26M

# Set timezone
date.timezone = UTC

# Session settings
session.auto_start = 0
session.gc_maxlifetime = 21600
```

## Step 8: SELinux Configuration

```bash
# Allow Apache to connect to IMAP and SMTP
sudo setsebool -P httpd_can_network_connect 1

# Allow Apache to send mail
sudo setsebool -P httpd_can_sendmail 1

# Set correct context for Roundcube directories
sudo semanage fcontext -a -t httpd_sys_rw_content_t "/var/www/roundcube/temp(/.*)?"
sudo semanage fcontext -a -t httpd_sys_rw_content_t "/var/www/roundcube/logs(/.*)?"
sudo restorecon -Rv /var/www/roundcube/
```

## Step 9: Firewall

```bash
# Allow HTTPS
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

## Step 10: Start and Test

```bash
# Restart Apache
sudo systemctl restart httpd

# Check for errors
sudo tail -20 /var/log/httpd/roundcube-error.log
```

Open your browser and navigate to `https://webmail.example.com`. You should see the Roundcube login page. Log in with an email address and password configured in Dovecot.

## Step 11: Remove the Installer

After verifying everything works, remove the installer directory:

```bash
# Remove the web installer for security
sudo rm -rf /var/www/roundcube/installer
```

## Enabling ManageSieve Plugin

The ManageSieve plugin lets users manage Sieve filters through the Roundcube interface. Make sure Dovecot's ManageSieve service is enabled:

Edit `/etc/dovecot/conf.d/20-managesieve.conf`:

```
protocols = $protocols sieve

service managesieve-login {
  inet_listener sieve {
    port = 4190
  }
}
```

```bash
sudo systemctl restart dovecot
```

## Troubleshooting

**Cannot log in:**

Check that Dovecot IMAP is running and accessible:

```bash
openssl s_client -connect localhost:993
```

Check Roundcube logs:

```bash
sudo tail -20 /var/www/roundcube/logs/errors.log
```

**Cannot send email:**

Verify the SMTP connection to Postfix:

```bash
telnet localhost 587
```

Check SELinux:

```bash
sudo ausearch -m avc -ts recent | grep httpd
```

**Database errors:**

Verify the database connection:

```bash
mysql -u roundcube -p -e "USE roundcubemail; SHOW TABLES;"
```

## Wrapping Up

Roundcube provides a solid webmail experience that your users will find familiar and easy to use. With the ManageSieve plugin, they can manage their own server-side mail filters without bugging you. Just make sure to keep Roundcube updated regularly since it is a public-facing web application.
