# How to configure Kubernetes Services with IPVS scheduling algorithms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPVS, Networking, Load Balancing, Performance

Description: Learn how to configure IPVS scheduling algorithms in Kubernetes for optimized load balancing including round-robin, least connection, and weighted distribution strategies for better service performance.

---

IPVS (IP Virtual Server) provides more sophisticated load balancing than the traditional iptables mode in Kubernetes. When you configure kube-proxy to use IPVS, you gain access to multiple scheduling algorithms that can dramatically improve traffic distribution and application performance. This guide shows you how to choose and configure the right algorithm for your workload.

## Understanding IPVS Scheduling Algorithms

IPVS is a transport-layer load balancer built into the Linux kernel. Unlike iptables, which processes rules sequentially, IPVS uses hash tables for O(1) lookup complexity. This makes it much faster when you have hundreds or thousands of services.

IPVS supports ten scheduling algorithms, but Kubernetes commonly uses five: round-robin (rr), least connection (lc), destination hashing (dh), source hashing (sh), and shortest expected delay (sed). Each algorithm optimizes for different traffic patterns and application requirements.

The round-robin algorithm distributes connections evenly across backends. Least connection sends new connections to the backend with the fewest active connections. Source hashing ensures requests from the same client IP always go to the same backend, which is crucial for session affinity.

## Enabling IPVS Mode in kube-proxy

Before you can use IPVS scheduling algorithms, you need to enable IPVS mode in kube-proxy. First, ensure the required kernel modules are loaded:

```bash
# Load IPVS kernel modules
modprobe ip_vs
modprobe ip_vs_rr
modprobe ip_vs_wrr
modprobe ip_vs_sh
modprobe ip_vs_dh
modprobe ip_vs_lc
modprobe nf_conntrack

# Verify modules are loaded
lsmod | grep -e ip_vs -e nf_conntrack

# Make modules load on boot
cat <<EOF > /etc/modules-load.d/ipvs.conf
ip_vs
ip_vs_rr
ip_vs_wrr
ip_vs_sh
ip_vs_dh
ip_vs_lc
nf_conntrack
EOF
```

Next, configure kube-proxy to use IPVS. If you're using kubeadm, create a ConfigMap:

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
      excludeCIDRs:
      - "10.96.0.10/32"  # Exclude cluster DNS
      strictARP: true
      syncPeriod: 30s
      minSyncPeriod: 5s
    iptables:
      masqueradeAll: false
      masqueradeBit: 14
      minSyncPeriod: 0s
      syncPeriod: 30s
```

Restart kube-proxy to apply the changes:

```bash
kubectl rollout restart daemonset/kube-proxy -n kube-system
```

## Configuring Round-Robin Scheduling

Round-robin is the default algorithm. It distributes connections evenly across all backend pods, which works well when all backends have similar capacity and connection processing times:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    # IPVS scheduler is set via kube-proxy config, not service annotations
spec:
  type: ClusterIP
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 8080
```

Verify IPVS is working correctly:

```bash
# Install ipvsadm if not present
apt-get install ipvsadm

# View IPVS virtual services and real servers
ipvsadm -Ln

# Expected output shows your service with rr scheduler:
# TCP  10.96.100.50:80 rr
#   -> 10.244.1.10:8080  Masq    1      0          0
#   -> 10.244.2.15:8080  Masq    1      0          0
#   -> 10.244.3.20:8080  Masq    1      0          0
```

The `rr` indicator confirms round-robin scheduling is active. Each connection will go to the next backend in sequence.

## Using Least Connection for Uneven Workloads

When your backend pods handle connections with varying duration or complexity, least connection scheduling performs better than round-robin:

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
      scheduler: "lc"  # Least connection
      strictARP: true
```

Least connection works well for services like databases or long-polling HTTP connections where connection duration varies significantly:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-pool
spec:
  type: ClusterIP
  selector:
    app: postgres-pooler
  ports:
  - port: 5432
    targetPort: 5432
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-pooler
spec:
  replicas: 5
  selector:
    matchLabels:
      app: postgres-pooler
  template:
    metadata:
      labels:
        app: postgres-pooler
    spec:
      containers:
      - name: pgbouncer
        image: pgbouncer/pgbouncer:1.17
        ports:
        - containerPort: 5432
```

Monitor the connection distribution to verify it's balanced:

```bash
# Watch IPVS statistics
watch -n 1 'ipvsadm -Ln --stats'

# The InActConn column shows active connections per backend
# With lc, new connections go to the backend with lowest count
```

## Implementing Source Hashing for Session Affinity

Source hashing ensures all connections from the same client IP go to the same backend. This is critical for applications that maintain session state in memory:

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
      scheduler: "sh"  # Source hashing
      strictARP: true
```

Source hashing is perfect for sticky sessions:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: stateful-app
spec:
  type: ClusterIP
  selector:
    app: stateful
  ports:
  - port: 8080
    targetPort: 8080
  sessionAffinity: ClientIP  # Kubernetes-level session affinity
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800  # 3 hours
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: stateful
spec:
  serviceName: stateful-app
  replicas: 3
  selector:
    matchLabels:
      app: stateful
  template:
    metadata:
      labels:
        app: stateful
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
```

Combining IPVS source hashing with Kubernetes sessionAffinity provides two layers of stickiness. The IPVS layer works at the kernel level for maximum performance, while sessionAffinity provides application-level control.

## Using Destination Hashing for Cache Efficiency

Destination hashing distributes traffic based on the destination IP. This is useful when you have multiple services and want to ensure requests to the same service endpoint always hit the same backend:

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
      scheduler: "dh"  # Destination hashing
      strictARP: true
```

Destination hashing is particularly effective for caching proxies where cache hit rates improve when the same destination consistently routes to the same backend.

## Weighted Round-Robin for Heterogeneous Backends

When your backends have different capacities, use weighted round-robin to send more traffic to more powerful nodes:

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
      scheduler: "wrr"  # Weighted round-robin
      strictARP: true
```

Unfortunately, Kubernetes doesn't provide a native way to set per-pod weights for IPVS. The weights are automatically determined based on pod readiness and resource requests. Pods with higher resource requests may receive proportionally more traffic.

You can manually adjust weights using ipvsadm, though this isn't recommended in production as kube-proxy will overwrite your changes:

```bash
# View current weights
ipvsadm -Ln

# Manually set weight for a specific backend (temporary)
ipvsadm -e -t 10.96.100.50:80 -r 10.244.1.10:8080 -w 100 -m

# This gives the backend 10x more traffic than others with default weight 1
```

## Monitoring IPVS Performance

Track IPVS metrics to ensure your chosen algorithm performs well:

```bash
# Install monitoring tools
apt-get install sysstat ipvsadm

# View detailed statistics
ipvsadm -Ln --stats

# Monitor connection rates
ipvsadm -Ln --rate

# Check for connection drops
ipvsadm -Ln --stats | grep -E "Conns|InPkts|OutPkts|InBytes|OutBytes"
```

Export IPVS metrics to Prometheus for long-term tracking:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    scrape_configs:
    - job_name: 'kubernetes-nodes'
      kubernetes_sd_configs:
      - role: node
      relabel_configs:
      - source_labels: [__address__]
        regex: '(.*):10250'
        replacement: '${1}:9100'
        target_label: __address__
      # Scrape node-exporter which includes IPVS metrics
```

Look for metrics like `node_ipvs_connections_total`, `node_ipvs_incoming_packets_total`, and `node_ipvs_outgoing_bytes_total` to understand load distribution.

## Troubleshooting Common Issues

If services aren't working after switching to IPVS, check these common problems:

```bash
# Verify kernel modules are loaded
lsmod | grep ip_vs

# Check kube-proxy is using IPVS
kubectl logs -n kube-system -l k8s-app=kube-proxy | grep -i ipvs

# Ensure ipset is installed (required for IPVS mode)
which ipset || apt-get install ipset

# List IPVS rules
ipvsadm -Ln

# Check for kube-proxy errors
kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=50
```

If you need to fall back to iptables mode, change the mode in the ConfigMap and restart kube-proxy. IPVS rules will persist until you run `ipvsadm -C` to clear them.

IPVS scheduling algorithms give you fine-grained control over load balancing in Kubernetes. By choosing the right algorithm for your workload characteristics, you can improve performance, ensure fair distribution, and provide session affinity where needed. Start with round-robin for most services, then switch to least connection or source hashing based on your specific requirements.
