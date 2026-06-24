# How to Configure Apache Reverse Proxy with IPv6 Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Apache, Reverse Proxy, mod_proxy, Backend

Description: Learn how to configure Apache as a reverse proxy forwarding requests to IPv6 backend servers using mod_proxy, including HTTP and HTTPS backends.

## Enable Required Modules

```bash
# Debian/Ubuntu: enable mod_proxy and related modules used below

a2enmod proxy proxy_http proxy_balancer lbmethod_byrequests headers ssl proxy_wstunnel
systemctl restart apache2
```

## Basic IPv6 Reverse Proxy

```apache
<VirtualHost *:80>
    ServerName example.com

    # Enable proxy
    ProxyPreserveHost On
    ProxyRequests Off

    # Proxy to IPv6 backend (brackets required)
    ProxyPass        / http://[2001:db8::10]:8080/
    ProxyPassReverse / http://[2001:db8::10]:8080/

    # Pass client IP to backend
    RequestHeader set X-Real-IP "expr=%{REMOTE_ADDR}"
    RequestHeader set X-Forwarded-Proto "http"
</VirtualHost>
```

## HTTPS Frontend to HTTP IPv6 Backend

```apache
<VirtualHost *:443>
    ServerName example.com

    SSLEngine on
    SSLCertificateFile    /etc/ssl/certs/example.crt
    SSLCertificateKeyFile /etc/ssl/private/example.key

    ProxyPreserveHost On
    ProxyRequests Off

    ProxyPass        / http://[2001:db8::10]:8080/
    ProxyPassReverse / http://[2001:db8::10]:8080/

    # Tell backend the connection was HTTPS
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
    RequestHeader set X-Real-IP "expr=%{REMOTE_ADDR}"
</VirtualHost>
```

## Load Balancing with IPv6 Backends

```apache
<Proxy "balancer://ipv6cluster">
    # IPv6 backends - brackets required
    BalancerMember http://[2001:db8::10]:8080 loadfactor=1
    BalancerMember http://[2001:db8::11]:8080 loadfactor=1
    BalancerMember http://[2001:db8::12]:8080 loadfactor=1

    # Standby member
    BalancerMember http://[2001:db8::13]:8080 status=+H

    ProxySet lbmethod=byrequests
</Proxy>

<VirtualHost *:80>
    ServerName example.com

    ProxyPass        / balancer://ipv6cluster/
    ProxyPassReverse / balancer://ipv6cluster/

    ProxyPreserveHost On
</VirtualHost>
```

## Per-Path Proxying

```apache
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/static

    # Proxy /api/ to IPv6 backend
    ProxyPass        /api/ http://[2001:db8::20]:3000/
    ProxyPassReverse /api/ http://[2001:db8::20]:3000/

    # Proxy /ws/ for WebSocket
    ProxyPass        /ws/  ws://[2001:db8::30]:8080/
    ProxyPassReverse /ws/  ws://[2001:db8::30]:8080/

    # Serve static files locally
    <Directory /var/www/static>
        Require all granted
    </Directory>
</VirtualHost>
```

## Test Reverse Proxy

```bash
# Test proxy through Apache
curl -v http://example.com/

# If the frontend has an AAAA record, force an IPv6 client connection
curl -6 http://example.com/

# If the backend exposes a header-echo endpoint, verify forwarded headers
curl -s http://example.com/headers

# Check backend is responding over IPv6
curl http://[2001:db8::10]:8080/health

# View proxy errors
tail -f /var/log/apache2/error.log | grep proxy
```

## Summary

Configure Apache reverse proxy to IPv6 backends with `ProxyPass / http://[2001:db8::10]:8080/` - brackets are required around IPv6 addresses. On Debian/Ubuntu, enable the required modules with `a2enmod`. Use `RequestHeader set X-Real-IP "expr=%{REMOTE_ADDR}"` to pass the client address to the backend, and `mod_proxy_http` adds `X-Forwarded-For` by default. For load balancing, use `<Proxy "balancer://name">` with multiple `BalancerMember http://[2001:db8::N]:PORT` entries.
