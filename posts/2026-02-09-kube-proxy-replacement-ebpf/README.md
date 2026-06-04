# How to implement kube-proxy replacement with eBPF

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, eBPF, Kube-proxy, Networking, Cilium

Description: Replace kube-proxy with eBPF-based service load balancing for better performance using Cilium including setup, configuration, comparison with IPVS/iptables modes.

---

Kube-proxy has served Kubernetes well, but its iptables and IPVS implementations have limitations at scale. eBPF-based kube-proxy replacement eliminates these bottlenecks by implementing service load balancing directly in the kernel with hash table lookups instead of linear rule processing. This guide shows you how to replace kube-proxy with Cilium's eBPF implementation for improved performance and reliability.

## Why Replace Kube-Proxy

Traditional kube-proxy modes have scaling issues. In iptables mode, every packet traverses a chain of rules that grows with the number of services. Adding 1000 services means 1000 more rules to check. IPVS improves this with hash tables but still requires netfilter hooks and conntrack overhead.

eBPF-based implementations attach directly to network interfaces and cgroups, processing service traffic before it has to traverse the normal kube-proxy datapath. Service lookups use eBPF maps with O(1) complexity. Connection tracking for service load balancing happens in eBPF maps rather than kube-proxy-managed iptables state. This can reduce CPU usage in large service-heavy deployments, depending on workload and kernel support.

Additional benefits include:
- Consistent performance regardless of service count
- Native support for DSR (Direct Server Return)
- Maglev consistent hashing for better load distribution
- Session affinity without conntrack
- Faster failover when endpoints change

## Installing Cilium with Kube-Proxy Replacement

Start with a fresh cluster for the cleanest deployment. If using kubeadm, skip kube-proxy during initialization:

```bash
# Initialize without kube-proxy

kubeadm init --skip-phases=addon/kube-proxy \
  --pod-network-cidr=10.244.0.0/16
```

Install Cilium with kube-proxy replacement enabled:

```bash
# Add Cilium Helm repo
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=API_SERVER_IP \
  --set k8sServicePort=API_SERVER_PORT \
  --set bpf.masquerade=true \
  --set ipam.mode=kubernetes
```

Replace `API_SERVER_IP` and `API_SERVER_PORT` with your control plane endpoint. These settings tell Cilium how to reach the API server since kube-proxy won't be handling the kubernetes service.

Verify installation:

```bash
# Check Cilium status
kubectl -n kube-system exec ds/cilium -- cilium-dbg status | grep KubeProxyReplacement

# Should show:
# KubeProxyReplacement:   True

# Verify no kube-proxy pods
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# Test cluster DNS
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup kubernetes
```

## Migrating Existing Cluster from Kube-Proxy

For clusters already running kube-proxy, follow these steps to migrate:

```bash
# Step 1: Install Cilium alongside kube-proxy
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=false

# Wait for Cilium to stabilize
cilium status --wait

# Step 2: Enable kube-proxy replacement
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=$(kubectl get endpoints kubernetes -o jsonpath='{.subsets[0].addresses[0].ip}') \
  --set k8sServicePort=6443

# Step 3: Delete kube-proxy
kubectl -n kube-system delete ds kube-proxy
kubectl -n kube-system delete cm kube-proxy

# Step 4: Clean up kube-proxy iptables rules
# Run on each node with root permissions:
iptables-save | grep -v KUBE | iptables-restore
```

Verify the migration succeeded:

```bash
# Check services are working
kubectl get svc
kubectl run test --image=nginx:1.21
kubectl expose pod test --port=80
kubectl run -it --rm curl --image=curlimages/curl --restart=Never -- curl test

# Check eBPF maps
kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf lb list

# Verify no kube-proxy rules
iptables-save | grep KUBE-SVC
# Should return nothing
```

## Configuring kube-proxy Replacement Options

Fine-tune the replacement behavior:

```yaml
# values.yaml for Helm
kubeProxyReplacement: "true"

# Load balancing mode
# "snat" - Default, works everywhere
# "dsr" - Direct Server Return, best performance
# "hybrid" - DSR for TCP, SNAT for UDP
loadBalancer:
  algorithm: maglev
  mode: dsr
  acceleration: native

# NodePort configuration
nodePort:
  bindProtection: true

# eBPF datapath options
bpf:
  hostLegacyRouting: false
  masquerade: true
  preallocateMaps: true
```

Apply configuration:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  -f values.yaml

# Restart Cilium pods
kubectl -n kube-system rollout restart ds/cilium
```

## Enabling DSR Mode

DSR mode provides the best performance by having backend pods respond directly to clients:

```bash
# Configure DSR
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set routingMode=native \
  --set loadBalancer.mode=dsr \
  --set loadBalancer.dsrDispatch=opt \
  --set loadBalancer.algorithm=maglev

# Verify DSR is active
kubectl -n kube-system exec ds/cilium -- cilium-dbg status --verbose | grep -i "Mode:"
# Should show the kube-proxy replacement load-balancing mode as DSR
```

Create a service to test DSR:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dsr-service
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
  - port: 80
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

Verify DSR behavior with tcpdump:

```bash
# On the node receiving external traffic
tcpdump -i eth0 port 80 -n

# You should see:
# - Inbound packet to service IP
# - Outbound response returned directly from the backend path to the client
# - The service IP/port preserved as the response source
```

## Implementing Session Affinity

Configure session affinity without using conntrack:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: sticky-service
spec:
  type: ClusterIP
  selector:
    app: stateful-app
  ports:
  - port: 8080
    targetPort: 8080
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 300
```

Cilium implements this using eBPF maps rather than conntrack, reducing memory usage and improving performance:

```bash
# View affinity map
kubectl -n kube-system exec ds/cilium -- \
  cilium-dbg bpf lb list
```

## Monitoring Service Load Balancing

Check service endpoints and load balancing state:

```bash
# List all services
kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf lb list

# View specific service
kubectl -n kube-system exec ds/cilium -- \
  cilium-dbg service list

# Check backend health
kubectl -n kube-system exec ds/cilium -- \
  cilium-dbg bpf endpoint list

# Monitor connection tracking
kubectl -n kube-system exec ds/cilium -- \
  cilium-dbg bpf ct list global
```

Export metrics to Prometheus:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set prometheus.enabled=true \
  --set prometheus.serviceMonitor.enabled=true
```

Key metrics:
- `cilium_services_events_total`: Service add/delete/update events
- `cilium_service_implementation_delay`: Service datapath programming delay
- `cilium_proxy_redirects`: L7 proxy redirects, when L7 proxying is used
- `cilium_bpf_map_ops_total`: BPF map operations

## Performance Comparison

Benchmark kube-proxy replacement against traditional modes:

```bash
# Run Cilium's built-in performance tests
cilium connectivity perf --duration 30s --samples 3

# Compare CPU usage
kubectl top nodes

# Check latency
cilium connectivity perf --duration 30s --samples 3 --rr --throughput=false
```

Typical results show:
- 15-30% better throughput
- 25-40% lower CPU usage
- 10-20% latency reduction
- Consistent performance regardless of service count

## Troubleshooting

Common issues and solutions:

```bash
# Issue: Services not accessible
# Check Cilium status
cilium status

# Verify BPF programs are loaded
kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf lb list

# Check service endpoints
kubectl -n kube-system exec ds/cilium -- cilium-dbg service list

# Issue: DNS not resolving
# Ensure k8sServiceHost/Port are correct
kubectl -n kube-system get cm cilium-config -o yaml | grep k8sService

# Test API server connectivity
kubectl -n kube-system exec ds/cilium -- curl -k https://$K8S_SERVICE_HOST:$K8S_SERVICE_PORT

# Issue: NodePort not accessible
# Verify nodePort is enabled
kubectl -n kube-system exec ds/cilium -- cilium-dbg status --verbose | grep -i NodePort

# Check firewall rules
iptables -L -n | grep 30000:32767

# Issue: ExternalIPs not working
# Verify externalIPs support is enabled
kubectl -n kube-system exec ds/cilium -- cilium-dbg status --verbose | grep -i externalIPs

# Check external IP routing
ip route show table all | grep <EXTERNAL_IP>
```

Revert to kube-proxy if needed:

```bash
# Reinstall kube-proxy using the manifest generated for your Kubernetes version
kubeadm init phase addon kube-proxy --kubeconfig /etc/kubernetes/admin.conf

# Disable Cilium kube-proxy replacement
helm upgrade cilium cilium/cilium \
  --reuse-values \
  --set kubeProxyReplacement=false
```

## Advanced Features

Enable XDP acceleration for even better performance:

```bash
helm upgrade cilium cilium/cilium \
  --reuse-values \
  --set loadBalancer.acceleration=native

# Verify XDP is active
ip link show eth0 | grep xdp
```

Enable bandwidth manager:

```bash
helm upgrade cilium cilium/cilium \
  --reuse-values \
  --set bandwidthManager.enabled=true

# Apply bandwidth limits
kubectl annotate pod nginx kubernetes.io/ingress-bandwidth=100M
kubectl annotate pod nginx kubernetes.io/egress-bandwidth=100M
```

Replacing kube-proxy with eBPF-based load balancing eliminates performance bottlenecks and provides more efficient service handling. Cilium's implementation offers better scalability, lower latency, and advanced features like DSR and Maglev hashing, making it ideal for large-scale production clusters.
