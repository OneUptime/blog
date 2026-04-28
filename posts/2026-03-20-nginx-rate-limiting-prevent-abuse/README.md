# How to Configure Rate Limiting on Nginx to Prevent Abuse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, Rate Limiting, Security, DDoS, Web Server, API Protection

Description: Learn how to use Nginx's limit_req and limit_conn modules to enforce request rate limits and protect your services from abuse and DDoS attacks.

## Why Rate Limiting?

Without rate limiting, a single client can flood your server with requests, causing degraded performance for legitimate users or enabling credential-stuffing attacks. Nginx's built-in `ngx_http_limit_req_module` provides leaky-bucket rate limiting with minimal configuration.

## Defining a Rate Limiting Zone

Rate limit zones are defined in the `http` block and referenced in `server` or `location` blocks:

```nginx
# /etc/nginx/nginx.conf

http {
    # Define a shared memory zone called "api_limit"
    # Key: client IP ($binary_remote_addr uses less memory than $remote_addr)
    # Zone size: 10MB (stores ~160,000 IP addresses)
    # Rate: 10 requests per second per IP
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    # Separate zone for login endpoints with stricter limits
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=1r/s;
}
```

## Applying Rate Limits to Locations

```nginx
server {
    listen 80;
    server_name api.example.com;

    # General API rate limit with burst allowance
    location /api/ {
        # Allow burst of 20 extra requests; nodelay processes them immediately
        limit_req zone=api_limit burst=20 nodelay;

        # Return 429 Too Many Requests instead of default 503
        limit_req_status 429;

        proxy_pass http://127.0.0.1:3000;
    }

    # Strict rate limit for login to prevent brute force
    location /api/auth/login {
        limit_req zone=login_limit burst=5 nodelay;
        limit_req_status 429;

        proxy_pass http://127.0.0.1:3000;
    }
}
```

- `burst=20` - allows a burst of up to 20 extra requests to be queued
- `nodelay` - process burst requests immediately rather than spacing them out
- Without `nodelay`, queued requests are delayed to conform to the rate

## Limiting Concurrent Connections

Use `limit_conn` to cap simultaneous connections per IP (useful for download endpoints):

```nginx
http {
    # Track concurrent connections by IP
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
}

server {
    location /downloads/ {
        # Maximum 5 simultaneous connections per IP
        limit_conn conn_limit 5;
        limit_conn_status 429;

        root /var/www/downloads;
    }
}
```

## Whitelisting Trusted IPs

```nginx
http {
    # Map trusted IPs to a variable; 0 = apply limit, 1 = skip limit
    geo $limit {
        default         1;
        127.0.0.1       0;  # localhost bypass
        10.0.0.0/8      0;  # internal network bypass
    }

    # Use the geo variable as the zone key; empty key skips rate limiting
    map $limit $limit_key {
        0 "";
        1 $binary_remote_addr;
    }

    limit_req_zone $limit_key zone=api_limit:10m rate=10r/s;
}
```

## Logging Rate-Limited Requests

```nginx
http {
    # Log 429 responses at warn level for monitoring
    limit_req_log_level warn;
    limit_conn_log_level warn;
}
```

Check the error log for rate limit events:

```bash
grep "limiting requests" /var/log/nginx/error.log | tail -20
```

## Conclusion

Nginx rate limiting with `limit_req` and `limit_conn` provides a lightweight, effective defense against abuse. Define zones in the `http` block, apply them at the most specific location, use `burst` for spikes, and whitelist internal IPs to avoid throttling legitimate traffic.
