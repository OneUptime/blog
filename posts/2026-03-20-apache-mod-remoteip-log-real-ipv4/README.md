# How to Enable mod_remoteip to Log Real Client IPv4 Behind a Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, Mod_remoteip, IPv4, Logging, Reverse Proxy, X-Forwarded-For

Description: Configure Apache mod_remoteip to extract the real client IPv4 address from X-Forwarded-For headers when Apache is deployed behind a load balancer or reverse proxy.

## Introduction

When Apache sits behind a load balancer, CDN, or reverse proxy, `%h` in access logs records the proxy's IP rather than the real client IP. `mod_remoteip` solves this by reading the client IP from trusted proxy headers and replacing `REMOTE_ADDR` with the real client's IPv4 address.

## Enabling mod_remoteip

```bash
# Enable the module

sudo a2enmod remoteip

# Verify it's loaded
apache2ctl -M | grep remoteip
```

## Basic Configuration

```apache
# /etc/apache2/conf-available/remoteip.conf

# Define the header that carries the client IP
RemoteIPHeader X-Forwarded-For

# Trust specific proxy IPv4 addresses or ranges
RemoteIPTrustedProxy 192.168.1.1        # Internal load balancer
RemoteIPTrustedProxy 10.0.0.0/8         # Internal proxy network

# Example CDN IPv4 ranges; use your provider's full current published list
RemoteIPTrustedProxy 103.21.244.0/22
RemoteIPTrustedProxy 103.22.200.0/22
```

Enable the config:

```bash
sudo a2enconf remoteip
sudo systemctl reload apache2
```

## Using RemoteIPInternalProxy

For proxies that should be allowed to pass internal/private client IPv4 addresses:

```apache
# Internal proxies whose forwarded client IPs may be private RFC1918 addresses
RemoteIPInternalProxy 10.0.0.0/8
RemoteIPInternalProxy 172.16.0.0/12
RemoteIPInternalProxy 192.168.0.0/16
```

## Using a Different Header

Some load balancers use `X-Real-IP` instead of `X-Forwarded-For`:

```apache
# Use X-Real-IP header instead
RemoteIPHeader X-Real-IP
RemoteIPTrustedProxy 10.0.0.1  # Your load balancer
```

## Updating Access Log Format

After enabling mod_remoteip, the standard combined format still works, and `%a` / `%{c}a` let you log both the rewritten client IP and the underlying proxy IP explicitly:

```apache
# /etc/apache2/conf-available/remoteip.conf

# Standard combined log format - %h reflects the rewritten client IP when HostnameLookups is Off
LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined

# Extended format showing the client IP, connection IP, and trusted proxy list
LogFormat "%a %{c}a %{remoteip-proxy-ip-list}n %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined_extended
# %a = client IP after mod_remoteip processing
# %{c}a = underlying connection IP (the proxy's IP)
# %{remoteip-proxy-ip-list}n = intermediate trusted proxies processed by mod_remoteip
```

## Verifying mod_remoteip Is Working

```apache
# Add a temporary debug header to verify (requires mod_headers)
<VirtualHost *:80>
    ServerName app.example.com

    # Echo the remote IP back in a response header (for debugging only)
    Header always set X-Debug-Remote-Addr "expr=%{REMOTE_ADDR}"
</VirtualHost>
```

```bash
# If mod_headers is not already enabled
sudo a2enmod headers
sudo systemctl reload apache2

# Make a request through the proxy chain and check the header
curl -v http://app.example.com/ 2>&1 | grep X-Debug-Remote-Addr

# The value should be the real client IP, not the load balancer IP
```

Check access logs:

```bash
# Real client IP should appear in access log
sudo tail -f /var/log/apache2/access.log

# Compare with and without mod_remoteip:
# Without: 10.0.0.1 - - [19/Mar/2026:10:00:00] "GET / HTTP/1.1" 200 1234
# With:    203.0.113.50 - - [19/Mar/2026:10:00:00] "GET / HTTP/1.1" 200 1234
```

## Security Considerations

Only trust your own infrastructure in `RemoteIPTrustedProxy`. If you trust arbitrary IPs, clients can spoof their IP by sending a fabricated `X-Forwarded-For` header.

```apache
# DANGEROUS: Never do this in production
# RemoteIPTrustedProxy 0.0.0.0/0  ← allows IP spoofing!

# SAFE: Only trust your specific load balancers
RemoteIPTrustedProxy 10.0.0.1   # Load balancer 1
RemoteIPTrustedProxy 10.0.0.2   # Load balancer 2
```

## Conclusion

`mod_remoteip` is essential for accurate access logging and IP-based access control when Apache is behind a proxy. Configure `RemoteIPTrustedProxy` with exactly your load balancer IPs, use `RemoteIPHeader X-Forwarded-For`, and verify real IPs appear in logs. Never trust IP ranges you do not control.
