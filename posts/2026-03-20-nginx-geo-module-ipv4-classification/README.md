# How to Use the Nginx Geo Module to Classify IPv4 Client Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, Geo Module, IPv4, Access Control, Traffic Routing, Networking

Description: Use the Nginx ngx_http_geo_module to classify client IPv4 addresses into custom variables for traffic routing, access control, and geo-based logic.

## Introduction

The `geo` module in Nginx maps client IP addresses to custom variable values. You can use it to classify internal vs external traffic, define regional groups, or set flags that downstream directives can act on-without any external dependencies.

## Basic geo Block Syntax

Define a `geo` block in the `http` context to create a variable based on client IP:

```nginx
# /etc/nginx/nginx.conf (http block)

http {
    # Map client IP to a traffic class variable
    geo $remote_addr $traffic_class {
        default         "external";

        # Internal RFC-1918 networks
        10.0.0.0/8      "internal";
        172.16.0.0/12   "internal";
        192.168.0.0/16  "internal";

        # Specific trusted office IPs
        203.0.113.0/24  "office";
        198.51.100.10   "trusted_partner";
    }

    include /etc/nginx/conf.d/*.conf;
}
```

## Using the geo Variable for Access Control

Use the classified variable in `if` blocks or `map` directives:

```nginx
# /etc/nginx/conf.d/geo-access.conf

server {
    listen 80;
    server_name admin.example.com;

    location /admin {
        # Only allow internal and office traffic to admin panel
        if ($traffic_class = "external") {
            return 403 "Access denied from external IP";
        }

        proxy_pass http://admin_backend;
    }

    location /api {
        # Log different detail levels based on traffic class
        access_log /var/log/nginx/internal_access.log combined;
        proxy_pass http://api_backend;
    }
}
```

## Geo-Based Rate Limiting

Combine `geo` with `limit_req_zone` to apply different rate limits per traffic class:

```nginx
http {
    geo $remote_addr $rate_limit_key {
        default         $binary_remote_addr;  # External: limit by IP
        10.0.0.0/8      "";                  # Internal: no limit (empty key disables)
        192.168.0.0/16  "";
    }

    # Zone only applies when $rate_limit_key is non-empty
    limit_req_zone $rate_limit_key zone=api_limit:10m rate=10r/s;

    server {
        listen 80;

        location /api {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://api_backend;
        }
    }
}
```

## Multi-Region Routing

Route traffic to different backends based on geographic classification:

```nginx
http {
    geo $remote_addr $region {
        default             "us";
        203.0.113.0/24      "eu";
        198.51.100.0/24     "apac";
    }

    map $region $upstream_pool {
        "eu"    "eu_backends";
        "apac"  "apac_backends";
        default "us_backends";
    }

    upstream us_backends   { server 10.1.0.10:8080; }
    upstream eu_backends   { server 10.2.0.10:8080; }
    upstream apac_backends { server 10.3.0.10:8080; }

    server {
        listen 80;
        location / {
            proxy_pass http://$upstream_pool;
        }
    }
}
```

## Using an External GeoIP Database

For real geographic classification, combine `geo` with the `geoip` module and MaxMind databases:

```bash
# Install GeoIP module and database

sudo apt install nginx-module-geoip
wget -O /etc/nginx/GeoIP.dat.gz \
  https://dl.miyuru.lk/geoip/maxmind/country/maxmind4.dat.gz && \
  gunzip /etc/nginx/GeoIP.dat.gz
```

```nginx
load_module modules/ngx_http_geoip_module.so;

http {
    geoip_country /etc/nginx/GeoIP.dat;

    server {
        location / {
            # $geoip_country_code is set automatically
            if ($geoip_country_code = "CN") {
                return 403;
            }
            proxy_pass http://backend;
        }
    }
}
```

## Conclusion

The Nginx `geo` module is a powerful, zero-dependency tool for IPv4-based traffic classification. Use it to segment internal vs external traffic, apply differentiated rate limits, route to regional backends, or enforce access controls-all driven by simple CIDR-based rules in your Nginx configuration.
