# How to Use Redis with DPDK for Network Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, DPDK, Network

Description: Learn how DPDK bypasses the Linux kernel network stack to reduce Redis network latency, and how to integrate Redis with DPDK-accelerated environments for extreme throughput.

---

DPDK (Data Plane Development Kit) is a set of libraries that bypass the Linux kernel network stack, delivering packets directly to user-space applications. Combined with Redis, DPDK can reduce network latency from hundreds of microseconds to under 10 microseconds for ultra-high-throughput use cases.

## Why DPDK for Redis

The Linux kernel network stack adds overhead at each layer: socket buffers, interrupt handling, context switches. For most applications this is fine, but at 10M+ ops/sec with microsecond SLA requirements, kernel bypass is necessary.

Without DPDK:
```text
NIC -> Kernel -> Socket Buffer -> redis-server -> Response
Latency: 50-200 microseconds
```

With DPDK:
```text
NIC -> DPDK Poll Mode Driver -> User-space App -> Redis
Latency: 2-20 microseconds
```

## System Requirements

```bash
# Check DPDK-compatible NICs
lspci | grep -i ethernet

# Check Hugepage support
grep -i hugepage /proc/meminfo

# Enable hugepages (required for DPDK)
echo 1024 | sudo tee /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages
```

## Install DPDK

```bash
sudo apt update && sudo apt install -y dpdk dpdk-dev libdpdk-dev

# Check DPDK version
pkg-config --modversion libdpdk
```

## Bind NIC to DPDK Driver (vfio-pci)

```bash
# Load vfio-pci module
sudo modprobe vfio-pci

# Find NIC PCI address
dpdk-devbind.py --status

# Unbind from kernel driver
sudo dpdk-devbind.py --unbind 0000:02:00.0

# Bind to vfio-pci
sudo dpdk-devbind.py --bind vfio-pci 0000:02:00.0

# Verify
dpdk-devbind.py --status | grep vfio
```

## Redis with DPDK via VPP

VPP (Vector Packet Processing) is a DPDK-based framework that exposes a host stack (host-stack) with a POSIX socket API. Redis runs unmodified on top of VPP.

```bash
# Install VPP
sudo apt install vpp vpp-plugin-core

# Configure VPP for Redis
cat <<EOF > /etc/vpp/startup.conf
unix {
  nodaemon
  log /var/log/vpp/vpp.log
  cli-listen /run/vpp/cli.sock
}
dpdk {
  dev 0000:02:00.0
}
EOF

sudo systemctl start vpp
```

```bash
# In VPP CLI
sudo vppctl
> set int state GigabitEthernetb/0/0 up
> set int ip address GigabitEthernetb/0/0 10.0.0.1/24
> session enable
> app ns add id redis secret 1234 sw_if_index 1
```

## Benchmark Without DPDK

```bash
redis-benchmark -h 127.0.0.1 -p 6379 -q -n 1000000 -c 200 -P 16
```

## Monitor Network Performance

```bash
# Interrupts per second (kernel path)
cat /proc/interrupts | grep eth0

# With DPDK - no interrupts (poll mode)
# Use DPDK stats
dpdk-testpmd> show port stats all
```

## Alternative: Redis Multi-threaded I/O

If DPDK is too complex, Redis's built-in multi-threaded I/O (available since Redis 6.0) provides a middle ground by offloading network read/write operations to dedicated threads:

```bash
# redis.conf
io-threads 4
io-threads-do-reads yes
```

## When to Use DPDK with Redis

DPDK is worth the operational complexity only when:
- Throughput exceeds 5M ops/sec
- p99 latency must be under 50 microseconds
- You have dedicated hardware and networking team support

For most workloads, tuning the kernel TCP stack and disabling THP achieves sufficient latency improvement without DPDK complexity.

## Summary

DPDK eliminates kernel network overhead by polling the NIC directly from user-space, reducing Redis latency to single-digit microseconds at extreme throughput. Redis runs on DPDK via a host stack like VPP that provides a standard socket API. For most production deployments, kernel TCP tuning achieves sub-millisecond latency without the operational burden of DPDK.
