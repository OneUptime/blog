# How to Configure HAProxy Transparent Proxy with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, HAProxy, Transparent Proxy, TPROXY, Network Configuration

Description: Learn how to configure HAProxy as a transparent proxy for IPv6 traffic, allowing it to intercept and forward connections while preserving original source and destination addresses.

## What is Transparent Proxy?

Transparent proxy allows HAProxy to:
- Forward connections appearing to come from the original client IPv6 address
- Intercept traffic without client reconfiguration (TPROXY mode)
- Preserve source IPs for logging and backend application logic

```text
Client (2001:db8::client) → Router → HAProxy (TPROXY) → Backend
Backend sees connection from: 2001:db8::client (original client)
Not from: HAProxy's address
```

## Option 1: Preserve Source IP with transparent

```haproxy
# HAProxy sends traffic to backend using the client's source IP

# Requires: CAP_NET_ADMIN, iptables TPROXY, routing rules

global
    maxconn 4096

backend transparent_backend
    # Use client's source address for outgoing connections to backend
    # Source family must match the server family (IPv6 here)
    source ipv6@:: usesrc clientip

    # For IPv4 backends use:
    # source 0.0.0.0 usesrc clientip

    server app1 [2001:db8::10]:8080
    server app2 [2001:db8::11]:8080
```

## System Configuration for Transparent Proxy

```bash
# 1. Enable IP forwarding
sysctl -w net.ipv6.conf.all.forwarding=1

# 2. Create routing table for TPROXY
ip -6 rule add fwmark 1 lookup 100
ip -6 route add local default dev lo table 100

# 3. Add iptables/ip6tables rules for TPROXY
ip6tables -t mangle -A PREROUTING -p tcp --dport 80 \
    -j TPROXY --tproxy-mark 0x1/0x1 --on-port 3128

ip6tables -t mangle -A PREROUTING -p tcp --dport 443 \
    -j TPROXY --tproxy-mark 0x1/0x1 --on-port 3129
```

## HAProxy Configuration for TPROXY

```haproxy
global
    log /dev/log local0
    maxconn 4096

defaults
    mode tcp
    log global
    timeout connect 5s
    timeout client  30s
    timeout server  30s

frontend tproxy_http
    # Bind with transparent option (requires TPROXY kernel support)
    bind [::]:3128 transparent
    default_backend app_servers

backend app_servers
    # Forward with original client source IP
    # For IPv6 backends, source family must match destination
    source ipv6@:: usesrc clientip
    server app1 [2001:db8::10]:8080
    server app2 [2001:db8::11]:8080
```

## Option 2: Use PROXY Protocol Instead

For most use cases, PROXY protocol is simpler and more reliable:

```haproxy
backend app_servers
    # Instead of transparent proxy, use PROXY protocol
    # Easier to configure, no special kernel/routing needed
    server app1 [2001:db8::10]:8080 check send-proxy-v2
    server app2 [2001:db8::11]:8080 check send-proxy-v2
```

## Verify Transparent Proxy Operation

```bash
# Check HAProxy has required capability
getcap $(which haproxy)
# Should include: cap_net_admin+eip

# Grant capability if missing
setcap cap_net_admin+ep /usr/sbin/haproxy

# Test: backend should see original client IPv6 address
# On a backend server, run:
tcpdump -i eth0 -n tcp port 8080

# Access through HAProxy from a different client
curl -6 http://[2001:db8::haproxy]/
# Backend should show client's IPv6 address in tcpdump
```

## Summary

HAProxy transparent proxy for IPv6 uses `source ipv6@:: usesrc clientip` in backend sections to forward connections appearing to originate from the original client. Requires Linux TPROXY kernel support, routing rules (`ip -6 rule add fwmark 1 lookup 100`), and ip6tables TPROXY rules. For most applications, the PROXY protocol (`send-proxy-v2`) is simpler, more portable, and equally effective at preserving client IPv6 addresses to backend services.
