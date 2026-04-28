# How to Configure Nginx Logging to Capture Client IPv4 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, Logging, IPv4, Access Logs, X-Forwarded-For, Security

Description: Configure Nginx access logs to accurately capture client IPv4 addresses, including handling reverse proxies and X-Forwarded-For headers for correct attribution.

## Introduction

Accurate client IP logging is essential for security auditing, analytics, and debugging. Behind load balancers or CDNs, `$remote_addr` shows the proxy's IP rather than the real client. This guide covers capturing both and handling the X-Forwarded-For chain.

## Default Log Format and $remote_addr

By default, Nginx logs the direct TCP connection IP:

```nginx
# Default combined log format (built into Nginx)

log_format combined '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent"';
```

If Nginx is the edge server (direct client connections), `$remote_addr` is the client IPv4. If Nginx is behind a load balancer, `$remote_addr` is the load balancer's IP.

## Capturing Real Client IP Behind a Proxy

Add the real IP to your log format using `$http_x_forwarded_for`:

```nginx
# /etc/nginx/nginx.conf

http {
    # Enhanced log format with real client IP and upstream info
    log_format enhanced '$remote_addr '
                        'real_ip=$http_x_forwarded_for '
                        '[$time_local] '
                        '"$request" $status $body_bytes_sent '
                        'upstream=$upstream_addr '
                        'response_time=$upstream_response_time '
                        '"$http_user_agent"';

    server {
        access_log /var/log/nginx/access.log enhanced;
    }
}
```

## Using realip Module for Accurate $remote_addr

The `ngx_http_realip_module` replaces `$remote_addr` with the actual client IP extracted from trusted proxy headers:

```nginx
http {
    # Trust these IP ranges as proxy headers
    set_real_ip_from 10.0.0.0/8;        # Internal load balancers
    set_real_ip_from 172.16.0.0/12;
    set_real_ip_from 192.168.0.0/16;
    set_real_ip_from 127.0.0.1;

    # Use X-Forwarded-For header to find real IP
    real_ip_header X-Forwarded-For;

    # Use the leftmost (original client) IP in the header
    real_ip_recursive on;

    server {
        access_log /var/log/nginx/access.log combined;
        # Now $remote_addr contains the real client IPv4
    }
}
```

## JSON Log Format for Log Aggregation

Structured JSON logs work well with ELK, Datadog, and Splunk:

```nginx
log_format json_log escape=json '{'
    '"time":"$time_iso8601",'
    '"client_ip":"$remote_addr",'
    '"forwarded_for":"$http_x_forwarded_for",'
    '"method":"$request_method",'
    '"uri":"$request_uri",'
    '"status":$status,'
    '"bytes_sent":$body_bytes_sent,'
    '"response_time":$request_time,'
    '"upstream_time":"$upstream_response_time",'
    '"upstream_addr":"$upstream_addr",'
    '"user_agent":"$http_user_agent"'
'}';

server {
    access_log /var/log/nginx/access.json json_log;
}
```

## Conditional Logging

Skip logging health checks and internal requests to reduce log noise:

```nginx
http {
    # Map to suppress logging for health check endpoints
    map $request_uri $loggable {
        default         1;
        "~^/health"     0;
        "~^/ping"       0;
        "~^/metrics"    0;
    }

    server {
        # Only log when $loggable = 1
        access_log /var/log/nginx/access.log combined if=$loggable;
    }
}
```

## Analyzing Logs by IPv4 Address

```bash
# Top 10 client IPs by request count
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -n 10

# Find all requests from a specific IP
grep '^203\.0\.113\.50 ' /var/log/nginx/access.log

# Count 4xx/5xx errors per IP (security incident investigation)
awk '$9 ~ /^[45]/ {print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -n 20
```

## Conclusion

Accurate IPv4 client logging in Nginx requires understanding your network topology. Use `set_real_ip_from` with `real_ip_header` to unwrap trusted proxy headers so `$remote_addr` always reflects the true client. Adopt JSON log formats for modern observability stacks, and use conditional logging to keep logs actionable without clutter from health check traffic.
