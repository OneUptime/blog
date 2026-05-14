# Cilium kube-proxy Replacement

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Kube-proxy, eBPF, Networking

Description: Replace kube-proxy with Cilium's fully eBPF-based service implementation for better performance, higher scalability, and advanced load balancing features unavailable in iptables.

---

## Introduction

kube-proxy is the default Kubernetes component responsible for implementing Services - it translates Service VIPs to pod IPs by programming iptables, nftables, or IPVS rules on each node. While functional, iptables-based kube-proxy has well-documented scaling limitations: kube-proxy creates rules for Services and endpoints, and clusters with tens of thousands of Pods and Services can spend significant time updating and traversing those rules.

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
helm repo add cilium https://helm.cilium.io/
helm repo update

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

# Delete the ConfigMap as well to avoid kube-proxy being reinstalled during a kubeadm upgrade
kubectl -n kube-system delete cm kube-proxy

# Upgrade Cilium to use full replacement before cleaning up node rules
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<API_SERVER_IP> \
  --set k8sServicePort=6443

# Run on each node with root permissions to clean up rules left by kube-proxy
iptables-save | grep -v KUBE | iptables-restore
```

## Step 3: Verify kube-proxy Replacement

```bash
# Confirm kube-proxy replacement is active
kubectl -n kube-system exec ds/cilium -- \
  cilium-dbg status | grep KubeProxyReplacement

# Expected output:
# KubeProxyReplacement:   True        [eth0 (Direct Routing), eth1]

# View full kube-proxy replacement details
kubectl -n kube-system exec ds/cilium -- \
  cilium-dbg status --verbose

# Verify service handling
kubectl -n kube-system exec ds/cilium -- cilium-dbg service list
```

## Step 4: Validate Service Connectivity

```bash
# Create a test service
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80 --type=NodePort

# Create a client pod for in-cluster tests
kubectl run test-pod --image=curlimages/curl --restart=Never -- sleep 3600

# Test ClusterIP access
kubectl exec test-pod -- curl http://nginx:80

# Test NodePort
NODE_PORT=$(kubectl get svc nginx -o jsonpath='{.spec.ports[0].nodePort}')
curl http://<node-ip>:${NODE_PORT}

# Check the ClusterIP and NodePort entries in Cilium
kubectl -n kube-system exec ds/cilium -- cilium-dbg service list
```

## Step 5: Socket-Level Load Balancing

Cilium's kube-proxy replacement supports socket-level LB - load balancing happens at the connect() syscall before packets enter the network stack:

```bash
# Verify socket LB is enabled
kubectl -n kube-system exec ds/cilium -- \
  cilium-dbg status --verbose | grep "Socket LB"

# Trace socket LB translation events while generating test traffic
kubectl -n kube-system exec ds/cilium -- \
  cilium-dbg monitor -v -t trace-sock
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

Replacing kube-proxy with Cilium's eBPF implementation is one of the highest-impact performance improvements you can make to a Kubernetes cluster. The shift from large iptables rule chains to eBPF map lookups keeps service selection efficient as the number of Services grows, and socket-level load balancing performs service translation before lower-layer packet processing. For clusters with hundreds of services or high connection rates, this replacement can reduce per-connection overhead while also enabling advanced features like DSR (Direct Server Return) and consistent hashing for stateful services.
