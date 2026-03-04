# How to Tune TCP Buffer Sizes and Socket Parameters on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Networking

Description: Step-by-step guide on tune tcp buffer sizes and socket parameters on rhel 9 with practical examples and commands.

---

TCP buffer tuning on RHEL 9 optimizes network throughput for high-bandwidth and high-latency connections.

## View Current Settings

```bash
sysctl net.core.rmem_max
sysctl net.core.wmem_max
sysctl net.ipv4.tcp_rmem
sysctl net.ipv4.tcp_wmem
```

## Increase Socket Buffer Sizes

```bash
sudo tee /etc/sysctl.d/99-tcp-buffers.conf <<EOF
# Maximum socket receive/send buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216

# Default socket receive/send buffer sizes
net.core.rmem_default = 1048576
net.core.wmem_default = 1048576

# TCP auto-tuning buffers (min, default, max)
net.ipv4.tcp_rmem = 4096 1048576 16777216
net.ipv4.tcp_wmem = 4096 1048576 16777216

# Network device backlog
net.core.netdev_max_backlog = 50000

# TCP window scaling
net.ipv4.tcp_window_scaling = 1
EOF

sudo sysctl -p /etc/sysctl.d/99-tcp-buffers.conf
```

## Calculate Optimal Buffer Size

The bandwidth-delay product (BDP) determines optimal buffer size:

```
BDP = Bandwidth (bytes/s) * RTT (seconds)

Example: 10 Gbps link with 10ms RTT
BDP = (10,000,000,000 / 8) * 0.010 = 12,500,000 bytes (~12 MB)
```

## Verify Tuning

```bash
# Test throughput
iperf3 -c remote-host -t 30 -w 16M

# Check actual window sizes
ss -tnei | head -20
```

## Conclusion

TCP buffer tuning on RHEL 9 is essential for high-bandwidth or high-latency networks. Calculate the bandwidth-delay product for your connections and set buffer sizes accordingly.

