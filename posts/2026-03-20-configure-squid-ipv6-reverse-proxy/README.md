# How to Configure Squid as an IPv6 Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Squid, Reverse Proxy, Cache, HTTP Proxy, Networking

Description: Configure Squid as an IPv6 reverse proxy that caches content from backend servers and serves requests to IPv6 clients, with cache tuning and acceleration.

## Introduction

A reverse proxy sits in front of backend servers, caching responses and serving them to clients. Squid as a reverse proxy (also called an accelerator) handles IPv6 client connections, caches backend responses, and forwards requests to origin servers. This reduces backend load and improves response times for IPv6 clients.

## Squid Reverse Proxy Configuration

```squid
# /etc/squid/squid.conf - IPv6 Reverse Proxy (Accelerator)

# Listen on IPv6 for incoming client requests

http_port [::]:80 accel vhost

# HTTPS with IPv6
https_port [::]:443 accel vhost \
  cert=/etc/squid/server.crt \
  key=/etc/squid/server.key

# Backend (origin) server - IPv6 or IPv4
cache_peer 2001:db8::1 parent 8080 0 no-query originserver \
  name=backend1 login=PASS

# Or IPv4 backend
cache_peer 10.0.0.10 parent 80 0 no-query originserver \
  name=backend-ipv4

# Prefer IPv6 connections to backends
dns_v4_first off

# ACL: traffic destined for our virtual host
acl our_site dstdomain .example.com

# Forward requests to backend
http_access allow our_site

# Use backend only for our site
cache_peer_access backend1 allow our_site
cache_peer_access backend1 deny all

# Disable caching for dynamic content
acl no_cache urlpath_regex \.php$
cache deny no_cache
```

## Cache Configuration for IPv6 Traffic

```squid
# Cache storage
cache_dir ufs /var/spool/squid 20000 16 256
maximum_object_size 50 MB
cache_mem 512 MB

# Cache control
cache_replacement_policy heap LFUDA
memory_replacement_policy heap GDSF

# Refresh patterns - cache static content aggressively
refresh_pattern ^ftp:          1440  20% 10080
refresh_pattern ^gopher:       1440   0% 1440
refresh_pattern -i (/cgi-bin/|\?) 0  0%  0
refresh_pattern \.(jpg|jpeg|png|gif|ico|css|js) 10080 90% 43200
refresh_pattern .              0     20% 4320

# Log X-Forwarded-For from IPv6 clients
forwarded_for on
follow_x_forwarded_for allow all
acl_uses_indirect_client on
```

## IPv6 Client Headers

```squid
# Add X-Forwarded-For with client's IPv6 address to backend requests
request_header_add X-Forwarded-For "%>a" all

# Forward client IP to backend (for logging)
forwarded_for on
```

## Load Balancing Multiple IPv6 Backends

```squid
# Round-robin across multiple IPv6 backends
cache_peer 2001:db8::1 parent 8080 0 no-query originserver \
  round-robin weight=1 name=be1

cache_peer 2001:db8::2 parent 8080 0 no-query originserver \
  round-robin weight=1 name=be2

cache_peer 2001:db8::3 parent 8080 0 no-query originserver \
  round-robin weight=2 name=be3   # Higher weight = more traffic

# Failover configuration
cache_peer 2001:db8::ff parent 8080 0 no-query originserver \
  no-digest no-netdb-exchange allow-miss \
  max-conn=100 name=backup
```

## Monitoring Cache Performance

```bash
# Real-time cache stats via Squid manager
squidclient -h ::1 mgr:info | grep -E "Hits|Miss|Request"

# Cache hit ratio for IPv6 traffic
tail -1000 /var/log/squid/access.log | \
  awk '{split($4, a, "/"); hits[a[1]]++} END {
    total = hits["TCP_HIT"] + hits["TCP_MISS"]
    if (total > 0) printf "Hit ratio: %.1f%%\n", hits["TCP_HIT"]/total*100
  }'

# Per-client cache stats
awk '{print $3}' /var/log/squid/access.log | \
  grep "2001:db8:" | \
  sort | uniq -c | sort -rn
```

## Conclusion

Squid as an IPv6 reverse proxy combines caching with IPv6 frontend support. Use `http_port [::]:80 accel vhost` for IPv6 listening and `cache_peer` with IPv6 backend addresses. Configure `forwarded_for on` to pass client IPv6 addresses to backends. Monitor cache hit ratios and response times with OneUptime to verify the reverse proxy is improving performance.
