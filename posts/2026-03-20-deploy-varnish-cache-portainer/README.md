# How to Deploy Varnish Cache via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Varnish, Cache, Portainer, Docker, HTTP Cache, CDN, Web Performance

Description: Deploy Varnish HTTP cache via Portainer to accelerate web application response times, reduce backend load, and serve cached content at wire speed with VCL configuration.

---

Varnish Cache is a high-performance HTTP reverse proxy cache that can dramatically accelerate web application response times. Deploying it via Portainer in front of your web services is straightforward with Docker.

## Step 1: Deploy Varnish Stack

```yaml
# varnish-stack.yml

version: "3.8"
services:
  varnish:
    image: varnish:7.4
    command: -p default_keep=300 -p default_grace=3600
    environment:
      - VARNISH_SIZE=1G
    volumes:
      - /opt/varnish/default.vcl:/etc/varnish/default.vcl:ro
    ports:
      - "80:80"
    depends_on:
      - webapp
    restart: unless-stopped
    networks:
      - varnish-net

  webapp:
    image: myapp:1.2.3
    # Don't expose to internet - Varnish is the front door
    restart: unless-stopped
    networks:
      - varnish-net

networks:
  varnish-net:
    driver: bridge
```

## Step 2: Configure VCL

Create `/opt/varnish/default.vcl` on the host:

```vcl
# default.vcl - Varnish Configuration Language
vcl 4.1;

backend default {
    .host = "webapp";       # Service name from Docker network
    .port = "8080";
    .connect_timeout = 5s;
    .between_bytes_timeout = 10s;
}

sub vcl_recv {
    # Remove cookie for static assets - allows caching
    if (req.url ~ "\.(css|js|png|jpg|gif|ico|woff2?|svg)$") {
        unset req.http.Cookie;
    }
    
    # Don't cache admin or API endpoints
    if (req.url ~ "^/admin" || req.url ~ "^/api/v1") {
        return(pass);
    }
    
    # Pass non-GET/HEAD requests directly to backend
    if (req.method != "GET" && req.method != "HEAD") {
        return(pass);
    }
}

sub vcl_backend_response {
    # Cache static assets for 1 day
    if (bereq.url ~ "\.(css|js|png|jpg|gif|ico)$") {
        set beresp.ttl = 86400s;
        unset beresp.http.Set-Cookie;
    }
    
    # Cache HTML pages for 5 minutes
    if (beresp.http.Content-Type ~ "text/html") {
        set beresp.ttl = 300s;
        set beresp.grace = 3600s;    # Serve stale for 1 hour if backend is down
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
    
    return(deliver);
}
```

## Step 3: Cache Invalidation

Purge cached content when data changes:

```bash
# Purge a specific URL from Varnish cache
curl -X PURGE http://localhost/products/123

# Invalidate all cached objects (from inside the container)
docker exec <varnish-container-name> varnishadm ban 'obj.http.date ~ .*'
```

Add PURGE support to your VCL:

```vcl
acl trusted_purgers {
    "127.0.0.1";
    "172.16.0.0"/12;
}

sub vcl_recv {
    if (req.method == "PURGE") {
        # Only allow purge from internal network
        if (client.ip !~ trusted_purgers) {
            return(synth(405, "Not allowed."));
        }
        return(purge);
    }

    # Existing caching rules continue below...
}
```

## Step 4: Monitor Cache Performance

```bash
# From Portainer's container console
varnishstat -1 -f MAIN.cache_hit -f MAIN.cache_miss

# Calculate hit rate
# hit_rate = cache_hit / (cache_hit + cache_miss)

# View live request log
varnishlog -q "ReqMethod eq GET"
```

## Summary

Varnish deployed via Portainer provides industrial-strength HTTP caching in front of your web applications. The VCL language gives precise control over caching behavior, and the grace feature keeps serving cached content even when backends are temporarily unavailable. For cache-friendly web applications, Varnish can serve a large share of requests from cache without hitting the backend.
