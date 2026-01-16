# How to Tune Docker Daemon for High-Performance Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Performance, Tuning, Optimization, Production

Description: Learn how to tune the Docker daemon for high-performance workloads, including storage drivers, logging, network optimization, and resource management.

---

Docker daemon configuration significantly impacts container performance, especially for high-throughput applications. This guide covers daemon tuning for optimal performance in production environments.

## Daemon Configuration Overview

```
Docker Daemon Components
┌─────────────────────────────────────────────────────────────┐
│                     Docker Daemon                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Storage   │  │  Network    │  │   Logging   │        │
│  │   Driver    │  │   Driver    │  │   Driver    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                │                 │
│         ▼                ▼                ▼                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Container Runtime (containerd)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Linux Kernel                        │   │
│  │  (cgroups, namespaces, networking, storage)         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Storage Driver Optimization

### Choose the Right Storage Driver

```json
// /etc/docker/daemon.json
{
  "storage-driver": "overlay2"
}
```

| Driver | Performance | Use Case |
|--------|-------------|----------|
| overlay2 | Best | Default for modern Linux |
| fuse-overlayfs | Good | Rootless Docker |
| btrfs | Good | Btrfs filesystems |
| zfs | Good | ZFS filesystems |
| vfs | Slow | Testing only |

### Overlay2 Optimizations

```json
{
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ]
}
```

### Dedicated Storage Partition

```bash
# Create separate partition for Docker
# /etc/fstab
/dev/sdb1  /var/lib/docker  xfs  defaults,noatime,nodiratime  0  2

# XFS with ftype=1 for overlay2
mkfs.xfs -n ftype=1 /dev/sdb1
```

### SSD Optimization

```bash
# Enable discard for SSD
# /etc/fstab
/dev/nvme0n1p1  /var/lib/docker  ext4  defaults,noatime,discard  0  2
```

## Logging Configuration

### Optimize Log Driver

```json
{
  "log-driver": "local",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3",
    "compress": "true"
  }
}
```

### Disable Logging for High-Throughput

```json
{
  "log-driver": "none"
}
```

### JSON File with Limits

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3",
    "mode": "non-blocking",
    "max-buffer-size": "4m"
  }
}
```

## Network Performance

### Use Host Network Mode

```yaml
# For maximum network performance
services:
  high-perf-app:
    network_mode: host
```

### Bridge Network Optimization

```json
{
  "bip": "172.17.0.1/16",
  "fixed-cidr": "172.17.0.0/16",
  "mtu": 9000
}
```

### Disable Userland Proxy

```json
{
  "userland-proxy": false
}
```

### DNS Configuration

```json
{
  "dns": ["8.8.8.8", "8.8.4.4"],
  "dns-search": ["example.com"],
  "dns-opts": ["ndots:1"]
}
```

## Resource Management

### Default Container Limits

```json
{
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65535,
      "Soft": 65535
    },
    "nproc": {
      "Name": "nproc",
      "Hard": 65535,
      "Soft": 65535
    },
    "memlock": {
      "Name": "memlock",
      "Hard": -1,
      "Soft": -1
    }
  }
}
```

### CPU and Memory Settings

```json
{
  "cpu-rt-runtime": 950000,
  "default-runtime": "runc",
  "default-shm-size": "128M"
}
```

### Cgroup Driver

```json
{
  "exec-opts": ["native.cgroupdriver=systemd"]
}
```

## Parallel Operations

### Concurrent Image Downloads

```json
{
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 10
}
```

### Build Parallelism

```bash
# Set BuildKit parallelism
export DOCKER_BUILDKIT=1
export BUILDKIT_STEP_LOG_MAX_SIZE=10485760
export BUILDKIT_STEP_LOG_MAX_SPEED=10485760
```

## Memory Optimization

### Live Restore

```json
{
  "live-restore": true
}
```

### Shutdown Timeout

```json
{
  "shutdown-timeout": 15
}
```

## Complete Production Configuration

```json
// /etc/docker/daemon.json
{
  "storage-driver": "overlay2",

  "log-driver": "local",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3",
    "compress": "true"
  },

  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 10,

  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65535,
      "Soft": 65535
    },
    "nproc": {
      "Name": "nproc",
      "Hard": 65535,
      "Soft": 65535
    }
  },

  "userland-proxy": false,
  "live-restore": true,
  "shutdown-timeout": 15,

  "dns": ["8.8.8.8", "8.8.4.4"],

  "metrics-addr": "0.0.0.0:9323",
  "experimental": true,

  "exec-opts": ["native.cgroupdriver=systemd"],

  "features": {
    "buildkit": true
  }
}
```

## Systemd Service Optimization

### Service Override

```ini
# /etc/systemd/system/docker.service.d/override.conf
[Service]
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
LimitMEMLOCK=infinity

# Increased startup timeout
TimeoutStartSec=300

# Restart policy
Restart=always
RestartSec=5

# Memory settings
MemoryLimit=infinity
```

```bash
# Apply changes
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### Socket Activation Tuning

```ini
# /etc/systemd/system/docker.socket.d/override.conf
[Socket]
ListenStream=/var/run/docker.sock
SocketMode=0660
SocketUser=root
SocketGroup=docker
```

## Kernel Parameters

### Sysctl Tuning

```bash
# /etc/sysctl.d/docker.conf

# Network tuning
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# Memory tuning
vm.max_map_count = 262144
vm.swappiness = 10
vm.overcommit_memory = 1

# File handles
fs.file-max = 2097152
fs.nr_open = 2097152
fs.inotify.max_user_instances = 8192
fs.inotify.max_user_watches = 524288

# Enable IP forwarding
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
```

```bash
# Apply settings
sudo sysctl -p /etc/sysctl.d/docker.conf
```

### Limits Configuration

```bash
# /etc/security/limits.conf
* soft nofile 65535
* hard nofile 65535
* soft nproc 65535
* hard nproc 65535
root soft nofile 65535
root hard nofile 65535
```

## Monitoring and Metrics

### Enable Prometheus Metrics

```json
{
  "metrics-addr": "0.0.0.0:9323"
}
```

### Verify Daemon Settings

```bash
# Check running configuration
docker info

# Check specific settings
docker info --format '{{.Driver}}'
docker info --format '{{.LoggingDriver}}'
docker info --format '{{json .Plugins}}'
```

## Benchmarking

### Storage Performance

```bash
# Test storage driver performance
docker run --rm \
  -v /var/lib/docker:/var/lib/docker \
  alpine \
  sh -c 'dd if=/dev/zero of=/tmp/test bs=1M count=1000 && rm /tmp/test'
```

### Network Performance

```bash
# Test network throughput
docker run --rm \
  --network host \
  networkstatic/iperf3 -c target-ip
```

## Troubleshooting Performance

### Check Daemon Logs

```bash
# View daemon logs
journalctl -u docker.service -f

# Check for slow operations
journalctl -u docker.service | grep -i "slow\|timeout\|error"
```

### Debug Mode

```json
{
  "debug": true
}
```

```bash
# Restart and check logs
sudo systemctl restart docker
journalctl -u docker.service -f
```

## Summary

| Setting | Impact | Default | Recommended |
|---------|--------|---------|-------------|
| storage-driver | High | overlay2 | overlay2 |
| log-driver | Medium | json-file | local |
| max-concurrent-downloads | Medium | 3 | 10 |
| userland-proxy | Medium | true | false |
| live-restore | Low | false | true |
| default-ulimits | High | system | 65535 |

Daemon tuning should be done incrementally with monitoring. Start with storage driver selection and logging configuration, then optimize network settings and resource limits based on workload requirements. For container-level resource management, see our post on [Limiting Docker Container CPU and Memory](https://oneuptime.com/blog/post/2026-01-13-docker-container-cpu-memory-limits/view).

