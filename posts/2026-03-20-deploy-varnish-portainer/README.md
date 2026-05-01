# How to Deploy Varnish Cache via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Varnish, Caching, Docker, Web Performance

Description: Deploy Varnish Cache as an HTTP accelerator using Portainer to dramatically improve web application performance through edge caching.

## Introduction

Varnish Cache is a high-performance HTTP reverse proxy cache. It sits in front of web servers and caches responses, dramatically reducing backend load and improving response times. Varnish is configured via VCL (Varnish Configuration Language) for fine-grained cache rules.

## Prerequisites

- Portainer installed with Docker
- A backend web server or application to cache

## Step 1: Create VCL Configuration

Create the Varnish configuration on the host:

```bash
mkdir -p /opt/varnish/conf
cat > /opt/varnish/conf/default.vcl << 'EOF'
vcl 4.1;

acl purge {
    "localhost";
}

# Backend - your application server

backend default {
    .host = "myapp";    # Docker service name on the same network
    .port = "8080";
    .probe = {
        .url = "/health";
        .interval = 10s;
        .timeout = 5s;
        .window = 3;
        .threshold = 2;
    }
}

sub vcl_recv {
    # Remove tracking query strings
    set req.url = regsuball(req.url, "utm_[a-z]+=[-_A-Za-z0-9]+&?", "");
    set req.url = regsuball(req.url, "[?&]$", "");

    # Allow local cache purge requests
    if (req.method == "PURGE") {
        if (!client.ip ~ purge) {
            return(synth(405, "Not allowed."));
        }
        return(purge);
    }

    # Do not cache non-GET/HEAD requests
    if (req.method != "GET" && req.method != "HEAD") {
        return(pass);
    }

    # Do not cache requests with Authorization or Cookie headers
    if (req.http.Authorization || req.http.Cookie) {
        return(pass);
    }

    # Do not cache admin paths
    if (req.url ~ "^/admin") {
        return(pass);
    }
}

sub vcl_backend_response {
    # Cache cacheable successful responses for 5 minutes
    if (beresp.status == 200) {
        set beresp.ttl = 5m;
        set beresp.grace = 1h;   # Serve stale for 1h while fetching fresh
    }

    # Cache 404s briefly to reduce backend hits
    if (beresp.status == 404) {
        set beresp.ttl = 60s;
    }
}

sub vcl_deliver {
    # Add cache status header for debugging
    if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
        set resp.http.X-Cache-Hits = obj.hits;
    } else {
        set resp.http.X-Cache = "MISS";
    }
}
EOF
```

## Step 2: Create the Stack in Portainer

```yaml
# docker-compose.yml - Varnish Cache
version: "3.8"

services:
  varnish:
    image: varnish:7.7.3-alpine
    container_name: varnish
    restart: unless-stopped
    ports:
      - "80:80"        # Public HTTP (cached)
    volumes:
      - /opt/varnish/conf/default.vcl:/etc/varnish/default.vcl:ro
    command: >
      varnishd
      -F
      -f /etc/varnish/default.vcl
      -s malloc,512m
      -a 0.0.0.0:80,HTTP
      -T 127.0.0.1:6082
    healthcheck:
      test: ["CMD", "varnishstat", "-1", "-f", "MAIN.uptime"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - web_net

  myapp:
    image: myapp:latest
    container_name: myapp
    restart: unless-stopped
    networks:
      - web_net

networks:
  web_net:
    driver: bridge
```

## Step 3: Test Cache Behavior

```bash
# First request - should be a MISS
curl -I http://localhost/

# Second request - should be a HIT for a cacheable response
curl -I http://localhost/
# Look for: X-Cache: HIT

# Purge a cached URL from a source allowed by the purge ACL
curl -X PURGE http://localhost/some/page

# Check cache statistics
docker exec varnish varnishstat -1 -f MAIN.cache_hit,MAIN.cache_miss,MAIN.uptime
```

## Step 4: Reload VCL Without Restart

```bash
# Reload the mounted VCL while Varnish is running
docker exec varnish varnishreload
```

## Step 5: Monitor Cache Hit Rate

```bash
# Live statistics
docker exec -it varnish varnishstat -f MAIN.cache_hit,MAIN.cache_miss

# Calculate hit ratio
docker exec varnish varnishstat -1 -f MAIN.cache_hit,MAIN.cache_miss | \
  awk 'BEGIN{hits=0;miss=0} {value=0; for (i=1; i<=NF; i++) if ($i ~ /^[0-9.]+$/) {value=$i; break}} /cache_hit/{hits=value} /cache_miss/{miss=value} END{if (hits+miss == 0) print "Hit rate: 0%"; else printf "Hit rate: %.2f%%\n", hits/(hits+miss)*100}'

# Watch request flow for GET requests
docker exec varnish varnishlog -g request -q "ReqMethod eq GET" -i ReqURL,VCL_call
```

## Conclusion

Varnish Cache is extremely fast (serves from memory at microsecond speeds) and highly configurable via VCL. The `grace` period allows Varnish to serve stale content while fetching fresh data, eliminating thundering herd problems on cache expiry. Always include `X-Cache` headers in `vcl_deliver` to debug cache behavior from the client side. For static assets, set long TTLs (hours or days) and use versioned URLs for cache busting.
