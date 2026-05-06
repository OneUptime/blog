# How to Configure Apache VirtualHosts with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Apache, VirtualHost, Web Server, Network Configuration

Description: Learn how to configure Apache VirtualHost directives for IPv6 addresses, including IPv6-specific virtual hosts, name-based virtual hosting over IPv6, and dual-stack configurations.

## IPv6 VirtualHost Syntax

```apache
# IPv6 addresses in VirtualHost directives must be in brackets

# IPv6-specific virtual host

<VirtualHost [2001:db8::10]:80>
    ServerName example.com
    DocumentRoot /var/www/example
</VirtualHost>

# Wildcard virtual host for any address Apache is listening on
<VirtualHost *:80>
    ServerName default.example.com
    DocumentRoot /var/www/default
</VirtualHost>
```

## Name-Based Virtual Hosting over IPv6

```apache
# /etc/apache2/ports.conf
Listen [2001:db8::10]:80

# /etc/apache2/sites-available/ipv6-vhosts.conf

# Default/catch-all for requests to this IPv6 address
<VirtualHost [2001:db8::10]:80>
    ServerName default.example.com
    DocumentRoot /var/www/default
</VirtualHost>

# Additional name-based site on the same IPv6 address
<VirtualHost [2001:db8::10]:80>
    ServerName www.example.com
    ServerAlias example.com
    DocumentRoot /var/www/example
    ErrorLog ${APACHE_LOG_DIR}/example-error.log
    CustomLog ${APACHE_LOG_DIR}/example-access.log combined
</VirtualHost>
```

## Dual-Stack VirtualHost

```apache
# Two separate VirtualHost blocks for IPv4 and IPv6

# IPv4 virtual host
<VirtualHost 192.168.1.10:80>
    ServerName example.com
    DocumentRoot /var/www/example
</VirtualHost>

# IPv6 virtual host (same DocumentRoot)
<VirtualHost [2001:db8::10]:80>
    ServerName example.com
    DocumentRoot /var/www/example
</VirtualHost>
```

## Multiple Sites on a Single IPv6 Address

```apache
# Name-based virtual hosting (most common for multiple sites on one IPv6 address)
<VirtualHost [2001:db8::10]:80>
    ServerName site1.example.com
    DocumentRoot /var/www/site1
</VirtualHost>

<VirtualHost [2001:db8::10]:80>
    ServerName site2.example.com
    DocumentRoot /var/www/site2
</VirtualHost>

<VirtualHost [2001:db8::10]:80>
    ServerName site3.example.com
    DocumentRoot /var/www/site3
</VirtualHost>
```

## IPv6 HTTPS VirtualHost

```apache
<VirtualHost [2001:db8::10]:443>
    ServerName secure.example.com

    SSLEngine on
    SSLCertificateFile      /etc/ssl/certs/example.crt
    SSLCertificateKeyFile   /etc/ssl/private/example.key
    SSLProtocol             all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite          ECDHE-ECDSA-AES256-GCM-SHA384

    DocumentRoot /var/www/secure

    ErrorLog  ${APACHE_LOG_DIR}/secure-error.log
    CustomLog ${APACHE_LOG_DIR}/secure-access.log combined

    Header always set Strict-Transport-Security "max-age=31536000"
</VirtualHost>
```

## Enable and Test VirtualHost

```bash
# Enable the site (Debian/Ubuntu)
a2ensite ipv6-vhosts.conf
systemctl reload apache2

# Test configuration
apache2ctl -S
# Shows list of virtual hosts with their addresses

# Test the IPv6 listener and default virtual host
curl -6 http://[2001:db8::10]/

# Check name-based virtual host matching explicitly
curl -6 -H "Host: default.example.com" http://[2001:db8::10]/
curl -6 -H "Host: www.example.com" http://[2001:db8::10]/
```

## Summary

Configure Apache IPv6 VirtualHosts with `<VirtualHost [2001:db8::10]:80>` for a specific IPv6 address, or `<VirtualHost *:80>` as a wildcard for any address Apache is listening on. IPv6 addresses must be in brackets. For name-based hosting on a single IPv6 address, repeat the same IPv6 address in multiple `VirtualHost` blocks and let `ServerName` or `ServerAlias` select the site. For dual-stack, create two VirtualHost blocks - one for IPv4 and one for IPv6 - pointing to the same DocumentRoot. Verify with `apache2ctl -S` and test with `curl -6`.
