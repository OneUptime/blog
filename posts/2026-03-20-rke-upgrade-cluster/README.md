# How to Upgrade an RKE Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE, Kubernetes, Rancher, Upgrade, Maintenance

Description: Step-by-step instructions for safely upgrading your RKE cluster to a newer Kubernetes version with minimal downtime.

## Introduction

Upgrading your Kubernetes cluster is essential for staying current with security patches, bug fixes, and new features. RKE makes cluster upgrades straightforward by handling rolling updates of control plane and worker node components. This guide walks you through the complete upgrade process with safety checks at each step.

Note: RKE/RKE1 reached end of life on July 31, 2025. Use this process for existing RKE1 clusters that you must maintain, and plan a migration to RKE2 for continued support and security updates.

## Before You Begin

### 1. Review the Kubernetes Version Skew Policy

Kubernetes supports upgrading only one minor version at a time (e.g., 1.26 → 1.27 → 1.28). Never skip minor versions.

### 2. Check Compatibility

```bash
# Check your current Kubernetes version

kubectl version

# Check your current RKE binary version
rke --version

# Review the RKE release notes for the target version
# https://github.com/rancher/rke/releases
```

### 3. Back Up etcd

Always create an etcd snapshot before upgrading:

```bash
# Create an etcd snapshot
rke etcd snapshot-save --name pre-upgrade-snapshot --config cluster.yml

# Verify the snapshot on each etcd node
ETCD_NODE="<etcd-node-address>"
ssh "${ETCD_NODE}" 'sudo ls -lh /opt/rke/etcd-snapshots | grep pre-upgrade-snapshot'
```

### 4. Back Up Configuration Files

```bash
# Back up the cluster state files
cp cluster.yml cluster.yml.bak
cp cluster.rkestate cluster.rkestate.bak
cp kube_config_cluster.yml kube_config_cluster.yml.bak
```

## Step 1: Upgrade the RKE Binary

Download the version of the RKE binary that corresponds to your target Kubernetes version:

```bash
# Download the new RKE binary
RKE_VERSION="v1.5.8"  # Supports the v1.28.8 example below; check releases for your target K8s

curl -LO "https://github.com/rancher/rke/releases/download/${RKE_VERSION}/rke_linux-amd64"
chmod +x rke_linux-amd64

# Test the new binary
./rke_linux-amd64 --version

# Replace the existing binary
sudo mv /usr/local/bin/rke /usr/local/bin/rke.old
sudo mv rke_linux-amd64 /usr/local/bin/rke
```

## Step 2: Update the Kubernetes Version in cluster.yml

```yaml
# cluster.yml - Update the kubernetes_version field
kubernetes_version: "v1.28.8-rancher1-1"  # Updated from v1.27.x
```

Make sure you are not also pinning Kubernetes component images under `system_images`; if both are set, RKE uses `system_images` instead of `kubernetes_version`.

Find available versions:

```bash
# List available Kubernetes versions for the current RKE binary
rke config --list-version --all
```

## Step 3: Check Pre-Upgrade Health

```bash
export KUBECONFIG=kube_config_cluster.yml

# Verify all nodes are healthy before upgrading
kubectl get nodes

# Check for any failed pods
kubectl get pods --all-namespaces --field-selector='status.phase!=Running,status.phase!=Succeeded'

# Check PodDisruptionBudgets that might block the upgrade
kubectl get pdb --all-namespaces
```

## Step 4: Run the Upgrade

```bash
# Run the upgrade (uses the updated cluster.yml)
rke up --config cluster.yml

# The upgrade process:
# 1. Upgrades etcd nodes first, one at a time
# 2. Upgrades control plane nodes
# 3. Upgrades worker components on etcd-only nodes
# 4. Upgrades worker nodes in batches based on max_unavailable_worker
# 5. Upgrades add-ons
```

RKE cordons each node before upgrading it and uncordons it afterward. If `upgrade_strategy.drain: true` is configured, RKE also drains worker nodes before upgrading them.

## Step 5: Monitor the Upgrade Progress

```bash
# In a separate terminal, watch node status
watch kubectl get nodes

# Monitor pod restarts
kubectl get pods --all-namespaces -w

# Check RKE upgrade logs
# (The rke up command outputs progress to stdout)
```

## Step 6: Verify the Upgrade

```bash
# Confirm the new Kubernetes version
kubectl version

# Check all nodes are running the new version
kubectl get nodes -o wide

# Check system pods are healthy
kubectl get pods -n kube-system

# Run a quick smoke test
kubectl run upgrade-test --image=nginx --restart=Never
kubectl get pod upgrade-test
kubectl delete pod upgrade-test
```

## Step 7: Upgrade kubectl (Optional)

Keep your kubectl client within one minor version of the cluster:

```bash
# Download the matching kubectl version
KUBECTL_VERSION="v1.28.8"
curl -LO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/kubectl

# Verify
kubectl version --client
```

## Handling Upgrade Failures

### If the Upgrade Fails Mid-Way

```bash
# Check what failed
rke up --config cluster.yml 2>&1 | tail -50

# Try running rke up again - RKE is idempotent and will retry failed nodes
rke up --config cluster.yml
```

### Restoring from etcd Snapshot

If the upgrade causes critical issues, restore from the pre-upgrade snapshot:

```bash
# Reapply the old cluster.yml with the previous Kubernetes version
cp cluster.yml.bak cluster.yml

# Restore etcd from snapshot
# This deletes the current cluster and rebuilds it from the snapshot.
rke etcd snapshot-restore \
    --name pre-upgrade-snapshot \
    --config cluster.yml
```

## Upgrading a Multi-Node HA Cluster

For HA clusters, the upgrade follows this order:
1. One etcd/control plane node at a time
2. Worker nodes in batches controlled by `max_unavailable_worker` (10% by default, rounded down with a minimum of one node)

```yaml
# Set max-unavailable workers during upgrade (default is 10%)
# This is configured in cluster.yml
upgrade_strategy:
  max_unavailable_worker: "20%"
  max_unavailable_controlplane: 1
  drain: true
  node_drain_input:
    force: false
    ignore_daemonsets: true
    delete_local_data: false
    grace_period: -1
    timeout: 60
```

## Conclusion

Upgrading an RKE cluster is a safe, rolling process when done carefully. Always back up etcd before starting, upgrade one minor version at a time, and monitor the cluster health throughout. RKE's upgrade mechanism handles cordoning and, when configured, node draining while applying rolling updates, minimizing disruption to running workloads. After the upgrade, verify all nodes and pods are healthy before declaring the upgrade complete.
