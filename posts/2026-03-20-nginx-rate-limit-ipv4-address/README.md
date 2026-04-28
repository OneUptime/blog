# How to Rate Limit Requests by IPv4 Address in Nginx

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, Rate Limiting, IPv4, Security, DDoS Protection, HTTP

Description: Configure Nginx rate limiting by IPv4 address using limit_req_zone and limit_conn_zone to protect backends from abuse and traffic spikes.

## Introduction

Nginx's `ngx_http_limit_req_module` and `ngx_http_limit_conn_module` allow you to cap requests and concurrent connections per IPv4 address. This guards against brute force attacks, API abuse, and accidental traffic floods.

## Request Rate Limiting with limit_req_zone

Define a shared memory zone keyed by client IP in the `http` block, then apply the limit in `location` blocks:

```nginx
# /etc/nginx/nginx.conf

http {
    # Create a 10MB zone named "api_limit" keyed by binary client IP
    # Rate: max 10 requests per second per IP
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    # Stricter zone for login endpoints (1 req/sec)
    limit_req_zone $binary_remote_addr zone=login_limit:5m rate=1r/s;

    include /etc/nginx/conf.d/*.conf;
}
```

Apply limits in server blocks:

```nginx
# /etc/nginx/conf.d/rate-limited.conf

server {
    listen 80;
    server_name api.example.com;

    # General API endpoints: 10 req/s with burst of 20
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        # burst=20: allow up to 20 queued requests before rejecting
        # nodelay: process burst requests immediately (no artificial delay)

        limit_req_status 429;  # Return HTTP 429 Too Many Requests
        proxy_pass http://api_backend;
    }

    # Login endpoint: 1 req/s, small burst queued (delayed)
    location /auth/login {
        limit_req zone=login_limit burst=5;
        limit_req_status 429;
        proxy_pass http://auth_backend;
    }
}
```

## Connection Limiting with limit_conn_zone

Limit concurrent open connections per IP (useful against slowloris attacks):

```nginx
http {
    # Zone for limiting concurrent connections per IP
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    server {
        listen 80;

        location / {
            # Max 20 concurrent connections per IPv4 address
            limit_conn conn_limit 20;
            limit_conn_status 503;
            proxy_pass http://backend;
        }
    }
}
```

## Combining Rate and Connection Limits

Apply both limits together for comprehensive protection:

```nginx
server {
    listen 80;
    server_name example.com;

    location /api/ {
        # Rate limit: 5 req/s with burst of 10
        limit_req zone=api_limit burst=10 nodelay;

        # Connection limit: max 10 concurrent connections per IP
        limit_conn conn_limit 10;

        proxy_pass http://api_backend;
    }
}
```

## Whitelisting Internal IPv4 Addresses

Use a `geo` block to flag trusted IPs and a `map` to translate the flag into the rate limit key (`geo` values are literal strings, so a `map` is needed to substitute `$binary_remote_addr`):

```nginx
http {
    # Flag trusted networks with 0, everything else with 1
    geo $limit {
        default         1;
        10.0.0.0/8      0;
        192.168.0.0/16  0;
    }

    # Translate the flag into the rate limit key
    map $limit $limit_key {
        0 "";                    # Internal: empty key disables the limit
        1 $binary_remote_addr;   # External: limit per IPv4 address
    }

    # Empty key disables the zone for that request
    limit_req_zone $limit_key zone=api_limit:10m rate=50r/s;
}
```

## Logging Rate Limited Requests

Capture rate limit events for monitoring:

```nginx
# Log format with rate limit info

log_format rate_limit '$remote_addr - $request [$time_local] '
                      '$status $body_bytes_sent '
                      '"$http_user_agent" limit=$limit_req_status';

server {
    access_log /var/log/nginx/access.log rate_limit;

    # Log rejected requests separately
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_req_log_level warn;  # Log limit events at WARN level
        proxy_pass http://backend;
    }
}
```

## Testing Rate Limits

Verify rate limiting is working with `ab` or `wrk`:

```bash
# Apache Bench: send 100 requests, 20 concurrent
ab -n 100 -c 20 http://api.example.com/api/test

# Check non-200 responses-429s indicate rate limiting is active
# Look for: "Non-2xx responses: 75"
```

## Conclusion

Nginx rate limiting by IPv4 address is a critical security layer requiring just two directives. Define zones at the `http` level with `limit_req_zone`, apply them with `limit_req` in location blocks, and combine with `limit_conn` to cap concurrent connections. Always whitelist trusted internal IPs and set `limit_req_status 429` for proper RFC 6585 compliance.
