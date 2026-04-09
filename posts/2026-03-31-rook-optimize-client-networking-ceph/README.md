# How to Optimize Client Networking for Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Network, Performance, Client, Storage

Description: Tune client-side network settings for Ceph including socket buffers, TCP parameters, and network interface configuration to maximize throughput.

---

Ceph client performance is heavily dependent on network throughput and latency. Optimizing network settings on client nodes can dramatically improve I/O performance, especially for high-throughput workloads.

## Use a Dedicated Storage Network

The most impactful change is using a dedicated storage network that separates Ceph traffic from other application traffic. Configure this in `ceph.conf`:

```ini
[global]
public_network = 192.168.1.0/24    # client-facing network
cluster_network = 10.0.0.0/24     # OSD replication network
```

Clients connect via the `public_network` interface only.

## Increase Socket Buffer Sizes

Ceph relies on large socket buffers for high throughput. Increase kernel limits:

```bash
# Set in /etc/sysctl.conf
cat >> /etc/sysctl.conf <<EOF
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.core.rmem_default = 67108864
net.core.wmem_default = 67108864
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 30000
EOF

sysctl -p
```

## Tune Ceph Messenger Settings

In `ceph.conf` on the client:

```ini
[client]
ms_dispatch_throttle_bytes = 1073741824
ms_tcp_nodelay = true
ms_tcp_rcvbuf = 0           # 0 = use system default (set above)
ms_async_op_threads = 3
```

## Enable Jumbo Frames

If your network supports it, enable jumbo frames (MTU 9000) for significantly higher throughput:

```bash
# On the client interface
ip link set eth1 mtu 9000

# Make persistent using NetworkManager (RHEL 8+, Ubuntu 18.04+)
nmcli connection modify eth1 ethernet.mtu 9000
nmcli connection up eth1
```

Ensure all switches, routers, and OSD nodes also support MTU 9000.

## Tune NIC Queues

Increase the number of receive queues on the NIC:

```bash
# Check current queues
ethtool -l eth1

# Set to maximum
ethtool -L eth1 combined 8

# Set IRQ affinity for NIC queues
apt install -y irqbalance
systemctl enable --now irqbalance
```

## Use RDMA if Available

For latency-sensitive workloads, Ceph supports RDMA (RoCE or InfiniBand) via the Async+RDMA messenger. Note that this transport is **experimental** and not production-supported by major vendors such as Red Hat. Ensure your Ceph build was compiled with RDMA support (`HAVE_RDMA`) before enabling it:

```ini
[client]
ms_type = async+rdma
ms_async_rdma_device_name = mlx5_0
```

## Monitor Network Performance

```bash
# Watch network throughput during I/O
sar -n DEV 1 10

# Check TCP retransmits (indicates packet loss)
ss -s | grep retrans

# Measure raw network speed between client and OSD node
iperf3 -c osd-node1 -P 4 -t 30
```

## Summary

Optimizing Ceph client networking involves using a dedicated storage VLAN, increasing kernel socket buffers, enabling TCP no-delay, configuring jumbo frames, and tuning NIC queues. The highest-impact change is typically the socket buffer increase combined with dedicated network interfaces, which can double throughput on 10 GbE and 25 GbE networks.
