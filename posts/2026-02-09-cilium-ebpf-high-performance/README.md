# How to Use Cilium with eBPF for High-Performance Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cilium, eBPF, Networking, Performance

Description: Learn how to deploy and configure Cilium with eBPF for high-performance Kubernetes networking, achieving kernel-level packet processing with minimal overhead and advanced observability.

---

Cilium represents a paradigm shift in Kubernetes networking by leveraging eBPF (extended Berkeley Packet Filter) to implement networking, security, and observability directly in the Linux kernel. Unlike traditional CNI plugins that rely heavily on iptables chains for service and policy handling, Cilium's eBPF programs process packets at efficient kernel hook points with low overhead, delivering dramatically better performance especially at scale.

eBPF allows you to run sandboxed programs in the kernel without changing kernel code or loading kernel modules. Cilium uses eBPF to implement services, network policies, load balancing, and observability, reducing reliance on traditional iptables-based packet processing. This approach enables features like socket-level load balancing, transparent encryption, and deep network visibility while maintaining high throughput.

## Installing Cilium

Install Cilium using the Cilium CLI:

```bash
# Install Cilium CLI

CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi
curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}
sha256sum --check cilium-linux-${CLI_ARCH}.tar.gz.sha256sum
sudo tar xzvfC cilium-linux-${CLI_ARCH}.tar.gz /usr/local/bin
rm cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}

# Install Cilium in Kubernetes cluster
cilium install --version 1.19.4

# Verify installation
cilium status --wait

# Check connectivity
cilium connectivity test
```

Or use Helm for more control:

```bash
helm repo add cilium https://helm.cilium.io/
helm repo update

helm install cilium cilium/cilium \
  --namespace kube-system \
  --version 1.19.4 \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true \
  --set bpf.masquerade=true \
  --set bpf.hostLegacyRouting=false \
  --set image.pullPolicy=IfNotPresent \
  --set ipv4.enabled=true \
  --set ipv6.enabled=false
```

## Understanding Cilium eBPF Architecture

Cilium injects eBPF programs at multiple hook points in the kernel:

1. **XDP (eXpress Data Path)**: Processes packets at NIC driver level before skb allocation
2. **TC (Traffic Control)**: Processes packets at network device ingress/egress
3. **Socket operations**: Intercepts connect, bind, sendmsg, recvmsg system calls
4. **Connection tracking**: Efficient conntrack using eBPF maps

View loaded eBPF programs:

```bash
# List BPF programs on node
kubectl exec -n kube-system ds/cilium -- bpftool prog show

# View BPF maps
kubectl exec -n kube-system ds/cilium -- bpftool map show

# Dump specific map
kubectl exec -n kube-system ds/cilium -- \
  cilium-dbg map get cilium_lb4_services
```

## Kube-Proxy Replacement

Cilium can completely replace kube-proxy using eBPF:

```bash
# Install Cilium with kube-proxy replacement
cilium install \
  --version 1.19.4 \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<API_SERVER_IP> \
  --set k8sServicePort=<API_SERVER_PORT>

# Delete kube-proxy
kubectl -n kube-system delete ds kube-proxy

# Verify kube-proxy replacement is active
cilium status | grep KubeProxyReplacement
```

Benefits over kube-proxy:

- No iptables rules, avoiding linear rule scanning
- Socket-level load balancing for better performance
- Maglev consistent hashing for consistent backend selection
- Native support for DSR (Direct Server Return)
- eBPF service load balancing in the socket path or datapath instead of kube-proxy rules

Check service load balancing:

```bash
# View BPF service map
kubectl exec -n kube-system ds/cilium -- \
  cilium-dbg service list

# Example output:
# ID   Frontend            Service Type   Backend
# 1    10.96.0.1:443       ClusterIP      1 => 192.168.1.10:6443
# 2    10.96.0.10:53       ClusterIP      1 => 10.244.0.5:53
#                                         2 => 10.244.1.8:53
```

## High-Performance Networking Features

### Native Routing Mode

Use direct routing for best performance:

```bash
helm install cilium cilium/cilium \
  --namespace kube-system \
  --version 1.19.4 \
  --set routingMode=native \
  --set autoDirectNodeRoutes=true \
  --set ipv4NativeRoutingCIDR=10.0.0.0/8 \
  --set bpf.hostLegacyRouting=false
```

This mode has Cilium install routes directly in the host routing table, avoiding encapsulation overhead.

### BPF Host Routing

Enable BPF-based host routing for even better performance:

```yaml
# ConfigMap for Cilium
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:
  enable-bpf-masquerade: "true"
  enable-host-reachable-services: "true"
  bpf-lb-algorithm: "maglev"
  bpf-lb-mode: "dsr"
  bpf-lb-dsr-dispatch: "ipip"
```

### DSR (Direct Server Return)

Configure DSR for improved load balancer performance:

```bash
helm install cilium cilium/cilium \
  --namespace kube-system \
  --version 1.19.4 \
  --set routingMode=native \
  --set kubeProxyReplacement=true \
  --set loadBalancer.mode=dsr \
  --set loadBalancer.dsrDispatch=opt \
  --set loadBalancer.algorithm=maglev
```

## Network Policy Enforcement

Cilium enforces network policies in eBPF for high performance:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend
spec:
  endpointSelector:
    matchLabels:
      app: frontend
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: loadbalancer
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
  egress:
  - toEndpoints:
    - matchLabels:
        app: backend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
  - toFQDNs:
    - matchPattern: "*.example.com"
    toPorts:
    - ports:
      - port: "443"
        protocol: TCP
```

Check policy enforcement:

```bash
# View endpoint policy status
kubectl exec -n kube-system ds/cilium -- \
  cilium-dbg endpoint list

# Get policy details for specific endpoint
kubectl exec -n kube-system ds/cilium -- \
  cilium-dbg endpoint get <endpoint-id>

# Inspect endpoint policy map entries
kubectl exec -n kube-system ds/cilium -- \
  cilium-dbg bpf policy get --all
```

## Hubble for Observability

Enable Hubble for deep network visibility:

```bash
# Install Cilium with Hubble
cilium install \
  --version 1.19.4 \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true

# Enable Hubble metrics
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --version 1.19.4 \
  --reuse-values \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,icmp,http}"

# Port-forward to Hubble UI
cilium hubble ui

# Use Hubble CLI
hubble observe --all

# Filter by pod
hubble observe --pod default/nginx

# Filter by verdict (dropped packets)
hubble observe --verdict DROPPED

# Filter by L7 protocol
hubble observe --protocol http
```

## Performance Tuning

Optimize Cilium for maximum performance:

```yaml
# High-performance configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:
  # Disable tunnel overhead
  routing-mode: "native"
  enable-ipv4: "true"
  enable-ipv6: "false"

  # BPF optimizations
  bpf-map-dynamic-size-ratio: "0.0025"
  bpf-ct-global-tcp-max: "1000000"
  bpf-ct-global-any-max: "500000"
  bpf-nat-global-max: "500000"
  bpf-neigh-global-max: "500000"
  bpf-policy-map-max: "65536"

  # Host routing for best performance
  enable-host-legacy-routing: "false"
  enable-bpf-masquerade: "true"

  # Service load balancing
  kube-proxy-replacement: "true"
  bpf-lb-mode: "dsr"
  bpf-lb-algorithm: "maglev"

  # MTU settings
  mtu: "1500"

  # Bandwidth optimization
  enable-bandwidth-manager: "true"
```

## Bandwidth Management

Cilium's eBPF-based bandwidth manager replaces the traditional bandwidth CNI/TBF approach:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: bandwidth-limited-pod
  annotations:
    kubernetes.io/egress-bandwidth: "10M"
    kubernetes.io/ingress-bandwidth: "10M"
spec:
  containers:
  - name: nginx
    image: nginx
```

Enable bandwidth manager:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --version 1.19.4 \
  --reuse-values \
  --set bandwidthManager.enabled=true
```

## Monitoring Cilium Performance

View Cilium metrics:

```bash
# Enable and port-forward to Cilium agent metrics
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --version 1.19.4 \
  --reuse-values \
  --set prometheus.enabled=true

kubectl port-forward -n kube-system ds/cilium 9962:9962

# Query metrics
curl http://localhost:9962/metrics | grep cilium

# Key metrics to monitor:
# - cilium_bpf_map_ops_total: BPF map operations
# - cilium_drop_count_total: Packet drops by reason
# - cilium_forward_count_total: Forwarded packets
# - cilium_policy_* metrics: Policy enforcement stats
# - cilium_endpoint_*: Endpoint statistics
```

Create Grafana dashboards using Cilium metrics:

```yaml
# ServiceMonitor for Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cilium-agent
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: cilium
  endpoints:
  - port: metrics
    interval: 10s
    path: /metrics
```

## Troubleshooting Performance Issues

Diagnose performance problems:

```bash
# Check BPF program statistics
kubectl exec -n kube-system ds/cilium -- \
  cilium-dbg bpf metrics list

# View dropped packets
kubectl exec -n kube-system ds/cilium -- \
  cilium-dbg monitor --type drop

# Check endpoint health
kubectl exec -n kube-system ds/cilium -- \
  cilium-dbg endpoint health

# View BPF map usage
kubectl exec -n kube-system ds/cilium -- \
  cilium-dbg map list

# Dump connection tracking
kubectl exec -n kube-system ds/cilium -- \
  cilium-dbg bpf ct list

# Check datapath mode
kubectl exec -n kube-system ds/cilium -- \
  cilium-dbg status --verbose | grep Datapath
```

## Best Practices

1. **Use native routing**: Disable tunneling for best performance
2. **Enable kube-proxy replacement**: Leverage eBPF service load balancing
3. **Tune BPF map sizes**: Adjust based on cluster size and workload
4. **Monitor with Hubble**: Get deep visibility without performance impact
5. **Use DSR mode**: For external load balancer performance
6. **Enable bandwidth manager**: Use Cilium's eBPF-based bandwidth manager for traffic shaping
7. **Keep Cilium updated**: Benefit from continuous eBPF optimizations

Cilium with eBPF delivers revolutionary Kubernetes networking performance by executing packet processing logic directly in the kernel. Combined with rich observability through Hubble, Cilium provides both speed and visibility without compromise.
