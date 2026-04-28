# How to Troubleshoot Nginx 504 Gateway Timeout for IPv4 Backend Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, 504, Gateway Timeout, IPv4, Troubleshooting, Performance

Description: Diagnose and resolve Nginx 504 Gateway Timeout errors by identifying slow IPv4 backends, adjusting proxy timeouts, and optimizing upstream response times.

## Introduction

A 504 Gateway Timeout means Nginx connected to the upstream server but the backend did not send a complete response within the configured timeout window. Unlike 502 (connection failure), 504 means the connection was established but the response took too long.

## Understanding Nginx Timeout Directives

```text
Client ──→ Nginx ──→ Backend
           │          │
           │──proxy_connect_timeout──▶ TCP connect established
           │                          │
           │──────proxy_send_timeout──▶ Request fully sent
           │                          │
           │◀─────proxy_read_timeout── Waiting for response...
           │                          │ ← 504 fires here if too slow
```

## Step 1: Identify Which Timeout Is Firing

Check the error log for the specific timeout type:

```bash
sudo tail -f /var/log/nginx/error.log

# 504 indicators (Linux uses errno 110; macOS/BSD uses errno 60):

# upstream timed out (110: Connection timed out) while reading response header from upstream
# upstream timed out (110: Connection timed out) while sending request to upstream
# upstream timed out (110: Connection timed out) while reading upstream
```

## Step 2: Measure Backend Response Time Directly

Test how long the backend actually takes to respond:

```bash
# Time a request directly to the backend (bypassing Nginx)
time curl -v http://192.168.1.10:8080/slow-endpoint

# Check P95/P99 response times with Apache Bench
ab -n 100 -c 10 http://192.168.1.10:8080/slow-endpoint | grep "Time per request"

# Use httpstat for detailed timing breakdown
pip install httpstat
httpstat http://192.168.1.10:8080/slow-endpoint
```

## Step 3: Increase Nginx Proxy Timeouts

Adjust timeouts based on your backend's actual performance profile:

```nginx
# /etc/nginx/conf.d/slow-backend.conf

upstream slow_backend {
    server 192.168.1.10:8080;
}

server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://slow_backend;

        # Time to establish TCP connection with upstream (default 60s; max 75s)
        proxy_connect_timeout 10s;

        # Timeout between successive write operations to upstream (increase for large uploads)
        proxy_send_timeout 120s;

        # Timeout between successive reads from upstream (increase for slow queries)
        proxy_read_timeout 300s;

        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # For specific slow endpoints only
    location /reports/generate {
        proxy_pass http://slow_backend;
        proxy_read_timeout 600s;  # Reports can take up to 10 minutes
    }
}
```

## Step 4: Diagnose Slow Backends

If the backend is genuinely slow, investigate the root cause:

```bash
# Check backend CPU and memory
ssh 192.168.1.10 "top -bn1 | head -15"

# Check for database slow queries
ssh db-server "sudo tail -100 /var/log/mysql/slow.log"

# Profile the application
# For Node.js apps, use --prof flag and analyze
# For Python apps, use cProfile or py-spy

# Check backend thread pool saturation
ss -s    # Summary of socket states
```

## Step 5: Add Timeout Headers for Client-Side Debugging

Log upstream timing to identify which requests are slow:

```nginx
# Custom log format with upstream timing
log_format timing '$remote_addr - $request [$time_local] '
                  '$status $body_bytes_sent '
                  'upstream_response_time=$upstream_response_time '
                  'request_time=$request_time';

server {
    access_log /var/log/nginx/timing.log timing;
}
```

```bash
# Find the slowest requests
sort -t= -k2 -n /var/log/nginx/timing.log | tail -20
```

## Step 6: Use Async Backend Processing

For requests that legitimately take a long time, consider returning a job ID immediately:

```nginx
# Return 202 Accepted for long operations
location /jobs {
    # Backend immediately returns job ID; client polls /jobs/{id}/status
    proxy_pass http://job_backend;
    proxy_read_timeout 10s;  # Short timeout: fail fast if no immediate response
}
```

## Conclusion

504 Gateway Timeout in Nginx is always a backend performance issue-the connection succeeded but the response was too slow. Start by measuring actual backend response times directly, then tune `proxy_read_timeout` to match realistic maximums. Instrument your access logs with `$upstream_response_time` to identify problematic endpoints, and fix slow database queries or resource contention at the backend level for a permanent solution.
