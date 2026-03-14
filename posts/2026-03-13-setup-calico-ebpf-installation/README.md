# How to Set Up Calico eBPF Installation Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, EBPF, Installation

Description: Install Calico with eBPF data plane enabled from the start, configuring all prerequisites before the first Calico pod runs for an optimal fresh-start deployment.

---

## Introduction

Installing Calico with eBPF from the beginning (as opposed to migrating an existing iptables installation) is cleaner and avoids some of the edge cases that arise when transitioning between data planes. A fresh eBPF installation starts with the kernel BPF subsystem properly configured, kube-proxy disabled before Calico even starts, and all configuration in place so the first calico-node pods come up in eBPF mode immediately.

This guide covers a complete fresh installation of Calico with eBPF enabled on a new Kubernetes cluster, including all prerequisites, the installation order, and initial validation.

## Prerequisites

- New Kubernetes cluster (kubeadm, k3s, or similar) with NO CNI installed yet
- Linux kernel 5.3+ on all nodes (5.10+ recommended)
- `kubectl` with cluster-admin access
- Nodes should be in `NotReady` state (awaiting CNI)

## Step 1: Prepare Nodes

```bash
# Verify all nodes are awaiting CNI (NotReady is expected)
kubectl get nodes
# Expected: NotReady - normal before CNI is installed

# Verify kernel version on each node
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  echo -n "${node}: "
  kubectl debug node/${node} --image=alpine -it --quiet -- uname -r 2>/dev/null | tr -d '\r'
done

# Ensure BPF filesystem is mounted on all nodes
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  kubectl debug node/${node} --image=ubuntu:22.04 -it --quiet -- \
    bash -c 'mount | grep -q bpffs && echo "BPF mounted" || (mount -t bpf bpffs /sys/fs/bpf && echo "BPF mounted (now)")' 2>/dev/null
done
```

## Step 2: Install Kubernetes Without kube-proxy

For clusters where you control the installation:

```bash
# kubeadm install without kube-proxy (Calico eBPF handles service routing)
kubeadm init \
  --skip-phases=addon/kube-proxy \
  --pod-network-cidr=192.168.0.0/16

# Or if already installed, disable kube-proxy
kubectl patch ds kube-proxy -n kube-system \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico-ebpf":"true"}}}}}'
```

## Step 3: Get API Server Endpoint for eBPF ConfigMap

```bash
# Get the real control plane IP (needed for eBPF service routing)
API_SERVER_IP=$(kubectl get endpoints kubernetes -n default \
  -o jsonpath='{.subsets[0].addresses[0].ip}')
API_SERVER_PORT=$(kubectl get endpoints kubernetes -n default \
  -o jsonpath='{.subsets[0].ports[0].port}')
echo "API Server: ${API_SERVER_IP}:${API_SERVER_PORT}"
```

## Step 4: Install Tigera Operator

```bash
CALICO_VERSION=v3.27.0
kubectl create -f \
  https://raw.githubusercontent.com/projectcalico/calico/${CALICO_VERSION}/manifests/tigera-operator.yaml

# Wait for operator to be ready
kubectl rollout status deploy/tigera-operator -n tigera-operator --timeout=120s
```

## Step 5: Create eBPF Configuration Resources

```yaml
# ebpf-install-config.yaml
---
# ConfigMap for Felix to use real API server IP (required for eBPF service routing)
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubernetes-services-endpoint
  namespace: tigera-operator
data:
  KUBERNETES_SERVICE_HOST: "192.168.1.100"  # Replace with real control plane IP
  KUBERNETES_SERVICE_PORT: "6443"

---
# Installation with eBPF enabled
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    linuxDataplane: BPF
    hostPorts: Disabled
    ipPools:
      - cidr: 192.168.0.0/16
        encapsulation: VXLAN
        natOutgoing: Enabled
        nodeSelector: "all()"
  variant: Calico
```

```bash
# Apply all configuration at once
kubectl apply -f ebpf-install-config.yaml

# Monitor installation
kubectl get tigerastatus -w
```

## Step 6: Verify Installation

```bash
# All nodes should become Ready
kubectl get nodes -w

# All calico-system pods should be Running
kubectl get pods -n calico-system

# Verify eBPF mode is active
kubectl exec -n calico-system ds/calico-node -c calico-node -- \
  bpftool prog list | grep -c calico
# Should show 10+ BPF programs

# Test pod connectivity
kubectl run test --image=busybox --restart=Never -- \
  wget -qO- https://kubernetes.default.svc && echo "OK"
```

## Installation Architecture

```mermaid
flowchart LR
    A[kubeadm init\n--skip kube-proxy] --> B[Tigera Operator]
    B --> C[Reads ConfigMap\nKUBERNETES_SERVICE_HOST]
    C --> D[Deploys calico-node\nwith BPF mode]
    D --> E[Loads BPF programs\ninto kernel]
    E --> F[Cluster Ready\nFull eBPF mode]
```

## Conclusion

Installing Calico with eBPF from scratch is the cleanest path to an eBPF-mode cluster. By installing Kubernetes without kube-proxy, setting up the API server endpoint ConfigMap before the first calico-node starts, and specifying `linuxDataplane: BPF` in the Installation resource, you ensure every calico-node comes up in eBPF mode from the first boot. Validate using `bpftool prog list` to confirm BPF programs are loaded before declaring the installation complete.
