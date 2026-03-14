# How to Use Cilium with eBPF for High-Performance Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cilium, eBPF, Networking, Performance

Description: Learn how to deploy and configure Cilium with eBPF for high-performance Kubernetes networking, achieving kernel-level packet processing with minimal overhead and advanced observability.

---

Cilium represents a paradigm shift in Kubernetes networking by leveraging eBPF (extended Berkeley Packet Filter) to implement networking, security, and observability directly in the Linux kernel. Unlike traditional CNI plugins that rely on iptables chains and network namespaces, Cilium's eBPF programs process packets at the earliest possible point with near-zero overhead, delivering dramatically better performance especially at scale.

eBPF allows you to run sandboxed programs in the kernel without changing kernel code or loading kernel modules. Cilium uses eBPF to implement services, network policies, load balancing, and observability, bypassing the traditional networking stack's inefficiencies. This approach enables features like socket-level load balancing, transparent encryption, and deep network visibility while maintaining line-rate performance.

## Installing Cilium

Install Cilium using the Cilium CLI:

```bash
# Install Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz
tar xzvfC cilium-linux-amd64.tar.gz /usr/local/bin
rm cilium-linux-amd64.tar.gz

# Install Cilium in Kubernetes cluster
cilium install --version 1.15.0

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
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=strict \
  --set hostServices.enabled=true \
  --set externalIPs.enabled=true \
  --set nodePort.enabled=true \
  --set hostPort.enabled=true \
  --set bpf.masquerade=true \
  --set bpf.hostRouting=true \
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
kubectl exec -n kube-system ds/cilium -- bpftool map dump name cilium_lb4_services
```

## Kube-Proxy Replacement

Cilium can completely replace kube-proxy using eBPF:

```bash
# Install Cilium with kube-proxy replacement
cilium install \
  --version 1.15.0 \
  --set kubeProxyReplacement=strict \
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
- Maglev consistent hashing for better session affinity
- Native support for DSR (Direct Server Return)
- Per-packet load balancing instead of per-connection

Check service load balancing:

```bash
# View BPF service map
kubectl exec -n kube-system ds/cilium -- \
  cilium service list

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
  --set tunnel=disabled \
  --set autoDirectNodeRoutes=true \
  --set ipv4NativeRoutingCIDR=10.0.0.0/8 \
  --set bpf.hostRouting=true
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
  bpf-lb-dsr-l4-xlate: "true"
```

### DSR (Direct Server Return)

Configure DSR for improved load balancer performance:

```bash
helm install cilium cilium/cilium \
  --namespace kube-system \
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
  cilium endpoint list

# Get policy verdict for specific endpoint
kubectl exec -n kube-system ds/cilium -- \
  cilium policy get <endpoint-id>

# Trace policy decision
kubectl exec -n kube-system ds/cilium -- \
  cilium policy trace <source-endpoint> <dest-endpoint>
```

## Hubble for Observability

Enable Hubble for deep network visibility:

```bash
# Install Cilium with Hubble
cilium install \
  --version 1.15.0 \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true

# Enable Hubble metrics
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
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
  tunnel: "disabled"
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
  enable-host-routing: "true"
  enable-bpf-masquerade: "true"

  # Service load balancing
  kube-proxy-replacement: "strict"
  enable-host-port: "true"
  enable-external-ips: "true"
  enable-node-port: "true"
  node-port-mode: "dsr"
  node-port-algorithm: "maglev"

  # MTU settings
  mtu: "1500"
  enable-auto-mtu: "true"

  # Bandwidth optimization
  enable-bandwidth-manager: "true"

  # Connection tracking
  ct-gc-interval: "0"
```

## Bandwidth Management

Cilium's eBPF-based bandwidth manager replaces traditional tc:

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
  --reuse-values \
  --set bandwidthManager.enabled=true
```

## Monitoring Cilium Performance

View Cilium metrics:

```bash
# Port-forward to Cilium agent metrics
kubectl port-forward -n kube-system ds/cilium 9090:9090

# Query metrics
curl http://localhost:9090/metrics | grep cilium

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
  cilium bpf stats

# View dropped packets
kubectl exec -n kube-system ds/cilium -- \
  cilium monitor --type drop

# Check endpoint health
kubectl exec -n kube-system ds/cilium -- \
  cilium endpoint health

# View BPF map usage
kubectl exec -n kube-system ds/cilium -- \
  cilium bpf map list

# Dump connection tracking
kubectl exec -n kube-system ds/cilium -- \
  cilium bpf ct list global

# Check datapath mode
kubectl exec -n kube-system ds/cilium -- \
  cilium status --verbose | grep Datapath
```

## Best Practices

1. **Use native routing**: Disable tunneling for best performance
2. **Enable kube-proxy replacement**: Leverage eBPF service load balancing
3. **Tune BPF map sizes**: Adjust based on cluster size and workload
4. **Monitor with Hubble**: Get deep visibility without performance impact
5. **Use DSR mode**: For external load balancer performance
6. **Enable bandwidth manager**: Replace tc with eBPF for traffic shaping
7. **Keep Cilium updated**: Benefit from continuous eBPF optimizations

Cilium with eBPF delivers revolutionary Kubernetes networking performance by executing packet processing logic directly in the kernel. Combined with rich observability through Hubble, Cilium provides both speed and visibility without compromise.
