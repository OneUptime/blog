# How to Optimize TCP Congestion Control Algorithms on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, TCP, Congestion Control, BBR, Network Performance

Description: Learn how to view, change, and optimize TCP congestion control algorithms on RHEL for better network performance.

---

TCP congestion control algorithms determine how a sender adjusts its transmission rate in response to network conditions. RHEL supports multiple algorithms, and choosing the right one can significantly impact throughput.

## Checking Available Algorithms

```bash
# List available congestion control algorithms
sysctl net.ipv4.tcp_available_congestion_control

# Check the currently active algorithm
sysctl net.ipv4.tcp_congestion_control
```

## Common Algorithms

- **cubic**: Default on RHEL. Good for general-purpose use.
- **bbr**: Developed by Google. Excels on high-bandwidth, high-latency links.
- **reno**: The original TCP congestion control. Rarely optimal.

## Enabling BBR

BBR (Bottleneck Bandwidth and Round-trip propagation time) often provides better throughput than cubic, especially on long-distance or lossy links.

```bash
# Load the BBR kernel module
sudo modprobe tcp_bbr

# Verify it is available
sysctl net.ipv4.tcp_available_congestion_control

# Set BBR as the active algorithm
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr

# Verify the change
sysctl net.ipv4.tcp_congestion_control
```

## Making BBR Persistent

```bash
# Ensure the tcp_bbr module loads at boot
echo "tcp_bbr" | sudo tee /etc/modules-load.d/tcp_bbr.conf

# Set BBR permanently
cat << 'SYSCTL' | sudo tee /etc/sysctl.d/99-bbr.conf
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
SYSCTL

# Apply changes
sudo sysctl -p /etc/sysctl.d/99-bbr.conf
```

Note: BBR works best with the `fq` (fair queue) queueing discipline. Setting `net.core.default_qdisc = fq` is recommended when using BBR.

## Testing Different Algorithms

```bash
# Benchmark with cubic
sudo sysctl -w net.ipv4.tcp_congestion_control=cubic
iperf3 -c 192.168.1.100 -t 30

# Benchmark with BBR
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr
iperf3 -c 192.168.1.100 -t 30
```

## Per-Connection Algorithm Selection

Applications can set the congestion control algorithm per socket using the `TCP_CONGESTION` socket option:

```python
import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
# Set BBR for this specific connection
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_CONGESTION, b'bbr')
```

BBR is generally recommended for wide-area network connections and cloud environments. For local data center traffic with low latency, cubic usually performs well enough.
