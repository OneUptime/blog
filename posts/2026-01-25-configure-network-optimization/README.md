# How to Configure Network Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Performance, Linux, DevOps, Optimization

Description: Learn how to configure network optimization at the OS and application level to reduce latency, increase throughput, and handle more concurrent connections in production systems.

---

Network performance can make or break your application. A poorly configured network stack leads to dropped connections, high latency, and frustrated users. The good news is that Linux provides dozens of kernel parameters you can tune, and most applications allow socket-level optimizations that compound these gains.

This guide covers practical network optimization techniques from kernel tuning to application-level socket configuration.

## Understanding Network Bottlenecks

Before tuning anything, you need to identify where your bottlenecks are. Network issues generally fall into three categories:

```mermaid
flowchart LR
    A[Client] --> B[Network Path]
    B --> C[Server NIC]
    C --> D[Kernel Network Stack]
    D --> E[Application]

    style B fill:#ff9999
    style D fill:#99ff99
    style E fill:#9999ff
```

| Bottleneck Type | Symptoms | Tools to Diagnose |
|-----------------|----------|-------------------|
| Bandwidth | Slow transfers, timeouts | iperf3, nethogs |
| Latency | High response times | ping, traceroute, mtr |
| Connection limits | Connection refused errors | ss, netstat |
| Packet loss | Retransmissions, timeouts | tcpdump, netstat -s |

## Kernel Network Stack Tuning

### Increase Socket Buffer Sizes

The default socket buffer sizes on Linux are conservative. For high-throughput applications, increase them:

```bash
# /etc/sysctl.conf

# Maximum socket receive buffer size (16 MB)
net.core.rmem_max = 16777216

# Maximum socket send buffer size (16 MB)
net.core.wmem_max = 16777216

# Default receive buffer size (1 MB)
net.core.rmem_default = 1048576

# Default send buffer size (1 MB)
net.core.wmem_default = 1048576

# TCP receive buffer: min, default, max (in bytes)
# These values are automatically tuned between min and max
net.ipv4.tcp_rmem = 4096 1048576 16777216

# TCP send buffer: min, default, max
net.ipv4.tcp_wmem = 4096 1048576 16777216
```

Apply the changes:

```bash
# Apply sysctl changes immediately
sudo sysctl -p

# Verify the settings
sysctl net.core.rmem_max
```

### Connection Backlog and Queue Sizes

When your server receives more connections than it can process, they queue up. If the queue overflows, connections are dropped.

```bash
# /etc/sysctl.conf

# Maximum number of connections that can be queued for acceptance
# Increase this for high-traffic servers
net.core.somaxconn = 65535

# Maximum number of packets queued on the INPUT side
# when the interface receives packets faster than the kernel can process
net.core.netdev_max_backlog = 65535

# Maximum number of remembered connection requests
# which have not yet received an acknowledgment
net.ipv4.tcp_max_syn_backlog = 65535
```

### TCP Connection Optimization

Tune TCP behavior for faster connections and better resource utilization:

```bash
# /etc/sysctl.conf

# Enable TCP Fast Open for faster connection establishment
# Client and server support (value 3)
net.ipv4.tcp_fastopen = 3

# Reuse TIME_WAIT sockets for new connections
# Safe for most workloads
net.ipv4.tcp_tw_reuse = 1

# Enable TCP window scaling for high-bandwidth connections
net.ipv4.tcp_window_scaling = 1

# Number of times to retry SYN packets before giving up
# Default is 6 (about 63 seconds), reduce for faster failure detection
net.ipv4.tcp_syn_retries = 3

# Number of times to retry SYN-ACK packets
net.ipv4.tcp_synack_retries = 3

# How long to keep sockets in FIN-WAIT-2 state (seconds)
net.ipv4.tcp_fin_timeout = 15
```

### Congestion Control

Modern congestion control algorithms handle packet loss and bandwidth estimation better than the default:

```bash
# Check available congestion control algorithms
sysctl net.ipv4.tcp_available_congestion_control

# Use BBR (Bottleneck Bandwidth and Round-trip propagation time)
# Developed by Google, excellent for high-latency networks
net.ipv4.tcp_congestion_control = bbr

# Ensure fair queuing is enabled (required for BBR)
net.core.default_qdisc = fq
```

BBR requires a Linux kernel 4.9 or later. Check your kernel version:

```bash
uname -r
```

## Application-Level Socket Configuration

### Node.js Socket Options

Configure socket options when creating servers:

```javascript
const http = require('http');
const net = require('net');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Hello World');
});

// Increase the connection backlog
// This matches the kernel's somaxconn setting
server.listen(3000, '0.0.0.0', 65535);

// Configure socket options for each connection
server.on('connection', (socket) => {
  // Disable Nagle's algorithm for lower latency
  // Good for real-time applications, bad for bulk transfers
  socket.setNoDelay(true);

  // Enable keep-alive to detect dead connections
  // Initial delay of 60 seconds before first probe
  socket.setKeepAlive(true, 60000);

  // Set socket timeout to prevent hanging connections
  socket.setTimeout(120000); // 2 minutes
});

// Handle socket timeout
server.on('timeout', (socket) => {
  socket.destroy();
});
```

### Python Socket Configuration

```python
import socket
import socketserver

class OptimizedTCPHandler(socketserver.BaseRequestHandler):
    def setup(self):
        # Get the socket
        sock = self.request

        # Disable Nagle's algorithm
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

        # Enable TCP keepalive
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)

        # Set keepalive parameters (Linux-specific)
        # Time before sending first probe (seconds)
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPIDLE, 60)

        # Interval between probes (seconds)
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPINTVL, 10)

        # Number of failed probes before considering connection dead
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPCNT, 5)

        # Increase receive buffer size
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 1048576)

        # Increase send buffer size
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 1048576)

    def handle(self):
        # Handle the request
        data = self.request.recv(4096)
        self.request.sendall(b'Response data')


# Create server with increased backlog
server = socketserver.TCPServer(
    ('0.0.0.0', 8080),
    OptimizedTCPHandler,
    bind_and_activate=False
)

# Set socket options on the server socket
server.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

# Bind and listen with larger backlog
server.server_bind()
server.socket.listen(65535)
server.serve_forever()
```

### Go Socket Tuning

```go
package main

import (
    "net"
    "net/http"
    "time"
)

func main() {
    // Create a custom listener with optimized settings
    listener, err := net.Listen("tcp", ":8080")
    if err != nil {
        panic(err)
    }

    // Create HTTP server with optimized timeouts
    server := &http.Server{
        // Read timeout prevents slow clients from holding connections
        ReadTimeout: 30 * time.Second,

        // Write timeout prevents slow writes from hanging
        WriteTimeout: 30 * time.Second,

        // Idle timeout for keep-alive connections
        IdleTimeout: 120 * time.Second,

        // Maximum header size to prevent memory attacks
        MaxHeaderBytes: 1 << 20, // 1 MB

        Handler: http.HandlerFunc(handler),
    }

    // Use a custom connection state callback for fine-grained control
    server.ConnState = func(conn net.Conn, state http.ConnState) {
        if state == http.StateNew {
            // Configure TCP options on new connections
            if tcpConn, ok := conn.(*net.TCPConn); ok {
                // Disable Nagle's algorithm
                tcpConn.SetNoDelay(true)

                // Enable keep-alive
                tcpConn.SetKeepAlive(true)
                tcpConn.SetKeepAlivePeriod(60 * time.Second)
            }
        }
    }

    server.Serve(listener)
}

func handler(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Hello World"))
}
```

## Network Interface Card Tuning

### Increase Ring Buffer Sizes

NIC ring buffers queue packets before they are processed by the kernel. Increase them for burst traffic:

```bash
# Check current ring buffer sizes
ethtool -g eth0

# Set ring buffer sizes (values depend on your NIC)
sudo ethtool -G eth0 rx 4096 tx 4096
```

### Enable Offloading Features

Modern NICs can offload work from the CPU:

```bash
# Check current offload settings
ethtool -k eth0

# Enable TCP segmentation offload
sudo ethtool -K eth0 tso on

# Enable generic receive offload
sudo ethtool -K eth0 gro on

# Enable large receive offload (use with caution in virtual environments)
sudo ethtool -K eth0 lro on

# Enable scatter-gather
sudo ethtool -K eth0 sg on
```

### IRQ Affinity

Distribute network interrupts across CPU cores:

```bash
# Check IRQ assignments for your network interface
cat /proc/interrupts | grep eth0

# Set IRQ affinity to distribute load across CPUs
# This example sets IRQ 42 to CPU 0-3
echo "f" > /proc/irq/42/smp_affinity
```

## Monitoring Network Performance

### Using ss for Connection Analysis

```bash
# Show all TCP connections with timer info
ss -tnpo

# Show listening sockets with process info
ss -tlnp

# Show socket memory usage
ss -m

# Show TCP internal info (congestion window, RTT, etc.)
ss -ti
```

### Using netstat for Statistics

```bash
# Show protocol statistics
netstat -s | head -50

# Show network interface statistics
netstat -i
```

### Quick Health Check Script

```bash
#!/bin/bash
# network_health.sh - Quick network stack health check

echo "=== Socket Buffer Sizes ==="
sysctl net.core.rmem_max net.core.wmem_max

echo ""
echo "=== TCP Buffer Sizes ==="
sysctl net.ipv4.tcp_rmem net.ipv4.tcp_wmem

echo ""
echo "=== Connection Limits ==="
sysctl net.core.somaxconn net.ipv4.tcp_max_syn_backlog

echo ""
echo "=== Congestion Control ==="
sysctl net.ipv4.tcp_congestion_control

echo ""
echo "=== Current Connections ==="
ss -s

echo ""
echo "=== TCP Retransmissions ==="
netstat -s | grep -i retransmit
```

## Summary

Network optimization is a layered effort. Start with kernel parameters that affect all applications, then tune application-level socket options for your specific workload, and finally optimize the hardware layer with NIC tuning.

| Layer | Key Optimizations |
|-------|-------------------|
| Kernel | Buffer sizes, connection backlog, TCP parameters, congestion control |
| Application | Socket options (NO_DELAY, keepalive), timeouts, backlog |
| Hardware | Ring buffers, offloading, IRQ affinity |

Always measure before and after tuning. Use tools like `iperf3` for bandwidth testing and `ss` for connection analysis. The right settings depend entirely on your workload, so test under realistic conditions.
