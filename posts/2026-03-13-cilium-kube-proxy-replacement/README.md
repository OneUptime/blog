# Cilium kube-proxy Replacement

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Kube-proxy, eBPF, Networking

Description: Replace kube-proxy with Cilium's fully eBPF-based service implementation for better performance, higher scalability, and advanced load balancing features unavailable in iptables.

---

## Introduction

kube-proxy is the default Kubernetes component responsible for implementing Services - it translates Service VIPs to pod IPs by programming iptables or IPVS rules on each node. While functional, iptables-based kube-proxy has well-documented scaling limitations: rules are evaluated linearly (O(n) per packet for n rules), updates require a full rule reload, and each Service adds rules that slow down all subsequent packet processing.

Cilium's kube-proxy replacement implements the same Service abstraction using eBPF hash maps, achieving O(1) lookup time regardless of the number of Services or endpoints. The replacement is transparent to applications - they still use Kubernetes Service DNS names and VIPs - but the data plane is dramatically more efficient. Cilium's kube-proxy replacement also enables features that iptables cannot support, such as socket-level load balancing that intercepts connections before they even enter the network stack.

This guide covers deploying Cilium without kube-proxy, verifying the replacement is working correctly, and validating the performance benefits.

## Prerequisites

- Kubernetes cluster (kube-proxy not yet running, or willing to remove it)
- Cilium v1.11+
- Helm v3+
- Linux kernel 5.10+ for full feature support

## Step 1: Install Cilium with kube-proxy Replacement

When bootstrapping a new cluster, deploy Cilium before kube-proxy starts:

```bash
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<API_SERVER_IP> \
  --set k8sServicePort=6443
```

## Step 2: Remove kube-proxy from Existing Cluster

If kube-proxy is already running:

```bash
# Remove kube-proxy DaemonSet
kubectl -n kube-system delete ds kube-proxy

# Clean up iptables rules left by kube-proxy
kubectl -n kube-system exec ds/cilium -- \
  cilium-iptables-save | grep -v "kube-proxy\|KUBE-" | \
  cilium-iptables-restore

# Upgrade Cilium to use full replacement
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set kubeProxyReplacement=true
```

## Step 3: Verify kube-proxy Replacement

```bash
# Confirm kube-proxy replacement is active
cilium status | grep KubeProxyReplacement

# Expected output:
# KubeProxyReplacement: True (socket LB, NodePort, ExternalIPs, HostPort)

# Verify service handling
cilium service list

# Check eBPF load balancer maps are populated
cilium bpf lb list
```

## Step 4: Validate Service Connectivity

```bash
# Create a test service
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80

# Test ClusterIP access
kubectl exec test-pod -- curl http://nginx:80

# Test NodePort
NODE_PORT=$(kubectl get svc nginx -o jsonpath='{.spec.ports[0].nodePort}')
curl http://<node-ip>:${NODE_PORT}

# Check service in Cilium
cilium service get <service-id>
```

## Step 5: Socket-Level Load Balancing

Cilium's kube-proxy replacement supports socket-level LB - load balancing happens at the connect() syscall before packets enter the network stack:

```bash
# Verify socket LB is enabled
cilium status | grep -i "socket"

# Check socket LB entries
kubectl exec -n kube-system cilium-xxxxx -- \
  cilium bpf lb list --frontend | grep -i socket
```

## Architecture Comparison

```mermaid
flowchart TD
    subgraph kube_proxy["kube-proxy (iptables)"]
        A[connect to Service VIP] --> B[iptables DNAT rule]
        B --> C[Rule 1... Rule 2... Rule N]
        C --> D[Backend Pod - O(n) lookup]
    end
    subgraph cilium["Cilium eBPF"]
        E[connect syscall] --> F[eBPF at socket level]
        F --> G[Hash map lookup O(1)]
        G --> H[Backend Pod - direct]
    end
```

## Conclusion

Replacing kube-proxy with Cilium's eBPF implementation is one of the highest-impact performance improvements you can make to a Kubernetes cluster. The shift from O(n) iptables traversal to O(1) eBPF map lookup scales linearly regardless of cluster size, and socket-level load balancing eliminates network hops entirely for local-node services. For clusters with hundreds of services or high connection rates, this replacement can reduce per-connection overhead by orders of magnitude while also enabling advanced features like DSR (Direct Server Return) and consistent hashing for stateful services.
