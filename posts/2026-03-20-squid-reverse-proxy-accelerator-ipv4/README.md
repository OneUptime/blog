# How to Set Up Squid Reverse Proxy (Accelerator) on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, Reverse Proxy, Accelerator, IPv4, Caching, HTTP

Description: Configure Squid as a reverse proxy (web accelerator) on IPv4 to cache and serve content from backend origin servers, reducing origin load.

## Introduction

Squid can operate as a reverse proxy or web accelerator, sitting in front of origin servers and caching their responses. Clients connect to Squid's IPv4 address, and Squid forwards cache misses to the origin while serving cache hits directly.

## Basic Reverse Proxy Configuration

```bash
# /etc/squid/squid.conf

# Listen on public IPv4 as reverse proxy

http_port 203.0.113.10:80 accel defaultsite=www.example.com no-vhost

# For HTTPS termination (requires Squid built with TLS support)
https_port 203.0.113.10:443 accel defaultsite=www.example.com no-vhost \
    tls-cert=/etc/squid/ssl/server.crt \
    tls-key=/etc/squid/ssl/server.key

# Define the origin server (backend)
cache_peer 192.168.1.10 parent 8080 0 no-query no-digest originserver name=origin1
acl our_site dstdomain www.example.com
cache_peer_access origin1 allow our_site
cache_peer_access origin1 deny all

# Only allow connections through the origin peer
never_direct allow all

# Cache settings
cache_mem 256 MB
maximum_object_size 50 MB
cache_dir ufs /var/spool/squid 10000 16 256

# Access control: allow clients for this site
http_access allow localhost manager
http_access deny manager
http_access allow our_site
http_access deny all
```

## Multiple Origin Servers (Load Balancing)

```bash
# Define multiple origin servers
cache_peer 192.168.1.10 parent 8080 0 no-query no-digest originserver round-robin name=origin1
cache_peer 192.168.1.11 parent 8080 0 no-query no-digest originserver round-robin name=origin2
cache_peer 192.168.1.12 parent 8080 0 no-query no-digest originserver round-robin name=origin3

# Never go direct to origin (always via cache peers)
never_direct allow all

# Round-robin load balancing across peers
cache_peer_access origin1 allow all
cache_peer_access origin2 allow all
cache_peer_access origin3 allow all
```

## Caching Policies

Control what Squid caches:

```bash
# Don't cache dynamic content or authenticated requests
acl dynamic_content url_regex -i /api/ /cart/ /account/
acl authenticated_requests req_header Authorization .+
cache deny dynamic_content
cache deny authenticated_requests

# Cache images, CSS, JS aggressively
acl cacheable_content url_regex -i \.(jpg|jpeg|png|gif|ico|css|js|woff2)(\?.*)?$
cache allow cacheable_content

# Default caching behavior for everything else
cache allow all
```

## Custom Cache Headers

Set heuristic freshness when the origin does not send explicit cache headers:

```bash
# Heuristic freshness for static assets without explicit origin freshness
refresh_pattern -i \.(jpg|jpeg|png|gif|ico|css|js|woff2)(\?.*)?$ 60 50% 1440
refresh_pattern .                                             0  20% 4320
```

## Testing the Reverse Proxy

```bash
# Test that Squid forwards requests to origin
curl -v -H "Host: www.example.com" http://203.0.113.10/

# Check cache hit/miss headers
curl -I -H "Host: www.example.com" http://203.0.113.10/logo.png
# X-Cache: HIT or MISS in response

# Squid access log shows HIT/MISS
sudo tail -f /var/log/squid/access.log | awk '{print $4, $7}'
# TCP_MISS = cache miss (origin served)
# TCP_HIT  = cache hit (served from cache)

# Check cache statistics through a cache manager port that allows localhost
curl -s http://127.0.0.1:3128/squid-internal-mgr/info | grep -i "cache\|hit\|miss"
```

## Conclusion

Squid reverse proxy (accelerator mode) uses `http_port <IP> accel` with `cache_peer` pointing to origin servers. Cache policies control what content is stored, and `refresh_pattern` sets heuristic freshness for static content when the origin does not send explicit freshness metadata. Monitor hit rates via the access log or the cache manager info report to measure the effectiveness of your caching strategy and tune accordingly.
