# How to configure Calico eBPF dataplane for native routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Calico, eBPF, Networking, Performance

Description: Configure Calico's eBPF dataplane for high-performance native routing in Kubernetes including setup, performance tuning, kube-proxy replacement, and comparison with standard iptables dataplane.

---

Calico's eBPF dataplane replaces iptables with eBPF programs for packet processing, delivering significant performance improvements and reduced CPU usage. Instead of traversing long iptables chains, packets are processed by efficient eBPF programs attached directly to network interfaces. This guide shows you how to enable and configure Calico's eBPF mode for maximum performance.

## Understanding Calico eBPF Dataplane

Traditional Calico uses iptables for policy enforcement and routing decisions. While iptables works well for small to medium clusters, it scales poorly as the number of services and policies grows. Each packet must traverse potentially thousands of iptables rules, consuming CPU cycles.

The eBPF dataplane replaces this with programs that use BPF maps for efficient lookups, avoiding the linear chain traversal that can affect iptables-based service handling as the number of services grows. eBPF programs also enable features like DSR (Direct Server Return) and native service handling without kube-proxy.

Key benefits include:
- Higher throughput for service-heavy clusters
- Lower first-packet latency
- Less CPU spent keeping the service data plane in sync
- Kube-proxy replacement capabilities
- Better support for large-scale clusters

## Prerequisites and Planning

Before enabling eBPF dataplane, verify your environment meets these requirements:

```bash
# Check kernel version (minimum 5.10, or RHEL 8.4 kernel 4.18.0-305+)

uname -r

# Verify BPF filesystem is mounted
mount | grep /sys/fs/bpf

# If not mounted
mount -t bpf bpf /sys/fs/bpf

# Check required kernel configs
grep CONFIG_BPF_SYSCALL /boot/config-$(uname -r)
grep CONFIG_BPF_JIT /boot/config-$(uname -r)

# Ensure kernel BTF is available
ls /sys/kernel/btf/vmlinux

# Load required kernel modules
modprobe xt_bpf
modprobe sch_ingress
```

Plan your configuration:

```yaml
# Standard iptables mode - baseline performance
Mode: iptables
kube-proxy: enabled
Felix handles: policy only

# eBPF mode - maximum performance
Mode: eBPF
kube-proxy: disabled (replaced by Calico)
Felix handles: policy + services
```

## Installing Calico with eBPF Dataplane

For new clusters, install Calico with eBPF enabled from the start:

```bash
# Download the Calico operator manifest
curl https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/tigera-operator.yaml -O

# Apply the operator
kubectl create -f tigera-operator.yaml

# Create Installation resource with eBPF enabled
cat <<EOF | kubectl apply -f -
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    linuxDataplane: BPF
    bpfNetworkBootstrap: Enabled
    kubeProxyManagement: Enabled
    bgp: Enabled
    ipPools:
    - blockSize: 26
      cidr: 10.244.0.0/16
      encapsulation: None
      natOutgoing: Enabled
      nodeSelector: all()
  flexVolumePath: /usr/libexec/kubernetes/kubelet-plugins/volume/exec/
  nodeUpdateStrategy:
    rollingUpdate:
      maxUnavailable: 1
    type: RollingUpdate
EOF
```

The `linuxDataplane: BPF` setting enables eBPF mode. `bpfNetworkBootstrap` lets the operator bootstrap API server access, and `kubeProxyManagement` lets it disable kube-proxy for the BPF dataplane. Wait for the installation to complete:

```bash
watch kubectl get tigerastatus

# All components should show "Available: True"
```

## Migrating Existing Cluster to eBPF

For existing Calico deployments, migrate to eBPF mode:

```bash
# Disable kube-proxy (Calico will replace it)
kubectl patch ds -n kube-system kube-proxy -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico": "true"}}}}}'

# Verify kube-proxy pods are gone
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# Configure Calico Felix for eBPF mode
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  bpfEnabled: true
  bpfExternalServiceMode: Tunnel
  bpfLogLevel: Info
  bpfDataIfacePattern: ^(en.*|eth.*)$
  bpfConnectTimeLoadBalancing: Enabled
  bpfHostNetworkedNATWithoutCTLB: Enabled
EOF

# Restart Calico pods to apply changes
kubectl delete pod -n calico-system --all

# Wait for pods to restart
kubectl rollout status daemonset/calico-node -n calico-system
```

Verify eBPF mode is active:

```bash
# Check Felix logs for eBPF activation
kubectl logs -n calico-system -l k8s-app=calico-node | grep -i "bpf"

# Should see: "BPF enabled, starting BPF dataplane"
```

## Configuring eBPF Dataplane Options

Fine-tune eBPF behavior through Felix configuration:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  bpfEnabled: true

  # How to handle NodePort/LoadBalancer services
  # Options: Tunnel (default), DSR
  bpfExternalServiceMode: DSR

  # Enable connection-time load balancing
  # Options: Disabled, Enabled, TCP
  bpfConnectTimeLoadBalancing: Enabled

  # Log level for BPF programs
  # Options: Off, Info, Debug
  bpfLogLevel: Info

  # Interface pattern for BPF attachment
  bpfDataIfacePattern: ^(en.*|eth.*|bond.*)$

  # Control host-networked NAT behavior with connection-time load balancing
  bpfHostNetworkedNATWithoutCTLB: Enabled

  # Source NAT port range used if there is a source port collision
  bpfPSNATPorts: 20000:29999

  # Map size tuning
  bpfMapSizeNATFrontend: 65536
  bpfMapSizeNATBackend: 262144
  bpfMapSizeNATAffinity: 65536
  bpfMapSizeRoute: 262144

  # Clean up kube-proxy iptables rules after kube-proxy has been disabled
  bpfKubeProxyIptablesCleanupEnabled: true
  bpfKubeProxyEndpointSlicesEnabled: true
```

Apply the configuration:

```bash
calicoctl apply -f felix-config.yaml

# Check configuration was applied
calicoctl get felixconfiguration default -o yaml
```

## Enabling DSR Mode for External Traffic

Direct Server Return (DSR) mode improves performance for external service traffic such as NodePort by having responses bypass the load balancing node:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  bpfEnabled: true
  bpfExternalServiceMode: DSR
  bpfDSROptoutCIDRs:
  - 10.0.0.0/8  # Exclude internal networks from DSR
```

DSR requires the underlying network to allow backend nodes to send replies using another node's IP address. In AWS this requires nodes in the same subnet with source/destination checks disabled, and in GCP it requires IP forwarding. DSR is not compatible with cloud load balancer traffic that expects replies from the same node. Use `bpfDSROptoutCIDRs` to exclude specific client networks.

Test DSR functionality:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dsr-test
spec:
  type: NodePort
  selector:
    app: nginx
  ports:
  - port: 80
    nodePort: 30080
    targetPort: 80
  externalTrafficPolicy: Local
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
```

Verify DSR is working:

```bash
# Access service from external client
curl http://<NODE_IP>:30080

# Check tcpdump on the backend pod's node
# Response packets should go directly to client, not back through NodePort node
```

## Monitoring eBPF Dataplane Performance

Check eBPF program statistics:

```bash
# List loaded BPF programs
bpftool prog list | grep calico

# View program details
bpftool prog show id <PROG_ID>

# Check map usage
bpftool map list | grep calico

# View map contents (example: NAT frontend)
bpftool map dump name cali_v4_nat_fe

# Monitor BPF statistics
kubectl exec -n calico-system <calico-node-name> -- \
  calico-node -bpf counters dump --iface=eth0
```

Track metrics in Prometheus:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  prometheusMetricsEnabled: true
---
apiVersion: v1
kind: Service
metadata:
  name: felix-metrics-svc
  namespace: calico-system
  labels:
    app: calico-felix-metrics
spec:
  clusterIP: None
  selector:
    k8s-app: calico-node
  ports:
  - name: metrics-port
    port: 9091
    targetPort: 9091
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: felix-bpf-metrics
  namespace: calico-system
spec:
  selector:
    matchLabels:
      app: calico-felix-metrics
  endpoints:
  - port: metrics-port
    interval: 30s
    path: /metrics
```

Key metrics to monitor:
- `felix_bpf_dataplane_endpoints`: Number of BPF endpoints managed in the data plane
- `felix_bpf_dirty_dataplane_endpoints`: BPF endpoints left dirty after a failure
- `felix_bpf_happy_dataplane_endpoints`: BPF endpoints successfully programmed
- `felix_bpf_num_ip_sets`: Number of BPF IP sets managed in the data plane
- `felix_bpf_conntrack_maglev_entries_total`: Maglev entries in the BPF conntrack table

## Performance Tuning

Tune map sizes based on cluster scale:

```bash
# Calculate required map sizes
# NAT frontend: entries for each node port, external IP, and service port
# NAT backend: total number of service endpoints

# For 1000 services with average 3 endpoints:
# Backend: 1000 * 3 * 1.5 = 4500
# Use 8192 (next power of 2)

# Conntrack: one entry per active connection
# Start with the default or 524288 and monitor usage
```

Configure map sizes:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  bpfMapSizeNATFrontend: 65536
  bpfMapSizeNATBackend: 262144
  bpfMapSizeNATAffinity: 65536
  bpfMapSizeRoute: 262144
  bpfMapSizeConntrack: 524288
```

Monitor map utilization:

```bash
# Check if maps are full
for map in $(bpftool map list | grep calico | awk '{print $1}' | tr -d ':'); do
  echo "Map $map:"
  bpftool map show id $map | grep -E "size|max_entries"
done

# If maps are consistently >80% full, increase sizes
```

## Troubleshooting eBPF Dataplane

Common issues and solutions:

```bash
# Issue: Services not working after enabling eBPF
# Check BPF programs are loaded
bpftool prog list | grep calico

# Verify kube-proxy is disabled
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# Check Felix logs
kubectl logs -n calico-system -l k8s-app=calico-node | grep -i error

# Issue: High CPU usage
# Check BPF counters for packet drops
kubectl exec -n calico-system <calico-node-name> -- \
  calico-node -bpf counters dump --iface=eth0 | grep Dropped

# Issue: Connectivity problems
# Verify interface pattern matches your NICs
ip link show
calicoctl get felixconfiguration default -o yaml | grep bpfDataIfacePattern

# Check BPF program attachment
tc filter show dev eth0 ingress
tc filter show dev eth0 egress
```

Revert to iptables mode if needed:

```bash
# Disable eBPF mode
calicoctl patch felixconfiguration default --patch='{"spec": {"bpfEnabled": false}}'

# Re-enable kube-proxy
kubectl patch ds -n kube-system kube-proxy --type='json' -p='[{"op": "remove", "path": "/spec/template/spec/nodeSelector/non-calico"}]'

# Restart Calico
kubectl delete pod -n calico-system --all
```

Calico's eBPF dataplane delivers significant performance improvements over iptables, especially in large-scale clusters. By eliminating linear rule processing and enabling features like DSR and native kube-proxy replacement, you can achieve better throughput, lower latency, and reduced CPU overhead for your Kubernetes networking.
