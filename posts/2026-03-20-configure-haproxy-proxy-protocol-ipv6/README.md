# How to Configure HAProxy PROXY Protocol with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, HAProxy, Proxy Protocol, Client IP, Load Balancer

Description: Learn how to configure the PROXY protocol in HAProxy for IPv6 connections to preserve client IP addresses through multiple proxy layers, including sending and receiving PROXY protocol headers.

## What is the PROXY Protocol?

The PROXY protocol prepends a header to TCP connections containing the original client's IP and port. This allows backend services to see the real client IPv6 address even after multiple proxy hops.

```text
Client (2001:db8::client:1234) → HAProxy → Backend
Without PROXY: Backend sees HAProxy's IPv6 address
With PROXY: Backend sees "PROXY TCP6 2001:db8::client 2001:db8::haproxy 1234 8080"
```

## Send PROXY Protocol to Backend

```haproxy
backend app_servers_v2
    # Send PROXY protocol v2 to IPv6 backends
    server app1 [2001:db8::10]:8080 check send-proxy-v2
    server app2 [2001:db8::11]:8080 check send-proxy-v2

    # PROXY protocol v1 (text format, human-readable)
    # server app1 [2001:db8::10]:8080 check send-proxy
```

## Accept PROXY Protocol from Upstream

```haproxy
frontend https_front
    # Accept PROXY protocol from an upstream load balancer
    bind [::]:443 accept-proxy ssl crt /etc/ssl/haproxy/example.pem

    default_backend app_servers
```

## PROXY Protocol v1 Format for IPv6

```text
# PROXY protocol v1 line format:

# PROXY TCP6 <client-ipv6> <proxy-ipv6> <client-port> <proxy-port>\r\n

# Example:
PROXY TCP6 2001:db8::client 2001:db8::haproxy 1234 80

# For local connections (health checks, etc.)
PROXY UNKNOWN\r\n
```

## PROXY Protocol v2 (Binary, Preferred)

```haproxy
backend app_servers
    # PROXY protocol v2 is more efficient (binary format)
    # Supports IPv4, IPv6, UNIX sockets, and TLV extensions
    server app1 [2001:db8::10]:8080 send-proxy-v2

    # Send SSL information in PROXY protocol v2 TLV
    server app1 [2001:db8::10]:8080 send-proxy-v2-ssl
```

## Full Frontend-to-Backend PROXY Protocol Chain

```haproxy
# Layer 1: External LB to HAProxy (HAProxy receives PROXY protocol)
frontend from_external_lb
    bind [::]:443 accept-proxy ssl crt /etc/ssl/haproxy/cert.pem
    default_backend haproxy_tier2

# Layer 2: HAProxy to backend (HAProxy sends PROXY protocol)
backend haproxy_tier2
    server backend1 [2001:db8::10]:8080 send-proxy-v2

# OR: Through in a single tier
frontend http_front
    bind *:80
    bind [::]:80
    default_backend proxy_backend

backend proxy_backend
    server app1 [2001:db8::10]:8080 check send-proxy-v2
```

## Verify PROXY Protocol is Working

```bash
# Send a PROXY protocol v1 header manually for testing
echo -e "PROXY TCP6 2001:db8::1 ::1 1234 80\r\nGET / HTTP/1.0\r\nHost: example.com\r\n\r\n" | \
    nc 2001:db8::10 8080

# Listen on backend and verify PROXY header received
# On the backend server:
nc -l 8080 | head -5

# Check HAProxy logs for client IP propagation
tail -f /var/log/haproxy.log
# Should show real client IPv6 address, not HAProxy's address
```

## Configure Nginx Backend to Accept PROXY Protocol

```nginx
server {
    # Nginx: accept PROXY protocol
    listen [::]:8080 proxy_protocol;

    # Use real_ip_header for PROXY protocol
    real_ip_header proxy_protocol;

    # Trusted proxy (HAProxy address)
    set_real_ip_from 2001:db8::haproxy;

    location / {
        root /var/www/html;
    }
}
```

## Summary

The PROXY protocol preserves client IPv6 addresses through proxy layers. Send PROXY protocol to backends with `server app1 [2001:db8::10]:8080 send-proxy-v2`. Receive it from upstream proxies with `bind [::]:443 accept-proxy`. PROXY protocol v2 (binary) is preferred over v1 (text) for production. The backend application must also be configured to read and parse the PROXY protocol header to obtain the real client IP.
