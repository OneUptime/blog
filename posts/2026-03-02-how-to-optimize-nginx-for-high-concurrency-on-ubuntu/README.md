# How to Optimize Nginx for High Concurrency on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Nginx, Performance, Web Server

Description: A practical guide to tuning Nginx worker processes, connections, buffers, and OS-level settings to handle high concurrency on Ubuntu servers.

---

A stock Nginx installation is conservative in its defaults. That is fine for development, but a server handling thousands of simultaneous connections needs deliberate tuning. The good news is that Nginx was designed for concurrency from the ground up, and most optimizations are straightforward configuration changes.

## Understanding Nginx's Architecture

Nginx uses an event-driven, non-blocking architecture. A single worker process can handle thousands of connections simultaneously by using the kernel's event notification system (epoll on Linux). This is fundamentally different from Apache's process-per-connection model.

The main configuration file is `/etc/nginx/nginx.conf`. The `http` block contains most tuning parameters, though some live in the `events` block.

## Worker Process Configuration

The number of worker processes should match the number of CPU cores:

```bash
# Check how many CPU cores you have
nproc --all
# Or
grep -c ^processor /proc/cpuinfo
```

Set this in `nginx.conf`:

```nginx
# /etc/nginx/nginx.conf

# Set to number of CPU cores, or "auto" to let Nginx detect
worker_processes auto;

# Pin each worker to a specific CPU core to avoid cache thrashing
# With 4 cores: 0001 0010 0100 1000 in binary
worker_cpu_affinity auto;

events {
    # Maximum connections per worker process
    # Total max connections = worker_processes * worker_connections
    worker_connections 4096;

    # Use epoll on Linux - the most efficient event model
    use epoll;

    # Accept multiple connections in a single call
    # Reduces syscall overhead when connections arrive in bursts
    multi_accept on;
}
```

## OS-Level Limits

Before Nginx can handle many connections, the OS must allow it. The default open file limit on Ubuntu is often 1024, which caps concurrent connections:

```bash
# Check current limits
ulimit -n

# Check system-wide limits
cat /proc/sys/fs/file-max
```

Increase limits in the Nginx systemd service:

```bash
# Edit the systemd service override
sudo systemctl edit nginx
```

Add these lines:

```ini
[Service]
# Allow Nginx to open up to 65535 files
LimitNOFILE=65535
```

Also set the limit in `nginx.conf`:

```nginx
# Must not exceed system LimitNOFILE
worker_rlimit_nofile 65535;
```

Increase system-wide network limits:

```bash
# /etc/sysctl.conf - add these lines
sudo tee -a /etc/sysctl.conf << 'EOF'

# Increase the maximum number of open socket connections
net.core.somaxconn = 65535

# Increase backlog for incoming connections
net.core.netdev_max_backlog = 65535

# Increase the TCP read/write buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216

# Reuse TIME_WAIT sockets more aggressively
net.ipv4.tcp_tw_reuse = 1

# Reduce TIME_WAIT timeout
net.ipv4.tcp_fin_timeout = 15

# Increase local port range for outbound connections
net.ipv4.ip_local_port_range = 1024 65535
EOF

# Apply immediately
sudo sysctl -p
```

## HTTP Performance Settings

```nginx
http {
    # Send file data directly from disk to socket (zero-copy)
    sendfile on;

    # Optimize for large files - send headers and beginning of file together
    tcp_nopush on;

    # Reduce latency for small responses by disabling Nagle algorithm
    tcp_nodelay on;

    # Keep connections alive to reuse TCP handshakes
    keepalive_timeout 65;

    # Allow multiple requests per keepalive connection
    keepalive_requests 1000;

    # How long to wait for client to send a request header
    client_header_timeout 15;

    # How long to wait for client to send the request body
    client_body_timeout 15;

    # How long to wait for client to acknowledge a response
    send_timeout 15;

    # Close connections quickly on client disconnect
    reset_timedout_connection on;
}
```

## Buffer Tuning

Proper buffer sizing prevents Nginx from writing temporary files, which is slow:

```nginx
http {
    # Buffer for request headers - increase for large cookies or auth tokens
    client_header_buffer_size 1k;
    large_client_header_buffers 4 8k;

    # Buffer for request body
    client_body_buffer_size 128k;

    # Maximum size of request body (e.g., file uploads)
    client_max_body_size 10m;

    # Proxy buffers - size these to fit typical backend responses in memory
    proxy_buffer_size 16k;
    proxy_buffers 8 16k;
    proxy_busy_buffers_size 32k;

    # Fastcgi buffers for PHP-FPM
    fastcgi_buffer_size 16k;
    fastcgi_buffers 8 16k;
}
```

Setting buffers too small forces disk writes. Setting them too large wastes RAM. A good starting point is to size proxy buffers to hold one full average response.

## Enabling Gzip Compression

Compression reduces bandwidth and speeds up response delivery:

```nginx
http {
    gzip on;

    # Minimum response size to compress (small responses are not worth it)
    gzip_min_length 1024;

    # Compress for all proxy clients too, not just direct clients
    gzip_proxied any;

    # Compression level 1-9 (1=fastest, 9=best compression)
    # Level 4-6 is a good balance for most workloads
    gzip_comp_level 5;

    # Types to compress
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml;

    # Add Vary header so caches know the response varies by encoding
    gzip_vary on;
}
```

## Caching Static Assets

For static files, caching dramatically reduces server load:

```nginx
server {
    # Cache static files at the browser for 30 days
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2|woff)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";

        # Serve from filesystem efficiently
        access_log off;
    }

    # Open file cache - cache file descriptors to avoid repeated stat() calls
    open_file_cache max=200000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
}
```

## Rate Limiting to Protect Under Load

Rate limiting prevents individual clients from overwhelming the server:

```nginx
http {
    # Define a rate limit zone: 10 requests/second per IP
    # 10m = 10MB of memory for tracking IPs
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # Limit concurrent connections per IP
    limit_conn_zone $binary_remote_addr zone=perip:10m;

    server {
        location /api/ {
            # Allow bursts of up to 20 requests without delay
            limit_req zone=api burst=20 nodelay;

            # Allow maximum 10 concurrent connections per IP
            limit_conn perip 10;
        }
    }
}
```

## Measuring Performance

After applying changes, reload Nginx and test:

```bash
# Reload configuration without downtime
sudo nginx -t && sudo systemctl reload nginx

# Install Apache Bench for load testing
sudo apt install apache2-utils -y

# Test with 10,000 requests, 500 concurrent
ab -n 10000 -c 500 http://localhost/

# Install wrk for more realistic load testing
sudo apt install wrk -y
wrk -t4 -c400 -d30s http://localhost/
```

Check Nginx status:

```bash
# Enable stub_status in a server block
location /nginx_status {
    stub_status on;
    allow 127.0.0.1;
    deny all;
}

# Then query it
curl http://localhost/nginx_status
```

The output shows active connections, requests accepted/handled, and current connections in reading/writing/waiting states.

## Monitoring Worker Processes

```bash
# Check how many worker processes are running
ps aux | grep nginx

# Watch connection counts in real time
watch -n1 'ss -s'

# Check if workers are hitting connection limits
# If this number is close to worker_connections, increase it
cat /proc/$(pgrep -f 'nginx: worker'|head -1)/limits | grep 'open files'
```

These changes will substantially increase what your Nginx installation can handle. Monitor metrics before and after each change so you understand the impact and can roll back if something causes unexpected behavior.
