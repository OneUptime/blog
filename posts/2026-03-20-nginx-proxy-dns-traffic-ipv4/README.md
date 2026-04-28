# How to Configure Nginx to Proxy DNS Traffic Over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, DNS, Proxy, IPv4, UDP, Stream Module, Networking

Description: Configure Nginx's stream module to proxy UDP and TCP DNS traffic over IPv4 to upstream DNS resolvers with load balancing and health checks.

## Introduction

Nginx's `stream` module can proxy layer-4 TCP and UDP traffic, making it suitable for DNS proxying. A DNS proxy in front of your resolvers provides load balancing across multiple upstream DNS servers, logging, and a single DNS endpoint for your network.

## Prerequisites

Nginx must be compiled with the `--with-stream` flag (UDP support has been built into the stream module since Nginx 1.9.13):

```bash
# Check if stream module is available

nginx -V 2>&1 | grep -o 'with-stream'
```

On Ubuntu/Debian, install:

```bash
sudo apt-get install nginx-full   # Includes stream module
```

## Basic DNS Proxy Configuration (UDP)

DNS primarily uses UDP. Configure an Nginx stream block:

```nginx
# /etc/nginx/nginx.conf

# Stream block must be at the top level (not inside http block)
stream {
    
    # Upstream DNS resolvers
    upstream dns_servers {
        # Round-robin across multiple resolvers
        server 8.8.8.8:53;         # Google DNS (primary)
        server 8.8.4.4:53;         # Google DNS (secondary)
        server 1.1.1.1:53;         # Cloudflare DNS
        
        # Optional: use hash for sticky resolution (same client → same resolver)
        # hash $remote_addr consistent;
    }
    
    # DNS server listening on UDP port 53
    server {
        listen 53 udp reuseport;    # UDP listener on port 53
        
        # Forward DNS queries to upstream resolvers
        proxy_pass dns_servers;
        
        proxy_timeout 2s;           # Timeout for upstream response
        proxy_responses 1;          # DNS expects 1 response per query
        
        # Log DNS proxy connections
        access_log /var/log/nginx/dns_access.log;
        error_log  /var/log/nginx/dns_error.log;
    }
    
    # Also proxy TCP DNS (used for large responses and zone transfers)
    server {
        listen 53;                  # TCP listener on port 53
        proxy_pass dns_servers;
        proxy_timeout 5s;
    }
}
```

## DNS Proxy with Access Control

```nginx
stream {
    
    # Geo module to restrict DNS to internal networks only
    geo $allowed_dns_client {
        default          0;          # Deny by default
        10.0.0.0/8       1;          # Allow internal network
        172.16.0.0/12    1;
        192.168.0.0/16   1;
        127.0.0.1/32     1;          # Allow localhost
    }
    
    upstream dns_resolvers {
        server 8.8.8.8:53;
        server 1.1.1.1:53;
    }
    
    server {
        listen 53 udp reuseport;
        listen 53;
        
        # Block non-internal clients
        # (Note: stream module doesn't support if; use map + proxy_pass instead)
        proxy_pass dns_resolvers;
        proxy_timeout 3s;
        proxy_responses 1;
    }
}
```

## DNS with Log Format Customization

```nginx
stream {
    
    # Custom log format for DNS traffic
    log_format dns '$remote_addr [$time_local] $protocol '
                   'upstream_bytes=$upstream_bytes_sent '
                   'downstream_bytes=$bytes_sent '
                   'upstream=$upstream_addr status=$status';
    
    upstream dns_pool {
        server 8.8.8.8:53;
        server 8.8.4.4:53;
    }
    
    server {
        listen 53 udp reuseport;
        proxy_pass dns_pool;
        proxy_timeout 2s;
        proxy_responses 1;
        access_log /var/log/nginx/dns.log dns;
    }
}
```

## Split-Horizon DNS with Multiple Upstreams

```nginx
stream {
    
    # Internal domain resolvers
    upstream internal_dns {
        server 10.0.0.10:53;     # Internal authoritative DNS
        server 10.0.0.11:53;
    }
    
    # External domain resolvers
    upstream external_dns {
        server 8.8.8.8:53;
        server 1.1.1.1:53;
    }
    
    # Route based on source IP
    map $remote_addr $dns_upstream {
        "~^10\."      internal_dns;
        default       external_dns;
    }
    
    server {
        listen 53 udp reuseport;
        proxy_pass $dns_upstream;    # Dynamic upstream based on client IP
        proxy_timeout 3s;
        proxy_responses 1;
    }
}
```

## Testing the DNS Proxy

```bash
# Start Nginx
sudo systemctl restart nginx

# Test DNS resolution through the proxy
dig @127.0.0.1 google.com
nslookup google.com 127.0.0.1

# Test UDP DNS with a specific record type
dig @127.0.0.1 -t MX example.com

# Test TCP DNS
dig @127.0.0.1 +tcp google.com
```

## Monitoring DNS Proxy

```bash
# Watch Nginx DNS logs
sudo tail -f /var/log/nginx/dns.log

# Check active connections
sudo nginx -T | grep stream
```

## Conclusion

Nginx's stream module provides a lightweight DNS proxy with load balancing and logging capabilities. It is particularly useful for corporate environments where a single DNS endpoint simplifies DHCP configuration while distributing queries across multiple resolvers for redundancy.
