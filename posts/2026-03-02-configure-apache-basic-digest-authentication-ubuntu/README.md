# How to Configure Apache Basic and Digest Authentication on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, Security, Authentication, Web Server

Description: Set up password protection for Apache directories on Ubuntu using both Basic and Digest authentication methods with practical configuration examples.

---

Apache's built-in authentication is a simple way to protect specific directories or locations from unauthorized access. You've almost certainly seen it before - a browser dialog box asking for a username and password before showing a page. This post covers setting up both Basic and Digest authentication on Apache running on Ubuntu.

## Understanding the Two Methods

**Basic Authentication** sends the username and password base64-encoded in the HTTP header. It's not encrypted on its own - you must use HTTPS or the credentials travel in plaintext. That said, over HTTPS it's perfectly secure and the simplest option to implement.

**Digest Authentication** uses an MD5 hash of the credentials instead of sending them directly. It provides more protection on HTTP connections than Basic, but MD5 is considered weak by modern standards. For new setups, Basic over HTTPS is generally preferred over Digest.

## Setting Up Basic Authentication

### Step 1: Enable Required Modules

```bash
# mod_auth_basic is usually enabled by default on Ubuntu
# Verify it's active
sudo apache2ctl -M | grep auth_basic

# If not loaded:
sudo a2enmod auth_basic
sudo systemctl reload apache2
```

### Step 2: Create the Password File

The password file stores usernames and hashed passwords. Store it outside the web root so it can't be downloaded:

```bash
# Create the password file with the first user
# -c creates a new file (don't use -c when adding users to an existing file)
sudo htpasswd -c /etc/apache2/.htpasswd alice

# Enter and confirm the password when prompted

# Add additional users (no -c flag)
sudo htpasswd /etc/apache2/.htpasswd bob
sudo htpasswd /etc/apache2/.htpasswd charlie

# View the file (passwords are hashed, not stored in plaintext)
sudo cat /etc/apache2/.htpasswd
# Output: alice:$apr1$xxxxxxxxxx$hashedpasswordhere
```

### Step 3: Configure Apache to Require Authentication

You can apply authentication at several levels:

**In the VirtualHost configuration (recommended):**

```bash
sudo nano /etc/apache2/sites-available/example.com.conf
```

```apache
<VirtualHost *:443>
    ServerName example.com
    DocumentRoot /var/www/example.com/public_html

    # Protect the entire site
    <Directory /var/www/example.com/public_html>
        AuthType Basic
        AuthName "Restricted Area"
        AuthUserFile /etc/apache2/.htpasswd
        Require valid-user
    </Directory>

    # Or protect a specific subdirectory
    <Directory /var/www/example.com/public_html/admin>
        AuthType Basic
        AuthName "Admin Panel"
        AuthUserFile /etc/apache2/.htpasswd
        Require valid-user
    </Directory>

    # Or protect a specific URL path (not directory)
    <Location /api/private>
        AuthType Basic
        AuthName "API Access"
        AuthUserFile /etc/apache2/.htpasswd
        Require valid-user
    </Location>
</VirtualHost>
```

**In a .htaccess file** (requires `AllowOverride AuthConfig` or `AllowOverride All`):

```apache
AuthType Basic
AuthName "Protected Area"
AuthUserFile /etc/apache2/.htpasswd
Require valid-user
```

### Step 4: Reload Apache

```bash
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Test it:

```bash
# Should return 401 without credentials
curl -I https://example.com/protected/

# Should return 200 with correct credentials
curl -u alice:password https://example.com/protected/

# Use -v to see the WWW-Authenticate header
curl -v https://example.com/protected/ 2>&1 | grep "WWW-Authenticate"
```

## Restricting Access to Specific Users

Instead of allowing any valid user, restrict to specific ones:

```apache
<Directory /var/www/example.com/public_html/admin>
    AuthType Basic
    AuthName "Admin Access"
    AuthUserFile /etc/apache2/.htpasswd

    # Only allow specific users
    Require user alice charlie

    # Or allow any valid user
    # Require valid-user
</Directory>
```

## Combining Authentication with IP Restrictions

You can require both a valid IP and a valid password, or allow either one:

```apache
<Directory /var/www/example.com/public_html/admin>
    AuthType Basic
    AuthName "Admin Panel"
    AuthUserFile /etc/apache2/.htpasswd

    # Require BOTH valid IP AND valid user (AND logic)
    <RequireAll>
        Require ip 192.168.1.0/24
        Require valid-user
    </RequireAll>

    # OR: Allow access if either condition is met (OR logic)
    # <RequireAny>
    #     Require ip 192.168.1.0/24
    #     Require valid-user
    # </RequireAny>
</Directory>
```

This is useful for an admin panel - local network users can access directly, while remote users need both VPN (IP-based) and a password.

## User Groups

For managing many users, group them:

```bash
# Create a group file
sudo nano /etc/apache2/.htgroups
```

```text
# Format: groupname: user1 user2 user3
admins: alice bob
editors: charlie dave eve
readonly: frank
```

```apache
<Directory /var/www/example.com/public_html/admin>
    AuthType Basic
    AuthName "Admin Area"
    AuthUserFile /etc/apache2/.htpasswd
    AuthGroupFile /etc/apache2/.htgroups

    # Allow only members of the admins group
    Require group admins
</Directory>
```

## Setting Up Digest Authentication

Digest authentication uses `htdigest` instead of `htpasswd` and requires a realm:

### Step 1: Enable mod_auth_digest

```bash
sudo a2enmod auth_digest
sudo systemctl reload apache2
```

### Step 2: Create the Digest Password File

```bash
# Create digest password file
# Format: htdigest -c passwordfile realm username
sudo htdigest -c /etc/apache2/.htdigest "Protected Area" alice
# Enter password when prompted

# Add more users (no -c)
sudo htdigest /etc/apache2/.htdigest "Protected Area" bob

# The realm MUST match exactly what you put in AuthName
cat /etc/apache2/.htdigest
# Output: alice:Protected Area:hashedpassword
```

### Step 3: Configure Apache

```apache
<Directory /var/www/example.com/public_html/private>
    AuthType Digest
    AuthName "Protected Area"     # Must match realm in password file exactly
    AuthDigestDomain /private/
    AuthDigestProvider file
    AuthUserFile /etc/apache2/.htdigest
    Require valid-user
</Directory>
```

```bash
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Test it:

```bash
# Test digest auth
curl --digest -u alice:password https://example.com/private/
```

## Managing Password File Users

```bash
# Add a user
sudo htpasswd /etc/apache2/.htpasswd newuser

# Change a user's password
sudo htpasswd /etc/apache2/.htpasswd alice
# You'll be prompted for the new password

# Delete a user
sudo htpasswd -D /etc/apache2/.htpasswd alice

# List users (no password hashes shown in a convenient format)
sudo cut -d: -f1 /etc/apache2/.htpasswd

# Verify a password without changing it (no standard htpasswd option)
# Test by actually making a request:
curl -u alice:password https://example.com/protected/ -o /dev/null -w "%{http_code}"
# 200 = correct, 401 = wrong credentials
```

## Using bcrypt for Password Hashing

By default, `htpasswd` uses bcrypt on modern Ubuntu systems, which is good. Verify:

```bash
# Check the hash format in the password file
sudo cat /etc/apache2/.htpasswd
# $2y$ prefix = bcrypt (good)
# $apr1$ prefix = MD5 (acceptable but weaker)
# $1$ prefix = old MD5 (avoid)

# Force bcrypt explicitly
sudo htpasswd -B /etc/apache2/.htpasswd alice
```

## Rate Limiting Login Attempts

Apache's built-in auth doesn't include rate limiting. Add it with `mod_ratelimit` or a firewall rule:

```bash
# Install fail2ban to block brute force attempts
sudo apt install fail2ban

# Create a jail for Apache auth failures
sudo nano /etc/fail2ban/jail.d/apache-auth.conf
```

```ini
[apache-auth]
enabled = true
port = http,https
filter = apache-auth
logpath = /var/log/apache2/*error.log
maxretry = 5
bantime = 3600
findtime = 600
```

```bash
# Restart fail2ban
sudo systemctl restart fail2ban

# Check the jail status
sudo fail2ban-client status apache-auth
```

## Protecting Specific File Types

Require authentication only for specific file extensions:

```apache
<FilesMatch "\.(pdf|doc|docx|xlsx)$">
    AuthType Basic
    AuthName "Document Access"
    AuthUserFile /etc/apache2/.htpasswd
    Require valid-user
</FilesMatch>
```

## Authentication in Reverse Proxy Scenarios

When Apache is a reverse proxy, you can add authentication at the proxy layer without modifying the backend:

```apache
<Location /app>
    # Authenticate before proxying
    AuthType Basic
    AuthName "Application Access"
    AuthUserFile /etc/apache2/.htpasswd
    Require valid-user

    # Then proxy to the backend
    ProxyPass http://localhost:3000/app
    ProxyPassReverse http://localhost:3000/app
</Location>
```

This protects any backend application without requiring the application to implement its own authentication.

For most use cases, Basic auth over HTTPS is the right choice. It's simple, widely supported, and perfectly secure when TLS is in place. Save Digest auth for legacy systems or environments where you genuinely cannot use HTTPS.
