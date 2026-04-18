# How to Tune net.ipv4.tcp_rmem and net.ipv4.tcp_wmem for Optimal Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Sysctl, Performance, Linux, Tcp_rmem, Tcp_wmem, Network Tuning

Description: Learn how to correctly configure net.ipv4.tcp_rmem and net.ipv4.tcp_wmem for different network scenarios, balancing throughput against memory usage.

## Understanding tcp_rmem and tcp_wmem

Both parameters have three values: `min default max`

```text
net.ipv4.tcp_rmem = 4096 87380 6291456
                    ^^^^  ^^^^^  ^^^^^^^
                    min   default  max
```

| Value | Description |
|---|---|
| min | Minimum buffer allocated per socket under memory pressure |
| default | Initial buffer size for new connections (before auto-tuning) |
| max | Maximum size for auto-tuned buffers per socket (does not override `net.core.rmem_max`, which caps `setsockopt(SO_RCVBUF)`) |

TCP auto-tuning grows the buffer from `default` toward `max` as needed.

## Step 1: Check Current Values

```bash
# View current TCP buffer settings

sysctl net.ipv4.tcp_rmem
sysctl net.ipv4.tcp_wmem

# Check overall socket buffer limits
sysctl net.core.rmem_max
sysctl net.core.wmem_max

# Check if auto-tuning is enabled
sysctl net.ipv4.tcp_moderate_rcvbuf
```

## Step 2: Configuration for Different Scenarios

### Scenario A: LAN / Low-Latency (< 1ms RTT)

For local network communication, large buffers waste memory:

```bash
cat > /etc/sysctl.d/99-tcp-lan.conf << 'EOF'
# LAN tuning - low latency, moderate buffers
net.core.rmem_max = 16777216    # 16 MB
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
EOF
```

### Scenario B: WAN / Long-Distance (10-100ms RTT)

For high-latency WAN links, larger buffers are needed:

```bash
cat > /etc/sysctl.d/99-tcp-wan.conf << 'EOF'
# WAN tuning - high latency, large buffers
net.core.rmem_max = 134217728    # 128 MB
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 1048576 134217728
net.ipv4.tcp_wmem = 4096 1048576 134217728
EOF
```

### Scenario C: High-Throughput Server (10G+)

For servers handling many high-bandwidth connections:

```bash
cat > /etc/sysctl.d/99-tcp-highbw.conf << 'EOF'
# High-bandwidth server tuning
net.core.rmem_max = 268435456    # 256 MB
net.core.wmem_max = 268435456
# tcp_rmem: min=4KB default=64MB max=256MB
net.ipv4.tcp_rmem = 4096 67108864 268435456
net.ipv4.tcp_wmem = 4096 67108864 268435456
net.ipv4.tcp_moderate_rcvbuf = 1   # Enable auto-tuning
EOF
```

## Step 3: Setting the Default Value

The `default` value determines the initial buffer for **every** new connection. Setting it too high wastes memory on servers with thousands of connections:

```bash
# For a server handling 10,000 concurrent connections:
# Memory = connections × default buffer size × 2 (read + write)
# At default=64MB: 10,000 × 64MB × 2 = 1.28 TB (too much!)
# At default=128KB: 10,000 × 128KB × 2 = 2.56 GB (reasonable)

# Set default to 128 KB, max to 128 MB
net.ipv4.tcp_rmem = 4096 131072 134217728
```

TCP auto-tuning will grow buffers beyond `default` for connections that need more.

## Step 4: Apply and Verify

```bash
# Apply settings
sudo sysctl -p /etc/sysctl.d/99-tcp-*.conf

# Verify applied values
sysctl net.ipv4.tcp_rmem net.ipv4.tcp_wmem

# Check per-socket buffer usage
ss -men | head -20
# Look for:
# rcvbuf=X sndbuf=Y
# X and Y show current buffer sizes for each socket
```

## Step 5: Monitor Buffer Utilization

Check if buffers are being fully utilized (indicates need for larger max):

```bash
# Show TCP memory usage
cat /proc/net/sockstat

# Output:
# TCP: inuse 150 orphan 0 tw 50 alloc 200 mem 50000
#                                              ^^^^
# mem = pages of memory used by TCP sockets

# Check extended TCP statistics (pruned, collapsed, etc.)
cat /proc/net/netstat | grep -i tcp

# Also useful:
ss -s   # Summary statistics
```

## Step 6: Benchmark Before and After

```bash
# Baseline throughput measurement
iperf3 -c server-ip -t 30 -P 4 | tail -5

# Apply new settings
sudo sysctl -p /etc/sysctl.d/99-tcp-highbw.conf

# Re-test
iperf3 -c server-ip -t 30 -P 4 | tail -5
# Compare sender and receiver throughput
```

## Conclusion

`tcp_rmem` and `tcp_wmem` control the per-socket buffer size range for TCP. Set the `min` value conservatively (4096), the `default` based on expected concurrent connections and typical message sizes, and the `max` based on the Bandwidth-Delay Product of your longest/fastest connections. Always enable TCP auto-tuning (`tcp_moderate_rcvbuf=1`) to let the kernel grow buffers only where needed.
