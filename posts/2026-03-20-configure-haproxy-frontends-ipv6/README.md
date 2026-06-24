# How to Configure HAProxy Frontends with IPv6 Bind Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, HAProxy, Frontend, Load Balancer, BIND

Description: Learn how to configure HAProxy frontend sections to listen on IPv6 addresses, bind to specific IPv6 interfaces, and handle both IPv4 and IPv6 traffic.

## Basic IPv6 Frontend Bind

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    maxconn 4096

defaults
    mode http
    timeout connect 5s
    timeout client  30s
    timeout server  30s

# IPv6-only frontend

frontend ipv6_http
    bind [::]:80 v6only
    default_backend app_servers
```

## Bind to Specific IPv6 Address

```haproxy
frontend specific_ipv6
    # Bind to a specific IPv6 address
    bind [2001:db8::10]:80

    # Bind to multiple IPv6 addresses
    bind [2001:db8::10]:80
    bind [2001:db8::20]:80

    default_backend app_servers
```

## Dual-Stack Frontend (IPv4 and IPv6)

```haproxy
frontend dual_stack_http
    # IPv4 and IPv6
    bind [::]:80 v4v6

    default_backend app_servers
```

## IPv6 HTTPS Frontend

```haproxy
global
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-sslv3
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256

frontend ipv6_https
    # IPv6 HTTPS
    bind [::]:443 v6only ssl crt /etc/ssl/haproxy/example.com.pem

    # HTTP mode
    mode http

    # Add security headers
    http-response set-header Strict-Transport-Security "max-age=31536000"

    # Route to backend
    acl host_api hdr(host) -i api.example.com
    use_backend api_servers if host_api
    default_backend web_servers
```

## Frontend with IPv6 ACLs

```haproxy
frontend http_front
    bind [::]:80 v4v6

    # ACLs for specific IPv6 client ranges
    acl is_ipv6 src -f /etc/haproxy/ipv6-ranges.txt
    acl is_ipv6_internal src 2001:db8:100::/48

    # Route matching IPv6 clients to dedicated backend
    use_backend ipv6_backend if is_ipv6 or is_ipv6_internal
    default_backend default_backend
```

## Check Frontend is Listening

```bash
# Check HAProxy is listening on IPv6
ss -6 -tlnp | grep haproxy

# Verify configuration
haproxy -c -f /etc/haproxy/haproxy.cfg

# Reload HAProxy
systemctl reload haproxy

# Test IPv6 frontend
curl -6 http://[::1]:80/
curl -6 http://[2001:db8::10]:80/
```

## Summary

Configure HAProxy frontends to listen on IPv6 with `bind [::]:80 v6only` (all IPv6 interfaces only) or `bind [2001:db8::10]:80` (specific address). For dual-stack, use `bind [::]:80 v4v6`. IPv6 addresses in bind directives require brackets. For HTTPS, append `ssl crt /path/to/cert.pem` to the bind line, and put `ssl-default-bind-*` settings in the `global` section. Test with `ss -6 -tlnp | grep haproxy` and `curl -6`.
