# How to Configure Nginx Rate Limiting on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, Ubuntu, Rate Limiting, Web Server, Security, DDoS Protection, API Protection, DevOps

Description: Learn how to configure Nginx rate limiting on Ubuntu to protect your web servers and APIs from abuse, DDoS attacks, and resource exhaustion.

---

> Rate limiting is your first line of defense against abusive traffic, DDoS attacks, and resource exhaustion. Nginx provides powerful built-in rate limiting capabilities that can protect your servers without requiring additional software. This guide covers everything from basic configuration to advanced patterns.

Rate limiting controls the rate of requests a client can make to your server within a specified time window. Without it, a single malicious actor or misbehaving client can overwhelm your server, affecting all users.

---

## Why Rate Limiting Matters

| Threat | Impact | How Rate Limiting Helps |
|--------|--------|------------------------|
| **DDoS Attacks** | Server unavailability | Limits requests per IP |
| **Brute Force** | Account compromise | Slows down login attempts |
| **API Abuse** | Resource exhaustion | Enforces fair usage |
| **Web Scraping** | Bandwidth theft | Throttles aggressive bots |
| **Application Bugs** | Cascading failures | Prevents retry storms |

---

## Prerequisites

Before configuring rate limiting, ensure you have the following:

- Ubuntu 20.04, 22.04, or 24.04 LTS
- Nginx installed and running
- Root or sudo access
- Basic understanding of Nginx configuration

If Nginx is not installed, install it with the following commands.

```bash
# Update package lists
sudo apt update

# Install Nginx
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installation
nginx -v
```

---

## Understanding the limit_req_zone Directive

The `limit_req_zone` directive is the foundation of Nginx rate limiting. It defines a shared memory zone that tracks request rates.

### Syntax Breakdown

The limit_req_zone directive follows this syntax pattern and must be placed in the http context.

```nginx
# Syntax: limit_req_zone key zone=name:size rate=rate;
#
# key       - What to limit by (usually $binary_remote_addr for IP)
# zone      - Name and size of shared memory zone
# rate      - Maximum request rate (requests per second or minute)

# Example: 10 requests per second per IP, using 10MB of shared memory
limit_req_zone $binary_remote_addr zone=mylimit:10m rate=10r/s;
```

### Key Variables Explained

| Variable | Description | Use Case |
|----------|-------------|----------|
| `$binary_remote_addr` | Client IP (binary, 4 bytes for IPv4) | Most common, efficient |
| `$remote_addr` | Client IP (string format) | Less efficient than binary |
| `$server_name` | Server name | Per-virtual-host limits |
| `$request_uri` | Request URI | Per-endpoint limits |
| `$http_x_api_key` | Custom header value | API key rate limiting |

### Memory Zone Sizing

The zone size determines how many clients can be tracked. Here is a guide for sizing your shared memory zone.

```nginx
# Each state uses approximately 128 bytes
# 1m (1 megabyte) = ~8,000 unique IP addresses
# 10m = ~80,000 unique IPs
#
# Formula: zone_size_mb = (expected_unique_ips / 8000) + buffer

# For small sites (up to 10K visitors/day)
limit_req_zone $binary_remote_addr zone=small:1m rate=10r/s;

# For medium sites (up to 100K visitors/day)
limit_req_zone $binary_remote_addr zone=medium:10m rate=10r/s;

# For large sites (millions of visitors)
limit_req_zone $binary_remote_addr zone=large:50m rate=10r/s;
```

---

## Basic Rate Limiting Configuration

Let us start with a simple rate limiting setup. This configuration limits each IP to 10 requests per second.

```nginx
# /etc/nginx/nginx.conf or /etc/nginx/conf.d/rate-limit.conf

http {
    # Define the rate limit zone in the http context
    # This creates a 10MB zone named "one" that tracks by IP address
    # Rate is set to 10 requests per second
    limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;

    server {
        listen 80;
        server_name example.com;

        location / {
            # Apply the rate limit to this location
            # Requests exceeding 10/s will receive 503 error
            limit_req zone=one;

            proxy_pass http://backend;
        }
    }
}
```

### Testing Basic Configuration

After configuring, test and reload Nginx.

```bash
# Test configuration syntax
sudo nginx -t

# If successful, reload Nginx
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx
```

---

## Burst Handling and the nodelay Option

Strict rate limiting can cause problems for legitimate users. Burst handling allows temporary spikes while maintaining overall rate limits.

### Understanding Burst

The burst parameter creates a queue for excess requests. This configuration allows bursts of up to 20 requests while maintaining the average rate.

```nginx
http {
    # 10 requests per second with burst queue of 20
    limit_req_zone $binary_remote_addr zone=burst_zone:10m rate=10r/s;

    server {
        listen 80;
        server_name example.com;

        location / {
            # burst=20 means up to 20 excess requests are queued
            # These queued requests are processed at the defined rate (10r/s)
            # Requests beyond burst+rate are rejected with 503
            limit_req zone=burst_zone burst=20;

            proxy_pass http://backend;
        }
    }
}
```

### The nodelay Option

Without `nodelay`, burst requests are delayed to match the rate. With `nodelay`, burst requests are processed immediately.

```nginx
http {
    limit_req_zone $binary_remote_addr zone=nodelay_zone:10m rate=10r/s;

    server {
        listen 80;
        server_name example.com;

        location /api/ {
            # nodelay processes burst requests immediately
            # Without nodelay: 20 burst requests take 2 seconds (10r/s)
            # With nodelay: 20 burst requests processed immediately
            # After burst is exhausted, rate limiting kicks in
            limit_req zone=nodelay_zone burst=20 nodelay;

            proxy_pass http://api_backend;
        }
    }
}
```

### Comparing Burst Behaviors

| Configuration | Behavior | Best For |
|--------------|----------|----------|
| `limit_req zone=z;` | Strict, no burst | Security-critical endpoints |
| `limit_req zone=z burst=20;` | Queue excess, delay | General web traffic |
| `limit_req zone=z burst=20 nodelay;` | Queue excess, no delay | API responses |

---

## Multiple Rate Limit Zones

Real-world applications need different limits for different resources. Here is how to configure multiple zones.

```nginx
http {
    # Zone for general web traffic - generous limits
    limit_req_zone $binary_remote_addr zone=web:10m rate=30r/s;

    # Zone for API endpoints - moderate limits
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # Zone for authentication - strict limits to prevent brute force
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    # Zone for search - prevent expensive operations
    limit_req_zone $binary_remote_addr zone=search:10m rate=1r/s;

    # Zone for file downloads - very restrictive
    limit_req_zone $binary_remote_addr zone=downloads:10m rate=2r/m;

    server {
        listen 80;
        server_name example.com;

        # General web pages - 30 requests/second
        location / {
            limit_req zone=web burst=50 nodelay;
            root /var/www/html;
        }

        # API endpoints - 10 requests/second
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api_backend;
        }

        # Authentication - 5 requests/minute (strict)
        location /login {
            limit_req zone=auth burst=3 nodelay;
            proxy_pass http://auth_backend;
        }

        location /register {
            limit_req zone=auth burst=2 nodelay;
            proxy_pass http://auth_backend;
        }

        # Search - 1 request/second
        location /search {
            limit_req zone=search burst=5;
            proxy_pass http://search_backend;
        }

        # Downloads - 2 per minute
        location /downloads/ {
            limit_req zone=downloads burst=1;
            alias /var/www/files/;
        }
    }
}
```

### Applying Multiple Zones to One Location

You can apply multiple rate limits to a single location for layered protection.

```nginx
http {
    # Per-IP limit
    limit_req_zone $binary_remote_addr zone=per_ip:10m rate=10r/s;

    # Global server limit (all IPs combined)
    limit_req_zone $server_name zone=per_server:1m rate=1000r/s;

    server {
        listen 80;
        server_name example.com;

        location /api/ {
            # Apply both limits - request must pass BOTH
            # This prevents both individual abuse and coordinated attacks
            limit_req zone=per_ip burst=20 nodelay;
            limit_req zone=per_server burst=100 nodelay;

            proxy_pass http://api_backend;
        }
    }
}
```

---

## Rate Limiting by Different Keys

### Rate Limiting by IP Address

The most common approach uses client IP address as the key.

```nginx
http {
    # Standard IP-based limiting using binary format for efficiency
    limit_req_zone $binary_remote_addr zone=by_ip:10m rate=10r/s;

    server {
        listen 80;
        server_name example.com;

        location / {
            limit_req zone=by_ip burst=20 nodelay;
            proxy_pass http://backend;
        }
    }
}
```

### Rate Limiting by User or Session

For authenticated users, limit by a user identifier from headers or cookies.

```nginx
http {
    # Map to extract user ID from cookie or use IP as fallback
    map $cookie_session_id $limit_key {
        ""      $binary_remote_addr;    # No session - use IP
        default $cookie_session_id;      # Use session ID
    }

    limit_req_zone $limit_key zone=by_user:10m rate=20r/s;

    server {
        listen 80;
        server_name example.com;

        location /api/ {
            # Authenticated users get their own rate limit bucket
            limit_req zone=by_user burst=40 nodelay;
            proxy_pass http://api_backend;
        }
    }
}
```

### Rate Limiting by API Key

For APIs using API keys, extract the key from headers.

```nginx
http {
    # Map API key from header, fallback to IP for requests without key
    map $http_x_api_key $api_limit_key {
        ""      $binary_remote_addr;    # No API key - limit by IP
        default $http_x_api_key;         # Use API key as limit key
    }

    # Different zones for different API tiers
    limit_req_zone $api_limit_key zone=api_free:10m rate=10r/m;
    limit_req_zone $api_limit_key zone=api_pro:10m rate=100r/m;
    limit_req_zone $api_limit_key zone=api_enterprise:10m rate=1000r/m;

    server {
        listen 80;
        server_name api.example.com;

        # Free tier API
        location /v1/free/ {
            limit_req zone=api_free burst=5 nodelay;
            proxy_pass http://api_backend;
        }

        # Pro tier API
        location /v1/pro/ {
            limit_req zone=api_pro burst=50 nodelay;
            proxy_pass http://api_backend;
        }

        # Enterprise tier API
        location /v1/enterprise/ {
            limit_req zone=api_enterprise burst=500 nodelay;
            proxy_pass http://api_backend;
        }
    }
}
```

### Rate Limiting by URI

Limit specific endpoints differently.

```nginx
http {
    # Combined key: IP + URI for per-endpoint-per-user limiting
    limit_req_zone $binary_remote_addr$uri zone=by_endpoint:20m rate=5r/s;

    server {
        listen 80;
        server_name example.com;

        location /api/ {
            # Each user gets 5r/s per unique endpoint
            # User can hit /api/users at 5r/s AND /api/posts at 5r/s
            limit_req zone=by_endpoint burst=10 nodelay;
            proxy_pass http://api_backend;
        }
    }
}
```

---

## Connection Limiting with limit_conn

While `limit_req` limits the request rate, `limit_conn` limits concurrent connections. This is useful for preventing resource exhaustion.

### Basic Connection Limiting

Connection limiting restricts how many simultaneous connections each client can have.

```nginx
http {
    # Define connection limit zone
    limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;

    server {
        listen 80;
        server_name example.com;

        # Limit each IP to 10 concurrent connections
        limit_conn conn_per_ip 10;

        location / {
            proxy_pass http://backend;
        }
    }
}
```

### Combining Rate and Connection Limits

For comprehensive protection, use both rate and connection limiting together.

```nginx
http {
    # Rate limiting zone
    limit_req_zone $binary_remote_addr zone=req_zone:10m rate=10r/s;

    # Connection limiting zone
    limit_conn_zone $binary_remote_addr zone=conn_zone:10m;

    # Connection zone for downloads (separate limit)
    limit_conn_zone $binary_remote_addr zone=download_conn:10m;

    server {
        listen 80;
        server_name example.com;

        # Global connection limit for this server
        limit_conn conn_zone 20;

        location / {
            # Apply rate limit
            limit_req zone=req_zone burst=20 nodelay;
            proxy_pass http://backend;
        }

        location /downloads/ {
            # Stricter limits for downloads
            limit_req zone=req_zone burst=5;
            limit_conn download_conn 2;  # Only 2 concurrent downloads per IP

            # Limit download speed to 1MB/s per connection
            limit_rate 1m;

            alias /var/www/files/;
        }
    }
}
```

### Connection Limit Status Codes

Configure the status code returned when connection limits are exceeded.

```nginx
http {
    limit_conn_zone $binary_remote_addr zone=conn_zone:10m;

    # Return 429 (Too Many Requests) instead of default 503
    limit_conn_status 429;

    server {
        listen 80;
        server_name example.com;

        limit_conn conn_zone 10;

        location / {
            proxy_pass http://backend;
        }
    }
}
```

---

## Whitelisting IPs from Rate Limits

Some IPs should be exempt from rate limiting, such as monitoring systems, internal services, or trusted partners.

### Using geo Module for Whitelisting

The geo module provides an efficient way to whitelist IP addresses and ranges.

```nginx
http {
    # Define whitelist using geo module
    # 0 = not whitelisted (apply rate limit)
    # 1 = whitelisted (bypass rate limit)
    geo $whitelist {
        default         0;

        # Localhost
        127.0.0.1       1;

        # Internal network
        10.0.0.0/8      1;
        192.168.0.0/16  1;
        172.16.0.0/12   1;

        # Monitoring service
        203.0.113.50    1;

        # Office IP range
        198.51.100.0/24 1;

        # Partner API servers
        192.0.2.10      1;
        192.0.2.11      1;
    }

    # Map to create rate limit key
    # Empty string means no rate limiting
    map $whitelist $limit_key {
        0 $binary_remote_addr;  # Apply rate limit
        1 "";                    # Skip rate limit (empty key)
    }

    limit_req_zone $limit_key zone=standard:10m rate=10r/s;

    server {
        listen 80;
        server_name example.com;

        location / {
            # Whitelisted IPs bypass this limit entirely
            limit_req zone=standard burst=20 nodelay;
            proxy_pass http://backend;
        }
    }
}
```

### Whitelisting with External File

For managing large lists of IPs, use an external file.

```nginx
# /etc/nginx/conf.d/whitelist.conf
geo $whitelist {
    default 0;
    include /etc/nginx/whitelist-ips.conf;
}
```

Create the whitelist file with one IP or CIDR per line.

```bash
# /etc/nginx/whitelist-ips.conf
# Monitoring systems
203.0.113.50    1;
203.0.113.51    1;

# Office locations
198.51.100.0/24 1;

# Partner networks
192.0.2.0/24    1;
```

### Dynamic Whitelisting by Header

For internal services that pass through load balancers, whitelist by header.

```nginx
http {
    # Check for internal service header
    map $http_x_internal_service $is_internal {
        ""              0;
        "secret-token"  1;  # Must match your internal token
        default         0;
    }

    map $is_internal $internal_limit_key {
        0 $binary_remote_addr;
        1 "";
    }

    limit_req_zone $internal_limit_key zone=external:10m rate=10r/s;

    server {
        listen 80;
        server_name example.com;

        location /api/ {
            # Internal services with correct header bypass limit
            limit_req zone=external burst=20 nodelay;
            proxy_pass http://api_backend;
        }
    }
}
```

---

## Custom Error Pages for Rate-Limited Requests

Provide informative responses when rate limits are exceeded.

### Basic Custom Error Page

Configure a custom error page for rate-limited requests.

```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # Change default 503 to 429 for rate limiting
    limit_req_status 429;

    server {
        listen 80;
        server_name example.com;

        # Custom error page for 429
        error_page 429 /429.html;

        location = /429.html {
            root /var/www/error_pages;
            internal;  # Only accessible via internal redirect
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api_backend;
        }
    }
}
```

Create the custom error page with helpful information.

```html
<!-- /var/www/error_pages/429.html -->
<!DOCTYPE html>
<html>
<head>
    <title>429 - Too Many Requests</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #e74c3c; }
        .retry { background: #3498db; color: white; padding: 10px 20px;
                 border-radius: 5px; text-decoration: none; }
    </style>
</head>
<body>
    <h1>429 - Too Many Requests</h1>
    <p>You have exceeded the rate limit. Please slow down your requests.</p>
    <p>Try again in a few seconds.</p>
    <a href="/" class="retry">Return to Homepage</a>
</body>
</html>
```

### JSON Response for APIs

For API endpoints, return JSON instead of HTML.

```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_status 429;

    server {
        listen 80;
        server_name api.example.com;

        # JSON error response for APIs
        error_page 429 = @rate_limited;

        location @rate_limited {
            default_type application/json;
            return 429 '{"error": "rate_limit_exceeded", "message": "Too many requests. Please retry after a few seconds.", "retry_after": 60}';
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api_backend;
        }
    }
}
```

### Adding Retry-After Header

Include the Retry-After header to help clients know when to retry.

```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_status 429;

    server {
        listen 80;
        server_name api.example.com;

        error_page 429 = @rate_limited;

        location @rate_limited {
            # Add headers to help clients
            add_header Retry-After 60 always;
            add_header X-RateLimit-Limit 10 always;
            add_header X-RateLimit-Remaining 0 always;

            default_type application/json;
            return 429 '{"error": "rate_limit_exceeded", "retry_after": 60}';
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;

            # Add rate limit headers to successful responses too
            add_header X-RateLimit-Limit 10;

            proxy_pass http://api_backend;
        }
    }
}
```

---

## Logging Rate-Limited Requests

Proper logging helps identify attacks and tune rate limits.

### Basic Rate Limit Logging

Configure logging to capture rate-limited requests separately.

```nginx
http {
    # Custom log format including rate limit info
    log_format rate_limit '$remote_addr - $remote_user [$time_local] '
                          '"$request" $status $body_bytes_sent '
                          '"$http_referer" "$http_user_agent" '
                          'rt=$request_time limit_req_status=$limit_req_status';

    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_status 429;

    server {
        listen 80;
        server_name example.com;

        # Main access log
        access_log /var/log/nginx/access.log;

        # Separate log for all requests with rate limit format
        access_log /var/log/nginx/rate_limit.log rate_limit;

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api_backend;
        }
    }
}
```

### Logging Only Rate-Limited Requests

To reduce log volume, only log rate-limited requests.

```nginx
http {
    log_format rate_limited '$remote_addr - [$time_local] "$request" '
                            '$status "$http_user_agent"';

    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_status 429;

    # Map to conditionally log based on status
    map $status $is_rate_limited {
        429     1;
        default 0;
    }

    server {
        listen 80;
        server_name example.com;

        # Only log rate-limited requests
        access_log /var/log/nginx/rate_limited.log rate_limited if=$is_rate_limited;

        # Regular access log
        access_log /var/log/nginx/access.log;

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api_backend;
        }
    }
}
```

### Log Analysis Commands

Useful commands for analyzing rate limit logs.

```bash
# Count rate-limited requests by IP
grep "\" 429 " /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -20

# Find rate-limited requests in the last hour
grep "\" 429 " /var/log/nginx/access.log | grep "$(date '+%d/%b/%Y:%H')" | wc -l

# Top rate-limited endpoints
grep "\" 429 " /var/log/nginx/access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -10

# Rate-limited requests per minute
grep "\" 429 " /var/log/nginx/access.log | awk '{print $4}' | cut -d: -f1-3 | uniq -c | tail -20

# Watch rate-limited requests in real-time
tail -f /var/log/nginx/access.log | grep --line-buffered "\" 429 "
```

---

## Testing Rate Limits

Always test rate limits before deploying to production.

### Testing with curl

Simple sequential testing with curl.

```bash
# Basic test - make 15 rapid requests
for i in {1..15}; do
    curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/test
done

# Test with timing
for i in {1..20}; do
    echo -n "Request $i: "
    curl -s -o /dev/null -w "%{http_code} - %{time_total}s\n" http://localhost/api/test
done

# Test and show headers
curl -i http://localhost/api/test 2>/dev/null | grep -E "^(HTTP|X-RateLimit|Retry-After)"
```

### Testing with Apache Bench (ab)

Use Apache Bench for concurrent request testing.

```bash
# Install Apache Bench
sudo apt install apache2-utils -y

# Send 100 requests with 10 concurrent connections
ab -n 100 -c 10 http://localhost/api/test

# Send requests for 30 seconds with 20 concurrent connections
ab -t 30 -c 20 http://localhost/api/test

# Test with keep-alive connections
ab -n 100 -c 10 -k http://localhost/api/test
```

### Testing with wrk

For more realistic load testing, use wrk.

```bash
# Install wrk
sudo apt install wrk -y

# Basic load test
wrk -t4 -c100 -d30s http://localhost/api/test

# With more connections
wrk -t8 -c200 -d60s http://localhost/api/test
```

### Testing with a Bash Script

Create a comprehensive test script.

```bash
#!/bin/bash
# rate_limit_test.sh - Test Nginx rate limiting

URL="${1:-http://localhost/api/test}"
REQUESTS="${2:-50}"
DELAY="${3:-0.05}"

echo "Testing rate limit on: $URL"
echo "Requests: $REQUESTS, Delay between: ${DELAY}s"
echo "---"

success=0
limited=0
errors=0

for i in $(seq 1 $REQUESTS); do
    code=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

    case $code in
        200|201|204) ((success++)); status="OK" ;;
        429) ((limited++)); status="RATE LIMITED" ;;
        *) ((errors++)); status="ERROR" ;;
    esac

    printf "Request %3d: %s (%s)\n" $i $code "$status"
    sleep $DELAY
done

echo "---"
echo "Summary:"
echo "  Success: $success"
echo "  Rate Limited: $limited"
echo "  Errors: $errors"
```

Run the test script.

```bash
chmod +x rate_limit_test.sh
./rate_limit_test.sh http://localhost/api/test 50 0.01
```

---

## Rate Limiting for APIs vs Web Pages

APIs and web pages have different requirements. Here is a complete configuration addressing both.

```nginx
http {
    # Web page rate limiting - generous for normal browsing
    # Pages load many resources (images, CSS, JS)
    limit_req_zone $binary_remote_addr zone=web_pages:10m rate=50r/s;

    # Static assets - very generous
    limit_req_zone $binary_remote_addr zone=static:10m rate=100r/s;

    # API rate limiting - stricter
    limit_req_zone $binary_remote_addr zone=api_general:10m rate=10r/s;

    # API write operations - even stricter
    limit_req_zone $binary_remote_addr zone=api_write:10m rate=2r/s;

    # Search and expensive operations
    limit_req_zone $binary_remote_addr zone=expensive:10m rate=1r/s;

    # Authentication endpoints
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    # Connection limits
    limit_conn_zone $binary_remote_addr zone=conn_web:10m;
    limit_conn_zone $binary_remote_addr zone=conn_api:10m;

    # Status codes
    limit_req_status 429;
    limit_conn_status 429;

    # Web server
    server {
        listen 80;
        server_name www.example.com;

        # Connection limit for web
        limit_conn conn_web 50;

        # HTML pages
        location / {
            limit_req zone=web_pages burst=100 nodelay;
            root /var/www/html;
            index index.html;
        }

        # Static assets (images, CSS, JS)
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2?)$ {
            limit_req zone=static burst=200 nodelay;
            root /var/www/html;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # Search page
        location /search {
            limit_req zone=expensive burst=5;
            proxy_pass http://search_backend;
        }

        # Login page
        location /login {
            limit_req zone=auth burst=3 nodelay;
            proxy_pass http://auth_backend;
        }

        error_page 429 /429.html;
        location = /429.html {
            root /var/www/error_pages;
            internal;
        }
    }

    # API server
    server {
        listen 80;
        server_name api.example.com;

        # Stricter connection limit for API
        limit_conn conn_api 20;

        # Default API rate limit
        location /api/ {
            limit_req zone=api_general burst=20 nodelay;

            # Add rate limit headers
            add_header X-RateLimit-Limit "600 per minute";

            proxy_pass http://api_backend;
        }

        # Read-only endpoints - slightly higher limits
        location /api/v1/read/ {
            limit_req zone=api_general burst=30 nodelay;
            proxy_pass http://api_backend;
        }

        # Write operations - stricter limits
        location /api/v1/write/ {
            limit_req zone=api_write burst=5 nodelay;
            proxy_pass http://api_backend;
        }

        # POST/PUT/DELETE methods - additional restrictions
        location /api/ {
            if ($request_method !~ ^(GET|HEAD|OPTIONS)$) {
                set $write_request 1;
            }

            limit_req zone=api_general burst=20 nodelay;
            proxy_pass http://api_backend;
        }

        # Expensive operations
        location /api/v1/reports/ {
            limit_req zone=expensive burst=2;
            proxy_pass http://api_backend;
        }

        location /api/v1/export/ {
            limit_req zone=expensive burst=2;
            proxy_pass http://api_backend;
        }

        # Authentication API
        location /api/v1/auth/ {
            limit_req zone=auth burst=3 nodelay;
            proxy_pass http://auth_backend;
        }

        # JSON error responses
        error_page 429 = @api_rate_limited;
        location @api_rate_limited {
            add_header Content-Type application/json always;
            add_header Retry-After 60 always;
            return 429 '{"error":"rate_limit_exceeded","message":"Too many requests","retry_after":60}';
        }
    }
}
```

---

## Troubleshooting

### Common Issues and Solutions

#### Rate Limits Not Working

Check these common causes when rate limits appear to not work.

```bash
# 1. Verify configuration syntax
sudo nginx -t

# 2. Check if module is loaded
nginx -V 2>&1 | grep -o 'http_limit_req_module'

# 3. Verify zone is defined in http context, not server
# Wrong:
#   server { limit_req_zone ... }  # Error!
# Right:
#   http { limit_req_zone ... }

# 4. Check error logs
sudo tail -f /var/log/nginx/error.log

# 5. Verify the location block is being matched
# Add a test header
location /api/ {
    add_header X-Location-Matched "api";
    limit_req zone=api burst=20 nodelay;
}
```

#### Zone Memory Full

When the zone runs out of memory, new IPs cannot be tracked.

```bash
# Check for "limit_req" errors in logs
grep "limit_req" /var/log/nginx/error.log

# Error message: "could not allocate node"
# Solution: Increase zone size

# Change from:
limit_req_zone $binary_remote_addr zone=api:1m rate=10r/s;

# To:
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

#### Behind a Load Balancer or Proxy

When Nginx is behind a proxy, all requests appear from the proxy IP.

```nginx
http {
    # Use real IP from X-Forwarded-For header
    set_real_ip_from 10.0.0.0/8;        # Trust your load balancer network
    set_real_ip_from 172.16.0.0/12;
    set_real_ip_from 192.168.0.0/16;
    real_ip_header X-Forwarded-For;
    real_ip_recursive on;

    # Now $binary_remote_addr contains the real client IP
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name example.com;

        location / {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
        }
    }
}
```

#### IPv6 Considerations

IPv6 addresses use more memory. Consider using prefix-based limiting.

```nginx
http {
    # For IPv6, limit by /64 prefix instead of full address
    # This groups users from the same network
    map $remote_addr $limit_key_v6 {
        "~^(?P<prefix>[0-9a-f:]+::[0-9a-f]+):" $prefix;
        default $binary_remote_addr;
    }

    limit_req_zone $limit_key_v6 zone=ipv6_aware:20m rate=10r/s;
}
```

#### Debugging with Test Configuration

Create a test configuration to verify rate limiting works.

```nginx
# /etc/nginx/conf.d/rate-limit-test.conf
server {
    listen 8080;
    server_name localhost;

    # Very restrictive for easy testing
    limit_req_zone $binary_remote_addr zone=test:1m rate=1r/s;
    limit_req_status 429;

    location /test {
        limit_req zone=test burst=2 nodelay;
        return 200 "OK\n";
    }
}
```

Test the configuration.

```bash
# Reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Quick test - should see 429 after first few requests
for i in {1..10}; do curl -s -o /dev/null -w "%{http_code} " http://localhost:8080/test; done
echo
```

### Monitoring Rate Limit Effectiveness

Create a script to monitor rate limiting.

```bash
#!/bin/bash
# monitor_rate_limits.sh

echo "=== Rate Limit Monitoring ==="
echo "Time: $(date)"
echo ""

# Count 429 responses in the last hour
hour_429=$(grep "\" 429 " /var/log/nginx/access.log | \
    grep "$(date '+%d/%b/%Y:%H')" | wc -l)
echo "429 responses (last hour): $hour_429"

# Top offending IPs
echo ""
echo "Top 10 rate-limited IPs (last hour):"
grep "\" 429 " /var/log/nginx/access.log | \
    grep "$(date '+%d/%b/%Y:%H')" | \
    awk '{print $1}' | sort | uniq -c | sort -rn | head -10

# Most targeted endpoints
echo ""
echo "Most targeted endpoints:"
grep "\" 429 " /var/log/nginx/access.log | \
    grep "$(date '+%d/%b/%Y:%H')" | \
    awk '{print $7}' | sort | uniq -c | sort -rn | head -10
```

---

## Complete Production Configuration

Here is a complete, production-ready Nginx rate limiting configuration.

```nginx
# /etc/nginx/nginx.conf

user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 4096;
    multi_accept on;
    use epoll;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" rt=$request_time';

    log_format rate_limit '$remote_addr [$time_local] "$request" '
                          '$status "$http_user_agent"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Real IP configuration (if behind proxy)
    set_real_ip_from 10.0.0.0/8;
    set_real_ip_from 172.16.0.0/12;
    set_real_ip_from 192.168.0.0/16;
    real_ip_header X-Forwarded-For;
    real_ip_recursive on;

    # Whitelist configuration
    geo $whitelist {
        default         0;
        127.0.0.1       1;
        10.0.0.0/8      1;
        # Add your monitoring IPs
        # 203.0.113.50  1;
    }

    map $whitelist $limit_key {
        0 $binary_remote_addr;
        1 "";
    }

    # Rate limit zones
    limit_req_zone $limit_key zone=general:10m rate=30r/s;
    limit_req_zone $limit_key zone=api:10m rate=10r/s;
    limit_req_zone $limit_key zone=api_write:10m rate=2r/s;
    limit_req_zone $limit_key zone=auth:10m rate=5r/m;
    limit_req_zone $limit_key zone=search:10m rate=1r/s;

    # Connection limit zones
    limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;

    # Status codes
    limit_req_status 429;
    limit_conn_status 429;

    # Conditional logging for rate-limited requests
    map $status $is_rate_limited {
        429     1;
        default 0;
    }

    # Include server configurations
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

Create the server configuration.

```nginx
# /etc/nginx/sites-available/example.com

server {
    listen 80;
    server_name example.com www.example.com;

    # Logging
    access_log /var/log/nginx/example.access.log main;
    access_log /var/log/nginx/example.ratelimit.log rate_limit if=$is_rate_limited;
    error_log /var/log/nginx/example.error.log;

    # Global connection limit
    limit_conn conn_per_ip 30;

    # Root directory
    root /var/www/example.com;

    # Error pages
    error_page 429 = @rate_limited;

    location @rate_limited {
        default_type application/json;
        add_header Retry-After 60 always;
        add_header X-RateLimit-Limit "varies by endpoint" always;
        return 429 '{"error":"rate_limit_exceeded","retry_after":60}';
    }

    # Static files
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2?)$ {
        limit_req zone=general burst=100 nodelay;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Main site
    location / {
        limit_req zone=general burst=50 nodelay;
        try_files $uri $uri/ =404;
    }

    # API endpoints
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # API write operations
    location /api/v1/write/ {
        limit_req zone=api_write burst=5 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Authentication
    location /api/auth/ {
        limit_req zone=auth burst=3 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Search
    location /search {
        limit_req zone=search burst=5;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check (no rate limit)
    location /health {
        access_log off;
        return 200 "OK\n";
    }
}
```

Enable the site and test.

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Verify it's working
curl -I http://example.com/api/test
```

---

## Conclusion

Nginx rate limiting is a powerful tool for protecting your servers. Key takeaways:

- **Use `limit_req_zone`** to define rate limits in the http context
- **Choose appropriate keys** - IP for anonymous, user ID for authenticated
- **Configure burst** to handle legitimate traffic spikes
- **Use `nodelay`** for APIs to avoid adding latency
- **Create multiple zones** for different endpoint types
- **Whitelist** monitoring and internal services
- **Log rate-limited requests** for analysis and tuning
- **Test thoroughly** before deploying to production

Rate limiting is just one layer of defense. Combine it with firewalls, CDNs, and application-level protections for comprehensive security.

---

*Need to monitor your rate limiting effectiveness and server health in production? [OneUptime](https://oneuptime.com) provides comprehensive infrastructure monitoring, alerting, and incident management. Track 429 error rates, set up alerts when rate limits are triggered excessively, and ensure your rate limiting configuration is protecting your servers effectively.*

**Related Reading:**
- [How to Implement Rate Limiting in FastAPI](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
- [How to Implement Rate Limiting in Node.js](https://oneuptime.com/blog/post/2026-01-06-nodejs-rate-limiting-no-external-services/view)
