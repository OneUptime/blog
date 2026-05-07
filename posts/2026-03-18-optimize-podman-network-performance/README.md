# How to Optimize Podman Network Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Networking, Performance, DevOps, Container, DNS, Linux, CNI

Description: A comprehensive guide to optimizing Podman container network performance, covering network modes, DNS configuration, MTU tuning, and advanced networking techniques.

---

> Network performance is often the invisible bottleneck in containerized applications. The difference between default networking and optimized networking can be a substantial improvement in throughput and latency.

Podman supports multiple network modes, each with different performance characteristics. The default rootful bridge networking adds overhead from network address translation and virtual bridge processing. For performance-critical applications, understanding and tuning network configuration is essential. This guide covers common Podman network optimization techniques, from simple mode selection to advanced kernel tuning.

---

## Understanding Podman Network Modes

Podman offers several network modes with different performance trade-offs:

| Mode | Throughput | Latency | Isolation | Use Case |
|------|-----------|---------|-----------|----------|
| host | Native | Native | None | Maximum performance |
| bridge | ~90% native | +0.1-1ms | Full | Default, most apps |
| slirp4netns | ~50-70% | +1-5ms | Full | Rootless fallback |
| pasta | ~80-90% | +0.1-0.5ms | Full | Rootless recommended |
| none | N/A | N/A | Complete | No networking needed |

Check your current network configuration:

```bash
# List available networks

podman network ls

# Inspect default network
podman network inspect podman

# Check which network mode a container uses
podman inspect --format '{{.HostConfig.NetworkMode}}' my-container
```

---

## Use Host Networking for Maximum Performance

Host networking eliminates all virtual networking overhead. The container shares the host's network stack directly:

```bash
# Run with host networking
podman run --network=host your-image

# Benchmark: Compare bridge vs host
# Bridge mode
podman run --rm -it --network=bridge nicolaka/netshoot \
  iperf3 -c target-host -t 10

# Host mode
podman run --rm -it --network=host nicolaka/netshoot \
  iperf3 -c target-host -t 10
```

Host networking is ideal for:
- High-throughput data processing
- Low-latency APIs
- Network monitoring tools
- Applications that need to bind to many ports

The trade-off is that containers share the host's network namespace, so port conflicts are possible and there is no network isolation between containers.

---

## Optimize Bridge Networking

If you need network isolation, optimize the bridge network:

```bash
# Create an optimized bridge network
podman network create \
  --driver bridge \
  --opt mtu=9000 \
  --subnet 10.90.0.0/16 \
  fast-bridge

# Run containers on the optimized network
podman run --network=fast-bridge your-image
```

Tune the bridge network configuration:

```bash
# Increase the network MTU for internal traffic
podman network create --opt mtu=9000 jumbo-net

# Use a larger subnet to avoid IP exhaustion
podman network create --subnet 10.100.0.0/16 large-net
```

---

## Switch from slirp4netns to pasta

For rootless Podman, the default network mode can be `slirp4netns` on older installations or custom configurations, which is slower. Switch to `pasta` for significantly better performance:

```bash
# Check current rootless network mode
podman info --format '{{.Host.Pasta.Executable}}'

# Run with pasta explicitly
podman run --network=pasta your-image

# Configure pasta as default in containers.conf
# ~/.config/containers/containers.conf
```

```toml
# ~/.config/containers/containers.conf
[network]
# Use pasta instead of slirp4netns for rootless
default_rootless_network_cmd = "pasta"
```

Benchmark the difference:

```bash
# Test with slirp4netns
podman run --rm --network=slirp4netns nicolaka/netshoot \
  iperf3 -c host-ip -t 10

# Test with pasta
podman run --rm --network=pasta nicolaka/netshoot \
  iperf3 -c host-ip -t 10
```

---

## Optimize DNS Resolution

DNS lookups inside containers can add latency to every outbound connection. Optimize DNS configuration:

```bash
# Use specific DNS servers instead of container DNS resolver
podman run --dns=8.8.8.8 --dns=1.1.1.1 your-image

# Disable DNS search domains to speed up resolution
podman run --dns-search=. your-image

# Use host DNS resolution directly
podman run --network=host your-image
```

For applications making many DNS queries, run a local DNS cache:

```bash
# Run dnsmasq as a caching DNS resolver
podman network create --subnet 10.91.0.0/24 dns-net

podman run -d --name dns-cache \
  --network dns-net \
  --ip 10.91.0.53 \
  --cap-add NET_ADMIN \
  drpsychick/dnsmasq:latest \
  --cache-size=10000 \
  --no-negcache

# Point containers at the cache
podman run --network dns-net --dns=10.91.0.53 your-image
```

---

## Tune MTU Settings

Mismatched MTU settings cause fragmentation and reduce throughput. Set the MTU appropriately for your network:

```bash
# Check host MTU
ip link show | grep mtu

# Create a network with matching MTU
# For standard Ethernet
podman network create --opt mtu=1500 standard-net

# For jumbo frames on internal networks
podman network create --opt mtu=9000 jumbo-net

# For overlay/VPN environments (account for encapsulation overhead)
podman network create --opt mtu=1400 overlay-net
```

Verify MTU inside the container:

```bash
podman run --rm --network=jumbo-net nicolaka/netshoot \
  ip link show eth0
```

---

## Use Pods for Shared Networking

Containers in the same pod share a network namespace, eliminating inter-container network overhead:

```bash
# Create a pod - all containers share the network
podman pod create --name my-app -p 8080:8080 -p 5432:5432

# Web server and database communicate via localhost
podman run -d --pod my-app --name web your-web-app
podman run -d --pod my-app --name db postgres:16

# Inside web container, access db at localhost:5432
# No bridge traversal, no NAT, localhost-speed communication
```

This is ideal for sidecar patterns where services need to communicate frequently:

```bash
# App + reverse proxy + log collector in one pod
podman pod create --name full-app -p 80:80

podman run -d --pod full-app --name proxy nginx:alpine
podman run -d --pod full-app --name app your-app:latest
podman run -d --pod full-app --name logs fluent-bit:latest
```

---

## Optimize TCP Settings

Tune TCP parameters for containerized workloads:

```bash
# Run container with custom sysctl settings
podman run --sysctl net.core.somaxconn=65535 \
  --sysctl net.ipv4.tcp_max_syn_backlog=65535 \
  --sysctl net.core.netdev_max_backlog=65535 \
  your-image

# For high-throughput applications
podman run \
  --sysctl net.core.rmem_max=16777216 \
  --sysctl net.core.wmem_max=16777216 \
  --sysctl net.ipv4.tcp_rmem="4096 87380 16777216" \
  --sysctl net.ipv4.tcp_wmem="4096 87380 16777216" \
  your-image
```

For high-connection-rate applications:

```bash
# Enable TCP fast open and reuse
podman run \
  --sysctl net.ipv4.tcp_fastopen=3 \
  --sysctl net.ipv4.tcp_tw_reuse=1 \
  --sysctl net.core.somaxconn=65535 \
  your-image
```

---

## Port Publishing Optimization

How you publish ports affects performance:

```bash
# Standard bridge port publish uses firewall/NAT rules
podman run -p 8080:8080 your-image

# Bind to specific interface to avoid unnecessary routing
podman run -p 127.0.0.1:8080:8080 your-image

# Use host networking to avoid port publishing overhead entirely
podman run --network=host your-image

# For UDP workloads, specify the protocol
podman run -p 5000:5000/udp your-image
```

---

## Network Performance Benchmarking

Create a comprehensive benchmark script:

```bash
#!/bin/bash
# network-benchmark.sh - Compare network modes

TARGET_HOST=${1:-"localhost"}
IMAGE="nicolaka/netshoot"

echo "=== Podman Network Performance Benchmark ==="
echo "Target: $TARGET_HOST"
echo ""

# Start iperf3 server on target
echo "Ensure iperf3 server is running: iperf3 -s"
echo ""

# Test each network mode
for MODE in host bridge pasta; do
  echo "--- Mode: $MODE ---"

  # Throughput test
  echo "Throughput (TCP):"
  podman run --rm --network=$MODE $IMAGE \
    iperf3 -c $TARGET_HOST -t 5 -f m 2>/dev/null | grep "sender"

  # Latency test
  echo "Latency:"
  podman run --rm --network=$MODE $IMAGE \
    ping -c 10 -q $TARGET_HOST 2>/dev/null | grep "rtt"

  echo ""
done
```

---

## Monitor Network Performance

Set up continuous network monitoring:

```bash
# Watch network I/O per container
watch -n 2 'podman stats --no-stream --format \
  "table {{.Name}}\t{{.NetIO}}"'

# Track connection counts per container
CPID=$(podman inspect --format '{{.State.Pid}}' my-container)
sudo nsenter -t $CPID -n ss -s

# Monitor for dropped packets
CPID=$(podman inspect --format '{{.State.Pid}}' my-container)
sudo nsenter -t $CPID -n ip -s link show eth0 | grep -E "dropped|errors"
```

---

## Conclusion

Network performance optimization in Podman ranges from simple mode selection to deep kernel parameter tuning. For maximum performance, use host networking. For rootless deployments still using slirp4netns, switch to pasta. Use pods for inter-container communication to avoid bridge overhead. Tune MTU, DNS, and TCP parameters for your workload profile. Always benchmark before and after changes to quantify improvements. The right network configuration can reduce the network overhead that containerization introduces, giving you near-native performance where isolation requirements allow it.
