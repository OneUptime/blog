# How to Tune Network Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Network, Performance, Tuning, Linux, TCP

Description: Learn how to tune network performance on RHEL by adjusting kernel parameters, buffer sizes, and NIC settings.

---

Network performance tuning on RHEL involves adjusting kernel TCP/IP parameters, NIC settings, and buffer sizes. Proper tuning can improve throughput, reduce latency, and handle more concurrent connections.

## Prerequisites

- A RHEL system
- Root or sudo access

## Tuning TCP Buffer Sizes

Increase TCP buffer sizes for high-bandwidth connections:

```bash
# Maximum receive buffer
sudo sysctl -w net.core.rmem_max=16777216

# Maximum send buffer
sudo sysctl -w net.core.wmem_max=16777216

# TCP receive buffer (min, default, max)
sudo sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"

# TCP send buffer (min, default, max)
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"
```

## Tuning Connection Handling

Increase the connection backlog for busy servers:

```bash
# Maximum socket backlog
sudo sysctl -w net.core.somaxconn=65535

# Maximum SYN backlog
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65535

# Network device backlog
sudo sysctl -w net.core.netdev_max_backlog=5000
```

## Enabling TCP Optimizations

Enable TCP Fast Open for faster connection setup:

```bash
sudo sysctl -w net.ipv4.tcp_fastopen=3
```

Enable BBR congestion control:

```bash
sudo sysctl -w net.core.default_qdisc=fq
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr
```

Verify BBR is active:

```bash
sysctl net.ipv4.tcp_congestion_control
```

## Tuning TCP Keepalive

Adjust keepalive settings for long-lived connections:

```bash
# Time before sending keepalive probes (seconds)
sudo sysctl -w net.ipv4.tcp_keepalive_time=600

# Interval between probes
sudo sysctl -w net.ipv4.tcp_keepalive_intvl=60

# Number of probes before dropping connection
sudo sysctl -w net.ipv4.tcp_keepalive_probes=5
```

## Tuning Port Range

Increase the local port range for outbound connections:

```bash
sudo sysctl -w net.ipv4.ip_local_port_range="1024 65535"
```

Allow reuse of TIME_WAIT sockets:

```bash
sudo sysctl -w net.ipv4.tcp_tw_reuse=1
```

## Making Settings Persistent

Save all network tuning:

```bash
cat << 'SYSCTL' | sudo tee /etc/sysctl.d/network.conf
net.core.rmem_max=16777216
net.core.wmem_max=16777216
net.ipv4.tcp_rmem=4096 87380 16777216
net.ipv4.tcp_wmem=4096 65536 16777216
net.core.somaxconn=65535
net.ipv4.tcp_max_syn_backlog=65535
net.core.netdev_max_backlog=5000
net.ipv4.tcp_fastopen=3
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
net.ipv4.ip_local_port_range=1024 65535
net.ipv4.tcp_tw_reuse=1
SYSCTL
sudo sysctl -p /etc/sysctl.d/network.conf
```

## Tuning NIC Settings with ethtool

View current NIC settings:

```bash
ethtool eth0
```

Enable receive offloading:

```bash
sudo ethtool -K eth0 rx-checksumming on
sudo ethtool -K eth0 tx-checksumming on
sudo ethtool -K eth0 tso on
sudo ethtool -K eth0 gro on
```

Adjust ring buffer sizes:

```bash
# View current and maximum ring buffer sizes
ethtool -g eth0

# Increase ring buffers
sudo ethtool -G eth0 rx 4096 tx 4096
```

Enable multi-queue (RSS):

```bash
ethtool -l eth0
sudo ethtool -L eth0 combined 8
```

## Tuning Interrupt Coalescing

Reduce interrupt overhead:

```bash
sudo ethtool -C eth0 rx-usecs 50 tx-usecs 50
```

For latency-sensitive workloads, reduce coalescing:

```bash
sudo ethtool -C eth0 rx-usecs 0 tx-usecs 0
```

## Testing Network Performance

Install iperf3 for bandwidth testing:

```bash
sudo dnf install iperf3 -y

# Server side
iperf3 -s

# Client side
iperf3 -c server-ip -t 30 -P 4
```

## Conclusion

Network performance tuning on RHEL combines kernel parameter adjustments with NIC hardware optimization. Start with TCP buffer sizes and congestion control, then move to NIC-level tuning with ethtool. Always benchmark before and after changes to measure the impact.
