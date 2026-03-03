# How to Upgrade Kubernetes on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes Upgrade, Cluster Management, k8s, Version Management

Description: A practical walkthrough of upgrading Kubernetes on Talos Linux using talosctl, covering version compatibility, the upgrade process, and post-upgrade verification.

---

Upgrading Kubernetes on a Talos Linux cluster is different from upgrading Kubernetes on a traditional Linux distribution. On Talos, you do not use kubeadm or manually update packages. Instead, you use `talosctl` to update the Kubernetes version in the machine configuration, and Talos handles the rest. This separation between the OS upgrade and the Kubernetes upgrade gives you flexibility and control.

## Understanding the Two-Step Upgrade

On Talos Linux, the operating system and Kubernetes are upgraded independently:

1. **Talos OS upgrade** - Updates the kernel, initramfs, and Talos system components
2. **Kubernetes upgrade** - Updates the Kubernetes control plane and kubelet versions

You can upgrade Talos without changing the Kubernetes version, and you can upgrade Kubernetes without changing the Talos version (within compatibility limits). This guide focuses on the Kubernetes upgrade.

## Checking Current Versions

Before upgrading, know what you are running:

```bash
# Check the current Kubernetes version
kubectl version

# Check Talos version (to verify Kubernetes compatibility)
talosctl version --nodes 192.168.1.10

# Check the kubelet version on each node
kubectl get nodes -o wide

# Example output:
# NAME      STATUS   VERSION   INTERNAL-IP
# cp-01     Ready    v1.29.0   192.168.1.10
# cp-02     Ready    v1.29.0   192.168.1.11
# cp-03     Ready    v1.29.0   192.168.1.12
# worker-01 Ready    v1.29.0   192.168.1.20
```

## Version Compatibility

Each Talos release supports specific Kubernetes versions. Check the Talos documentation or release notes to confirm compatibility:

```bash
# General rule: Talos v1.7.x supports Kubernetes v1.28.x through v1.30.x
# Always verify with the official compatibility matrix
```

Kubernetes itself has upgrade rules: you should only upgrade one minor version at a time. For example, go from v1.28 to v1.29, not directly from v1.28 to v1.30.

## The Kubernetes Upgrade Command

Talos provides a dedicated command for Kubernetes upgrades:

```bash
# Upgrade Kubernetes to a specific version
talosctl upgrade-k8s --nodes 192.168.1.10 \
  --to 1.30.0
```

This command upgrades the Kubernetes components in the correct order:

1. Updates the control plane components (API server, controller manager, scheduler)
2. Updates the kubelet on each node
3. Updates CoreDNS and other add-ons

The `--nodes` flag should point to a control plane node. The command manages the entire cluster-wide upgrade from there.

## Step-by-Step Upgrade Process

### Step 1: Pre-Upgrade Checks

```bash
# Verify cluster health
kubectl get nodes
kubectl get pods -n kube-system

# Check that all nodes are Ready
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}: {.status.conditions[?(@.type=="Ready")].status}{"\n"}{end}'

# Verify etcd health
talosctl etcd status --nodes 192.168.1.10

# Take an etcd snapshot
talosctl etcd snapshot /tmp/etcd-pre-k8s-upgrade.snapshot \
  --nodes 192.168.1.10
```

### Step 2: Perform a Dry Run

Before the actual upgrade, do a dry run to see what will change:

```bash
# Dry run shows what would be upgraded
talosctl upgrade-k8s --nodes 192.168.1.10 \
  --to 1.30.0 --dry-run

# Review the output to understand what changes will be made
```

The dry run output shows the current and target versions for each component, along with any configuration changes that will be applied.

### Step 3: Execute the Upgrade

```bash
# Run the actual upgrade
talosctl upgrade-k8s --nodes 192.168.1.10 \
  --to 1.30.0

# The command will output progress information:
# upgrading kube-apiserver from v1.29.0 to v1.30.0
# upgrading kube-controller-manager from v1.29.0 to v1.30.0
# upgrading kube-scheduler from v1.29.0 to v1.30.0
# upgrading kubelet from v1.29.0 to v1.30.0 on node cp-01
# upgrading kubelet from v1.29.0 to v1.30.0 on node cp-02
# upgrading kubelet from v1.29.0 to v1.30.0 on node cp-03
# upgrading kubelet from v1.29.0 to v1.30.0 on node worker-01
# ...
```

The command handles the upgrade sequentially, waiting for each component to be healthy before moving to the next.

### Step 4: Verify the Upgrade

```bash
# Check that all nodes are running the new version
kubectl get nodes -o wide

# Verify control plane components
kubectl get pods -n kube-system -o wide

# Check the Kubernetes version reported by the API server
kubectl version

# Verify all system pods are running
kubectl get pods -n kube-system --field-selector status.phase!=Running
```

## Upgrading with Custom Kubernetes Images

If you use a private registry or need custom Kubernetes images:

```bash
# Specify a custom image repository
talosctl upgrade-k8s --nodes 192.168.1.10 \
  --to 1.30.0 \
  --apiserver-image myregistry.com/kube-apiserver \
  --controller-manager-image myregistry.com/kube-controller-manager \
  --scheduler-image myregistry.com/kube-scheduler
```

This is common in air-gapped environments where you cannot pull images from public registries.

## What Gets Upgraded

The `talosctl upgrade-k8s` command upgrades these components:

**Control Plane Components:**
- kube-apiserver
- kube-controller-manager
- kube-scheduler

**Node Components:**
- kubelet (on all nodes)
- kube-proxy (if used)

**Add-ons:**
- CoreDNS
- kube-proxy DaemonSet

**What does NOT get upgraded:**
- Talos OS itself (use `talosctl upgrade` for that)
- Container Network Interface (CNI) plugins
- Ingress controllers
- Custom operators and controllers
- Your application workloads

## Upgrading the CNI Separately

Your CNI plugin (Flannel, Cilium, Calico, etc.) is managed separately from the Kubernetes upgrade. After upgrading Kubernetes, you may need to upgrade the CNI to maintain compatibility:

```bash
# Example: Upgrade Cilium after a Kubernetes upgrade
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --version 1.15.0

# Example: Upgrade Flannel
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
```

Check your CNI's compatibility matrix to ensure it supports the new Kubernetes version.

## Handling Upgrade Failures

### API Server Fails to Start

If the API server does not come up after the upgrade:

```bash
# Check API server logs
talosctl logs kube-apiserver --nodes 192.168.1.10

# Check system events
talosctl get events --nodes 192.168.1.10

# If the API server has a configuration issue, you may need to
# revert the Kubernetes version
talosctl upgrade-k8s --nodes 192.168.1.10 --to 1.29.0
```

### Kubelet Fails on Specific Nodes

If some nodes fail to upgrade their kubelet:

```bash
# Check kubelet logs on the affected node
talosctl logs kubelet --nodes 192.168.1.20

# Check the node status
kubectl describe node worker-01

# Sometimes a reboot resolves kubelet issues
talosctl reboot --nodes 192.168.1.20
```

### etcd Issues

If etcd has problems during the upgrade:

```bash
# Check etcd logs
talosctl logs etcd --nodes 192.168.1.10

# Check etcd member status
talosctl etcd members --nodes 192.168.1.10

# If etcd is in a bad state, restore from the pre-upgrade snapshot
talosctl etcd recover --nodes 192.168.1.10 \
  --snapshot /tmp/etcd-pre-k8s-upgrade.snapshot
```

## Post-Upgrade Checklist

Run through this checklist after every Kubernetes upgrade:

```bash
# 1. All nodes running new version
kubectl get nodes -o wide

# 2. All system pods healthy
kubectl get pods -n kube-system

# 3. etcd is healthy
talosctl etcd status --nodes 192.168.1.10

# 4. DNS resolution works
kubectl run test-dns --rm -it --image=busybox -- nslookup kubernetes.default

# 5. Pod scheduling works
kubectl run test-pod --rm -it --image=alpine -- echo "scheduling works"

# 6. Check application health
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# 7. Verify API deprecations
# New Kubernetes versions may remove deprecated APIs
# Check that your manifests use current API versions
```

## Planning Your Upgrade Schedule

A good Kubernetes upgrade cadence for Talos clusters:

- Keep Kubernetes within one minor version of the latest stable release
- Upgrade Talos OS first, then Kubernetes
- Test upgrades in a staging cluster before production
- Schedule upgrades during low-traffic windows
- Allow at least a week between upgrading staging and production

## Conclusion

Upgrading Kubernetes on Talos Linux is a single-command operation that handles the complexity of coordinating component upgrades across the cluster. The `talosctl upgrade-k8s` command upgrades control plane components and kubelets in the correct order while maintaining cluster availability. Always start with pre-upgrade checks and backups, use the dry-run flag to preview changes, and verify everything works after the upgrade completes. Combined with Talos OS upgrades, this gives you a complete, manageable upgrade path for your entire infrastructure.
