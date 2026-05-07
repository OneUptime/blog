# How to Restrict Apache Access by IPv4 Address Using Require ip

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, IPv4, Access Control, Require ip, Security, Authorization

Description: Use Apache's Require ip directive to restrict access to virtual hosts, directories, and locations based on client IPv4 addresses and subnets.

## Introduction

Apache 2.4's `mod_authz_host` replaces the old `Allow`/`Deny` directives with the unified `Require ip` syntax. It provides cleaner, more readable access control based on IPv4 addresses and CIDR notation. If Apache is behind a reverse proxy or load balancer, `Require ip` matches the proxy's address unless `mod_remoteip` is configured.

## Basic Require ip Configuration

```apache
# /etc/apache2/sites-available/restricted.conf

<VirtualHost *:80>
    ServerName admin.example.com
    DocumentRoot /var/www/admin

    # Restrict entire site to specific IPs
    <Location />
        # Internal network
        Require ip 192.168.1.0/24
        # Admin workstation
        Require ip 10.0.0.5
        # VPN exit node
        Require ip 203.0.113.10
    </Location>
</VirtualHost>
```

Note: Multiple `Require ip` lines are combined with OR logic (any match grants access).

## Restricting a Specific Directory

```apache
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/html

    # Public access to the main site
    <Directory /var/www/html>
        Require all granted
    </Directory>

    # Restrict admin directory to internal IPs only
    <Directory /var/www/html/admin>
        Require ip 10.0.0.0/8
        Require ip 192.168.0.0/16
    </Directory>

    # Restrict API keys endpoint to trusted partners
    <Location /api/keys>
        Require ip 203.0.113.0/24
    </Location>
</VirtualHost>
```

## Combining IP and Authentication Requirements

Use `RequireAll` to require both IP restriction AND password authentication:

```apache
<Directory /var/www/html/secure>
    AuthType Basic
    AuthName "Secure Area"
    AuthUserFile /etc/apache2/.htpasswd

    # Must satisfy BOTH conditions: correct IP AND valid password
    <RequireAll>
        Require ip 10.0.0.0/8
        Require valid-user
    </RequireAll>
</Directory>
```

Use `RequireAny` for OR logic (either IP OR password):

```apache
<Directory /var/www/html/protected>
    AuthType Basic
    AuthName "Protected Area"
    AuthUserFile /etc/apache2/.htpasswd

    # Allow if IP matches OR if valid credentials provided
    <RequireAny>
        Require ip 192.168.1.0/24
        Require valid-user
    </RequireAny>
</Directory>
```

## Denying Specific IPs (NOT Logic)

Use `Require not` to block specific addresses:

```apache
<Directory /var/www/html>
    # Allow all except blocked IPs
    <RequireAll>
        Require all granted
        # Block specific bad subnet
        Require not ip 198.51.100.0/24
        # Block specific abusive IP
        Require not ip 203.0.113.99
    </RequireAll>
</Directory>
```

## Returning a Custom Error for Denied Requests

```apache
<VirtualHost *:80>
    ServerName restricted.example.com

    ErrorDocument 403 "Access restricted to authorized networks only."

    <Location />
        Require ip 192.168.0.0/16
    </Location>
</VirtualHost>
```

## Migrating from Apache 2.2 Syntax

```apache
# Old Apache 2.2 syntax (deprecated):

Order deny,allow
Deny from all
Allow from 192.168.1.0/24

# New Apache 2.4 syntax (correct):
Require ip 192.168.1.0/24
```

## Verifying Access Control

```bash
# Test from an allowed IPv4 client
curl -4 http://admin.example.com/

# Test from a client that has a blocked source IP assigned locally (should return 403)
curl --interface 198.51.100.100 http://admin.example.com/

# Check Apache authorization logs
sudo tail -f /var/log/apache2/error.log | grep "client denied"

# Verify config syntax
sudo apachectl configtest
```

## Conclusion

Apache 2.4's `Require ip` is the modern, clean way to implement IPv4-based access control. It integrates naturally with Apache's authorization framework through `RequireAll` and `RequireAny`, enabling combinations of IP restrictions and authentication. Replace all legacy `Order`/`Allow`/`Deny` directives when upgrading to Apache 2.4+ for consistent and maintainable access policies.
