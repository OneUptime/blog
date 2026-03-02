# How to Configure HAProxy ACLs for URL-Based Routing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, HAProxy, Load Balancing, Networking, Web Server

Description: Configure HAProxy ACLs on Ubuntu to route traffic based on URL paths, hostnames, headers, and query parameters to different backend server pools.

---

HAProxy ACLs (Access Control Lists) are conditional expressions that let you make routing decisions based on properties of the request. Instead of sending all traffic to one backend, you can route `/api/*` requests to your API servers, `/admin` to a separate protected backend, and static assets to a cache tier - all within a single HAProxy instance. This guide covers the ACL syntax and practical routing scenarios.

## Installing HAProxy

```bash
# Install HAProxy on Ubuntu
sudo apt update
sudo apt install haproxy

# Check version
haproxy -v

# Enable on boot
sudo systemctl enable haproxy
sudo systemctl start haproxy
```

## HAProxy Configuration Structure

Before writing ACLs, understand the configuration sections:

```
global      - Process-wide settings (logging, security, performance)
defaults    - Default settings inherited by all frontends/backends
frontend    - Defines listening ports and applies routing logic (ACLs)
backend     - Defines server pools
listen      - Combined frontend+backend shorthand
```

## Basic ACL Syntax

```
acl NAME condition
```

Where `condition` is a test using a **fetch method** and optionally a **converter** and **matcher**:

```
acl is_api     path_beg /api/          # Path begins with /api/
acl is_static  path_end .css .js .png  # Path ends with these extensions
acl is_admin   path_beg /admin         # Path begins with /admin
acl is_secure  ssl_fc                  # Request arrived over HTTPS
acl mobile     hdr(User-Agent) -i android iphone  # User-Agent contains these
```

## URL Path-Based Routing

The most common use case - routing based on URL path:

```bash
sudo nano /etc/haproxy/haproxy.cfg
```

```
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

# Main frontend
frontend web_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/haproxy/combined.pem

    # HTTP to HTTPS redirect
    http-request redirect scheme https unless { ssl_fc }

    # --- Define ACLs ---

    # URL path-based ACLs
    acl is_api      path_beg /api/
    acl is_api_v2   path_beg /api/v2/
    acl is_admin    path_beg /admin/
    acl is_static   path_beg /static/ /assets/ /media/
    acl is_websocket path_beg /ws/
    acl is_health   path_eq /health

    # --- Routing Rules (order matters - first match wins) ---

    # Route health checks to a dedicated backend
    use_backend health_backend   if is_health

    # Route admin to a restricted backend
    use_backend admin_backend    if is_admin

    # Route API v2 before general API (more specific first)
    use_backend api_v2_backend   if is_api_v2

    # Route remaining API calls
    use_backend api_backend      if is_api

    # Route WebSocket connections
    use_backend ws_backend       if is_websocket

    # Route static assets to cache/CDN backend
    use_backend static_backend   if is_static

    # Default backend for everything else (the web app)
    default_backend app_backend

# Backend definitions
backend app_backend
    balance roundrobin
    option http-server-close
    option forwardfor
    server app1 10.0.0.10:3000 check
    server app2 10.0.0.11:3000 check

backend api_backend
    balance leastconn
    option http-server-close
    option forwardfor
    server api1 10.0.0.20:8080 check
    server api2 10.0.0.21:8080 check

backend api_v2_backend
    balance roundrobin
    server apiv2-1 10.0.0.30:8080 check
    server apiv2-2 10.0.0.31:8080 check

backend admin_backend
    # Only allow admin traffic from specific IPs
    acl admin_allowed src 10.0.0.0/24 192.168.1.100
    http-request deny unless admin_allowed
    server admin1 10.0.0.40:8080 check

backend static_backend
    balance roundrobin
    option http-server-close
    server static1 10.0.0.50:80 check
    server static2 10.0.0.51:80 check

backend ws_backend
    # WebSocket support
    timeout tunnel 3600s
    option http-server-close
    server ws1 10.0.0.60:8080 check

backend health_backend
    # Simple health response without hitting backend
    http-request return status 200 content-type "text/plain" string "OK"
```

## Hostname-Based Routing

Route traffic based on the HTTP `Host` header (virtual hosting):

```
frontend multi_site
    bind *:80
    bind *:443 ssl crt /etc/ssl/haproxy/

    # ACLs for different domains
    acl is_blog     hdr(host) -i blog.example.com
    acl is_api      hdr(host) -i api.example.com
    acl is_shop     hdr(host) -i shop.example.com
    acl is_www      hdr(host) -i example.com www.example.com

    # Route by hostname
    use_backend blog_backend  if is_blog
    use_backend api_backend   if is_api
    use_backend shop_backend  if is_shop
    use_backend web_backend   if is_www

    default_backend web_backend
```

## Combining ACLs with Logical Operators

ACLs can be combined with AND and OR logic:

```
frontend smart_frontend
    bind *:80

    # Define individual conditions
    acl is_api          path_beg /api/
    acl is_authenticated hdr(Authorization) -m found
    acl is_internal     src 10.0.0.0/8

    # Combination examples:

    # Route to premium backend only if BOTH API and authenticated
    use_backend premium_api  if is_api is_authenticated

    # Route to internal API if either internal network OR authenticated
    # (using OR: list them in separate use_backend lines or use OR operator)
    use_backend internal_api  if is_api is_internal

    # NOT operator - deny if missing authentication for API
    http-request deny if is_api !is_authenticated

    # Complex condition: POST to /api/ from external networks requires auth
    acl is_post method POST
    acl is_external !src 10.0.0.0/8
    http-request deny if is_api is_post is_external !is_authenticated
```

## Header-Based Routing

Route based on custom request headers (useful for feature flags or A/B testing):

```
frontend header_routing
    bind *:80

    # Route requests with a custom header to a different backend
    acl is_beta_user   hdr(X-Beta-Feature) -i true
    acl is_mobile      hdr(User-Agent) -i -m sub mobile android iphone

    # Send beta users to the beta backend
    use_backend beta_backend    if is_beta_user

    # Send mobile traffic to mobile-optimized backend
    use_backend mobile_backend  if is_mobile

    # Route based on Accept header (API versioning)
    acl wants_json     hdr(Accept) -i application/json
    use_backend json_api  if wants_json

    default_backend web_backend
```

## Query Parameter Routing

Route based on URL query parameters:

```
frontend query_routing
    bind *:80

    # Route based on ?version=2 query parameter
    acl is_v2   url_param(version) -m str 2
    acl is_v3   url_param(version) -m str 3

    use_backend api_v3_backend  if is_v3
    use_backend api_v2_backend  if is_v2
    default_backend api_backend
```

## Rewriting URLs Before Routing

Strip path prefixes or rewrite paths when routing to backends:

```
frontend url_rewrite
    bind *:80

    acl is_api  path_beg /api/

    # Strip the /api/ prefix before sending to backend
    # Backend receives /v1/users instead of /api/v1/users
    http-request replace-path ^/api/(.*) /\1  if is_api

    use_backend api_backend  if is_api
    default_backend app_backend
```

## Testing the Configuration

```bash
# Test configuration syntax
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Reload if syntax is valid (zero-downtime reload)
sudo systemctl reload haproxy

# Test routing with curl
curl -H "Host: blog.example.com" http://localhost:80/
curl http://localhost:80/api/v2/users
curl http://localhost:80/static/style.css

# Test ACL decisions with verbose output
curl -v http://localhost:80/admin/dashboard

# Use HAProxy stats page to see traffic distribution
# Add to defaults or frontend:
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:statspassword
```

ACLs are evaluated in order, and the first matching `use_backend` directive wins. Always put more specific ACLs before general ones to ensure the right traffic reaches the right backend.
