# How to Configure HAProxy to Bind a Frontend to a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, IPv4, Frontend, BIND, Load Balancing, Networking

Description: Configure HAProxy frontend sections to listen on specific IPv4 addresses and ports, controlling exactly which network interfaces accept incoming traffic.

## Introduction

HAProxy's `bind` directive in the frontend section controls which IPv4 address and port the load balancer listens on. Binding to a specific IP rather than all interfaces is a security best practice, especially on multi-homed servers.

## Basic Frontend Bind Configuration

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    log /dev/log local1 notice
    maxconn 50000
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    timeout connect 5s
    timeout client  60s
    timeout server  60s

# Frontend: listen on a specific IPv4 address

frontend http_in
    # Bind to specific IPv4 address on port 80
    bind 203.0.113.10:80

    default_backend app_servers

backend app_servers
    server app1 192.168.1.10:8080 check
    server app2 192.168.1.11:8080 check
```

## Binding to Multiple IPv4 Addresses

A single frontend can bind to multiple addresses:

```haproxy
frontend http_in
    # Bind to two public IPs
    bind 203.0.113.10:80
    bind 203.0.113.11:80

    # Also bind to internal management IP
    bind 10.0.0.1:80

    default_backend app_servers
```

## Binding to All IPv4 Interfaces

To accept connections on all IPv4 interfaces:

```haproxy
frontend http_in
    # 0.0.0.0 = all IPv4 interfaces
    bind 0.0.0.0:80

    # Equivalent shorthand:
    # bind *:80

    default_backend app_servers
```

## Setting TCP Options on Bind

```haproxy
frontend http_in
    # Bind with TCP options
    bind 203.0.113.10:80 accept-proxy defer-accept maxconn 10000

    default_backend app_servers
```

## SSL Bind Configuration

```haproxy
frontend https_in
    # Bind with SSL on specific IPv4
    bind 203.0.113.10:443 ssl crt /etc/haproxy/certs/example.pem

    default_backend app_servers
```

## Verifying Bind Configuration

```bash
# Check what HAProxy is listening on
sudo ss -tlnp | grep haproxy

# Validate configuration before reloading
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Reload HAProxy
sudo systemctl reload haproxy

# Or perform a seamless reload directly with HAProxy
sudo haproxy -f /etc/haproxy/haproxy.cfg -p /var/run/haproxy.pid -sf $(cat /var/run/haproxy.pid)
```

## Restricting Bind to Internal Interface Only

```haproxy
# Accept public traffic on public IP
frontend public_http
    bind 203.0.113.10:80
    default_backend app_servers

# Accept admin traffic only on internal IP
frontend admin_http
    bind 10.0.0.1:8404

    # Require all traffic to be from internal network
    tcp-request connection reject if !{ src 10.0.0.0/8 }

    # HAProxy stats page
    stats enable
    stats uri /stats
    stats refresh 10s
```

## Conclusion

HAProxy's `bind` directive gives precise control over which IPv4 addresses and ports the load balancer accepts connections on. Always bind to specific IPs on production multi-homed servers rather than `*:80`, use SSL parameters directly on the `bind` line for HTTPS frontends, and validate configuration with `haproxy -c` before reloading to prevent outages.
