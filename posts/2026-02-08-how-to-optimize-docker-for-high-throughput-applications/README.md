# How to Optimize Docker for High-Throughput Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Performance, High Throughput, Networking, Linux, Optimization, DevOps

Description: Learn how to tune Docker networking, storage, and kernel parameters to handle high-throughput workloads with minimal overhead and maximum performance.

---

Docker adds a thin layer between your application and the host. For most workloads, this overhead is negligible. But when you push throughput to tens of thousands of requests per second, every microsecond in the network stack and every context switch in the I/O path adds up. This guide covers the specific tuning steps that make Docker work for high-throughput applications like message brokers, API gateways, load balancers, and streaming services.

## Networking: The Biggest Bottleneck

Docker's default bridge network introduces overhead from iptables NAT rules, veth pair traversal, and userspace proxy. For high-throughput applications, this overhead is the first thing to address.

### Use Host Networking

Host networking eliminates the virtual network stack entirely. The container shares the host's network namespace, so packets go straight to the application without NAT or bridge traversal.

```bash
# Run with host networking - no network namespace overhead
docker run -d --network host --name fast-proxy nginx:latest
```

The tradeoff is isolation. Containers sharing the host network can see all host interfaces and ports. Use this for dedicated application servers, not for multi-tenant environments.

### Tune the Bridge Network If Host Networking Is Not an Option

If you need bridge networking, optimize the network driver and disable the userspace proxy:

```json
{
  "userland-proxy": false,
  "iptables": true,
  "ip-forward": true
}
```

The userland proxy is a Go process that handles port forwarding. Disabling it forces Docker to use iptables rules directly, which the kernel handles much more efficiently.

### Increase the Connection Tracking Table

High-throughput applications open many connections. The default conntrack table is often too small:

```bash
# Check current conntrack limits
cat /proc/sys/net/netfilter/nf_conntrack_max
# Default is often 65536

# Increase for high-throughput workloads
echo 262144 | sudo tee /proc/sys/net/netfilter/nf_conntrack_max
echo "net.netfilter.nf_conntrack_max = 262144" | sudo tee -a /etc/sysctl.d/docker-tuning.conf

# Reduce conntrack timeout for faster table cleanup
echo 60 | sudo tee /proc/sys/net/netfilter/nf_conntrack_tcp_timeout_time_wait
echo "net.netfilter.nf_conntrack_tcp_timeout_time_wait = 60" | sudo tee -a /etc/sysctl.d/docker-tuning.conf

sudo sysctl -p /etc/sysctl.d/docker-tuning.conf
```

### Tune TCP Parameters

Optimize the TCP stack for high connection rates:

```bash
# /etc/sysctl.d/docker-tuning.conf
# Increase the maximum number of connections
net.core.somaxconn = 65535

# Increase the backlog for incoming connections
net.core.netdev_max_backlog = 65535

# Enable TCP fast open
net.ipv4.tcp_fastopen = 3

# Increase the range of local ports
net.ipv4.ip_local_port_range = 1024 65535

# Reuse TIME_WAIT sockets for new connections
net.ipv4.tcp_tw_reuse = 1

# Increase TCP buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 87380 16777216
```

```bash
# Apply all settings
sudo sysctl -p /etc/sysctl.d/docker-tuning.conf
```

## CPU Optimization

### Disable CPU Throttling

Docker's default CPU CFS (Completely Fair Scheduler) bandwidth control can throttle containers even when the host has spare CPU capacity:

```bash
# Run without CPU throttling
docker run -d --cpu-period=0 --name fast-app myapp:latest

# Or set generous limits that accommodate burst traffic
docker run -d --cpus=4.0 --cpu-shares=2048 --name fast-app myapp:latest
```

### Pin to Specific CPUs

For latency-sensitive, high-throughput applications, pin the container to specific CPU cores to avoid cache thrashing:

```bash
# Pin to CPU cores 0-3 for the application
docker run -d --cpuset-cpus="0-3" --name fast-app myapp:latest

# Pin interrupts for the network card to different cores (4-5)
# This prevents network interrupts from preempting application threads
sudo sh -c 'echo 4 > /proc/irq/$(cat /proc/interrupts | grep eth0 | head -1 | awk -F: "{print \$1}" | tr -d " ")/smp_affinity_list'
```

### NUMA-Aware Container Placement

On multi-socket servers, ensure containers run on the same NUMA node as their allocated memory:

```bash
# Pin to CPU cores and memory on NUMA node 0
docker run -d \
  --cpuset-cpus="0-7" \
  --cpuset-mems="0" \
  --name fast-app myapp:latest
```

## Storage Optimization

### Use tmpfs for Ephemeral Data

High-throughput applications often write temporary data (logs, caches, session files). Keep this data in RAM:

```bash
# Mount tmpfs for temporary directories
docker run -d \
  --tmpfs /tmp:size=1G,noexec,nosuid \
  --tmpfs /var/log:size=512M \
  --name fast-app myapp:latest
```

### Use Direct I/O for Data Paths

For applications that manage their own caching (databases, message queues), bypass the page cache with O_DIRECT. This requires a volume mount, not overlay2:

```bash
# Use a volume for the data directory
docker run -d \
  -v /data/kafka:/var/lib/kafka/data \
  --name kafka bitnami/kafka:latest
```

### Increase File Descriptor Limits

High-throughput servers need many file descriptors for connections and files:

```bash
# Set high ulimits for file descriptors and processes
docker run -d \
  --ulimit nofile=65536:65536 \
  --ulimit nproc=4096:4096 \
  --name fast-app myapp:latest
```

Or set defaults in the daemon configuration:

```json
{
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    },
    "nproc": {
      "Name": "nproc",
      "Hard": 4096,
      "Soft": 4096
    }
  }
}
```

## Memory Optimization

### Disable Memory Swapping

Swapping kills throughput. Disable it for high-performance containers:

```bash
# Disable swap for the container
docker run -d \
  --memory=8g \
  --memory-swap=8g \
  --memory-swappiness=0 \
  --name fast-app myapp:latest
```

Setting `--memory-swap` equal to `--memory` disables swap for that container. Setting `--memory-swappiness=0` tells the kernel to avoid swapping as much as possible.

### Lock Memory Pages

For applications that benefit from locked memory (low-latency message queues, real-time processing):

```bash
# Allow the container to lock memory pages
docker run -d \
  --cap-add IPC_LOCK \
  --ulimit memlock=-1:-1 \
  --name fast-app myapp:latest
```

## Docker Compose for High-Throughput Stack

Here is a complete Docker Compose file for a high-throughput API stack:

```yaml
# docker-compose.yml - high-throughput configuration
services:
  api:
    image: ghcr.io/your-org/api:latest
    network_mode: host
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
      nproc:
        soft: 4096
        hard: 4096
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
          cpus: "2.0"
    tmpfs:
      - /tmp:size=512M,noexec,nosuid
    sysctls:
      - net.core.somaxconn=65535
    read_only: true

  redis:
    image: redis:7-alpine
    network_mode: host
    command: >
      redis-server
      --maxmemory 2gb
      --maxmemory-policy allkeys-lru
      --tcp-backlog 511
      --save ""
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    deploy:
      resources:
        limits:
          memory: 3G
    volumes:
      - redis-data:/data
    sysctls:
      - net.core.somaxconn=65535

volumes:
  redis-data:
```

## Benchmarking Your Tuning

Verify the impact of each change with benchmarks:

```bash
# HTTP throughput benchmark with wrk
docker run --rm --network host williamyeh/wrk \
  -t 8 -c 256 -d 30s http://localhost:8080/api/health

# TCP connection rate with tcpkali
docker run --rm --network host lpicanco/tcpkali \
  -c 1000 --connect-rate 10000 -T 30s localhost:8080

# Compare before and after each tuning change
# Run the benchmark, apply one change, run again
```

## Monitoring Under Load

Track these metrics to verify your tuning is working:

```bash
# Monitor network connections
ss -s

# Watch conntrack table usage
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max

# Monitor container resource usage in real-time
docker stats --no-stream

# Check for dropped packets
cat /proc/net/softnet_stat
```

## Wrapping Up

High-throughput Docker tuning focuses on three areas: reducing network overhead (host networking, conntrack tuning, TCP parameters), optimizing CPU usage (pinning, NUMA awareness, disabling throttling), and managing memory and storage (tmpfs, no swap, high file descriptor limits). Apply changes one at a time and benchmark after each change to understand the impact. Not every optimization helps every workload, so measure rather than assume.
