# How to Configure net.core.somaxconn and TCP Backlog for High-Connection Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, Sysctl, Performance, Server Tuning, Connection Backlog

Description: Learn how to configure net.core.somaxconn and the TCP listen backlog to prevent connection drops on high-traffic servers accepting many simultaneous connections.

## What Is the TCP Backlog?

When a server calls `listen()`, the OS maintains a queue of incoming TCP connections waiting to be accepted by the application. If this queue fills up, new connections are dropped. Two kernel parameters control the maximum queue depth:

- `net.core.somaxconn` - system-wide cap on the listen backlog
- `net.ipv4.tcp_max_syn_backlog` - SYN queue for incomplete (half-open) connections

Applications pass a `backlog` value to `listen()`, but the OS caps it at `somaxconn`.

## Step 1: Check Current Values

```bash
# Check current somaxconn limit

sysctl net.core.somaxconn
# Default: 4096 on Linux 5.4+ (was 128 on older kernels) - still low for very high-traffic servers

# Check SYN backlog
sysctl net.ipv4.tcp_max_syn_backlog
# Default: scales with system memory (commonly 128-2048)

# Check if SYN cookies are enabled (protection against SYN flood)
sysctl net.ipv4.tcp_syncookies
```

## Step 2: Identify Backlog Drops

Check if the OS is dropping connections due to backlog overflow:

```bash
# Check for listen overflows
netstat -s | grep -i "listen\|overflow\|dropped"

# Output:
# 12 times the listen queue of a socket overflowed
# 12 SYNs to LISTEN sockets dropped
# These indicate dropped connections!

# Using ss to see current listen queue depth
ss -lnt
# Columns: Recv-Q Send-Q Local Address:Port
# Recv-Q = current queue depth
# Send-Q = maximum queue depth (somaxconn limit)
# If Recv-Q approaches Send-Q, you have a bottleneck
```

## Step 3: Increase somaxconn and Backlog

```bash
# Increase the listen backlog limit
sudo sysctl -w net.core.somaxconn=65535

# Increase SYN backlog for incomplete connections
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65535

# Enable SYN cookies to handle SYN flood scenarios
sudo sysctl -w net.ipv4.tcp_syncookies=1

# Make persistent
cat > /etc/sysctl.d/99-tcp-backlog.conf << 'EOF'
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_syncookies = 1
EOF

sudo sysctl -p /etc/sysctl.d/99-tcp-backlog.conf
```

## Step 4: Configure Application-Level Backlog

The kernel limit is only half the equation. The application must also request a large backlog:

**Nginx:**
```nginx
# /etc/nginx/nginx.conf
events {
    worker_connections 65535;
}

http {
    # The listen backlog parameter
    listen 80 backlog=65535;
    listen 443 backlog=65535;
}
```

**Node.js:**
```javascript
const http = require('http');
const server = http.createServer(app);

// Pass backlog as third argument to listen()
server.listen(3000, '0.0.0.0', 65535, () => {
    console.log('Server listening with backlog=65535');
});
```

**Python:**
```python
import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.bind(('0.0.0.0', 8080))
sock.listen(65535)  # Set backlog to 65535
```

## Step 5: Monitor Accept Queue Health

```bash
# Watch listen queue depth in real time
watch -n 1 "ss -lnt | grep -E 'LISTEN|State'"

# Check for overflows periodically
watch -n 5 "netstat -s | grep -i overflow"

# Use nstat for brief statistics
nstat TcpExtListenOverflows TcpExtListenDrops
```

## Step 6: Tune Related Parameters

For servers with very high connection rates, tune additional parameters:

```bash
cat > /etc/sysctl.d/99-high-connection-server.conf << 'EOF'
# Listen backlog
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_syncookies = 1

# Reduce TIME_WAIT to recycle ports faster
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1

# Increase local port range for outbound connections
net.ipv4.ip_local_port_range = 1024 65535

# Increase max open file descriptors
fs.file-max = 2097152
EOF

sudo sysctl -p /etc/sysctl.d/99-high-connection-server.conf

# Also set ulimits for the application user
echo "* soft nofile 1048576" >> /etc/security/limits.conf
echo "* hard nofile 1048576" >> /etc/security/limits.conf
```

## Conclusion

The `net.core.somaxconn` parameter limits how many pending connections the OS will queue before dropping new ones. The default (128 on older kernels, 4096 on Linux 5.4+) is often too low for production servers under heavy load. Set it to 65535 along with `net.ipv4.tcp_max_syn_backlog`, and ensure your application calls `listen()` with a matching backlog value. Monitor for overflows with `netstat -s | grep overflow` to confirm the changes resolved the connection drops.
