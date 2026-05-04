# How to Configure Nginx HTTP/2 Push with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, HTTP/2, Server Push, IPv6, Web Performance, TLS

Description: Configure Nginx HTTP/2 server push on IPv6-enabled servers to proactively send resources to clients, improving page load times for users connecting over IPv6.

---

HTTP/2 Server Push allows Nginx to proactively send resources (CSS, JavaScript, fonts) to clients before they request them, reducing round-trips. Configuring this on IPv6-enabled Nginx servers combines HTTP/2 push with IPv6 listener configuration.

> **Important:** HTTP/2 Server Push has been deprecated. The `http2_push`, `http2_push_preload`, and `http2_max_concurrent_pushes` directives were made obsolete in Nginx 1.25.1 (June 2023) and are ignored with a warning in newer versions. Major browsers also stopped honoring server pushes (Chrome disabled it by default in Chrome 106, late 2022). The examples below require Nginx older than 1.25.1; for modern deployments, prefer `103 Early Hints` and `Link: rel=preload` headers instead.

## Prerequisites

HTTP/2 requires TLS. Ensure your server has a valid certificate:

```bash
# Verify TLS is working on IPv6

openssl s_client -connect '[2001:db8::1]':443 -servername yourdomain.com < /dev/null
```

## Nginx Configuration with HTTP/2 Push and IPv6

```nginx
# /etc/nginx/sites-available/default

server {
    # Listen on both IPv4 and IPv6 with HTTP/2
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Modern SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers off;

    root /var/www/html;
    index index.html;

    location = /index.html {
        # HTTP/2 Server Push: proactively send CSS and JS
        http2_push /css/styles.css;
        http2_push /js/app.js;
        http2_push /fonts/main.woff2;

        add_header Link "</css/styles.css>; rel=preload; as=style";
        add_header Link "</js/app.js>; rel=preload; as=script";
    }

    # Serve static assets with aggressive caching
    location ~* \.(css|js|woff2|png|jpg|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        gzip_static on;
    }
}

# HTTP redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

## Dynamic HTTP/2 Push Based on Request Path

```nginx
# Dynamic push based on which page is requested
map $request_uri $push_resources {
    "/"          "start=1";
    "/dashboard" "start=1";
    default      "";
}

server {
    listen [::]:443 ssl http2;
    ssl_certificate     /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;

    location @push_index {
        http2_push /css/critical.css;
        http2_push /js/critical.js;
        try_files $uri /index.html;
    }

    location / {
        if ($push_resources) {
            # Only push for main page requests
        }
        try_files $uri @push_index;
    }
}
```

## Testing HTTP/2 Push over IPv6

```bash
# Check if HTTP/2 is active and push is working
curl -6 \
  --http2 \
  -v \
  https://yourdomain.com/ 2>&1 | grep -E "< HTTP/|PUSH_PROMISE"

# Use nghttp2 client for detailed HTTP/2 diagnostics
nghttp -nv https://yourdomain.com/ 2>&1 | grep -E "PUSH|push"

# Check HTTP/2 is using IPv6
curl -6 -o /dev/null -s \
  --write-out "%{remote_ip}\n" \
  https://yourdomain.com/

# Use h2load for HTTP/2 performance testing with IPv6
# (HTTP/2 is the default for HTTPS via ALPN; use --alpn-list=h2 to force it)
h2load \
  --alpn-list=h2 \
  -n 1000 \
  -c 10 \
  -m 10 \
  https://yourdomain.com/
```

## Nginx Configuration for IPv6-Only Server

```nginx
server {
    # IPv6-only server (no IPv4)
    listen [2001:db8::1]:443 ssl http2;

    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;

    location / {
        http2_push /css/styles.css;
        http2_push /js/app.js;
        root /var/www/html;
        index index.html;
    }
}
```

## Verifying Push with Browser DevTools

```bash
# Check response headers for Push promises
curl -6 -I --http2 https://yourdomain.com/

# Should include Link header if preload is configured:
# Link: </css/styles.css>; rel=preload; as=style

# Check Nginx logs for HTTP/2 connection version
tail -f /var/log/nginx/access.log | grep "HTTP/2"
```

## Monitoring HTTP/2 Push Performance

```nginx
# Add to nginx.conf for timing metrics
# $http2 is set to the negotiated protocol (e.g. "h2") or empty otherwise
log_format http2_format '$remote_addr [$time_local] '
                        '"$request" $status $body_bytes_sent '
                        '"$http2" $request_time';

access_log /var/log/nginx/http2.log http2_format;
```

HTTP/2 server push on IPv6-enabled Nginx servers combines the bandwidth efficiency of IPv6 with proactive resource delivery, reducing page load times for users on modern dual-stack and IPv6-only networks.
