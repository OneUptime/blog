# How to Configure HAProxy Backend Servers with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, HAProxy, Backend, Load Balancer, Server

Description: Learn how to configure HAProxy backend sections with IPv6 server addresses, including load balancing, health checks, and failover with IPv6 backend servers.

## Basic IPv6 Backend

```haproxy
# Backend with IPv6 server addresses

backend app_servers
    balance roundrobin

    # IPv6 servers - address in brackets
    server app1 [2001:db8::10]:8080 check
    server app2 [2001:db8::11]:8080 check
    server app3 [2001:db8::12]:8080 check
```

## Backend with Health Checks

```haproxy
backend web_servers
    balance leastconn
    option httpchk GET /health HTTP/1.1
    http-check send hdr Host example.com

    # IPv6 servers with check parameters
    server web1 [2001:db8::10]:80 check inter 5s rise 2 fall 3
    server web2 [2001:db8::11]:80 check inter 5s rise 2 fall 3

    # Backup server (only used when all active servers are down)
    server backup1 [2001:db8::12]:80 check backup
```

## Mixed IPv4 and IPv6 Backend

```haproxy
backend mixed_backend
    balance roundrobin

    # IPv6 servers
    server ipv6-app1 [2001:db8::10]:8080 check weight 3
    server ipv6-app2 [2001:db8::11]:8080 check weight 3

    # IPv4 servers
    server ipv4-app1 192.168.1.10:8080 check weight 1
    server ipv4-app2 192.168.1.11:8080 check weight 1
```

## HTTPS Backend with IPv6

```haproxy
backend secure_backend
    balance roundrobin

    # HTTPS to IPv6 backend
    server app1 [2001:db8::10]:443 check ssl verify none
    server app2 [2001:db8::11]:443 check ssl verify required ca-file /etc/ssl/certs/ca.crt verifyhost app2.example.com
```

## Backend with Persistent Sessions

```haproxy
backend sticky_backend
    balance roundrobin
    cookie SERVERID insert indirect nocache

    # Cookie-based persistence to IPv6 servers
    server app1 [2001:db8::10]:8080 check cookie server1
    server app2 [2001:db8::11]:8080 check cookie server2
```

## Backend with Source IP Persistence

```haproxy
backend source_persist
    # Source-based persistence hashes the client source IP
    balance source

    # Consistent hashing reduces remapping when server availability changes
    hash-type consistent

    server app1 [2001:db8::10]:8080 check
    server app2 [2001:db8::11]:8080 check
    server app3 [2001:db8::12]:8080 check
```

## Verify Backend Configuration

```bash
# Test configuration syntax
haproxy -c -f /etc/haproxy/haproxy.cfg

# Reload HAProxy
systemctl reload haproxy

# Check backend status via stats socket
echo "show servers state" | socat stdio /var/run/haproxy/admin.sock

# Check backend health via stats page
# Access http://haproxy:8404/stats (if configured)

# Test direct connection to IPv6 backend
curl -g -6 http://[2001:db8::10]:8080/health

# Check HAProxy logs
journalctl -u haproxy -f
```

## Summary

Configure HAProxy backend servers with IPv6 addresses using `server name [2001:db8::10]:PORT check`. Health checks with `check inter 5s rise 2 fall 3` monitor backend availability. Use `backup` keyword for standby servers. Mix IPv4 and IPv6 servers in the same backend by using appropriate syntax for each. For HTTPS backends, add `ssl` and use `verify required ca-file /path/to/ca.crt verifyhost <hostname>` when you need certificate validation while connecting to an IP literal. Use `balance source` with `hash-type consistent` for source-based persistence with IPv6 clients while reducing remapping when servers change state.
