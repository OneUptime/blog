# How to Configure Cilium eBPF-Based IPv6 Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cilium, eBPF, IPv6, Kubernetes, CNI, XDP

Description: Configure Cilium's eBPF datapath for IPv6 in Kubernetes, including XDP acceleration, kube-proxy replacement, and eBPF-based IPv6 load balancing.

## Introduction

Cilium uses eBPF programs attached to network interfaces to implement the Kubernetes datapath. For IPv6, Cilium's eBPF programs handle pod-to-pod routing, service load balancing, and network policies entirely in the kernel, bypassing iptables and kube-proxy.

## Installing Cilium with eBPF and IPv6

```bash
# Install Cilium with full eBPF mode and IPv6

helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set ipv4.enabled=false \
  --set ipv6.enabled=true \
  --set ipam.mode=kubernetes \
  --set k8s.requireIPv6PodCIDR=true \
  --set routingMode=native \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=api.example.com \
  --set k8sServicePort=6443 \
  --set ipv6NativeRoutingCIDR="fd00:10::/104" \
  --set autoDirectNodeRoutes=true

# Verify eBPF programs loaded
cilium status --verbose
kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf endpoint list
```

## Cilium eBPF Datapath Internals

```bash
# Show eBPF programs loaded on a node
bpftool prog list | grep cilium

# Show Cilium eBPF maps; IPv6-related maps commonly include lb6/ct6 entries
bpftool map list | grep cilium

# Inspect IPv6 IP-to-identity mappings in the eBPF IPCache
kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf ipcache list | grep ':'

# Show per-endpoint eBPF program attachment
# Cilium attaches endpoint programs via tc/tcx on pod-facing interfaces
ip link show type veth | grep lxc
bpftool net show dev lxc1234abcd

# Trace eBPF execution for debugging
kubectl -n kube-system exec ds/cilium -- cilium-dbg monitor --type trace
```

## XDP Acceleration for IPv6

```bash
# Enable XDP acceleration (requires supported NIC)
# XDP accelerates Cilium's service handling on supported NICs

helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set loadBalancer.acceleration=native  # XDP native mode

# Verify XDP is enabled
kubectl -n kube-system exec ds/cilium -- cilium-dbg status --verbose | grep XDP
# Should show: XDP Acceleration:    Native

# Check XDP program on physical interface
bpftool net show dev eth0
# Look for an xdp attachment on the direct-routing device
```

## IPv6 Kube-Proxy Replacement

```bash
# Verify kube-proxy replacement is active
kubectl -n kube-system exec ds/cilium -- cilium-dbg status | grep KubeProxyReplacement
# KubeProxyReplacement: True

# Check IPv6 service entries in eBPF
kubectl -n kube-system exec ds/cilium -- cilium-dbg service list
# Shows ClusterIP, NodePort, LoadBalancer services
# Each IPv6 service has eBPF LB rules

# Inspect a specific IPv6 service
kubectl get svc my-service -o jsonpath='{.spec.clusterIPs}'
# e.g.: ["fd00:10:96::10"]

kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf lb list --frontends | grep "fd00:10:96"
```

## eBPF-Based Network Policy for IPv6

```yaml
# IPv6 CiliumNetworkPolicy
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-ipv6-frontend-to-backend
spec:
  endpointSelector:
    matchLabels:
      app: backend
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
    - fromEndpoints:
        - {}  # Allow all Cilium-managed endpoints
```

```bash
# Verify policy is enforced via eBPF
kubectl -n kube-system exec ds/cilium -- cilium-dbg endpoint list | grep -E "backend|frontend"
kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf policy list
# Dumps realized eBPF policy maps for local endpoints
```

## Monitoring Cilium IPv6 Performance

```bash
# Hubble flow monitoring
hubble observe --since 1m

# BPF datapath traffic metrics
kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf metrics list | head -20

# Network policy drop counters
hubble observe --since 1m --verdict DROPPED

# Hubble metrics for Prometheus
# Prometheus exports metrics such as cilium_drop_count_total
# and cilium_forward_count_total
```

## Conclusion

Cilium's eBPF datapath provides efficient IPv6 networking for Kubernetes, with optional XDP acceleration on supported NICs. kube-proxy replacement eliminates iptables overhead for IPv6 service routing. Use `cilium-dbg monitor` and Hubble for real-time flow visibility. Monitor pod connectivity and network policy effectiveness with OneUptime synthetic checks.
