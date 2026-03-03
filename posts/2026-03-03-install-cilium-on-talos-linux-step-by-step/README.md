# How to Install Cilium on Talos Linux Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cilium, CNI, Kubernetes, Networking

Description: A complete step-by-step guide to installing and configuring Cilium as your CNI plugin on a Talos Linux Kubernetes cluster.

---

Cilium is one of the most popular CNI (Container Network Interface) plugins for Kubernetes, and it pairs exceptionally well with Talos Linux. Cilium uses eBPF (extended Berkeley Packet Filter) to provide networking, security, and observability at the kernel level, which means better performance and more features than traditional iptables-based CNI solutions. Setting up Cilium on Talos Linux requires some specific configuration because Talos is an immutable OS without SSH access.

This guide walks through every step from preparing your Talos configuration to verifying that Cilium is fully operational.

## Prerequisites

Before installing Cilium, you need:

- A running Talos Linux cluster (or one you are about to create)
- talosctl configured and connected to your cluster
- kubectl configured with cluster access
- Helm installed on your local machine

## Step 1: Configure Talos Linux for Cilium

Talos Linux ships with Flannel as the default CNI. To use Cilium instead, you need to disable the default CNI in your Talos machine configuration. This must be done before or during cluster creation.

Create a patch file for your configuration:

```yaml
# cilium-talos-patch.yaml
cluster:
  network:
    # Disable the default Flannel CNI
    cni:
      name: none
  proxy:
    # Cilium can replace kube-proxy entirely
    disabled: true
```

Apply this patch when generating your Talos configuration:

```bash
# Generate Talos configs with Cilium patches
talosctl gen config my-cluster https://192.168.1.10:6443 \
  --config-patch @cilium-talos-patch.yaml

# Or apply the patch to existing configs
talosctl apply-config --nodes 192.168.1.10 --patch @cilium-talos-patch.yaml
```

If you are applying this to an existing cluster, you need to apply it to all nodes (both control plane and workers):

```bash
# Apply to all control plane nodes
talosctl apply-config --nodes 192.168.1.10 --patch @cilium-talos-patch.yaml
talosctl apply-config --nodes 192.168.1.11 --patch @cilium-talos-patch.yaml
talosctl apply-config --nodes 192.168.1.12 --patch @cilium-talos-patch.yaml

# Apply to worker nodes
talosctl apply-config --nodes 192.168.1.20 --patch @cilium-talos-patch.yaml
talosctl apply-config --nodes 192.168.1.21 --patch @cilium-talos-patch.yaml
```

## Step 2: Configure Kernel Parameters

Cilium needs certain kernel parameters enabled. Talos Linux supports configuring these through the machine config:

```yaml
# kernel-params-patch.yaml
machine:
  sysctls:
    net.ipv4.ip_forward: "1"
    net.ipv6.conf.all.forwarding: "1"
    net.ipv4.conf.all.rp_filter: "0"
    net.ipv4.conf.default.rp_filter: "0"
```

Apply this to all nodes:

```bash
talosctl apply-config --nodes 192.168.1.10 --patch @kernel-params-patch.yaml
```

## Step 3: Install Cilium Using Helm

Add the Cilium Helm repository and install:

```bash
# Add the Cilium Helm repo
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with Talos-compatible settings
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true \
  --set securityContext.capabilities.ciliumAgent="{CHOWN,KILL,NET_ADMIN,NET_RAW,IPC_LOCK,SYS_ADMIN,SYS_RESOURCE,DAC_OVERRIDE,FOWNER,SETGID,SETUID}" \
  --set securityContext.capabilities.cleanCiliumState="{NET_ADMIN,SYS_ADMIN,SYS_RESOURCE}" \
  --set cgroup.autoMount.enabled=false \
  --set cgroup.hostRoot=/sys/fs/cgroup \
  --set k8sServiceHost=localhost \
  --set k8sServicePort=7445
```

Let me explain the key settings:

- `ipam.mode=kubernetes` - Uses Kubernetes-native IP address management
- `kubeProxyReplacement=true` - Cilium handles all kube-proxy functionality
- `securityContext.capabilities` - Required capabilities for running on Talos
- `cgroup.autoMount.enabled=false` - Talos already mounts cgroups
- `cgroup.hostRoot=/sys/fs/cgroup` - Location of cgroup filesystem on Talos
- `k8sServiceHost=localhost` and `k8sServicePort=7445` - Talos proxy for the API server

## Step 4: Verify the Installation

Wait for Cilium pods to start and check their status:

```bash
# Watch Cilium pods come up
kubectl get pods -n kube-system -l app.kubernetes.io/part-of=cilium --watch

# Check that Cilium pods are running on all nodes
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# You should see one cilium pod per node and one cilium-operator pod
```

Install the Cilium CLI for more detailed verification:

```bash
# Install Cilium CLI (macOS)
brew install cilium-cli

# Or download directly
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz
tar xzvf cilium-linux-amd64.tar.gz
sudo mv cilium /usr/local/bin/

# Check Cilium status
cilium status

# Run the connectivity test suite
cilium connectivity test
```

The `cilium status` command should show all components as OK:

```text
    /----\
 /----\    |
|      |   |
|      |   |  Cilium:  OK
|      |   |  Operator: OK
 \----/    |  Hubble:   disabled
    \----/

Deployment  cilium-operator  Desired: 1, Ready: 1/1
DaemonSet   cilium           Desired: 5, Ready: 5/5
```

## Step 5: Verify Networking

Create test pods to verify that pod-to-pod networking works:

```bash
# Create test pods
kubectl run test-1 --image=busybox:1.36 --restart=Never -- sleep 3600
kubectl run test-2 --image=busybox:1.36 --restart=Never -- sleep 3600

# Wait for pods to be ready
kubectl wait --for=condition=Ready pod/test-1 pod/test-2

# Get the IP of test-2
TEST2_IP=$(kubectl get pod test-2 -o jsonpath='{.status.podIP}')

# Test connectivity from test-1 to test-2
kubectl exec test-1 -- ping -c 3 $TEST2_IP

# Test DNS resolution
kubectl exec test-1 -- nslookup kubernetes.default

# Clean up
kubectl delete pod test-1 test-2
```

## Step 6: Enable Optional Features

Cilium has many optional features you might want to enable:

### Enable Hubble (Observability)

```bash
# Upgrade Cilium with Hubble enabled
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true

# Access the Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80
# Open http://localhost:12000 in your browser
```

### Enable WireGuard Encryption

```bash
# Enable transparent encryption between pods
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set encryption.enabled=true \
  --set encryption.type=wireguard
```

## Troubleshooting

If Cilium pods are not starting:

```bash
# Check Cilium agent logs
kubectl logs -n kube-system -l k8s-app=cilium --tail=100

# Check Cilium operator logs
kubectl logs -n kube-system -l app.kubernetes.io/name=cilium-operator --tail=100

# Check if the Cilium agent is reporting any issues
kubectl exec -n kube-system ds/cilium -- cilium status --verbose

# Check BPF maps
kubectl exec -n kube-system ds/cilium -- cilium bpf endpoint list
```

Common issues on Talos Linux:

- **cgroup mount issues** - Make sure `cgroup.autoMount.enabled=false` and `cgroup.hostRoot=/sys/fs/cgroup`
- **API server connectivity** - Use `k8sServiceHost=localhost` and `k8sServicePort=7445` for the Talos proxy
- **Missing capabilities** - Ensure the securityContext capabilities are correctly set

## Summary

Installing Cilium on Talos Linux involves disabling the default CNI and kube-proxy in the Talos configuration, installing Cilium via Helm with Talos-specific settings, and verifying the installation with connectivity tests. The combination of Talos Linux's minimal, secure platform and Cilium's eBPF-powered networking gives you a modern, high-performance Kubernetes cluster. Once Cilium is running, you can enable additional features like Hubble observability and WireGuard encryption as your needs grow.
