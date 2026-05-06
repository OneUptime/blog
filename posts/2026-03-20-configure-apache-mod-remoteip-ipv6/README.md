# How to Configure Apache mod_remoteip for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Apache, Mod_remoteip, X-Forwarded-For, Reverse Proxy

Description: Learn how to configure Apache mod_remoteip to correctly identify IPv6 client addresses when Apache is behind a load balancer or reverse proxy that sends X-Forwarded-For headers.

## Why mod_remoteip for IPv6?

When Apache is behind a load balancer:
- `REMOTE_ADDR` and `%a` show the load balancer's IPv6 address
- The real client IP is in `X-Forwarded-For` header
- `mod_remoteip` overrides REMOTE_ADDR with the real client IP

```text
Client (2001:db8:100::25) → LB (2001:db8:1::10) → Apache
Apache sees REMOTE_ADDR = 2001:db8:1::10 (wrong!)
X-Forwarded-For: 2001:db8:100::25 (real IP)
mod_remoteip corrects this → %a = 2001:db8:100::25
```

## Enable mod_remoteip

```bash
# Debian/Ubuntu

a2enmod remoteip
systemctl restart apache2

# RHEL/CentOS
# mod_remoteip is included in httpd
```

## Basic mod_remoteip Configuration

```apache
# /etc/apache2/conf-available/remoteip.conf

<IfModule mod_remoteip.c>
    # Header containing the real client IP
    RemoteIPHeader X-Forwarded-For

    # Trust IPv6 load balancer addresses
    RemoteIPTrustedProxy 2001:db8:1::/64

    # Also trust IPv4 load balancers
    RemoteIPTrustedProxy 192.168.1.0/24

    # Trust a specific IPv6 load balancer
    RemoteIPTrustedProxy 2001:db8:1::10
    RemoteIPTrustedProxy 2001:db8:1::11
</IfModule>
```

```bash
# Enable the configuration
a2enconf remoteip
systemctl reload apache2
```

## Update Log Format to Use Real IP

```apache
# After mod_remoteip, use %a for the real client IP
# %h = remote hostname (or IP address if HostnameLookups is Off)
# %a = real IP address after remoteip processing
# %{c}a = actual connection IP before mod_remoteip overrides it

LogFormat "%a %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined_real
LogFormat "%{c}a %a %l %u %t \"%r\" %>s" combined_debug
# %{c}a = load balancer IP, %a = real client IP

# Apply in virtual host
<VirtualHost *:80>
    CustomLog ${APACHE_LOG_DIR}/access.log combined_real
</VirtualHost>
```

## Use X-Real-IP Instead of X-Forwarded-For

```apache
<IfModule mod_remoteip.c>
    # Some load balancers use X-Real-IP header
    RemoteIPHeader X-Real-IP

    # Trust the IPv6 LB range
    RemoteIPTrustedProxy 2001:db8:1::/64
</IfModule>
```

## Verify mod_remoteip is Working

```bash
# Check mod_remoteip is loaded
apache2ctl -M | grep remoteip

# If you test from the same host, trust loopback too:
# RemoteIPTrustedProxy 127.0.0.1
# RemoteIPTrustedProxy ::1

# Then send a request with a test IPv6 client IP
curl -H "X-Forwarded-For: 2001:db8:100::25" http://localhost/

# Check the last access-log entry for the client IP
tail -n 1 /var/log/apache2/access.log

# Or use a PHP/CGI script that prints REMOTE_ADDR
# After mod_remoteip, REMOTE_ADDR should be 2001:db8:100::25
```

## Trusted Proxy vs Internal Proxy

```apache
<IfModule mod_remoteip.c>
    RemoteIPHeader X-Forwarded-For

    # RemoteIPTrustedProxy: trust these proxies to present the header
    # Use this for external proxies that forward public client IPs
    RemoteIPTrustedProxy 2001:db8:1::/64

    # RemoteIPInternalProxy: trust these internal proxies to present the header
    # Use this when private or non-public proxy/client addresses are expected
    RemoteIPInternalProxy ::1
    RemoteIPInternalProxy 2001:db8:2::20
</IfModule>
```

## Summary

Configure `mod_remoteip` in Apache with `RemoteIPHeader X-Forwarded-For` and `RemoteIPTrustedProxy 2001:db8:1::/64` to correctly extract real IPv6 client addresses from X-Forwarded-For headers. After enabling, use `%a` in log format for the real client IP, and `%{c}a` for the connection IP (load balancer). Enable with `a2enmod remoteip` and apply trusted IPv6 proxy ranges to prevent IP spoofing from untrusted sources.
