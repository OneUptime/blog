# How to Upgrade RKE2 Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Upgrade, Maintenance, Rancher

Description: A comprehensive guide to upgrading RKE2 clusters safely, covering both manual upgrades and automated upgrades using the system-upgrade-controller.

Keeping your RKE2 cluster up to date is essential for security patches, bug fixes, and new features. RKE2 supports several upgrade methods, from manual upgrades to automated rolling upgrades using the system-upgrade-controller. This guide covers all upgrade approaches with best practices for production environments.

## Prerequisites

- An operational RKE2 cluster
- Backup of etcd (critical before any upgrade)
- Understanding of the current and target RKE2 versions, including Kubernetes version skew rules
- Maintenance window scheduled (for production)

## Before Upgrading: Preparation Checklist

```bash
# 1. Check current RKE2 version

rke2 --version
kubectl version

# 2. Take an etcd backup before upgrading
sudo rke2 etcd-snapshot save \
  --name pre-upgrade-$(date +%Y%m%d-%H%M%S)

# Verify snapshot was created
ls -lh /var/lib/rancher/rke2/server/db/snapshots/

# 3. Check cluster health before upgrade
kubectl get nodes
kubectl get pods -A --field-selector='status.phase!=Running,status.phase!=Succeeded'

# 4. Review the RKE2 release notes for the target version
# Check: https://github.com/rancher/rke2/releases
# Do not skip unsupported intermediate Kubernetes minor versions.

# 5. Check workload pod disruption budgets
kubectl get pdb -A
```

## Method 1: Manual Upgrade

### Upgrade Server (Control Plane) Nodes

```bash
# On each server node (one at a time):

# 1. Download the new RKE2 version
RKE2_VERSION="v1.34.6+rke2r3"

# Using the installation script (handles proper upgrade)
curl -sfL https://get.rke2.io | \
  INSTALL_RKE2_VERSION=$RKE2_VERSION sh -

# 2. Restart RKE2 server to apply the new version
sudo systemctl restart rke2-server

# 3. Verify the upgrade succeeded
rke2 --version
kubectl get nodes

# 4. Wait for the node to return to Ready state before upgrading next server
kubectl wait node/<node-name> --for=condition=Ready --timeout=300s

# 5. Repeat for each server node
```

### Upgrade Agent (Worker) Nodes

```bash
# On each agent/worker node (drain first to minimize workload disruption):

# 1. Drain the node to move workloads elsewhere
kubectl drain <worker-node> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=300s

# 2. Download and install the new version
RKE2_VERSION="v1.34.6+rke2r3"
curl -sfL https://get.rke2.io | \
  INSTALL_RKE2_VERSION=$RKE2_VERSION \
  INSTALL_RKE2_TYPE=agent sh -

# 3. Restart the agent
sudo systemctl restart rke2-agent

# 4. Wait for node to be ready
kubectl wait node/<worker-node> --for=condition=Ready --timeout=300s

# 5. Uncordon the node
kubectl uncordon <worker-node>

# 6. Verify workloads are running
kubectl get pods -A -o wide --field-selector "spec.nodeName=<worker-node>"
```

## Method 2: Automated Upgrade with system-upgrade-controller

### Install the System Upgrade Controller

```bash
# Install the system-upgrade-controller
kubectl apply -f \
  https://github.com/rancher/system-upgrade-controller/releases/latest/download/crd.yaml \
  -f \
  https://github.com/rancher/system-upgrade-controller/releases/latest/download/system-upgrade-controller.yaml

# Verify the controller is running
kubectl get pods -n system-upgrade
```

### Create Server Upgrade Plan

```yaml
# rke2-server-upgrade-plan.yaml - Automated server node upgrade
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: rke2-server-upgrade
  namespace: system-upgrade
spec:
  # The target RKE2 version
  version: v1.34.6+rke2r3

  # Number of nodes to upgrade simultaneously
  concurrency: 1

  # Only upgrade when nodes are ready
  nodeSelector:
    matchExpressions:
    # Only upgrade server/control-plane nodes
    - key: node-role.kubernetes.io/control-plane
      operator: In
      values: ["true"]

  # Cordon and drain the node before upgrading
  drain:
    force: false
    ignoreDaemonSets: true
    deleteEmptydirData: false
    timeout: 300s

  serviceAccountName: system-upgrade

  upgrade:
    # Use the RKE2 upgrade image
    image: rancher/rke2-upgrade

  tolerations:
  - key: "node-role.kubernetes.io/control-plane"
    operator: "Exists"
    effect: "NoSchedule"
```

```yaml
# rke2-agent-upgrade-plan.yaml - Automated agent node upgrade
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: rke2-agent-upgrade
  namespace: system-upgrade
spec:
  version: v1.34.6+rke2r3

  # Wait for server nodes to finish upgrading first
  prepare:
    image: rancher/rke2-upgrade
    args:
    - prepare
    - rke2-server-upgrade

  # Upgrade 2 worker nodes at a time
  concurrency: 2

  nodeSelector:
    matchExpressions:
    # Only upgrade worker/agent nodes
    - key: node-role.kubernetes.io/control-plane
      operator: DoesNotExist

  drain:
    force: false
    ignoreDaemonSets: true
    deleteEmptydirData: true
    timeout: 300s

  serviceAccountName: system-upgrade

  upgrade:
    image: rancher/rke2-upgrade
```

```bash
# Apply the upgrade plans
kubectl apply -f rke2-server-upgrade-plan.yaml
kubectl apply -f rke2-agent-upgrade-plan.yaml

# Monitor upgrade progress
kubectl get plans -n system-upgrade
kubectl get jobs -n system-upgrade -w

# Watch node upgrades
kubectl get nodes -w
```

## Post-Upgrade Verification

```bash
# Verify all nodes are running the new version
kubectl get nodes -o custom-columns=NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion

# Check that all pods are running
kubectl get pods -A --field-selector='status.phase!=Running,status.phase!=Succeeded'

# Verify RKE2 version
rke2 --version

# Run a CIS scan if applicable
# List available profiles and choose one that matches your RKE2/Kubernetes version
kubectl get clusterscanprofiles.compliance.cattle.io

kubectl apply -f - <<EOF
apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: post-upgrade-scan
spec:
  scanProfileName: cis-1.10-profile
EOF
```

## Conclusion

Upgrading RKE2 clusters requires careful preparation, proper ordering (server nodes first, then agent nodes), and validation at each step. The system-upgrade-controller automates this process while helping maintain availability through proper drain and uncordon operations when workloads are replicated and protected by disruption budgets. Always take an etcd backup before upgrading and test the upgrade process in a non-production environment first. Rancher provides additional tools for managing cluster upgrades across multiple clusters simultaneously.
