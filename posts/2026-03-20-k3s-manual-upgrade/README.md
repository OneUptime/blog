# How to Upgrade K3s Manually

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Upgrade, DevOps, Linux

Description: A step-by-step guide to manually upgrading K3s server and agent nodes to a new version with minimal disruption.

## Introduction

While automated upgrade controllers are great for CI/CD pipelines, sometimes a manual, controlled upgrade is preferred - especially in production environments where you want explicit human oversight of each step. This guide covers the complete process for manually upgrading both K3s server and agent nodes.

## Prerequisites

- Access to all K3s nodes via SSH
- `kubectl` configured and working
- Knowledge of your current K3s version: `k3s --version`
- A maintenance window planned

## Step 1: Check Current Version and Target Version

Before upgrading, verify your current cluster state:

```bash
# Check current K3s version on each node

k3s --version

# Check Kubernetes version from the API
kubectl version

# List all nodes and their versions
kubectl get nodes -o wide

# Check the latest K3s release (or browse GitHub releases for other versions)
curl -s https://api.github.com/repos/k3s-io/k3s/releases/latest | grep tag_name
```

## Step 2: Back Up Your Cluster Data

Always back up before upgrading:

```bash
# On a K3s server node, back up the datastore and server token
# For SQLite (default on single-server clusters), back up the entire DB directory:
cp -a /var/lib/rancher/k3s/server/db /var/lib/rancher/k3s/server/db.backup

# For embedded etcd:
k3s etcd-snapshot save --name pre-upgrade-snapshot

# Back up the server token as well; it is required to restore from backup
cp /var/lib/rancher/k3s/server/token /var/lib/rancher/k3s/server/token.backup

# If you use embedded etcd, verify the snapshot was created
k3s etcd-snapshot list
```

## Step 3: Drain the First Server Node

Cordon and drain the server node you are upgrading first:

```bash
# Get the node name
kubectl get nodes

# Cordon the node (prevent new pods from being scheduled)
kubectl cordon <server-node-name>

# Drain the node (evict all pods gracefully)
kubectl drain <server-node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --force \
  --timeout=120s
```

## Step 4: Upgrade the K3s Server Binary

SSH into the server node and run the upgrade:

```bash
# Re-run the installer with the same K3S_ variables and extra arguments
# you originally used so your existing service configuration is preserved
# Replace v1.29.3+k3s1 with your target version
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_VERSION=v1.29.3+k3s1 \
  <EXISTING_K3S_ENV> \
  sh -s - <EXISTING_K3S_ARGS>

# The installer will automatically:
# 1. Download the new binary
# 2. Replace the existing binary
# 3. Restart the k3s service
```

Alternatively, download the binary manually:

```bash
# Download specific version binary
curl -Lo /usr/local/bin/k3s \
  https://github.com/k3s-io/k3s/releases/download/v1.29.3+k3s1/k3s

# Make it executable
chmod +x /usr/local/bin/k3s

# Restart K3s service
systemctl restart k3s

# Verify new version
k3s --version
```

## Step 5: Verify the Server Node is Ready

After the service restarts, verify the node comes back healthy:

```bash
# Wait for the node to become Ready (run from any node with kubectl)
kubectl wait --for=condition=Ready node/<server-node-name> --timeout=120s

# Uncordon the node
kubectl uncordon <server-node-name>

# Confirm the node version is updated
kubectl get nodes -o wide
```

## Step 6: Upgrade Agent Nodes

Repeat the drain/upgrade process for each agent node:

```bash
# On the control plane, cordon and drain the agent
kubectl cordon <agent-node-name>
kubectl drain <agent-node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --force

# SSH to the agent node and upgrade
ssh user@<agent-node-ip>

# Re-run the installer with the same K3S_URL, K3S_TOKEN, and any other
# K3S_ variables or extra arguments you originally used
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_VERSION=v1.29.3+k3s1 \
  <EXISTING_K3S_ENV> \
  sh -s - <EXISTING_K3S_ARGS>

# Back on the control plane, wait for the node to become Ready again
kubectl wait --for=condition=Ready node/<agent-node-name> --timeout=120s

# Back on the control plane, uncordon the agent
kubectl uncordon <agent-node-name>
```

## Step 7: Verify the Full Cluster

After all nodes are upgraded:

```bash
# Verify all nodes are on the new version and Ready
kubectl get nodes -o wide

# Check that all system pods are running
kubectl get pods -n kube-system

# Run a quick smoke test
kubectl run test-pod --image=nginx --restart=Never
kubectl get pod test-pod
kubectl delete pod test-pod
```

## Rolling Back

If something goes wrong, restore from backup and reinstall the previous version:

```bash
# Reinstall the previous version on the affected server node, but do not start it yet
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_VERSION=v1.28.8+k3s1 \
  INSTALL_K3S_SKIP_START=true \
  <EXISTING_K3S_ENV> \
  sh -s - <EXISTING_K3S_ARGS>

# For single-server clusters using SQLite, stop K3s and restore the DB directory and token
systemctl stop k3s
rm -rf /var/lib/rancher/k3s/server/db
cp -a /var/lib/rancher/k3s/server/db.backup \
      /var/lib/rancher/k3s/server/db
cp /var/lib/rancher/k3s/server/token.backup \
   /var/lib/rancher/k3s/server/token
systemctl start k3s
```

For embedded etcd clusters, restore the snapshot with the documented `k3s server --cluster-reset --cluster-reset-restore-path=<snapshot-path>` procedure instead of copying SQLite files.

## Conclusion

Manual K3s upgrades give you full control over the process. Always upgrade servers before agents, back up your data beforehand, and verify each node before moving to the next. For clusters with multiple server nodes in HA mode, upgrade one server at a time to maintain quorum throughout the process.
