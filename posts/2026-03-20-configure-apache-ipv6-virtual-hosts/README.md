# How to Configure Apache with IPv6 Virtual Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Apache, VirtualHost, Web Server, Name-Based Hosting

Description: A practical guide to setting up multiple Apache virtual hosts served over IPv6, covering name-based hosting, IP-based hosting, and mixed IPv4/IPv6 scenarios.

## IPv6 Virtual Host Fundamentals

```apache
# In Apache, explicit IPv6 addresses in VirtualHost must be in brackets

# <VirtualHost [IPv6-address]:port>

# Common syntax forms:
<VirtualHost [2001:db8::10]:80>  # Specific IPv6 address
<VirtualHost *:80>               # Wildcard address on port 80
```

## Name-Based IPv6 Virtual Hosting

```apache
# /etc/apache2/ports.conf
Listen [::]:80

# /etc/apache2/sites-available/ipv6-sites.conf

# Default virtual host must be listed first for this address:port
<VirtualHost *:80>
    ServerName default.example.com
    DocumentRoot /var/www/default
</VirtualHost>

# Site 1
<VirtualHost *:80>
    ServerName site1.example.com
    ServerAlias www.site1.example.com
    DocumentRoot /var/www/site1

    ErrorLog  ${APACHE_LOG_DIR}/site1-error.log
    CustomLog ${APACHE_LOG_DIR}/site1-access.log combined
</VirtualHost>

# Site 2
<VirtualHost *:80>
    ServerName site2.example.com
    DocumentRoot /var/www/site2

    ErrorLog  ${APACHE_LOG_DIR}/site2-error.log
    CustomLog ${APACHE_LOG_DIR}/site2-access.log combined
</VirtualHost>
```

## IP-Based IPv6 Virtual Hosting

```apache
# Each site has its own IPv6 address
# Requires multiple IPv6 addresses on the server

# /etc/apache2/ports.conf
Listen [2001:db8::10]:80
Listen [2001:db8::20]:80

# Site 1 on first IPv6 address
<VirtualHost [2001:db8::10]:80>
    ServerName site1.example.com
    DocumentRoot /var/www/site1
</VirtualHost>

# Site 2 on second IPv6 address
<VirtualHost [2001:db8::20]:80>
    ServerName site2.example.com
    DocumentRoot /var/www/site2
</VirtualHost>
```

## Mixed IPv4 and IPv6 Virtual Hosts

```apache
# /etc/apache2/ports.conf
Listen 80

# Wildcard virtual hosts match requests on port 80
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/example
</VirtualHost>

# Another site
<VirtualHost *:80>
    ServerName other.example.com
    DocumentRoot /var/www/other
</VirtualHost>
```

## HTTPS IPv6 Virtual Hosts

```apache
# /etc/apache2/ports.conf
Listen 80
Listen 443

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName example.com
    Redirect permanent / https://example.com/
</VirtualHost>

# HTTPS virtual host
<VirtualHost *:443>
    ServerName example.com

    SSLEngine on
    SSLCertificateFile    /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    DocumentRoot /var/www/example

    # Security headers
    Header always set X-Content-Type-Options nosniff
    Header always set Strict-Transport-Security "max-age=31536000"
</VirtualHost>
```

## Enable and Test

```bash
# If using the HTTPS example, enable the required modules
a2enmod ssl headers

# Enable site configuration
a2ensite ipv6-sites.conf

# Test syntax
apache2ctl configtest

# Reload Apache
systemctl reload apache2

# View virtual host layout
apache2ctl -S

# Test name-based IPv6 virtual hosts
curl -6 -H "Host: site1.example.com" http://[::1]/
curl -6 -H "Host: site2.example.com" http://[::1]/

# Test with real IPv6 address
curl -6 -H "Host: site1.example.com" http://[2001:db8::10]/
```

## Summary

Configure Apache IPv6 virtual hosts with `Listen [::]:80` plus `<VirtualHost *:80>` for name-based hosting, or `<VirtualHost [2001:db8::10]:80>` for a specific IPv6 address. Name-based hosting over IPv6 works the same as IPv4 - Apache first matches the best IP:port, then compares the `Host:` header to `ServerName` and `ServerAlias`. Use `<VirtualHost *:80>` as a wildcard virtual host on port 80, and remember that `Listen` controls which addresses Apache accepts connections on. Verify layout with `apache2ctl -S` and test with `curl -6 -H "Host: example.com"`.
