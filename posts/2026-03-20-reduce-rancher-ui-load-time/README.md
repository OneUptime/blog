# How to Reduce Rancher UI Load Time - Reduce Load Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, UI Performance, CDN, Browser, Optimization, User Experience

Description: Reduce Rancher UI load time by deploying behind a CDN, optimizing TLS termination, enabling compression, and tuning proxy settings.

## Introduction

Rancher's web UI is a rich single-page application (Vue.js) that fetches substantial JavaScript bundles and makes many API calls on load. Users managing dozens of clusters often experience slow UI load times. This guide covers front-end and infrastructure optimizations.

## Step 1: Add a Reverse Proxy with Compression

If you terminate TLS on an external Layer 7 proxy in front of Rancher, make sure it supports WebSockets and forwards the headers Rancher expects. The example below also enables gzip/brotli compression and caches only static assets:

```nginx
# nginx.conf for Rancher reverse proxy

http {
    proxy_cache_path /var/cache/nginx/rancher levels=1:2 keys_zone=rancher-static-cache:10m inactive=7d max_size=1g use_temp_path=off;

    upstream rancher {
        server rancher.cattle-system.svc.cluster.local:80;
        keepalive 100;
    }

    map $http_upgrade $connection_upgrade {
        default Upgrade;
        ''      close;
    }

    server {
        listen 443 ssl;
        http2 on;
        server_name rancher.example.com;

        ssl_certificate /etc/ssl/rancher/tls.crt;
        ssl_certificate_key /etc/ssl/rancher/tls.key;
        ssl_protocols TLSv1.2 TLSv1.3;

        # Enable gzip for JS/CSS assets
        gzip on;
        gzip_types application/javascript text/css application/json;
        gzip_min_length 1024;
        gzip_comp_level 6;
        gzip_vary on;

        # Enable Brotli if nginx-brotli module is available
        brotli on;
        brotli_types application/javascript text/css application/json;
        brotli_comp_level 6;

        # Cache static assets (Rancher uses content-hashed filenames)
        location ~* \.(js|css|woff2|png|svg)$ {
            proxy_pass http://rancher;
            proxy_cache rancher-static-cache;
            proxy_cache_valid 200 7d;    # Cache static assets for 7 days
            proxy_cache_lock on;
            add_header Cache-Control "public, max-age=604800, immutable";
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Port $server_port;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location / {
            proxy_pass http://rancher;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Port $server_port;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_read_timeout 1800s;
            proxy_buffering off;
        }
    }
}
```

## Step 2: Configure HTTP/2

Rancher UI makes many concurrent API calls. HTTP/2 multiplexing significantly improves performance:

```bash
# Verify HTTP/2 is enabled on your load balancer
curl -I --http2 https://rancher.example.com

# HTTP/2 response should show: HTTP/2 200
```

## Step 3: Reduce API Calls on Load

Users with many clusters can avoid landing on the Rancher home page first by setting a specific cluster as their login landing page:

```bash
# Set a default cluster to reduce initial load
# Users can configure this in their profile:
# User Avatar > Preferences > Landing Page > Specific Cluster
```

## Step 4: Use a CDN for Global Teams

For distributed teams, put a CDN in front of Rancher only for static UI assets and leave API/auth/WebSocket traffic uncached:

```yaml
# Cloudflare Configuration
# - Enable Brotli compression
# - Set Cache Rules for static asset URLs with TTL 7 days
# - Bypass cache for API/auth/WebSocket traffic
# - Enable HTTP/2 and optionally HTTP/3 (QUIC) between browsers and Cloudflare
# - Enable Argo Smart Routing for non-cacheable traffic
# - Set SSL mode to Full (Strict)
```

## Step 5: Optimize Browser Settings

Advise users to:

1. Use Firefox or a Chromium-based browser (Chrome, Edge, Opera, Brave, etc.)
2. Ensure browser caching is enabled (not incognito mode for regular use)
3. Use the Rancher CLI for bulk operations instead of the UI

## Step 6: Monitor UI Performance

```bash
# Use Chrome DevTools to measure load time
# Open DevTools > Network > Disable cache > Hard reload
# Look at:
# - DOMContentLoaded time (compare before and after changes)
# - Bundle sizes (main JS bundle is often the bottleneck)
# - API call waterfall (look for sequential blocking calls)
```

## Conclusion

The biggest UI load time improvements usually come from HTTP/2 multiplexing (reduces connection-level request queuing), compression (often cuts transfer size by roughly half or more), and static asset caching (reduces repeat downloads). For global teams, a CDN can reduce latency for users far from the Rancher server's data center, as long as only static assets are cached.
