# How to Configure Apache Dual-Stack (IPv4 and IPv6)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Apache, Dual-Stack, Web Server, Network Configuration

Description: Learn how to configure Apache HTTP Server to simultaneously serve both IPv4 and IPv6 clients (dual-stack mode) with proper VirtualHost configuration.

## ports.conf for Dual-Stack

```apache
# /etc/apache2/ports.conf

# Listen on all interfaces.
# On IPv6-capable builds, Apache will handle IPv4 and IPv6 here.
Listen 80

# HTTPS dual-stack
<IfModule ssl_module>
    Listen 443
</IfModule>
```

## Dual-Stack VirtualHost with Wildcard

```apache
# Using * matches ALL Listen addresses (both IPv4 and IPv6)
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com
    DocumentRoot /var/www/example

    # Logs will show both IPv4 and IPv6 client addresses
    ErrorLog  ${APACHE_LOG_DIR}/example-error.log
    CustomLog ${APACHE_LOG_DIR}/example-access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName example.com

    SSLEngine on
    SSLCertificateFile    /etc/ssl/certs/example.crt
    SSLCertificateKeyFile /etc/ssl/private/example.key

    DocumentRoot /var/www/example
</VirtualHost>
```

## Explicit Dual-Stack VirtualHosts

```apache
# For sites needing separate control per address family

# IPv4 site
<VirtualHost 192.168.1.10:80>
    ServerName example.com
    DocumentRoot /var/www/example
    # IPv4-specific settings
</VirtualHost>

# IPv6 site (same DocumentRoot and config)
<VirtualHost [2001:db8::10]:80>
    ServerName example.com
    DocumentRoot /var/www/example
    # IPv6-specific settings (can be different)
</VirtualHost>
```

## Detecting IPv6 Clients in Apache

```apache
# Use SetEnvIfExpr to detect IPv6 connections
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/example

    # Set a variable for native IPv6 clients.
    # Exclude IPv4-mapped IPv6 addresses used on some platforms/builds.
    SetEnvIfExpr "%{IPV6} == 'on' && ! -R '::ffff:0:0/96'" IS_IPV6

    # Different log for IPv4 vs IPv6
    CustomLog ${APACHE_LOG_DIR}/ipv4-access.log combined env=!IS_IPV6
    CustomLog ${APACHE_LOG_DIR}/ipv6-access.log combined env=IS_IPV6
</VirtualHost>
```

## Test Dual-Stack

```bash
# Verify Apache listens on both
ss -tlnp | grep apache
# Depending on the platform/build, you may see a single [::]:80 listener
# that also accepts IPv4, or separate 0.0.0.0:80 and [::]:80 listeners.

# Test IPv4 access
curl -4 http://example.com

# Test IPv6 access
curl -6 http://example.com

# Test directly by address
curl http://192.168.1.10/ -H "Host: example.com"
curl -6 http://[2001:db8::10]/ -H "Host: example.com"

# Check server-status for both connection types, if mod_status is enabled
curl -6 http://[::1]/server-status
```

## Apache Log Format with IP Version

```apache
# Custom log format indicating IP version
LogFormat "%a %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined_v6
# %a shows the client IP in IPv4 or IPv6 form
```

## Summary

Configure Apache dual-stack by adding `Listen 80` and `Listen 443` to `ports.conf`. Use `<VirtualHost *:80>` to match all Listen addresses (both IPv4 and IPv6) in a single block, or use explicit `<VirtualHost 192.168.1.10:80>` and `<VirtualHost [2001:db8::10]:80>` pairs. Verify with `ss -tlnp | grep apache` and test with `curl -4` and `curl -6`. Use `SetEnvIfExpr` to detect and differentiate native IPv6 clients without matching IPv4-mapped addresses.
