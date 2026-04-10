# How to Tune Linux Kernel Parameters for Redis Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Linux, Kernel, Performance, Tuning

Description: Learn which Linux kernel parameters affect Redis performance and how to configure them to eliminate latency spikes and maximize throughput.

---

Redis runs on Linux in most production environments, and the kernel's default settings are not optimized for low-latency, high-throughput in-memory data stores. These tuning steps address the most common bottlenecks.

## Disable Transparent Huge Pages

THP causes `fork()` to stall during RDB saves, creating latency spikes:

```bash
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
```

Make permanent by adding to `/etc/rc.local` or creating a systemd override:

```bash
sudo tee /etc/systemd/system/disable-thp.service << 'EOF'
[Unit]
Description=Disable Transparent Huge Pages
DefaultDependencies=no
After=sysinit.target local-fs.target

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo never > /sys/kernel/mm/transparent_hugepage/enabled'
ExecStart=/bin/sh -c 'echo never > /sys/kernel/mm/transparent_hugepage/defrag'

[Install]
WantedBy=basic.target
EOF

sudo systemctl enable --now disable-thp.service
```

## Increase TCP Backlog

Redis suggests a large TCP backlog for high connection rates:

```bash
sysctl -w net.core.somaxconn=65535
sysctl -w net.ipv4.tcp_max_syn_backlog=65535
```

And in `redis.conf`:

```text
tcp-backlog 511
```

## Set vm.overcommit_memory

Redis fork for RDB fails if the kernel rejects memory overcommit:

```bash
sysctl -w vm.overcommit_memory=1
```

## Tune Network Buffer Sizes

For high-throughput deployments:

```bash
sysctl -w net.core.rmem_max=134217728
sysctl -w net.core.wmem_max=134217728
sysctl -w net.ipv4.tcp_rmem="4096 87380 134217728"
sysctl -w net.ipv4.tcp_wmem="4096 65536 134217728"
```

## Disable NUMA if Running on Multi-Socket Systems

NUMA (Non-Uniform Memory Access) can cause Redis to allocate memory from a remote NUMA node, increasing latency:

```bash
numactl --interleave=all redis-server /etc/redis/redis.conf
```

## Persist All Settings

Add all tuning parameters to `/etc/sysctl.conf`:

```text
net.core.somaxconn=65535
net.ipv4.tcp_max_syn_backlog=65535
vm.overcommit_memory=1
net.core.rmem_max=134217728
net.core.wmem_max=134217728
net.ipv4.tcp_rmem=4096 87380 134217728
net.ipv4.tcp_wmem=4096 65536 134217728
```

Apply without reboot:

```bash
sudo sysctl -p
```

## Verify Redis Startup Warnings

Redis itself warns about missing kernel settings at startup:

```bash
sudo journalctl -u redis --no-pager | grep "WARNING"
```

Common warnings and their fixes:

```text
WARNING: The TCP backlog setting of 511 cannot be enforced
  -> Fix: net.core.somaxconn=65535

WARNING overcommit_memory is set to 0
  -> Fix: vm.overcommit_memory=1

WARNING you have Transparent Huge Pages (THP) support enabled
  -> Fix: echo never > /sys/kernel/mm/transparent_hugepage/enabled
```

## Summary

Key Linux kernel tunings for Redis: disable Transparent Huge Pages to prevent fork latency spikes, set `vm.overcommit_memory=1` to allow RDB saves, increase TCP backlog to `65535`, and tune network buffer sizes for high throughput. Address all startup warnings in the Redis log - each one has a performance impact.
