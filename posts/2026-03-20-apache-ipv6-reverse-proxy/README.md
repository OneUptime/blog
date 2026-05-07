# How to Configure Apache as an IPv6 Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Apache, Reverse Proxy, mod_proxy, Dual-Stack

Description: Configure Apache httpd as an IPv6 reverse proxy using mod_proxy, handle dual-stack virtual hosts, preserve IPv6 client IP headers, and proxy to IPv6 backends.

## Introduction

Apache httpd supports IPv6 through its `Listen` directive and `mod_proxy` module. IPv6 configuration requires specifying addresses in bracket notation in VirtualHost directives and enabling `mod_proxy` with appropriate backend URLs.

## Step 1: Enable Required Modules

```bash
# Enable proxy modules

a2enmod proxy proxy_http proxy_balancer lbmethod_byrequests ssl headers remoteip
systemctl reload apache2
```

## Step 2: Dual-Stack VirtualHost Configuration

```apache
# /etc/apache2/sites-available/app.conf

# IPv4 VirtualHost
<VirtualHost *:80>
    ServerName app.example.com
    Redirect permanent / https://app.example.com/
</VirtualHost>

# IPv6 VirtualHost - IPv6 literals must use brackets
<VirtualHost [::]:80>
    ServerName app.example.com
    Redirect permanent / https://app.example.com/
</VirtualHost>

# IPv4 HTTPS
<VirtualHost *:443>
    ServerName app.example.com
    SSLEngine On
    SSLCertificateFile    /etc/ssl/certs/app.crt
    SSLCertificateKeyFile /etc/ssl/private/app.key

    # Reverse proxy to backend
    ProxyPreserveHost On
    ProxyAddHeaders On
    ProxyPass        / http://backend.internal:8080/
    ProxyPassReverse / http://backend.internal:8080/

    # Pass client IP to backend
    RequestHeader set X-Real-IP "expr=%{REMOTE_ADDR}"
</VirtualHost>

# IPv6 HTTPS - explicit IPv6 binding
<VirtualHost [::]:443>
    ServerName app.example.com
    SSLEngine On
    SSLCertificateFile    /etc/ssl/certs/app.crt
    SSLCertificateKeyFile /etc/ssl/private/app.key

    ProxyPreserveHost On
    ProxyAddHeaders On
    ProxyPass        / http://backend.internal:8080/
    ProxyPassReverse / http://backend.internal:8080/

    RequestHeader set X-Real-IP "expr=%{REMOTE_ADDR}"
</VirtualHost>
```

## Step 3: Listen Directives

```apache
# /etc/apache2/ports.conf

# Listen on the required ports on all interfaces.
# Whether a single socket accepts both IPv4 and IPv6 depends on the platform/build.
Listen 80
Listen 443

# Or bind to a specific IPv6 address:
# Listen [2001:db8::1]:80
# Listen [2001:db8::1]:443
```

## Step 4: Proxy to IPv6 Backends

```apache
# Proxy to IPv6-addressed backends
<VirtualHost [::]:80>
    ServerName api.example.com

    # IPv6 backends - must use brackets in backend URLs
    <Proxy balancer://ipv6backends>
        BalancerMember http://[2001:db8::10]:8080
        BalancerMember http://[2001:db8::11]:8080
        ProxySet lbmethod=byrequests
    </Proxy>

    ProxyPass        / balancer://ipv6backends/
    ProxyPassReverse / balancer://ipv6backends/
</VirtualHost>
```

## Step 5: RemoteIP for X-Forwarded-For

When Apache is behind a load balancer that passes IPv6 client addresses:

```apache
# /etc/apache2/conf-available/remoteip.conf

# Trust proxy subnets
RemoteIPHeader X-Forwarded-For
RemoteIPTrustedProxy 10.0.0.0/8
RemoteIPTrustedProxy fd00::/8
RemoteIPTrustedProxy 2001:db8:100::/48
```

## Step 6: Access Control by IPv6

```apache
# Restrict access to approved admin networks
<Directory /var/www/html/admin>
    Require ip 2001:db8:100::/48
    Require ip fd00::/8
    # Also allow IPv4 management
    Require ip 10.0.0.0/8
</Directory>

# Allow all IPv6, block IPv4
<Location /api>
    Require ip ::/0
</Location>
```

## Step 7: Custom Log Format for IPv6

```apache
# /etc/apache2/apache2.conf

# Log format that handles long IPv6 addresses
LogFormat "%a %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined_ipv6

# %a = RemoteIP (after RemoteIP processing)
# Add %{X-Forwarded-For}i if you also want the raw X-Forwarded-For chain
CustomLog ${APACHE_LOG_DIR}/access.log combined_ipv6
```

## Conclusion

Apache IPv6 reverse proxy uses the same core `mod_proxy` directives as IPv4, but IPv6 addresses in `<VirtualHost>`, `Listen`, and backend URLs must use bracket notation. Explicit IPv4 and IPv6 vhost bindings are useful when you want separate address matches, while `Listen` behavior across both families depends on the platform and build options. Enable `mod_remoteip` to correctly extract client IPv6 addresses from `X-Forwarded-For` headers when Apache sits behind a load balancer. Apache's `Require ip` access control directive handles both IPv4 CIDR and IPv6 prefix notation.
