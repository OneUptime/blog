# How to Configure Varnish Cache with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Varnish, IPv6, Caching, CDN, Reverse Proxy, VCL, Web Performance

Description: Configure Varnish Cache to accept client connections and forward requests to backends over IPv6, including VCL configuration for IPv6-aware caching policies.

---

Varnish Cache is a high-performance HTTP accelerator. Configuring it for IPv6 involves setting IPv6 listen addresses in the startup configuration and ensuring VCL backend definitions use correct IPv6 syntax.

## Varnish IPv6 Startup Configuration

```bash
# /etc/varnish/varnish.params (or systemd override)

# Listen on all interfaces including IPv6

VARNISH_LISTEN_ADDRESS=[::]
VARNISH_LISTEN_PORT=80

# Or specific IPv6 address
# VARNISH_LISTEN_ADDRESS=[2001:db8::1]

# Backend timeout
VARNISH_TIMEOUT_CONNECT=5

# Cache storage
VARNISH_STORAGE="malloc,256m"

# Workers
VARNISH_WORKERS="2,500,300"
```

For systemd-based configuration:

```bash
# Create systemd override for Varnish
sudo mkdir -p /etc/systemd/system/varnish.service.d/
cat > /etc/systemd/system/varnish.service.d/override.conf << 'EOF'
[Service]
ExecStart=
ExecStart=/usr/sbin/varnishd \
  -j unix,user=vcache \
  -F \
  -a [::]:80 \
  -a [::]:8443,PROXY \
  -T localhost:6082 \
  -f /etc/varnish/default.vcl \
  -S /etc/varnish/secret \
  -s malloc,256m
EOF

sudo systemctl daemon-reload
sudo systemctl restart varnish
```

## VCL Configuration with IPv6 Backends

```vcl
# /etc/varnish/default.vcl

vcl 4.1;

import std;
import directors;

# ACL of clients allowed to issue PURGE requests
acl purge {
    "127.0.0.1";
    "::1";
    "2001:db8::"/32;
}

# Backend definition with IPv6 address
backend web1 {
    .host = "2001:db8::10";
    .port = "8080";
    .probe = {
        .url = "/health";
        .timeout = 5s;
        .interval = 10s;
        .window = 5;
        .threshold = 3;
    }
}

backend web2 {
    .host = "2001:db8::11";
    .port = "8080";
}

# Director for load balancing
sub vcl_init {
    new cluster = directors.round_robin();
    cluster.add_backend(web1);
    cluster.add_backend(web2);
}

sub vcl_recv {
    # Set backend via director
    set req.backend_hint = cluster.backend();

    # Add client IP header (works for both IPv4 and IPv6)
    if (req.http.X-Forwarded-For) {
        set req.http.X-Forwarded-For = req.http.X-Forwarded-For + ", " + client.ip;
    } else {
        set req.http.X-Forwarded-For = client.ip;
    }

    # Handle PURGE requests
    if (req.method == "PURGE") {
        # Only allow purge from clients matching the purge ACL
        if (!(client.ip ~ purge)) {
            return (synth(405, "Not allowed."));
        }
        return (purge);
    }

    # Cache GET and HEAD requests only
    if (req.method != "GET" && req.method != "HEAD") {
        return (pass);
    }

    return (hash);
}

sub vcl_backend_response {
    # Cache successful responses for 5 minutes
    if (beresp.status == 200) {
        set beresp.ttl = 5m;
        set beresp.grace = 30s;
    }
}

sub vcl_deliver {
    # Add debug header showing cache status
    if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
    } else {
        set resp.http.X-Cache = "MISS";
    }
    set resp.http.X-Cache-Hits = obj.hits;
}
```

## IPv6-Specific VCL Rules

```vcl
# Add IPv6-specific handling in VCL

sub vcl_recv {
    # Detect IPv6 clients
    if (req.http.X-Forwarded-For ~ "^[0-9a-fA-F:]+$") {
        # Client connected via IPv6
        set req.http.X-Client-Protocol = "IPv6";
    } else {
        set req.http.X-Client-Protocol = "IPv4";
    }

    # Different caching strategy for IPv6 clients
    # (Example: longer TTL for clients that are likely on faster networks)
}
```

## Starting and Testing Varnish with IPv6

```bash
# Start Varnish
sudo systemctl start varnish

# Verify listening on IPv6
ss -tlnp | grep varnishd

# Test cache hit/miss over IPv6
curl -6 -I http://yourdomain.com/
# X-Cache: MISS (first request)
curl -6 -I http://yourdomain.com/
# X-Cache: HIT (subsequent requests)

# Check Varnish statistics
varnishstat -1 -f MAIN.cache_hit,MAIN.cache_miss

# Check Varnish logs for IPv6 connections
varnishlog -g request | grep -i "ipv6\|2001:"
```

## Firewall for Varnish IPv6

```bash
# Allow HTTP port for Varnish
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
# Management port (restrict to localhost only)
sudo ip6tables -A INPUT -p tcp -s ::1 --dport 6082 -j ACCEPT

sudo ip6tables-save > /etc/iptables/rules.v6
```

Varnish Cache's IPv6 support through its listen address configuration and VCL backend definitions enables powerful HTTP caching for IPv6 web traffic with the same performance characteristics as IPv4 caching deployments.
