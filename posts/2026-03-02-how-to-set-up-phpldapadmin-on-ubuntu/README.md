# How to Set Up phpLDAPadmin on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LDAP, PhpLDAPadmin, Web Administration, Directory Services

Description: Install and configure phpLDAPadmin on Ubuntu to get a browser-based interface for managing OpenLDAP directories, users, and groups.

---

phpLDAPadmin is a web-based LDAP browser and management tool written in PHP. It provides a tree-style view of your directory and allows you to create, edit, and delete entries without writing LDIF files by hand. While it is older than alternatives like LDAP Account Manager, it remains widely used and covers most day-to-day LDAP administration tasks through a familiar interface.

## Prerequisites

- Ubuntu 22.04 or newer
- OpenLDAP or another LDAP server running on the same host or accessible over the network
- Apache2 and PHP installed
- Root or sudo access

## Installing Dependencies

```bash
# Update package list
sudo apt update

# Install Apache and PHP with required extensions
sudo apt install -y apache2 php php-ldap php-xml php-mbstring libapache2-mod-php

# Verify PHP can talk to LDAP
php -m | grep ldap
# Expected output: ldap
```

## Installing phpLDAPadmin

```bash
# Install phpLDAPadmin from Ubuntu repositories
sudo apt install -y phpldapadmin

# The installation creates:
# - Application files: /usr/share/phpldapadmin/
# - Configuration: /etc/phpldapadmin/config.php
# - Apache config: /etc/apache2/conf-available/phpldapadmin.conf

# Enable the Apache configuration
sudo a2enconf phpldapadmin
sudo systemctl reload apache2
```

## Configuring phpLDAPadmin

The main configuration file controls which LDAP servers phpLDAPadmin connects to:

```bash
sudo nano /etc/phpldapadmin/config.php
```

Locate and update the server configuration section:

```php
<?php
/* Set your LDAP server details */

// LDAP server hostname or IP
$servers->setValue('server','host','127.0.0.1');

// LDAP server port (default 389, or 636 for LDAPS)
$servers->setValue('server','port',389);

// The base DN for your directory
$servers->setValue('server','base',array('dc=example,dc=com'));

// Auth type: 'cookie', 'session', or 'config'
$servers->setValue('login','auth_type','session');

// Optionally set a default bind DN for login
// Leave blank to prompt for credentials each time
$servers->setValue('login','bind_id','');

// Show template warnings - set to false in production
$servers->setValue('appearance','show_hints',false);

// Optional: define an anonymous bind for read-only access
// $servers->setValue('login','anon_bind',true);
?>
```

After saving, reload Apache:

```bash
sudo systemctl reload apache2
```

## Accessing phpLDAPadmin

Open a browser and navigate to:

```text
http://your-server-ip/phpldapadmin
```

Log in with your LDAP bind DN and password. For OpenLDAP, this is typically `cn=admin,dc=example,dc=com`.

## Securing phpLDAPadmin

### Restrict Access by IP

Edit the Apache configuration to limit who can reach phpLDAPadmin:

```bash
sudo nano /etc/apache2/conf-available/phpldapadmin.conf
```

Replace the default `Require all granted` with IP restrictions:

```apache
Alias /phpldapadmin /usr/share/phpldapadmin/htdocs
<Directory /usr/share/phpldapadmin/htdocs>
    DirectoryIndex index.php
    Options +FollowSymLinks
    AllowOverride None

    # Only allow access from specific networks
    Require ip 192.168.1.0/24
    Require ip 10.0.0.0/8
    Require ip 127.0.0.1
</Directory>
```

```bash
sudo systemctl reload apache2
```

### Enable HTTPS

Encrypting traffic prevents credentials from being sent in plaintext:

```bash
# Enable SSL module and default SSL site
sudo a2enmod ssl
sudo a2ensite default-ssl

# Generate a self-signed certificate (replace with Let's Encrypt for public servers)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout /etc/ssl/private/phpldapadmin.key \
  -out /etc/ssl/certs/phpldapadmin.crt \
  -subj "/CN=$(hostname -f)"

# Edit the default SSL virtual host
sudo nano /etc/apache2/sites-available/default-ssl.conf
```

Update the certificate paths in the file:

```apache
SSLCertificateFile    /etc/ssl/certs/phpldapadmin.crt
SSLCertificateKeyFile /etc/ssl/private/phpldapadmin.key
```

```bash
sudo systemctl restart apache2
```

Access phpLDAPadmin at `https://your-server/phpldapadmin`.

### Disable Anonymous Binds

Prevent unauthenticated browsing by disabling anonymous access in both OpenLDAP and phpLDAPadmin:

```bash
# In /etc/phpldapadmin/config.php, ensure this is set:
$servers->setValue('login','anon_bind',false);

# In OpenLDAP, restrict anonymous access:
cat > /tmp/disable_anon.ldif <<'EOF'
dn: cn=config
changetype: modify
add: olcDisallows
olcDisallows: bind_anon
EOF

sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f /tmp/disable_anon.ldif
```

## Common Tasks in phpLDAPadmin

### Creating a User

1. Expand your base DN tree in the left panel
2. Click on `ou=People` (or wherever you store users)
3. Click **Create a child entry**
4. Select a template like **Generic: User Account** or **Samba Account**
5. Fill in the required attributes:
   - `uid`: username
   - `cn`: full name
   - `sn`: surname
   - `userPassword`: set via the password field
6. Click **Create Object**

### Modifying an Entry

1. Navigate to the entry in the tree
2. Click on an attribute value to edit it inline
3. Or click **Modify** to see all attributes at once
4. After making changes, click **Update Object**

### Searching the Directory

1. Click **Search** in the top navigation
2. Enter your search criteria:
   - Base DN: `dc=example,dc=com`
   - Filter: `(uid=jsmith)` or `(mail=*@example.com)`
   - Scope: Sub (searches the whole tree)
3. Click **Search**

### Exporting to LDIF

1. Navigate to an entry or subtree
2. Click **Export** in the entry view
3. Choose scope (entry, subtree) and format options
4. Download the resulting LDIF file

## Troubleshooting

### Blank Page or PHP Errors

```bash
# Check PHP error log
sudo tail -f /var/log/apache2/error.log

# Verify PHP LDAP extension is loaded
php -i | grep -i ldap

# Check PHP version compatibility
php --version
```

### Cannot Connect to LDAP Server

```bash
# Test LDAP connectivity directly
ldapsearch -x -H ldap://127.0.0.1 -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" -W "(objectClass=*)"

# Check if OpenLDAP is running
sudo systemctl status slapd

# Verify phpLDAPadmin config has the correct server address
grep -n "host\|port\|base" /etc/phpldapadmin/config.php
```

### Template Not Found Errors

If phpLDAPadmin complains about missing templates:

```bash
# Check template directory
ls /usr/share/phpldapadmin/templates/

# Reinstall if templates are missing
sudo apt install --reinstall phpldapadmin
```

### Session Expiry Too Fast

```bash
# Increase PHP session lifetime
sudo nano /etc/php/8.x/apache2/php.ini
# Set: session.gc_maxlifetime = 7200

sudo systemctl reload apache2
```

phpLDAPadmin has been around for a long time and while the interface looks dated, it remains functional for routine LDAP administration. For more polished alternatives, consider LDAP Account Manager, Apache Directory Studio (a desktop application), or the web console bundled with 389 Directory Server.
