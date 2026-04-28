# How to Configure Nginx worker_connections for High Traffic on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, Performance, IPv4, Tuning, Worker_connections, Linux, Web Server

Description: Learn how to tune Nginx worker_connections alongside OS file descriptor limits to handle high-traffic IPv4 workloads without running out of connections.

---

`worker_connections` is one of the most important Nginx tuning parameters. It defines the maximum number of simultaneous connections each worker process can handle. Getting this right prevents "too many open files" errors and connection drops under load.

## Understanding the Relationship

The total concurrent connections Nginx can handle is:

```text
max_connections = worker_processes × worker_connections
```

For a server with 4 CPU cores and `worker_connections 4096`, the theoretical maximum is **16,384 simultaneous connections**.

## Step 1: Check the OS File Descriptor Limit

Each connection consumes a file descriptor. The OS must allow enough.

```bash
# Check the current soft limit for the nginx process (or current user)

ulimit -n

# Check system-wide hard limits
cat /proc/sys/fs/file-max
```

## Step 2: Raise the OS Limits

Edit `/etc/security/limits.conf` to allow more file descriptors for the nginx user.

```bash
# /etc/security/limits.conf
# Allow the nginx user to open up to 65535 file descriptors
nginx soft nofile 65535
nginx hard nofile 65535
```

For systemd-managed Nginx, set limits in the service override:

```ini
# /etc/systemd/system/nginx.service.d/override.conf
[Service]
LimitNOFILE=65535
```

```bash
# Reload systemd and restart Nginx
systemctl daemon-reload
systemctl restart nginx
```

## Step 3: Configure Nginx

```nginx
# /etc/nginx/nginx.conf

# Set worker count to match available CPU cores
worker_processes auto;

# Raise the per-process file descriptor limit to match OS setting
worker_rlimit_nofile 65535;

events {
    # Maximum simultaneous connections per worker
    worker_connections 4096;

    # Use the most efficient event model on Linux
    use epoll;

    # Accept multiple connections per epoll wakeup (improves throughput)
    multi_accept on;
}

http {
    # Enable persistent connections to reduce TCP handshake overhead
    keepalive_timeout 65;
    keepalive_requests 1000;

    # ... your server blocks
}
```

## Step 4: Tune TCP Settings for IPv4

High connection counts require matching kernel TCP parameters.

```bash
# /etc/sysctl.conf additions for high-traffic IPv4

# Increase the listen() accept queue limit
net.core.somaxconn = 65535

# Larger SYN backlog for half-open connections
net.ipv4.tcp_max_syn_backlog = 65535

# Enable TCP Fast Open (reduces latency for repeat connections)
net.ipv4.tcp_fastopen = 3

# Reuse TIME_WAIT sockets for new connections
net.ipv4.tcp_tw_reuse = 1
```

```bash
# Apply sysctl settings immediately
sysctl -p
```

## Verifying Under Load

```bash
# Check current active connections
ss -s

# Watch Nginx worker connection counts in real time
watch -n1 "ss -tnp | grep nginx | wc -l"

# Check for "worker_connections is not enough" in logs
grep "worker_connections" /var/log/nginx/error.log
```

## Key Takeaways

- `worker_connections` must not exceed the OS file descriptor limit; always raise `worker_rlimit_nofile` to match.
- Use `worker_processes auto` so Nginx spawns one worker per CPU core.
- Enable `epoll` and `multi_accept` on Linux for the best performance.
- Tune `net.core.somaxconn` and `net.ipv4.tcp_max_syn_backlog` to handle burst traffic without dropping connections.
