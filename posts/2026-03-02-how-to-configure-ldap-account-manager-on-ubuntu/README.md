# How to Configure LDAP Account Manager on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LDAP, LAM, Directory Services, Web Administration

Description: Learn how to install and configure LDAP Account Manager (LAM) on Ubuntu for easy web-based management of LDAP directories and user accounts.

---

LDAP Account Manager (LAM) is a web-based front-end for managing LDAP directories. It works with OpenLDAP, 389 Directory Server, Active Directory, and other LDAP-compliant directories. LAM removes the need to write LDIF files by hand for routine tasks like creating users, managing groups, and assigning roles - making it accessible to administrators who do not want to use command-line LDAP tools for every operation.

## Prerequisites

- Ubuntu 22.04 or newer
- A running LDAP server (OpenLDAP or 389 Directory Server)
- Apache or Nginx web server
- PHP 8.x
- Root or sudo access

## Installing LAM

```bash
# Update the package list
sudo apt update

# Install LDAP Account Manager and its dependencies
sudo apt install -y ldap-account-manager

# LAM installs Apache as a dependency if not already present
# Verify Apache is running
sudo systemctl status apache2
```

The package installs LAM under `/usr/share/ldap-account-manager/` and creates an Apache configuration at `/etc/apache2/conf-available/ldap-account-manager.conf`.

## Enabling the LAM Configuration

```bash
# Enable the LAM Apache configuration
sudo a2enconf ldap-account-manager

# Reload Apache
sudo systemctl reload apache2

# Access LAM at:
# http://your-server/lam
```

## Initial LAM Setup

Open a browser and navigate to `http://your-server/lam`. The first time you access it, click "LAM configuration" in the top right corner.

### Setting the Master Password

```bash
# The default master password is "lam"
# You should change it immediately via the web UI:
# LAM Configuration -> Edit general settings -> Change master password
```

### Creating a Server Profile

A server profile tells LAM how to connect to your LDAP directory:

1. Navigate to **LAM Configuration -> Edit server profiles**
2. Click **Add profile** (or edit the default one)
3. Configure the settings:

```
Profile name: myldap
Server address: ldap://localhost:389
Tree suffix: dc=example,dc=com
Bind user: cn=admin,dc=example,dc=com
Bind password: your_admin_password
```

For TLS connections, change the server address to `ldaps://localhost:636` and adjust the SSL settings accordingly.

### Configuring Account Types

In the server profile, configure which account types LAM should manage:

```
Account types -> Add account type:
- Users: enabled, suffix ou=People,dc=example,dc=com
- Groups: enabled, suffix ou=Groups,dc=example,dc=com
- Hosts: enabled if needed
```

## Securing LAM with HTTPS

Running LAM over plain HTTP is not suitable for production because credentials are transmitted in cleartext.

### Using a Self-Signed Certificate

```bash
# Enable Apache SSL module
sudo a2enmod ssl

# Enable the default SSL site
sudo a2ensite default-ssl

# Generate a self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout /etc/ssl/private/apache-selfsigned.key \
  -out /etc/ssl/certs/apache-selfsigned.crt \
  -subj "/CN=$(hostname -f)"

# Edit the SSL virtual host to use the generated cert
sudo nano /etc/apache2/sites-available/default-ssl.conf
```

Update the SSL certificate paths:

```apache
SSLCertificateFile    /etc/ssl/certs/apache-selfsigned.crt
SSLCertificateKeyFile /etc/ssl/private/apache-selfsigned.key
```

```bash
# Reload Apache
sudo systemctl restart apache2
```

### Redirect HTTP to HTTPS

Edit the default HTTP virtual host:

```bash
sudo nano /etc/apache2/sites-available/000-default.conf
```

Add a redirect:

```apache
<VirtualHost *:80>
    ServerName ldap.example.com
    # Redirect all HTTP traffic to HTTPS
    Redirect permanent / https://ldap.example.com/
</VirtualHost>
```

```bash
sudo systemctl reload apache2
```

## Restricting Access to LAM

Limit LAM access to trusted IP addresses using Apache access control:

```bash
sudo nano /etc/apache2/conf-available/ldap-account-manager.conf
```

Modify the Directory block:

```apache
<Directory /usr/share/ldap-account-manager>
    Options +FollowSymLinks
    AllowOverride None

    # Restrict to internal networks only
    Require ip 192.168.1.0/24 10.0.0.0/8
    # Allow localhost
    Require ip 127.0.0.1
</Directory>
```

```bash
sudo systemctl reload apache2
```

## Using LAM to Manage Users

Once configured, LAM's interface is straightforward:

### Creating a User

1. Log in at `https://your-server/lam`
2. Click **Users** in the top navigation
3. Click **New user**
4. Fill in the required fields:
   - UID: `jsmith`
   - Last name: `Smith`
   - First name: `John`
   - Email: `jsmith@example.com`
   - Password: set a strong password
5. Click **Save**

### Creating a Group

1. Click **Groups** in the navigation
2. Click **New group**
3. Enter the group name and GID
4. Add members from the existing users list
5. Click **Save**

### Bulk User Import

LAM supports importing users via a CSV file:

1. Navigate to **Tools -> File upload**
2. Download the template CSV for your account type
3. Fill in the template and upload it

The CSV format for users looks like:

```csv
UID;Last name;First name;Email;Password
jdoe;Doe;Jane;jdoe@example.com;TempPass123!
bwilson;Wilson;Bob;bwilson@example.com;TempPass456!
```

## Configuring Password Policies in LAM

LAM can enforce password complexity rules:

1. Go to **LAM Configuration -> Edit server profiles**
2. Select your profile
3. Navigate to **Module settings -> Users**
4. Adjust password settings:
   - Minimum password length
   - Password complexity requirements
   - Account expiry settings

## Troubleshooting

### LAM Cannot Connect to LDAP Server

```bash
# Test LDAP connectivity from the server
ldapsearch -x -H ldap://localhost -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" -W "(objectClass=*)"

# Check if the LDAP port is open
ss -tlnp | grep 389

# Review Apache error log for PHP/LDAP errors
sudo tail -f /var/log/apache2/error.log
```

### Permission Errors

```bash
# Ensure the web server can read LAM configuration
ls -la /etc/ldap-account-manager/

# Fix permissions if needed
sudo chown -R www-data:www-data /var/lib/ldap-account-manager/
sudo chmod 750 /var/lib/ldap-account-manager/
```

### Session Timeout Issues

If sessions expire too quickly, adjust the PHP session timeout:

```bash
sudo nano /etc/php/8.x/apache2/php.ini
# Find and update:
# session.gc_maxlifetime = 3600
sudo systemctl reload apache2
```

## Keeping LAM Updated

```bash
# Update LAM with your package manager
sudo apt update && sudo apt upgrade -y ldap-account-manager

# Check the LAM changelog for breaking changes before upgrading
cat /usr/share/doc/ldap-account-manager/changelog.gz | zcat | head -100
```

LDAP Account Manager makes routine directory administration much faster than working with raw LDAP commands or LDIF files. For organizations running their own LDAP infrastructure, it is worth the setup time, particularly when non-technical staff need to manage user accounts without getting into command-line LDAP operations.
