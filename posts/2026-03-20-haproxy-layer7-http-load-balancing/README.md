# How to Configure HAProxy Layer 7 HTTP Load Balancing with IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, HTTP, Layer 7, Load Balancing, IPv4, ACL, Content Routing

Description: Configure HAProxy in HTTP mode for Layer 7 load balancing, enabling content-based routing, header manipulation, and application-aware traffic distribution.

## Introduction

Layer 7 (HTTP mode) load balancing allows HAProxy to inspect HTTP content-headers, URLs, cookies-enabling sophisticated routing decisions. You can route `/api/` to one backend, `/static/` to another, and add or modify HTTP headers in transit.

## Complete HTTP Load Balancer Configuration

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    maxconn 100000
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http                  # HTTP (Layer 7) mode
    option  httplog               # Full HTTP access logging
    option  dontlognull           # Skip logging empty connections
    option  forwardfor            # Add X-Forwarded-For header
    option  http-server-close     # Keep client connection alive, close server side
    option  redispatch            # Retry on another server after a failed connection attempt
    retries 3
    timeout http-request  10s    # Time to receive full HTTP request
    timeout queue         30s    # Time in queue when backend full
    timeout connect       5s
    timeout client        60s
    timeout server        60s
    timeout http-keep-alive 10s  # Idle time for keepalive connections

# Frontend: HTTP entry point

frontend http_in
    bind 203.0.113.10:80

    # HTTP to HTTPS redirect
    redirect scheme https code 301 if !{ ssl_fc }

frontend https_in
    bind 203.0.113.10:443 ssl crt /etc/haproxy/certs/bundle.pem

    # Define ACLs for content-based routing
    acl is_api      path_beg /api/
    acl is_static   path_beg /static/ /assets/ /img/
    acl is_websocket hdr(Upgrade) -i WebSocket

    # Route based on ACL matches
    use_backend ws_servers      if is_websocket
    use_backend api_servers     if is_api
    use_backend static_servers  if is_static
    default_backend web_servers
```

## Backend Definitions

```haproxy
backend web_servers
    balance roundrobin

    # HTTP health check endpoint
    option httpchk GET /health HTTP/1.1
    http-check send hdr Host www.example.com
    http-check expect status 200

    # Manipulate headers before sending to backend
    http-request set-header X-Forwarded-Proto https
    http-request del-header Proxy    # Remove potential header injection

    server web1 192.168.1.10:8080 check inter 3s fall 3 rise 2
    server web2 192.168.1.11:8080 check inter 3s fall 3 rise 2
    server web3 192.168.1.12:8080 check inter 3s fall 3 rise 2 weight 2

backend api_servers
    balance leastconn

    option httpchk GET /api/health
    http-check expect status 200

    # Compress API responses
    compression algo gzip
    compression type application/json text/plain

    server api1 192.168.2.10:8080 check
    server api2 192.168.2.11:8080 check

backend static_servers
    balance uri          # Hash URI for cache consistency

    server cdn1 192.168.3.10:80 check
    server cdn2 192.168.3.11:80 check

backend ws_servers
    # WebSocket requires specific timeouts
    timeout tunnel 1h   # Keep WebSocket connections alive

    server ws1 192.168.4.10:8080 check
    server ws2 192.168.4.11:8080 check
```

## URL Rewriting and Header Manipulation

```haproxy
# Add these directives inside the existing frontend https_in

    # Rewrite URL path before forwarding
    http-request set-path /v2%[path] if { path_beg /api/ }

    # Set custom request headers
    http-request set-header X-Request-ID %[uuid()]
    http-request set-header X-Real-IP %[src]

    # Remove sensitive headers from responses
    http-response del-header Server
    http-response del-header X-Powered-By

    # Add security headers to responses
    http-response set-header X-Content-Type-Options nosniff
    http-response set-header X-Frame-Options DENY
    http-response set-header Strict-Transport-Security "max-age=63072000; includeSubDomains"
```

## Rate Limiting at Layer 7

```haproxy
# Add these directives inside the existing frontend https_in

    # Track request rate per source IP
    stick-table type ip size 100k expire 60s store http_req_rate(60s)
    http-request track-sc0 src

    # Reject if more than 100 requests per minute
    http-request reject if { sc_http_req_rate(0) gt 100 }
```

## Conclusion

HAProxy Layer 7 HTTP mode unlocks content-aware routing using ACLs, flexible header manipulation, HTTP health checks, and application-level rate limiting. It is the right choice for modern web applications, microservices, and APIs. The performance overhead over TCP mode is minimal thanks to HAProxy's event-driven architecture.
