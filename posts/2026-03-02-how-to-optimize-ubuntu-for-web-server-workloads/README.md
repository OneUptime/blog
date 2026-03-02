# How to Optimize Ubuntu for Web Server Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Web Server, Performance Tuning, Nginx, Kernel

Description: Tune Ubuntu kernel networking, file descriptor limits, and memory settings to maximize web server throughput, reduce latency, and handle high concurrent connection loads.

---

Web servers have a different performance profile than database servers. The dominant characteristics are: many concurrent short-lived TCP connections, high file I/O for static content, and sensitivity to network stack performance. A default Ubuntu installation handles web traffic fine at low scale, but as traffic grows, you hit kernel limits that don't show up as obvious errors - they manifest as intermittent slowness, connection drops, or inexplicably high response times under load.

## Increase File Descriptor Limits

Web servers open a file descriptor for every connection and every file served. The default limits are too low for high-traffic servers:

```bash
# View current limits
cat /proc/sys/fs/file-max
ulimit -n  # Per-process limit

# Set global file limit
echo "fs.file-max = 2000000" | sudo tee -a /etc/sysctl.d/99-webserver.conf

# Set per-process limits for nginx/apache user and root
cat << 'EOF' | sudo tee /etc/security/limits.d/99-webserver.conf
# Web server file descriptor limits
www-data         soft    nofile          200000
www-data         hard    nofile          200000
root             soft    nofile          200000
root             hard    nofile          200000
*                soft    nofile          100000
*                hard    nofile          100000
EOF

# For systemd-managed nginx, set in the unit file
sudo systemctl edit nginx
```

Add to the systemd override:

```ini
[Service]
LimitNOFILE=200000
LimitNPROC=65536
```

## Tune the TCP Network Stack

The network stack has the biggest impact on web server performance:

```bash
sudo nano /etc/sysctl.d/99-webserver.conf
```

```ini
# /etc/sysctl.d/99-webserver.conf - Web server kernel tuning

# ---- TCP Buffers ----
# Increase socket receive and send buffers
# These affect throughput for each connection
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.core.rmem_default = 65536
net.core.wmem_default = 65536

# TCP socket buffer auto-tuning ranges [min, default, max]
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# ---- Connection Handling ----
# Increase connection backlog queue
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Increase the maximum number of "orphaned" sockets
net.ipv4.tcp_max_orphans = 65535

# ---- TIME_WAIT Handling ----
# Maximum number of TIME_WAIT sockets
net.ipv4.tcp_max_tw_buckets = 2000000

# Allow reuse of TIME_WAIT sockets for new connections (safe with timestamps)
net.ipv4.tcp_tw_reuse = 1

# Enable TCP timestamps (required for tcp_tw_reuse)
net.ipv4.tcp_timestamps = 1

# ---- Connection Keepalive ----
# Time before sending keepalive probes
net.ipv4.tcp_keepalive_time = 120
net.ipv4.tcp_keepalive_intvl = 10
net.ipv4.tcp_keepalive_probes = 6

# ---- SYN Cookies ----
# Enable SYN flood protection
net.ipv4.tcp_syncookies = 1

# ---- Incoming Traffic ----
# Increase incoming packet queue
net.core.netdev_max_backlog = 65535

# Enable receive buffer auto-tuning
net.ipv4.tcp_moderate_rcvbuf = 1

# ---- Congestion Control ----
# Use BBR congestion control for better throughput
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# ---- Ephemeral Ports ----
# Expand range of local ports available for outbound connections
net.ipv4.ip_local_port_range = 10000 65535

# ---- File System ----
fs.file-max = 2000000
```

Apply the settings:

```bash
sudo sysctl --system

# Verify BBR is loaded
lsmod | grep bbr
# If not present:
sudo modprobe tcp_bbr
echo "tcp_bbr" | sudo tee -a /etc/modules-load.d/modules.conf
```

## Optimize Nginx for High Concurrency

With the kernel tuned, Nginx also needs configuration adjustments:

```bash
sudo nano /etc/nginx/nginx.conf
```

```nginx
# /etc/nginx/nginx.conf - Tuned for high-traffic web serving

user www-data;

# Set worker count to number of CPU cores
worker_processes auto;

# Maximum connections per worker (2 * worker_rlimit_nofile / workers)
# worker_processes * worker_connections = max connections
worker_connections 65535;

# Set to match the file descriptor limit
worker_rlimit_nofile 200000;

pid /run/nginx.pid;

events {
    worker_connections 65535;

    # Use epoll for efficient event processing on Linux
    use epoll;

    # Accept multiple connections per event loop iteration
    multi_accept on;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;        # Batch packet sending (improves throughput)
    tcp_nodelay on;       # Send small packets immediately (reduces latency)

    # Connection and request timeouts
    keepalive_timeout 65;
    keepalive_requests 1000;
    send_timeout 30;
    client_body_timeout 30;
    client_header_timeout 30;

    # Buffer sizes
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    output_buffers 1 32k;
    postpone_output 1460;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_comp_level 4;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_types
        application/javascript
        application/json
        application/xml
        text/css
        text/html
        text/javascript
        text/plain
        text/xml;

    # Open file cache - reduces filesystem calls for frequently served files
    open_file_cache max=200000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    include /etc/nginx/mime.types;
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

## Enable TCP Fast Open

TCP Fast Open (TFO) reduces latency on repeated connections by including data in the SYN packet:

```bash
# Enable TFO in kernel
echo 3 | sudo tee /proc/sys/net/ipv4/tcp_fastopen
echo "net.ipv4.tcp_fastopen = 3" | sudo tee -a /etc/sysctl.d/99-webserver.conf

# Enable in nginx (for connections to upstream backends)
# In upstream block:
# server backend:8080;
# keepalive 64;

# For listening sockets:
# listen 443 ssl http2 fastopen=10;
```

## Configure Static File Caching Headers

For static assets, proper cache headers reduce server load dramatically:

```nginx
# In your nginx server block
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";

    # Serve directly without access logs for static files
    access_log off;
    log_not_found off;
}
```

## NUMA Awareness for Multi-Socket Servers

On servers with multiple CPU sockets, NUMA-aware configuration prevents cross-socket memory access:

```bash
# Check NUMA topology
numactl --hardware

# Start nginx workers bound to CPU NUMA nodes
# For 2 NUMA nodes with 16 cores each, bind workers to specific CPUs
sudo systemctl edit nginx
```

```ini
[Service]
ExecStart=
ExecStart=/usr/sbin/nginx -g "daemon off;"
# Pin nginx to NUMA node 0
ExecStartPre=/bin/bash -c 'numactl --cpunodebind=0 --membind=0 nginx -t'
```

## IRQ Affinity for High-Bandwidth Servers

On servers with 10GbE or 25GbE NICs handling significant traffic, pin network interrupts to specific CPU cores:

```bash
# View NIC IRQs
cat /proc/interrupts | grep eth0

# Set IRQ affinity for eth0 to specific CPUs
# This is covered in more detail in the IRQ affinity guide
for irq in $(cat /proc/interrupts | grep eth0 | awk '{print $1}' | tr -d ':'); do
    echo 0f | sudo tee /proc/irq/$irq/smp_affinity  # CPUs 0-3
done
```

## Verify Settings with Benchmarking

Test the impact of your changes:

```bash
# Install Apache Bench
sudo apt install apache2-utils -y

# Test 10,000 requests with 1,000 concurrent connections
ab -n 10000 -c 1000 -k http://localhost/

# Test with a realistic payload
ab -n 50000 -c 2000 -H "Accept-Encoding: gzip" http://localhost/index.html

# More realistic test with wrk
sudo apt install wrk -y
wrk -t12 -c400 -d30s http://localhost/
```

Key metrics to compare before and after tuning:
- Requests per second (higher is better)
- 99th percentile latency (lower is better)
- Transfer rate (higher is better)
- Non-2xx responses (should be 0)

## Checking Current System State

```bash
# View current network connections and their states
ss -s  # Summary with TIME_WAIT count

# Watch connection states in real time
watch -n 1 'ss -s'

# Check if hitting file descriptor limits
cat /proc/sys/fs/file-nr  # [open, 0, max]

# View socket queue depths
ss -tlnp | awk '{print $2, $4}'

# Check netstat for errors
netstat -s | grep -E "error|fail|drop|overflow"
```

These tuning changes work together. Network stack tuning handles connection volume, file descriptor increases handle simultaneous requests, and proper web server configuration ties it all together. Start with the sysctl changes (they're risk-free and reversible) and benchmark each step to quantify the improvement.
