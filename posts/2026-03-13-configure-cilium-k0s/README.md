# Configure Cilium on k0s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, k0s, kubernetes, cni, networking, lightweight

Description: A guide to deploying and configuring Cilium as the CNI on k0s, the lightweight Kubernetes distribution, for production-grade networking with minimal overhead.

---

## Introduction

k0s is a lightweight, single-binary Kubernetes distribution designed for simplicity and minimal resource overhead. It supports pluggable CNI providers, making it an excellent platform for running Cilium in edge, IoT, and resource-constrained environments.

Cilium on k0s provides the same eBPF-based networking and policy capabilities as on any other Kubernetes distribution, with the added benefit of k0s's streamlined operational model. The combination is particularly popular for edge deployments where both k0s's low overhead and Cilium's efficient eBPF datapath are valuable.

This guide walks through installing k0s with Cilium as the CNI, configuring Cilium for k0s's directory structure, and verifying the installation.

## Prerequisites

- Linux nodes with kernel 4.19+ (5.10+ recommended for full Cilium features)
- `k0s` binary downloaded and installed
- `kubectl` and `cilium` CLI available
- Root or sudo access on cluster nodes

## Step 1: Install k0s Without a Default CNI

Configure k0s to skip its default CNI so Cilium can be installed separately.

```bash
# Download k0s (replace with the latest version)
curl -sSLf https://get.k0s.sh | sudo sh

# Create k0s configuration that disables the default CNI
sudo mkdir -p /etc/k0s
```

```yaml
# /etc/k0s/k0s.yaml
# k0s configuration with no CNI (Cilium will be installed separately)
apiVersion: k0s.k0sproject.io/v1beta1
kind: ClusterConfig
metadata:
  name: k0s
spec:
  network:
    # Disable k0s's default CNI (kube-router)
    provider: custom
    podCIDR: "10.244.0.0/16"
    serviceCIDR: "10.96.0.0/12"
    # Disable kube-proxy — Cilium will replace it with eBPF
    kubeProxy:
      disabled: true
  # Disable the default CoreDNS; Cilium will manage DNS
  extensions:
    helm:
      repositories:
      - name: cilium
        url: https://helm.cilium.io/
      charts:
      - name: cilium
        chartname: cilium/cilium
        version: "1.15.3"
        namespace: kube-system
        values: |
          kubeProxyReplacement: true
          k8sServiceHost: 127.0.0.1
          k8sServicePort: "6443"
          ipam:
            mode: kubernetes
          tunnel: vxlan
```

## Step 2: Start k0s Controller

Initialize the k0s controller node.

```bash
# Install and start k0s as a systemd service
sudo k0s install controller --config /etc/k0s/k0s.yaml
sudo k0s start

# Monitor k0s startup
sudo k0s status

# Get the admin kubeconfig
sudo k0s kubeconfig admin > ~/.kube/k0s-config.yaml
export KUBECONFIG=~/.kube/k0s-config.yaml

# Wait for the API server to be ready
kubectl wait --for=condition=Ready node --all --timeout=5m
```

## Step 3: Install Cilium on k0s

Deploy Cilium using Helm with k0s-specific configuration.

```bash
# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium configured for k0s
# Note: k0s runs the API server on localhost:6443 by default
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=127.0.0.1 \
  --set k8sServicePort=6443 \
  --set ipam.mode=kubernetes \
  --set tunnel=vxlan \
  --set operator.replicas=1

# Wait for Cilium to be ready
kubectl wait --for=condition=Ready pod -l k8s-app=cilium \
  -n kube-system --timeout=5m
```

## Step 4: Join Worker Nodes

Add worker nodes to the k0s cluster.

```bash
# Generate a join token on the controller
sudo k0s token create --role worker > worker-token.txt

# On each worker node — install k0s and join
sudo k0s install worker --token-file worker-token.txt
sudo k0s start

# Verify nodes join the cluster
kubectl get nodes --watch
```

## Step 5: Verify Cilium and Run Connectivity Tests

Confirm Cilium is operating correctly on k0s.

```bash
# Check Cilium status
cilium status

# Run the full connectivity test suite
cilium connectivity test

# Verify kube-proxy replacement (Cilium handles service load balancing)
cilium status | grep KubeProxyReplacement

# Enable Hubble for observability
cilium hubble enable
cilium hubble ui
```

## Best Practices

- Use k0s's built-in Helm extension to install Cilium declaratively — it integrates with k0s's lifecycle management
- Enable kube-proxy replacement from the start — it reduces resource usage and improves latency
- On resource-constrained edge nodes, set `operator.replicas=1` to reduce overhead
- Use the `kubernetes` IPAM mode on k0s to align with the pod CIDR configured in k0s's ClusterConfig
- Monitor node kernel version compatibility — Cilium's eBPF features have minimum kernel version requirements

## Conclusion

Cilium on k0s is an excellent combination for lightweight, production-grade Kubernetes deployments. k0s's simple operational model pairs well with Cilium's efficient eBPF datapath, and together they provide a Kubernetes platform that is both low-overhead and enterprise-capable. The kube-proxy replacement feature makes this combination particularly attractive for edge environments where every CPU cycle and MB of memory counts.
