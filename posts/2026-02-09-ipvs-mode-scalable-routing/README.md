# How to Implement IPVS Mode kube-proxy for Scalable Service Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPVS, kube-proxy, Load Balancing, Performance

Description: Learn how to configure kube-proxy in IPVS mode for scalable Kubernetes service routing with better performance, more load balancing algorithms, and consistent connection handling.

---

IPVS (IP Virtual Server) mode in kube-proxy provides a dramatic performance improvement over iptables for clusters with many services. While iptables uses sequential rule matching that degrades linearly with service count, IPVS uses hash tables for O(1) lookup complexity. This makes IPVS the clear choice for production clusters with hundreds or thousands of services, where iptables can introduce noticeable latency.

Beyond performance, IPVS offers richer load balancing algorithms including round-robin, least connection, source hashing, and weighted round-robin. IPVS also integrates deeply with the Linux kernel's connection tracking, providing better session persistence and more efficient packet processing. The trade-off is slightly more complex setup and dependency on kernel IPVS modules.

## Installing IPVS Prerequisites

Before enabling IPVS mode, install required kernel modules:

```bash
# Load IPVS kernel modules
modprobe ip_vs
modprobe ip_vs_rr
modprobe ip_vs_wrr
modprobe ip_vs_sh
modprobe nf_conntrack

# Verify modules loaded
lsmod | grep ip_vs

# Make modules load on boot
cat > /etc/modules-load.d/ipvs.conf <<EOF
ip_vs
ip_vs_rr
ip_vs_wrr
ip_vs_sh
nf_conntrack
EOF

# Install ipvsadm tool
apt-get install ipvsadm  # Debian/Ubuntu
yum install ipvsadm      # RHEL/CentOS
```

## Configuring kube-proxy for IPVS Mode

Enable IPVS mode in kube-proxy configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-proxy
  namespace: kube-system
data:
  config.conf: |
    apiVersion: kubeproxy.config.k8s.io/v1alpha1
    kind: KubeProxyConfiguration
    mode: "ipvs"
    ipvs:
      scheduler: "rr"
      syncPeriod: 30s
      minSyncPeriod: 5s
      # Enable strict ARP mode (required for MetalLB)
      strictARP: true
      # TCP timeout settings
      tcpTimeout: 0s
      tcpFinTimeout: 0s
      udpTimeout: 0s
    # Connection tracking
    conntrack:
      maxPerCore: 32768
      min: 131072
      tcpEstablishedTimeout: 24h
      tcpCloseWaitTimeout: 1h
```

Restart kube-proxy to apply changes:

```bash
# Delete kube-proxy pods to restart
kubectl delete pods -n kube-system -l k8s-app=kube-proxy

# Verify IPVS mode is active
kubectl logs -n kube-system -l k8s-app=kube-proxy | grep "Using ipvs"
```

## Understanding IPVS Load Balancing Algorithms

IPVS supports multiple scheduling algorithms:

### Round Robin (rr)

Distributes connections evenly across backends:

```yaml
ipvs:
  scheduler: "rr"
```

Best for: Homogeneous backends with similar capacity

### Least Connection (lc)

Routes to backend with fewest active connections:

```yaml
ipvs:
  scheduler: "lc"
```

Best for: Long-lived connections, mixed workloads

### Source Hashing (sh)

Routes based on source IP hash for session affinity:

```yaml
ipvs:
  scheduler: "sh"
```

Best for: Sticky sessions without sessionAffinity overhead

### Weighted Round Robin (wrr)

Allows different weights per backend:

```yaml
ipvs:
  scheduler: "wrr"
```

Best for: Heterogeneous backends with different capacities

## Viewing IPVS Configuration

Use ipvsadm to inspect IPVS state:

```bash
# List all virtual services
ipvsadm -L -n

# Example output:
# IP Virtual Server version 1.2.1 (size=4096)
# Prot LocalAddress:Port Scheduler Flags
#   -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
# TCP  10.96.0.1:443 rr
#   -> 192.168.1.10:6443            Masq    1      0          0
# TCP  10.96.100.50:80 rr
#   -> 10.244.0.10:8080             Masq    1      0          5
#   -> 10.244.1.20:8080             Masq    1      0          3
#   -> 10.244.2.30:8080             Masq    1      0          7

# Show statistics
ipvsadm -L -n --stats

# Show connection tracking
ipvsadm -L -n --connection

# Show specific service
ipvsadm -L -n -t 10.96.100.50:80
```

## Comparing iptables vs IPVS

Performance comparison:

```bash
# Count iptables rules (iptables mode)
iptables-save | wc -l
# Large clusters: 10,000+ rules

# Count IPVS services (IPVS mode)
ipvsadm -L -n | wc -l
# Same cluster: ~100-500 entries

# Benchmark service lookup latency
# iptables: O(n) linear scan, ms increases with services
# IPVS: O(1) hash table lookup, consistent μs latency
```

Real-world performance:
- Cluster with 5,000 services
- iptables mode: 50ms+ latency for packet processing
- IPVS mode: < 1ms latency for packet processing

## IPVS with Session Affinity

IPVS handles session affinity efficiently:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: sticky-service
spec:
  selector:
    app: my-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
```

Check IPVS persistence:

```bash
# View persistent connections
ipvsadm -L -n --persistent-conn

# IPVS uses kernel connection tracking for persistence
# More efficient than iptables recent module
```

## NodePort Services with IPVS

IPVS handles NodePort services efficiently:

```bash
# View NodePort virtual services
ipvsadm -L -n | grep -A 5 30080

# Output:
# TCP  0.0.0.0:30080 rr
#   -> 10.244.0.10:8080             Masq    1      0          2
#   -> 10.244.1.20:8080             Masq    1      0          1

# IPVS creates virtual service on 0.0.0.0:NodePort
# Accessible on all node IPs
```

## IPVS Dummy Interface

IPVS binds service IPs to a dummy interface:

```bash
# Check dummy interface
ip addr show kube-ipvs0

# Output:
# kube-ipvs0: <BROADCAST,NOARP> mtu 1500 qdisc noop state DOWN
#     inet 10.96.0.1/32 scope global kube-ipvs0
#     inet 10.96.0.10/32 scope global kube-ipvs0
#     inet 10.96.100.50/32 scope global kube-ipvs0
#     inet 10.96.200.100/32 scope global kube-ipvs0

# All ClusterIPs are bound as /32 addresses
# This allows IPVS to handle traffic to any ClusterIP
```

## Troubleshooting IPVS Mode

### Problem: IPVS mode not working

```bash
# Check kernel modules
lsmod | grep ip_vs
# If empty, load modules

# Check kube-proxy logs
kubectl logs -n kube-system -l k8s-app=kube-proxy | grep -i ipvs

# Common errors:
# "can't use ipvs proxier, fallback to iptables"
# Solution: Install ipvsadm and load kernel modules

# Verify kube-proxy config
kubectl get cm kube-proxy -n kube-system -o yaml | grep mode
```

### Problem: Service not accessible

```bash
# Check if virtual service exists
ipvsadm -L -n | grep <service-ip>

# If missing, check endpoints
kubectl get endpoints <service-name>

# View kube-proxy sync errors
kubectl logs -n kube-system -l k8s-app=kube-proxy | grep -i error

# Check firewall rules
# IPVS still uses some iptables for SNAT/DNAT
iptables -t nat -L -n | grep KUBE
```

### Problem: Uneven load distribution

```bash
# Check active connections per backend
ipvsadm -L -n --stats

# View connection distribution
ipvsadm -L -n --rate

# Verify scheduler algorithm
ipvsadm -L -n | grep -A 1 <service-ip>

# Change scheduler if needed
kubectl edit cm kube-proxy -n kube-system
# Set scheduler: "lc" or "wrr"
```

## IPVS with MetalLB

IPVS works excellently with MetalLB for LoadBalancer services:

```yaml
# Enable strict ARP mode
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-proxy
  namespace: kube-system
data:
  config.conf: |
    apiVersion: kubeproxy.config.k8s.io/v1alpha1
    kind: KubeProxyConfiguration
    mode: "ipvs"
    ipvs:
      strictARP: true
```

Deploy MetalLB:

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.12/config/manifests/metallb-native.yaml
```

## Monitoring IPVS Performance

Track IPVS metrics:

```bash
# View connection statistics
watch -n 1 'ipvsadm -L -n --stats'

# Monitor connection rate
watch -n 1 'ipvsadm -L -n --rate'

# Check connection table usage
cat /proc/sys/net/ipv4/vs/conn_tab_size
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max

# View IPVS parameters
sysctl -a | grep ipvs
```

Export metrics to Prometheus:

```yaml
# ServiceMonitor for kube-proxy IPVS metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kube-proxy
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: kube-proxy
  endpoints:
  - port: metrics
    interval: 30s
```

Key metrics:
- `kubeproxy_sync_proxy_rules_duration_seconds`: Rule sync time
- `kubeproxy_network_programming_duration_seconds`: Network programming latency
- `rest_client_requests_total`: API requests

## Advanced IPVS Configuration

Fine-tune IPVS for production:

```yaml
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: "ipvs"
ipvs:
  scheduler: "lc"
  syncPeriod: 30s
  minSyncPeriod: 2s
  # Exclude CIDR ranges from IPVS
  excludeCIDRs:
  - "169.254.0.0/16"
  strictARP: true
  tcpTimeout: 900s
  tcpFinTimeout: 120s
  udpTimeout: 300s
conntrack:
  maxPerCore: 32768
  min: 131072
  tcpEstablishedTimeout: 86400s
  tcpCloseWaitTimeout: 3600s
# iptables settings (still used for SNAT)
iptables:
  masqueradeBit: 14
  syncPeriod: 30s
  minSyncPeriod: 5s
```

Tune kernel parameters:

```bash
# Increase connection tracking table
sysctl -w net.netfilter.nf_conntrack_max=1000000
sysctl -w net.ipv4.vs.conn_tab_size=1000000

# Tune connection timeouts
sysctl -w net.ipv4.vs.timeout_established=86400
sysctl -w net.ipv4.vs.timeout_close=120

# Enable connection reuse
sysctl -w net.ipv4.vs.conntrack=1

# Make permanent
cat >> /etc/sysctl.conf <<EOF
net.netfilter.nf_conntrack_max=1000000
net.ipv4.vs.conn_tab_size=1000000
net.ipv4.vs.timeout_established=86400
net.ipv4.vs.timeout_close=120
net.ipv4.vs.conntrack=1
EOF
```

## Best Practices

1. **Use IPVS for large clusters**: Essential when > 1000 services
2. **Choose appropriate scheduler**: Match algorithm to workload
3. **Enable strict ARP**: Required for MetalLB and other LB solutions
4. **Monitor connection tracking**: Avoid table exhaustion
5. **Tune timeouts**: Balance memory usage and connection persistence
6. **Test thoroughly**: Verify all service types work (ClusterIP, NodePort, LoadBalancer)
7. **Keep kernel updated**: Benefit from IPVS improvements

IPVS mode transforms kube-proxy from a scaling bottleneck into a high-performance load balancer. For production clusters, IPVS is the clear choice over iptables mode.
