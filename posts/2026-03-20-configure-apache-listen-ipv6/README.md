# How to Configure Apache to Listen on IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Apache, Web Server, Listen Directive, Network Configuration

Description: Learn how to configure Apache HTTP Server to listen on IPv6 addresses using the Listen directive, including listening on all interfaces, specific addresses, and dual-stack configuration.

## Basic IPv6 Listen Directives

```apache
# In /etc/apache2/ports.conf or httpd.conf

# Listen on all IPv6 addresses on port 80

Listen [::]:80

# Listen on a specific IPv6 address
Listen [2001:db8::10]:80

# Listen on IPv6 loopback
Listen [::1]:80

# Listen on all interfaces on port 80
Listen 80

# If Apache is using separate IPv4 and IPv6 sockets,
# use explicit listeners for each address family instead:
# Listen 0.0.0.0:80
# Listen [::]:80
```

## Apache IPv6 Configuration File

```apache
# /etc/apache2/ports.conf

# Listen on all IPv6 addresses on port 80
Listen [::]:80

# HTTPS
<IfModule ssl_module>
    Listen [::]:443
</IfModule>

<IfModule mod_gnutls.c>
    Listen [::]:443
</IfModule>
```

## Dual-Stack vs IPv6-Only

```apache
# Dual-stack on platforms that use separate IPv4 and IPv6 sockets
Listen 0.0.0.0:80
Listen [::]:80

# On many Linux builds, Listen [::]:80 can already accept IPv4
# via IPv4-mapped IPv6 addresses, so adding both may overlap.

# IPv6-only server
Listen [::]:80
# (On platforms where [::]:80 also accepts IPv4, this is IPv6-only
# only when Apache is built/configured without IPv4-mapped addresses.)

# Check if Apache is listening
# ss -tlnp | grep -E 'apache2|httpd'
# netstat -tlnp | grep -E 'apache2|httpd'
```

## VirtualHost with IPv6

```apache
# Virtual host bound to a specific IPv6 address
<VirtualHost [2001:db8::10]:80>
    ServerName example.com
    DocumentRoot /var/www/html/example
    ErrorLog ${APACHE_LOG_DIR}/example-error.log
    CustomLog ${APACHE_LOG_DIR}/example-access.log combined
</VirtualHost>

# Dual-stack virtual host
<VirtualHost *:80>
    # * matches any address Apache is listening on for port 80
    ServerName example.com
    DocumentRoot /var/www/html/example
</VirtualHost>
```

## Verify IPv6 Support

```bash
# Inspect Apache build parameters
apache2ctl -V
# or
httpd -V

# Verify that an IPv6 Listen directive is configured
grep -R '^[[:space:]]*Listen.*\[:' /etc/apache2/
# or on RHEL/CentOS
grep -R '^[[:space:]]*Listen.*\[:' /etc/httpd/
```

## Apply and Verify

```bash
# Test configuration syntax
apache2ctl configtest
# or
httpd -t

# Restart Apache
systemctl restart apache2
# or
systemctl restart httpd

# Verify IPv6 listening
ss -6 -tlnp | grep -E 'apache2|httpd'
# Expected: a LISTEN entry for [::]:80 or your configured IPv6 address

# Test with curl
curl -6 http://[::1]/
curl -6 http://[2001:db8::10]/
```

## Summary

Configure Apache to listen on IPv6 by adding `Listen [::]:80` to `/etc/apache2/ports.conf` or `httpd.conf`. On platforms that use separate IPv4 and IPv6 sockets, add both `Listen 0.0.0.0:80` and `Listen [::]:80`; on many Linux builds, `Listen [::]:80` may already accept IPv4 via mapped addresses. Use `<VirtualHost [2001:db8::10]:80>` for a specific IPv6 address or `<VirtualHost *:80>` to match any listened-on address. Test syntax with `apache2ctl configtest` and verify with `ss -6 -tlnp | grep -E 'apache2|httpd'`.
