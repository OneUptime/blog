# How to Set Up a Caching Reverse Proxy for IPv4 with Varnish

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Varnish, Caching, Reverse Proxy, IPv4, HTTP, VCL

Description: Install and configure Varnish Cache as a caching reverse proxy for IPv4 HTTP services using VCL to define caching rules, cache invalidation, and backend health checks.

## Introduction

Varnish Cache is a high-performance HTTP accelerator placed in front of web servers. It caches HTTP responses in memory, serving cached content directly without hitting the backend. Varnish is configured using VCL (Varnish Configuration Language) - a domain-specific language for defining caching behavior.

## Installing Varnish

```bash
sudo apt-get update
sudo apt-get install -y varnish

# Check version

varnishd -V
```

## Basic VCL Configuration

```vcl
# /etc/varnish/default.vcl

vcl 4.1;

import std;

# Define the backend (origin server)
backend default {
    .host = "127.0.0.1";
    .port = "8080";
    .probe = {
        .url = "/health";
        .timeout = 5s;
        .interval = 10s;
        .window = 5;
        .threshold = 3;
    }
}

# Incoming requests
sub vcl_recv {
    # Strip cookies for static assets (enables caching)
    if (req.url ~ "\.(png|jpg|jpeg|gif|ico|css|js|woff2|svg)$") {
        unset req.http.Cookie;
    }

    # Don't cache POST/PUT/DELETE
    if (req.method != "GET" && req.method != "HEAD") {
        return(pass);
    }

    # Don't cache if Authorization header is present
    if (req.http.Authorization) {
        return(pass);
    }
}

# Backend response processing
sub vcl_backend_response {
    # Cache 200 and 301 responses for 1 hour
    if (beresp.status == 200 || beresp.status == 301) {
        set beresp.ttl = 1h;
        set beresp.grace = 10m;
    }

    # Don't cache backend errors
    if (beresp.status >= 500) {
        set beresp.uncacheable = true;
        set beresp.ttl = 0s;
    }
}

# Delivering cached response
sub vcl_deliver {
    # Add cache hit/miss header for debugging
    if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
        set resp.http.X-Cache-Hits = obj.hits;
    } else {
        set resp.http.X-Cache = "MISS";
    }

    # Remove internal headers
    unset resp.http.Via;
    unset resp.http.X-Varnish;
}
```

## Configuring Varnish to Listen on Port 80

```text
# /etc/default/varnish (or /etc/varnish/varnish.params on newer systems)
DAEMON_OPTS="-a :80 \
             -T localhost:6082 \
             -f /etc/varnish/default.vcl \
             -s malloc,256m"
```

Or via systemd override:

```bash
sudo mkdir -p /etc/systemd/system/varnish.service.d/
sudo tee /etc/systemd/system/varnish.service.d/override.conf << 'EOF'
[Service]
ExecStart=
ExecStart=/usr/sbin/varnishd \
  -j unix,user=vcache \
  -F \
  -a http=0.0.0.0:80,HTTP \
  -f /etc/varnish/default.vcl \
  -s malloc,256m
EOF
sudo systemctl daemon-reload
sudo systemctl restart varnish
```

## Cache Invalidation (Purge)

```vcl
# Add purge ACL in VCL
acl purge {
    "localhost";
    "10.0.1.0"/24;
}

sub vcl_recv {
    if (req.method == "PURGE") {
        if (!client.ip ~ purge) {
            return(synth(405, "Not allowed"));
        }
        return(purge);
    }
}
```

```bash
# Purge a URL from cache
curl -X PURGE http://cache-server/path/to/page

# Purge all cached objects (ban)
varnishadm ban req.url ~ .
```

## Monitoring Varnish

```bash
# Real-time statistics
varnishstat

# Live log viewer
varnishlog

# Cache hit rate
varnishstat -f MAIN.cache_hit -f MAIN.cache_miss -1

# Backend health status
varnishadm backend.list

# Connected clients (session counters)
varnishstat -1 -f MAIN.sess_conn -f MAIN.client_req
```

## Multiple Backends with Load Balancing

```vcl
import directors;

backend web1 {
    .host = "10.0.1.10";
    .port = "8080";
}

backend web2 {
    .host = "10.0.1.11";
    .port = "8080";
}

sub vcl_init {
    new cluster = directors.round_robin();
    cluster.add_backend(web1);
    cluster.add_backend(web2);
}

sub vcl_recv {
    set req.backend_hint = cluster.backend();
}
```

## Conclusion

Varnish improves HTTP performance by serving cached responses from memory. Define caching rules in VCL `vcl_recv` (decide to cache or pass), `vcl_backend_response` (set TTL), and `vcl_deliver` (modify response headers). Implement purge ACLs for cache invalidation. Use `varnishstat` to monitor hit rates and `varnishadm ban` for bulk cache invalidation.
