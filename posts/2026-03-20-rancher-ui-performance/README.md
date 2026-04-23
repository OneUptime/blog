# How to Reduce Rancher UI Load Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, UI Performance, Nginx, CDN, Optimization

Description: Reduce Rancher UI load time through CDN configuration, browser caching, compression, and resource optimization techniques for improved user experience.

## Introduction

A slow Rancher UI frustrates operators managing many clusters. UI performance depends on network latency to the Rancher server, asset delivery speed, and browser caching. This guide covers practical techniques to improve Rancher UI responsiveness for distributed teams.

## Prerequisites

- Rancher installation accessible via HTTPS
- NGINX or another reverse proxy in front of Rancher
- CDN (optional but recommended for geographically distributed teams)

## Step 1: Configure NGINX Reverse Proxy with Caching

```nginx
# nginx.conf - Optimized Rancher reverse proxy

map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

upstream rancher_servers {
    least_conn;
    server rancher-01:80;
    server rancher-02:80;
    server rancher-03:80;

    keepalive 32;  # Persistent connections
}

server {
    listen 443 ssl;
    http2 on;
    server_name rancher.example.com;

    ssl_certificate     /etc/ssl/certs/rancher.crt;
    ssl_certificate_key /etc/ssl/private/rancher.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # Enable compression
    gzip on;
    gzip_vary on;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        image/svg+xml
        font/woff2;
    gzip_min_length 1024;
    gzip_comp_level 6;

    # Cache static assets
    location ~* \.(js|css|png|jpg|ico|svg|woff2|woff|ttf)$ {
        proxy_pass http://rancher_servers;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_cache rancher_cache;
        proxy_cache_valid 200 7d;
        proxy_cache_use_stale error timeout updating;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        add_header Cache-Control "public, max-age=604800";
        add_header X-Cache-Status $upstream_cache_status;
    }

    # Proxy all other requests
    location / {
        proxy_pass http://rancher_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 900;
        proxy_buffering off;
    }
}

# Proxy cache zone
proxy_cache_path /var/cache/nginx/rancher
    levels=1:2
    keys_zone=rancher_cache:10m
    max_size=1g
    inactive=60m
    use_temp_path=off;
```

## Step 2: Configure CDN for Rancher UI Assets

```bash
# For CloudFront distribution in front of Rancher

# Create a distribution that leaves dynamic requests uncached
# and caches only the Rancher UI asset path.
cat > distribution-config.json <<EOF
{
  "CallerReference": "rancher-ui-$(date +%s)",
  "Comment": "CloudFront for Rancher UI assets",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "rancher-origin",
        "DomainName": "rancher.example.com",
        "CustomHeaders": {
          "Quantity": 0
        },
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "rancher-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "OriginRequestPolicyId": "b689b0a8-53d0-40ab-baf2-68738e2966ac",
    "Compress": true
  },
  "CacheBehaviors": {
    "Quantity": 1,
    "Items": [
      {
        "PathPattern": "dashboard/assets/*",
        "TargetOriginId": "rancher-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
          "Quantity": 2,
          "Items": ["GET", "HEAD"],
          "CachedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"]
          }
        },
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        "Compress": true
      }
    ]
  },
  "Enabled": true
}
EOF

aws cloudfront create-distribution \
  --distribution-config file://distribution-config.json
```

## Step 3: Use Preload Hints for Critical Resources

```nginx
# Hint critical Rancher UI assets to the browser
location = /dashboard/ {
    add_header Link "</dashboard/assets/index.css>; rel=preload; as=style";
    add_header Link "</dashboard/assets/index.js>; rel=preload; as=script";
    proxy_pass http://rancher_servers;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Port $server_port;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## Step 4: Configure Rancher UI Feature Flags

```bash
# Disable unused features to reduce UI complexity
# In Rancher feature flags

# List available feature flags
curl -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "https://rancher.example.com/v3/features"

# Ensure UI Server-Side Pagination is enabled for large environments
curl -X PUT \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"value": true}' \
  "https://rancher.example.com/v3/features/ui-sql-cache"

# Disable legacy features if you do not need them
curl -X PUT \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"value": false}' \
  "https://rancher.example.com/v3/features/legacy"
```

## Step 5: Optimize API Response Times

```bash
# Rancher UI makes many API calls on load
# Measure a representative API request
curl -sS -o /dev/null -w 'time_total=%{time_total}\n' \
  -H "Authorization: Bearer $TOKEN" \
  "https://rancher.example.com/v3/clusters?limit=100"

# Check pagination metadata and use the next link when needed
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://rancher.example.com/v3/clusters?limit=100" | jq '.pagination'
```

## Step 6: Browser Cache Configuration

```bash
# Ensure proper cache headers are set for Rancher assets
curl -I https://rancher.example.com/dashboard/assets/index.js

# Expected headers:
# Cache-Control: public, max-age=604800
# Content-Encoding: gzip
```

```nginx
# If cache headers are missing, add them in your reverse proxy
location ~* \.(js|css)$ {
    add_header Cache-Control "public, max-age=604800";
    expires 7d;
}
```

## Step 7: Monitor UI Performance

```bash
# Use Lighthouse or WebPageTest to measure UI performance
npx lighthouse https://rancher.example.com \
  --chrome-flags="--headless" \
  --output=json \
  --output-path=rancher-perf.json

# Extract key metrics
cat rancher-perf.json | jq '.categories.performance.score,
  .audits["first-contentful-paint"].displayValue,
  .audits["interactive"].displayValue'
```

## Conclusion

Rancher UI performance improvement requires a multi-layered approach. NGINX caching with HTTP/2, gzip compression, and proper cache headers for static assets can materially reduce initial load time. For globally distributed teams, a CDN in front of Rancher can deliver static assets from edge locations near each user while leaving dynamic API traffic uncached. Combined with Rancher UI server-side pagination and monitoring API response times, these optimizations create a significantly more responsive management experience.
