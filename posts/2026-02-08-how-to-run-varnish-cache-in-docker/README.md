# How to Run Varnish Cache in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Varnish, Caching, Web Servers, Performance, DevOps

Description: Deploy Varnish HTTP cache in Docker to accelerate your web applications with configurable caching rules and VCL configuration.

---

Varnish Cache is an HTTP accelerator that sits in front of your web server and caches responses. When the same content is requested again, Varnish serves it directly from memory instead of hitting your backend server. This can reduce backend load by 90% or more and cut response times from hundreds of milliseconds to single-digit milliseconds.

Varnish uses its own configuration language called VCL (Varnish Configuration Language) that gives you fine-grained control over what gets cached, for how long, and under what conditions. Running Varnish in Docker makes it easy to add this caching layer to any existing web stack.

## Quick Start

Run Varnish with a basic configuration that proxies to a backend server:

```bash
# Start Varnish pointing to a backend on the Docker network
docker run -d \
  --name varnish \
  -p 8080:80 \
  -e VARNISH_BACKEND_HOST=backend \
  -e VARNISH_BACKEND_PORT=80 \
  varnish:7.5
```

## Docker Compose with a Backend

Set up Varnish in front of an Nginx web server:

```yaml
# docker-compose.yml - Varnish cache in front of Nginx
version: "3.8"

services:
  varnish:
    image: varnish:7.5
    ports:
      # Varnish serves cached content on this port
      - "8080:80"
    volumes:
      # Mount custom VCL configuration
      - ./default.vcl:/etc/varnish/default.vcl:ro
    environment:
      # Allocate 256MB of memory for the cache
      VARNISH_SIZE: 256m
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    image: nginx:alpine
    volumes:
      - ./html:/usr/share/nginx/html:ro
    # No need to expose ports - Varnish accesses it through the Docker network
    restart: unless-stopped
```

## Basic VCL Configuration

Create a VCL file that defines caching behavior:

```vcl
# default.vcl - Basic Varnish configuration
vcl 4.1;

# Define the backend server
backend default {
    .host = "backend";
    .port = "80";
    # Health check the backend every 5 seconds
    .probe = {
        .url = "/";
        .timeout = 2s;
        .interval = 5s;
        .window = 5;
        .threshold = 3;
    }
}

# Handle incoming requests
sub vcl_recv {
    # Remove cookies for static assets so they can be cached
    if (req.url ~ "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$") {
        unset req.http.Cookie;
        return (hash);
    }

    # Do not cache POST requests
    if (req.method == "POST") {
        return (pass);
    }

    # Do not cache requests with Authorization headers
    if (req.http.Authorization) {
        return (pass);
    }

    # Strip tracking parameters from the URL before caching
    if (req.url ~ "(\?|&)(utm_source|utm_medium|utm_campaign|utm_content|utm_term|fbclid|gclid)=") {
        set req.url = regsuball(req.url, "(utm_source|utm_medium|utm_campaign|utm_content|utm_term|fbclid|gclid)=[^&]+&?", "");
        set req.url = regsub(req.url, "[?&]+$", "");
    }

    return (hash);
}

# Handle backend responses before caching
sub vcl_backend_response {
    # Cache static assets for 7 days
    if (bereq.url ~ "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$") {
        set beresp.ttl = 7d;
        unset beresp.http.Set-Cookie;
    }

    # Cache HTML pages for 5 minutes
    if (beresp.http.Content-Type ~ "text/html") {
        set beresp.ttl = 5m;
    }

    # Do not cache error responses
    if (beresp.status >= 500) {
        set beresp.ttl = 0s;
        set beresp.uncacheable = true;
        return (deliver);
    }

    # Set a grace period - serve stale content while fetching fresh content
    set beresp.grace = 1h;

    return (deliver);
}

# Modify responses before sending to the client
sub vcl_deliver {
    # Add a header to indicate cache hit or miss
    if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
        set resp.http.X-Cache-Hits = obj.hits;
    } else {
        set resp.http.X-Cache = "MISS";
    }

    return (deliver);
}
```

## Testing Cache Behavior

Verify that Varnish is caching correctly:

```bash
# First request should be a MISS
curl -I http://localhost:8080/
# Look for: X-Cache: MISS

# Second request should be a HIT
curl -I http://localhost:8080/
# Look for: X-Cache: HIT, X-Cache-Hits: 1

# Check cache statistics
docker exec varnish varnishstat -1 | grep -E "MAIN.cache_hit|MAIN.cache_miss"

# Watch requests in real time (like tail -f for Varnish)
docker exec varnish varnishlog
```

## Advanced VCL: Multiple Backends

Route requests to different backends based on the URL path:

```vcl
# default.vcl - Multiple backends with routing
vcl 4.1;

# API backend
backend api {
    .host = "api-service";
    .port = "8080";
    .probe = {
        .url = "/health";
        .timeout = 2s;
        .interval = 5s;
        .window = 5;
        .threshold = 3;
    }
}

# Web frontend backend
backend web {
    .host = "web-service";
    .port = "3000";
}

# Static assets backend
backend static {
    .host = "static-service";
    .port = "80";
}

sub vcl_recv {
    # Route based on URL path
    if (req.url ~ "^/api/") {
        set req.backend_hint = api;
        # Do not cache API responses by default
        return (pass);
    } else if (req.url ~ "^/static/") {
        set req.backend_hint = static;
        unset req.http.Cookie;
        return (hash);
    } else {
        set req.backend_hint = web;
    }

    return (hash);
}
```

The corresponding Docker Compose file:

```yaml
# docker-compose.yml - Varnish with multiple backends
version: "3.8"

services:
  varnish:
    image: varnish:7.5
    ports:
      - "80:80"
    volumes:
      - ./default.vcl:/etc/varnish/default.vcl:ro
    environment:
      VARNISH_SIZE: 512m
    restart: unless-stopped

  api-service:
    image: node:20-alpine
    command: node server.js
    volumes:
      - ./api:/app
    working_dir: /app

  web-service:
    build: ./web
    expose:
      - "3000"

  static-service:
    image: nginx:alpine
    volumes:
      - ./static:/usr/share/nginx/html:ro
```

## Cache Purging

Invalidate cached content when the backend data changes:

```vcl
# Add purging support to VCL
acl purge {
    "localhost";
    "172.16.0.0"/12;  # Docker network range
}

sub vcl_recv {
    # Handle PURGE requests
    if (req.method == "PURGE") {
        if (!client.ip ~ purge) {
            return (synth(405, "Not allowed"));
        }
        return (purge);
    }

    # Handle BAN requests (regex-based purging)
    if (req.method == "BAN") {
        if (!client.ip ~ purge) {
            return (synth(405, "Not allowed"));
        }
        ban("req.url ~ " + req.url);
        return (synth(200, "Banned"));
    }
}
```

Use purging from your application:

```bash
# Purge a specific URL from the cache
curl -X PURGE http://localhost:8080/page/about

# Ban (regex purge) all pages matching a pattern
curl -X BAN http://localhost:8080/products/.*

# Purge everything
curl -X BAN http://localhost:8080/.*
```

## Monitoring with Prometheus

Export Varnish metrics for Prometheus:

```yaml
# docker-compose.yml - Varnish with Prometheus metrics
version: "3.8"

services:
  varnish:
    image: varnish:7.5
    ports:
      - "80:80"
    volumes:
      - ./default.vcl:/etc/varnish/default.vcl:ro
    environment:
      VARNISH_SIZE: 256m

  varnish-exporter:
    image: jonnenauha/prometheus_varnish_exporter
    ports:
      - "9131:9131"
    command:
      - -no-exit
    # Share the Varnish shared memory with the exporter
    volumes_from:
      - varnish
    depends_on:
      - varnish

  backend:
    image: nginx:alpine
    volumes:
      - ./html:/usr/share/nginx/html:ro
```

## Useful Varnish Commands

```bash
# View real-time log of all requests
docker exec varnish varnishlog

# View only cache misses
docker exec varnish varnishlog -q "VCL_call eq MISS"

# View top requested URLs
docker exec varnish varnishtop -i ReqURL

# View overall statistics
docker exec varnish varnishstat

# Reload VCL configuration without restart
docker exec varnish varnishadm vcl.load newconfig /etc/varnish/default.vcl
docker exec varnish varnishadm vcl.use newconfig

# List loaded VCL configurations
docker exec varnish varnishadm vcl.list
```

## Summary

Varnish Cache is one of the most effective ways to improve web application performance. By serving cached responses from memory, it dramatically reduces backend load and response times. The VCL configuration language gives you precise control over caching behavior, from simple TTL-based caching to complex routing and purging strategies. Running Varnish in Docker makes it straightforward to add a caching layer to any web stack, and the built-in health checking ensures traffic only goes to healthy backends. Start with a simple configuration and add complexity as you learn what your application needs.
