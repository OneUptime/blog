# How to Set Up Flux CD on Talos Linux with API Access Only

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Talos Linux, Immutable OS, API-Based Management

Description: Configure Flux CD on Talos Linux, an immutable operating system with API-only access, for a fully declarative and secure GitOps-managed Kubernetes cluster.

---

## Introduction

Talos Linux is a minimal, immutable operating system designed exclusively for running Kubernetes. It has no SSH access, no shell, and no package manager. Every configuration change is made through its gRPC API (`talosctl`), making it one of the most secure and reproducible Linux distributions for Kubernetes. Its immutability means the OS is identical across all nodes and cannot drift over time.

Flux CD is a natural complement to Talos: if the OS is immutable and API-managed, the workloads running on it should be equally declarative. Together, they create a fully GitOps-managed stack from the OS layer up through application deployment. The key difference from other distributions is that Talos cluster bootstrapping uses `talosctl` and `taloscfg` rather than SSH-based installation scripts.

This guide covers bootstrapping a Talos Linux cluster, generating the kubeconfig, and deploying Flux CD.

## Prerequisites

- Talos Linux nodes (bare metal or VMs with Talos ISO booted)
- `talosctl` and `flux` CLI on your workstation
- Network access from your workstation to the Talos API endpoint (port 50000)
- A Git repository for Flux CD bootstrap

## Step 1: Generate Talos Configuration

```bash
# Generate Talos secrets and configuration for a new cluster
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --output-dir ./talos-config

# This creates:
# ./talos-config/controlplane.yaml  - Control plane machine config
# ./talos-config/worker.yaml        - Worker machine config
# ./talos-config/talosconfig        - talosctl client config
```

## Step 2: Customize the Control Plane Configuration

```yaml
# talos-config/controlplane.yaml (relevant sections)
machine:
  type: controlplane
  network:
    hostname: controlplane-1
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.101/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
  # Talos has no SSH — management is entirely via talosctl API
  # No SSH keys needed or supported

cluster:
  # Set the cluster endpoint to the VIP or load balancer
  controlPlane:
    endpoint: https://192.168.1.100:6443
  # Enable cluster discovery for automatic peer formation
  discovery:
    enabled: true
  # Configure etcd for HA
  etcd:
    advertisedSubnets:
      - 192.168.1.0/24
```

## Step 3: Apply Configuration to Talos Nodes

```bash
# Configure the talosctl endpoint
export TALOSCONFIG=./talos-config/talosconfig

# Apply control plane configuration (no SSH — pure API)
talosctl apply-config --insecure \
  --nodes 192.168.1.101 \
  --file ./talos-config/controlplane.yaml

# Apply worker configuration
talosctl apply-config --insecure \
  --nodes 192.168.1.104,192.168.1.105 \
  --file ./talos-config/worker.yaml

# Bootstrap the Kubernetes cluster (run on first control plane only)
talosctl bootstrap --nodes 192.168.1.101
```

## Step 4: Retrieve the Kubeconfig

```bash
# Get the kubeconfig from the Talos API (no SSH needed)
talosctl kubeconfig --nodes 192.168.1.101 ~/.kube/talos-config
export KUBECONFIG=~/.kube/talos-config

# Verify cluster access
kubectl get nodes
# Expected:
# NAME              STATUS   ROLES           AGE
# controlplane-1    Ready    control-plane   5m
# worker-1          Ready    <none>          3m
# worker-2          Ready    <none>          3m
```

## Step 5: Apply CNI (Talos Ships Without One)

Talos does not include a CNI. Deploy Cilium or Calico via `kubectl` before bootstrapping Flux:

```bash
# Install Cilium CNI
helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true \
  --set securityContext.capabilities.ciliumAgent="{CHOWN,KILL,NET_ADMIN,NET_RAW,IPC_LOCK,SYS_ADMIN,SYS_RESOURCE,DAC_OVERRIDE,FOWNER,SETGID,SETUID}"

# Wait for Cilium to be ready
kubectl wait pods --for=condition=Ready -n kube-system -l k8s-app=cilium --timeout=300s
```

## Step 6: Bootstrap Flux CD on Talos

```bash
export GITHUB_TOKEN=ghp_your_github_token

flux bootstrap github \
  --owner=my-org \
  --repository=talos-fleet \
  --branch=main \
  --path=clusters/talos-prod \
  --personal

# Flux controllers will run on worker nodes
kubectl get pods -n flux-system -o wide
```

## Step 7: Manage Talos Configuration Updates via Git

Even Talos OS configuration changes can be managed declaratively. Use the `talos-patch` approach with GitOps:

```yaml
# clusters/talos-prod/talos-patches/kernel-params.yaml
# Apply via: talosctl patch mc --patch @kernel-params.yaml
machine:
  sysctls:
    net.ipv4.tcp_max_syn_backlog: "65536"
    vm.max_map_count: "262144"
```

```bash
# Apply the patch to all nodes
talosctl patch mc \
  --nodes 192.168.1.101,192.168.1.104,192.168.1.105 \
  --patch @clusters/talos-prod/talos-patches/kernel-params.yaml
```

## Best Practices

- Store `talosconfig` and machine configuration templates in Git (encrypted with SOPS) — the API-only access model makes version-controlled configs essential.
- Use Talos's built-in support for control plane configuration upgrades (`talosctl upgrade-k8s`) rather than manual kubeadm commands.
- Configure Talos node maintenance windows via the API rather than SSH; use `talosctl` commands in Kubernetes Jobs for automated maintenance tasks.
- Use Cilium with eBPF and kube-proxy replacement on Talos for the most performant and feature-complete networking without OS-level iptables dependencies.
- Set up Talos health monitoring via `talosctl health` in a CronJob managed by Flux to detect node-level issues without SSH access.

## Conclusion

Talos Linux and Flux CD form a uniquely immutable, declarative stack where neither the operating system nor the workloads can drift from their declared state. The API-only access model of Talos aligns perfectly with Flux's GitOps philosophy — all changes, from OS kernel parameters to application deployments, flow through version-controlled, auditable processes rather than interactive shell sessions.
