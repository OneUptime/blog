# How to Set Up Flux CD on Talos Linux with API Access Only

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Talos Linux, Immutable OS, API-Based Management

Description: Configure Flux CD on Talos Linux, an immutable operating system with API-only access, for a fully declarative and secure GitOps-managed Kubernetes cluster.

---

## Introduction

Talos Linux is a minimal, immutable operating system designed exclusively for running Kubernetes. It has no SSH access, no shell, and no package manager. Every configuration change is made through its gRPC API (`talosctl`), making it one of the most secure and reproducible Linux distributions for Kubernetes. Its immutability keeps the base OS consistent across nodes and helps prevent configuration drift over time.

Flux CD is a natural complement to Talos: if the OS is immutable and API-managed, the workloads running on it should be equally declarative. Together, they create a fully GitOps-managed stack from the OS layer up through application deployment. The key difference from other distributions is that Talos cluster bootstrapping uses `talosctl` and `talosconfig` rather than SSH-based installation scripts.

This guide covers bootstrapping a Talos Linux cluster, generating the kubeconfig, and deploying Flux CD.

## Prerequisites

- Talos Linux nodes (bare metal or VMs with Talos ISO booted)
- `talosctl` and `flux` CLI on your workstation
- Network access from your workstation to the Talos API endpoint (port 50000)
- A Git repository for Flux CD bootstrap

## Step 1: Generate Talos Configuration

```bash
# Generate Talos secrets and configuration for a new cluster

cat > patch.yaml <<EOF
cluster:
  network:
    cni:
      name: none
  proxy:
    disabled: true
EOF

talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @patch.yaml \
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
  # Talos has no SSH - management is entirely via talosctl API
  # No SSH keys needed or supported

cluster:
  # Set the cluster endpoint to the VIP or load balancer
  controlPlane:
    endpoint: https://192.168.1.100:6443
  # Disable Talos-managed Flannel because Cilium will be installed later
  network:
    cni:
      name: none
  # Disable kube-proxy when using Cilium kube-proxy replacement
  proxy:
    disabled: true
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
talosctl config endpoint 192.168.1.101

# Apply control plane configuration (no SSH - pure API)
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
# controlplane-1    NotReady control-plane   5m
# worker-1          NotReady <none>          3m
# worker-2          NotReady <none>          3m
#
# Nodes become Ready after the CNI is installed.
```

## Step 5: Apply CNI (Use Cilium Instead of Default Flannel)

Talos can install Flannel by default, but this guide disabled it in the machine configuration so Cilium can be used instead. Deploy Cilium before bootstrapping Flux:

```bash
# Install Cilium CNI
helm repo add cilium https://helm.cilium.io/
helm repo update
helm install cilium cilium/cilium \
  --version 1.19.3 \
  --namespace kube-system \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true \
  --set securityContext.capabilities.ciliumAgent="{CHOWN,KILL,NET_ADMIN,NET_RAW,IPC_LOCK,SYS_ADMIN,SYS_RESOURCE,DAC_OVERRIDE,FOWNER,SETGID,SETUID}" \
  --set securityContext.capabilities.cleanCiliumState="{NET_ADMIN,SYS_ADMIN,SYS_RESOURCE}" \
  --set cgroup.autoMount.enabled=false \
  --set cgroup.hostRoot=/sys/fs/cgroup \
  --set k8sServiceHost=localhost \
  --set k8sServicePort=7445

# Wait for Cilium to be ready
kubectl wait pods --for=condition=Ready -n kube-system -l k8s-app=cilium --timeout=300s
kubectl get nodes
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

# Flux controllers will usually run on worker nodes when schedulable workers are available
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

- Store `talosconfig` and machine configuration templates in Git (encrypted with SOPS) - the API-only access model makes version-controlled configs essential.
- Use Talos's built-in support for control plane configuration upgrades (`talosctl upgrade-k8s`) rather than manual kubeadm commands.
- Run Talos maintenance and upgrade operations through the API rather than SSH; use `talosctl` from CI or tightly controlled automation with the required Talos credentials.
- Use Cilium with eBPF and kube-proxy replacement on Talos for the most performant and feature-complete networking without OS-level iptables dependencies.
- Set up Talos health monitoring via `talosctl health` in a CronJob managed by Flux to detect node-level issues without SSH access.

## Conclusion

Talos Linux and Flux CD form a uniquely immutable, declarative stack where both the operating system and workloads can be kept close to their declared state. The API-only access model of Talos aligns perfectly with Flux's GitOps philosophy - all changes, from OS kernel parameters to application deployments, flow through version-controlled, auditable processes rather than interactive shell sessions.
