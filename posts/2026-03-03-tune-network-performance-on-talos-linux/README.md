# How to Tune Network Performance on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Networking, Performance Tuning, TCP, Kubernetes

Description: Practical techniques for tuning network performance on Talos Linux including TCP settings, buffer sizes, and CNI optimization

---

Network performance is critical for Kubernetes clusters. Every API call, every service-to-service communication, and every external request travels through the network stack. On Talos Linux, the network configuration is managed entirely through the machine configuration API, which means tuning requires a deliberate, declarative approach. This guide covers the key network tuning parameters and strategies that will help you get the best possible network performance from your Talos Linux nodes.

## TCP Buffer Tuning

The default TCP buffer sizes in Linux are conservative. They are designed to work across a wide range of network conditions, but they leave performance on the table when you have a fast, low-latency network.

```yaml
# talos-machine-config.yaml
machine:
  sysctls:
    # TCP receive buffer: min, default, max (in bytes)
    net.ipv4.tcp_rmem: "4096 1048576 16777216"

    # TCP send buffer: min, default, max (in bytes)
    net.ipv4.tcp_wmem: "4096 1048576 16777216"

    # Global socket buffer limits
    net.core.rmem_max: "16777216"        # 16MB max receive buffer
    net.core.wmem_max: "16777216"        # 16MB max send buffer
    net.core.rmem_default: "1048576"     # 1MB default receive buffer
    net.core.wmem_default: "1048576"     # 1MB default send buffer

    # Total TCP memory (in pages, each page = 4KB)
    net.ipv4.tcp_mem: "786432 1048576 1572864"
```

The three values in `tcp_rmem` and `tcp_wmem` represent the minimum, default, and maximum buffer sizes. The kernel auto-tunes the buffer size within this range based on available memory and network conditions. Setting the maximum high allows connections over fast networks to use larger windows, which improves throughput.

## Connection Backlog and Queue Tuning

When many connections arrive simultaneously, the kernel queues them before they are accepted by the application. If these queues are too small, connections get dropped.

```yaml
# talos-machine-config.yaml
machine:
  sysctls:
    # Listen backlog size
    net.core.somaxconn: "65535"

    # Maximum packets queued on the input side
    net.core.netdev_max_backlog: "10000"

    # SYN queue size for half-open connections
    net.ipv4.tcp_max_syn_backlog: "65535"

    # Enable SYN cookies for SYN flood protection
    net.ipv4.tcp_syncookies: "1"

    # Maximum number of orphaned TCP connections
    net.ipv4.tcp_max_orphans: "262144"

    # Maximum number of TIME_WAIT connections
    net.ipv4.tcp_max_tw_buckets: "2000000"
```

The `somaxconn` value limits the backlog for each listening socket. Services that handle thousands of connections per second, like ingress controllers, need this set high. The `netdev_max_backlog` controls how many packets are queued when the kernel receives them faster than the application can process them.

## TCP Congestion Control

The congestion control algorithm determines how TCP responds to network congestion. The default is `cubic`, which works well for most scenarios, but `bbr` (Bottleneck Bandwidth and Round-trip propagation time) from Google performs significantly better on networks with high bandwidth and moderate latency.

```yaml
# talos-machine-config.yaml
machine:
  sysctls:
    # Use BBR congestion control
    net.ipv4.tcp_congestion_control: "bbr"

    # Use FQ (Fair Queueing) as the default queueing discipline
    net.core.default_qdisc: "fq"
```

BBR works by estimating the available bandwidth and the minimum RTT, then pacing packets to match. Unlike loss-based algorithms like cubic, BBR does not fill network buffers to capacity before backing off, resulting in lower latency and often higher throughput.

## Connection Reuse and Timeout Settings

Creating new TCP connections is expensive. Each connection requires a three-way handshake, and closing connections leaves them in TIME_WAIT state for 60 seconds by default. Tuning these settings reduces the overhead of connection management.

```yaml
# talos-machine-config.yaml
machine:
  sysctls:
    # Reuse TIME_WAIT connections for new outgoing connections
    net.ipv4.tcp_tw_reuse: "1"

    # Reduce FIN timeout from 60s to 30s
    net.ipv4.tcp_fin_timeout: "30"

    # Enable TCP keepalive
    net.ipv4.tcp_keepalive_time: "600"    # Start keepalive after 10 minutes
    net.ipv4.tcp_keepalive_intvl: "30"    # Send keepalive every 30 seconds
    net.ipv4.tcp_keepalive_probes: "5"    # Drop after 5 failed probes

    # Enable TCP Fast Open for both client and server
    net.ipv4.tcp_fastopen: "3"

    # Ephemeral port range
    net.ipv4.ip_local_port_range: "1024 65535"
```

The `ip_local_port_range` setting is often overlooked but critical for nodes running many outbound connections. The default range only provides about 28,000 ephemeral ports. Expanding it to the full range gives you over 64,000 ports, which prevents port exhaustion on busy nodes.

## Receive Packet Steering and Flow Control

On multi-core systems, network traffic processing can become a bottleneck if it is all handled by a single CPU core. Receive Packet Steering (RPS) and Receive Flow Steering (RFS) distribute incoming packets across multiple cores.

```yaml
# talos-machine-config.yaml
machine:
  sysctls:
    # Enable reverse path filtering (security)
    net.ipv4.conf.all.rp_filter: "1"

    # Enable IP forwarding (required for Kubernetes)
    net.ipv4.ip_forward: "1"
    net.ipv6.conf.all.forwarding: "1"
```

For RPS and RFS, you typically need to write to sysfs entries, which cannot be done through sysctls. On Talos, you can use a DaemonSet to set these:

```yaml
# rps-tuning-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: network-tuning
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: network-tuning
  template:
    metadata:
      labels:
        app: network-tuning
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: tuner
        image: busybox:latest
        securityContext:
          privileged: true
        command:
        - /bin/sh
        - -c
        - |
          # Enable RPS on all network interfaces
          for rx_queue in /sys/class/net/*/queues/rx-*/rps_cpus; do
            echo "ff" > "$rx_queue"  # Distribute across 8 cores
          done
          # Set RFS flow entries
          echo 32768 > /proc/sys/net/core/rps_sock_flow_entries
          for flow in /sys/class/net/*/queues/rx-*/rps_flow_cnt; do
            echo 4096 > "$flow"
          done
          sleep infinity
```

## CNI-Specific Optimizations

The Container Network Interface (CNI) plugin you use has a major impact on network performance. Cilium and Calico are the most common choices for Talos Linux.

For Cilium, enabling eBPF-based networking can significantly reduce overhead:

```yaml
# cilium-values.yaml
kubeProxyReplacement: true          # Replace kube-proxy with eBPF
enableIPv4Masquerade: true
bpf:
  masquerade: true
  hostRouting: true                  # Use BPF host routing
  tproxy: true
  lbExternalClusterIP: true
bandwidthManager:
  enabled: true                     # eBPF bandwidth manager
  bbr: true                         # Use BBR for pod traffic
```

For Calico, using eBPF dataplane provides similar benefits:

```yaml
# calico-config.yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  bpfEnabled: true                  # Enable eBPF dataplane
  bpfDisableUnprivileged: true
  bpfKubeProxyIptablesCleanupEnabled: true
```

## Jumbo Frames

If your network infrastructure supports it, enabling jumbo frames (MTU 9000) reduces the per-packet overhead significantly for large transfers:

```yaml
# talos-machine-config.yaml
machine:
  network:
    interfaces:
    - interface: eth0
      mtu: 9000                     # Enable jumbo frames
      addresses:
        - 10.0.0.1/24
```

Make sure every device in the network path supports the larger MTU, including switches, routers, and any virtual network infrastructure. A single device with a lower MTU will cause fragmentation and actually hurt performance.

## Measuring Network Performance

After applying your tuning, measure the results. Deploy iperf3 pods to test throughput between nodes:

```bash
# Run iperf3 server
kubectl run iperf-server --image=networkstatic/iperf3 -- -s

# Run iperf3 client
kubectl run iperf-client --image=networkstatic/iperf3 --rm -it -- \
  -c iperf-server -t 30 -P 4
```

Monitor network metrics through Prometheus. Key metrics to watch include packet drop rates, retransmission rates, and connection establishment times.

## Applying the Configuration

Apply your network tuning changes:

```bash
# Apply the machine configuration
talosctl apply-config --nodes 10.0.0.1 --file talos-machine-config.yaml

# Verify sysctl values
talosctl read /proc/sys/net/ipv4/tcp_congestion_control --nodes 10.0.0.1
talosctl read /proc/sys/net/core/somaxconn --nodes 10.0.0.1
```

Most network sysctl changes take effect immediately without a reboot. MTU changes may briefly disrupt existing connections.

## Conclusion

Network performance tuning on Talos Linux involves multiple layers: TCP stack parameters, connection management, congestion control, CNI configuration, and hardware-level settings like MTU. Start with the TCP buffer and congestion control changes, which provide the biggest bang for the least effort. Then move to CNI-specific optimizations and hardware tuning. Always measure before and after each change to verify improvement and catch any regressions.
