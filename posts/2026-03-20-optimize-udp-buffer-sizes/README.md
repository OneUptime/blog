# How to Optimize UDP Buffer Sizes for High-Volume UDP Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, Buffer, Linux, Sysctl, Performance, Network Tuning

Description: Learn how to tune UDP socket buffer sizes on Linux to prevent packet drops in high-volume UDP applications like DNS, syslog, VoIP, and streaming.

## Why UDP Buffer Sizes Matter

Unlike TCP, UDP has no flow control or retransmission. If the application cannot read datagrams fast enough from the receive buffer, packets are silently dropped. The kernel drops incoming UDP packets when the socket receive buffer is full.

This is a common cause of:
- DNS resolution timeouts (dig/nslookup failures)
- Syslog message loss
- VoIP packet loss
- Monitoring data gaps

## Step 1: Check Current UDP Buffer Settings

```bash
# System-wide maximum UDP socket buffer

sysctl net.core.rmem_max    # Maximum receive buffer
sysctl net.core.wmem_max    # Maximum send buffer

# Default buffer size for new sockets
sysctl net.core.rmem_default
sysctl net.core.wmem_default

# UDP-specific statistics
netstat -s -u | head -20

# Or with nstat
nstat UdpInErrors UdpRcvbufErrors UdpSndBufErrors
```

## Step 2: Check for UDP Receive Buffer Drops

```bash
# Check for UDP receive buffer overflow
netstat -s | grep "receive buffer errors"
# receive buffer errors: 15234  <- packets dropped due to full receive buffer

# Monitor with nstat
watch -n 1 "nstat UdpRcvbufErrors"

# Check per-socket buffer usage
ss -upe | grep udp
# Recv-Q shows bytes waiting in receive buffer
# If Recv-Q is consistently near the socket buffer size, increase it
```

## Step 3: Increase UDP Buffer Sizes System-Wide

```bash
cat > /etc/sysctl.d/99-udp-tuning.conf << 'EOF'
# Maximum socket receive/send buffer sizes
net.core.rmem_max = 134217728    # 128 MB
net.core.wmem_max = 134217728

# Default socket receive/send buffer for new sockets
net.core.rmem_default = 26214400  # 25 MB
net.core.wmem_default = 26214400

# Note: UDP sockets use rmem_default/wmem_default unless overridden
# by SO_RCVBUF/SO_SNDBUF socket options
EOF

sudo sysctl -p /etc/sysctl.d/99-udp-tuning.conf
```

## Step 4: Configure Application Socket Buffer Size

For applications you control, set large socket buffers programmatically:

```python
import socket

# Create a UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Set receive buffer to 64 MB
# Must be <= net.core.rmem_max
sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 64 * 1024 * 1024)

# Set send buffer to 64 MB
sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 64 * 1024 * 1024)

# Verify (Linux doubles the requested value internally for bookkeeping,
# so getsockopt typically returns 2x what was requested, capped at 2*rmem_max)
actual_rcvbuf = sock.getsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF)
print(f"Actual receive buffer: {actual_rcvbuf / 1048576:.1f} MB")
```

## Step 5: Configure High-Volume UDP Applications

**DNS resolver (unbound):**
```text
# /etc/unbound/unbound.conf
server:
    so-rcvbuf: 64m
    so-sndbuf: 64m
```

**syslog-ng:**
```text
# /etc/syslog-ng/syslog-ng.conf
source s_udp {
    udp(ip(0.0.0.0) port(514) so_rcvbuf(67108864));
};
```

**rsyslog:**
```text
# /etc/rsyslog.conf
module(load="imudp" TimeRequery="5")
input(type="imudp" port="514" rcvbufSize="67108864")
```

## Step 6: Tune for VoIP and Streaming

For real-time UDP (VoIP/RTP, gaming), latency matters more than throughput:

```bash
# Smaller buffers reduce queuing latency
# Large buffers increase bufferbloat for real-time traffic

# For VoIP/real-time: keep buffers small but ensure processing is fast
cat > /etc/sysctl.d/99-voip-udp.conf << 'EOF'
# Moderate buffers for real-time UDP
net.core.rmem_max = 26214400    # 25 MB (sufficient for VoIP bursts)
net.core.wmem_max = 26214400
net.core.rmem_default = 4194304 # 4 MB default
net.core.wmem_default = 4194304
EOF
```

## Step 7: Monitor UDP Performance

```bash
# Continuous monitoring of UDP drops
watch -n 1 "netstat -su 2>/dev/null | grep -E 'packets|error|overflow'"

# Count drops per second with sar
sar -n UDP 1 60

# Output columns: idgm/s (input datagrams/sec), odgm/s (output datagrams/sec),
# noport/s (datagrams to closed ports/sec), idgmerr/s (input datagram errors/sec)
#    idgm/s    odgm/s  noport/s idgmerr/s
#    45023.00  44900.00 0.00    125.00
# idgmerr/s > 0 = packets being dropped (often due to full receive buffer)

# Use ss to find large receive queues
ss -upe | awk '$2 > 1000 {print "LARGE QUEUE:", $0}'
```

## Conclusion

UDP packet loss due to buffer overflow is a common but silent problem. Monitor with `netstat -s | grep "receive buffer errors"` and increase buffers with `net.core.rmem_max` and `net.core.rmem_default`. For applications you control, use `SO_RCVBUF` to set per-socket limits up to the system maximum. For real-time UDP (VoIP), keep buffers moderate to avoid queuing latency while ensuring the application reads fast enough to drain the buffer.
