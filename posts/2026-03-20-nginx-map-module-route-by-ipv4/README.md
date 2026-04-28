# How to Use the Nginx map Module to Route Traffic by IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, Map Module, IPv4, Traffic Routing, Configuration, Networking

Description: Use the Nginx map module to create dynamic variables based on client IPv4 addresses, enabling conditional routing, feature flags, and per-IP customizations.

## Introduction

The `ngx_http_map_module` creates new variables whose values depend on other variables. Combined with `$remote_addr`, it enables powerful IPv4-based routing without external scripts or complex `if` chains.

## Basic map Syntax

```nginx
# /etc/nginx/nginx.conf (http context)

http {
    # Map client IP to a backend group variable
    map $remote_addr $backend_group {
        default          "standard";    # Fallback for unmatched IPs

        # Exact IP match
        203.0.113.10     "premium";

        # Prefix match with ~ for regex
        ~^10\.0\.1\.     "internal_team_a";
        ~^10\.0\.2\.     "internal_team_b";
    }

    include /etc/nginx/conf.d/*.conf;
}
```

## Routing to Different Upstreams Based on IP

```nginx
http {
    # Map IP to upstream pool name
    map $remote_addr $upstream_pool {
        default        "prod_backends";
        ~^10\.         "internal_backends";   # Regex prefix; for CIDR see geo module section
        203.0.113.5    "qa_backends";
        203.0.113.6    "qa_backends";
    }

    upstream prod_backends     { server 192.168.10.10:8080; server 192.168.10.11:8080; }
    upstream internal_backends { server 192.168.20.10:8080; }
    upstream qa_backends       { server 192.168.30.10:8080; }

    server {
        listen 80;

        location / {
            # Dynamic upstream selection based on client IP
            proxy_pass http://$upstream_pool;
            proxy_set_header Host $host;
        }
    }
}
```

## Feature Flags by IP (Dark Launch)

Enable new features only for specific IPs while keeping old behavior for everyone else:

```nginx
http {
    map $remote_addr $feature_new_checkout {
        default         "off";
        203.0.113.0     "on";   # Internal testers
        203.0.113.1     "on";
        198.51.100.50   "on";   # Beta customer
    }

    server {
        listen 80;

        location /checkout {
            # Route to new or old checkout based on IP flag
            if ($feature_new_checkout = "on") {
                proxy_pass http://new_checkout_backend;
                break;
            }
            proxy_pass http://legacy_checkout_backend;
        }
    }
}
```

## Combining map with geo for CIDR Support

The `map` module only supports exact matches and regex; use `geo` for CIDR ranges:

```nginx
http {
    # geo module handles CIDR ranges
    geo $remote_addr $ip_class {
        default        "external";
        10.0.0.0/8     "internal";
        172.16.0.0/12  "internal";
        192.168.0.0/16 "internal";
    }

    # map module creates derived variables from the geo result
    map $ip_class $allowed_methods {
        "internal" "GET|POST|PUT|DELETE|PATCH";
        "external" "GET|POST";
    }

    map $ip_class $rate_limit_zone {
        "internal" "";              # No rate limiting for internal
        "external" "api_external";
    }

    server {
        listen 80;

        location /api {
            # Block disallowed methods for external IPs
            if ($request_method !~ ^($allowed_methods)$) {
                return 405;
            }
            proxy_pass http://api_backend;
        }
    }
}
```

## Setting Custom Response Headers by IP

```nginx
http {
    map $remote_addr $debug_mode {
        default      "false";
        10.0.0.5     "true";   # Developer machine
        10.0.0.6     "true";
    }

    server {
        listen 80;

        location /api {
            # Add debug header for developer IPs
            add_header X-Debug-Mode $debug_mode always;
            proxy_pass http://api_backend;
        }
    }
}
```

## Testing map Routing

```bash
# Test routing for different source IPs using curl --interface

curl --interface 10.0.0.5 http://example.com/api
curl --interface 203.0.113.5 http://example.com/api

# Check which upstream was selected via X-Upstream header
location /api {
    proxy_pass http://$upstream_pool;
    add_header X-Upstream-Pool $upstream_pool always;
}
```

## Conclusion

The Nginx `map` module transforms client IPv4 addresses into variables that drive routing, feature flags, header customization, and access control. It evaluates lazily (only when the variable is used), making it efficient even with large mapping tables. For CIDR-based matching, pair `map` with the `geo` module to cover arbitrary subnet ranges.
