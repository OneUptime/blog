# How to Configure kube-proxy in IPVS Mode for IPv4 Service Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kube-proxy, IPVS, IPv4, Service Routing, Performance

Description: Switch kube-proxy from iptables to IPVS mode for improved IPv4 service routing performance in large Kubernetes clusters with many services.

IPVS (IP Virtual Server) mode uses the kernel IPVS and iptables APIs rather than only iptables chains. It uses a hash table for service lookups, supports more load balancing algorithms, and historically offered better rule-synchronization performance than iptables in large clusters. As of Kubernetes v1.35, however, IPVS mode is deprecated and Kubernetes recommends nftables as the replacement proxy mode.

## Prerequisites

```bash
# Load required kernel modules on all nodes
# Add scheduler modules for the algorithms you plan to use.

sudo modprobe ip_vs
sudo modprobe ip_vs_rr
sudo modprobe ip_vs_wrr
sudo modprobe ip_vs_sh
sudo modprobe ip_vs_lc
sudo modprobe nf_conntrack

# Make persistent
sudo tee -a /etc/modules >/dev/null << 'EOF'
ip_vs
ip_vs_rr
ip_vs_wrr
ip_vs_sh
ip_vs_lc
nf_conntrack
EOF

# Verify modules are loaded
lsmod | grep -e ip_vs -e nf_conntrack

# Install ipvsadm for inspection
sudo apt install ipvsadm -y
```

## Switching kube-proxy to IPVS Mode

```bash
# Edit the kube-proxy ConfigMap
kubectl edit configmap kube-proxy -n kube-system
```

Change the `mode` field under `data.config.conf`:

```yaml
# In the kube-proxy configuration stored in data.config.conf
mode: "ipvs"
ipvs:
  # Load balancing algorithm (for example: rr, wrr, lc, wlc, lblc, lblcr, sh, dh, sed, nq, mh)
  scheduler: "rr"
  # Sync period
  syncPeriod: 30s
  minSyncPeriod: 10s
  # Timeout for IPVS TCP connections
  tcpTimeout: 0s
  # Timeout for IPVS TCP connections after FIN
  tcpFinTimeout: 0s
  # UDP timeout
  udpTimeout: 0s
```

```bash
# Restart kube-proxy to apply the change
kubectl rollout restart daemonset/kube-proxy -n kube-system

# Verify the configured mode
kubectl get configmap kube-proxy -n kube-system -o go-template='{{index .data "config.conf"}}' \
  | grep 'mode:'
# Expected: mode: "ipvs"

# Verify the running proxy mode on a node
curl http://localhost:10249/proxyMode
# Expected: ipvs
```

## Verifying IPVS Rules

```bash
# View all IPVS virtual services (Service ports, NodePorts, external IPs, and load-balancer IPs)
sudo ipvsadm -L -n

# Example output:
# IP Virtual Server version 1.2.1 (size=4096)
# Prot LocalAddress:Port Scheduler Flags
#   -> RemoteAddress:Port Forward Weight ActiveConn InActConn
# TCP  10.96.0.1:443 rr
#   -> 192.168.1.10:6443         Masq    1      0          0
# TCP  10.96.45.123:80 rr
#   -> 10.244.1.5:8080          Masq    1      0          0
#   -> 10.244.2.8:8080          Masq    1      0          0
```

## IPVS Load Balancing Algorithms

```bash
# Available schedulers depend on which IPVS scheduler modules are available:
# rr    - Round Robin (default)
# wrr   - Weighted Round Robin
# lc    - Least Connection
# wlc   - Weighted Least Connection
# lblc  - Locality-Based Least Connection
# lblcr - Locality-Based Least Connection with Replication
# sh    - Source Hashing
# dh    - Destination Hashing
# sed   - Shortest Expected Delay
# nq    - Never Queue
# mh    - Maglev Hashing

# Example: change to Least Connection
kubectl edit configmap kube-proxy -n kube-system
# Set: scheduler: "lc"
kubectl rollout restart daemonset/kube-proxy -n kube-system
```

## Performance Comparison

Compared to kube-proxy in iptables mode, IPVS historically offered faster lookup and better rule-synchronization performance:

| Metric | iptables | IPVS |
|---|---|---|
| Rule lookup time | O(n) linear | O(1) hash |
| Rule synchronization | Slower in large clusters | Better |
| Traffic throughput | Lower | Higher |
| Balancing options | Default random selection | Multiple schedulers |

As of Kubernetes v1.35, however, IPVS proxy mode is deprecated and upstream recommends `nftables` as its replacement.

## Monitoring IPVS Connections

```bash
# View active connections
sudo ipvsadm -L -n -c

# View connection rates per service
sudo ipvsadm -L -n --rate

# Check persistent connection counters
sudo ipvsadm -L -n --persistent-conn
```

If you still need the IPVS backend, it can provide better rule-synchronization performance than iptables. However, as of Kubernetes v1.35, IPVS mode is deprecated and upstream recommends nftables for new deployments.
