# How to Perform Rolling Cluster Upgrades in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cluster Upgrade, RKE2, Rolling Update, Node Management, Maintenance

Description: Learn how to perform rolling Kubernetes cluster upgrades through Rancher with minimal downtime by upgrading control plane nodes and worker nodes in sequence.

---

Keeping Kubernetes clusters up to date is essential for security and feature access. Rancher makes rolling upgrades manageable by orchestrating node-by-node upgrades with configurable concurrency and health checks.

---

## Before You Upgrade

1. **Review the upgrade path**: Kubernetes supports upgrading one minor version at a time. Do not skip minor versions (e.g., go 1.28 → 1.29 → 1.30, not 1.28 → 1.30).
2. **Backup etcd** before upgrading (see the RKE2/K3s backup guides).
3. **Check node readiness**: all nodes should be `Ready` before starting.
4. **Review release notes** for breaking changes.

```bash
# Verify all nodes are Ready

kubectl get nodes

# Check current Kubernetes version
kubectl version
```

---

## Upgrade via Rancher UI (RKE2 Clusters)

1. In Rancher UI, navigate to **Cluster Management > Your Cluster > Edit Config**.
2. Change the **Kubernetes Version** to the desired target version.
3. Under **Upgrade Strategy**, configure:
   - **Control Plane Concurrency**: `1` (upgrade one control plane node at a time)
   - **Worker Concurrency**: `10%` (upgrade 10% of workers simultaneously)
   - **Drain Nodes**: enable for control plane and worker nodes if you want Rancher to drain nodes before upgrading them
4. Click **Save** - Rancher will orchestrate the rolling upgrade.

---

## Upgrade via kubectl (Manual Method)

For RKE2 clusters not managed by Rancher (or imported clusters with Rancher version management disabled), use the System Upgrade Controller:

```bash
# Install the System Upgrade Controller
kubectl apply -f \
  https://github.com/rancher/system-upgrade-controller/releases/latest/download/crd.yaml -f \
  https://github.com/rancher/system-upgrade-controller/releases/latest/download/system-upgrade-controller.yaml
```

Create a Plan for RKE2 server nodes:

```yaml
# upgrade-rke2-server.yaml
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: rke2-server-upgrade
  namespace: system-upgrade
spec:
  # Target version to upgrade to
  version: v1.30.2+rke2r1
  nodeSelector:
    matchLabels:
      rke2-upgrade: server
  tolerations:
    - operator: Exists
  serviceAccountName: system-upgrade
  upgrade:
    image: rancher/rke2-upgrade
  # Upgrade one control plane node at a time
  concurrency: 1
  # Drain nodes before upgrading
  drain:
    force: false
    skipWaitForDeleteTimeout: 60
```

Label the nodes you want to upgrade:

```bash
# Label control plane nodes
kubectl label node master-1 master-2 master-3 rke2-upgrade=server

# Apply the upgrade plan
kubectl apply -f upgrade-rke2-server.yaml
```

Create a similar plan for worker nodes after control plane completes:

```yaml
# upgrade-rke2-worker.yaml
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: rke2-worker-upgrade
  namespace: system-upgrade
spec:
  version: v1.30.2+rke2r1
  nodeSelector:
    matchLabels:
      rke2-upgrade: worker
  # Wait for the server plan to complete before starting worker upgrades
  prepare:
    image: rancher/rke2-upgrade
    args: ["prepare", "rke2-server-upgrade"]
  serviceAccountName: system-upgrade
  upgrade:
    image: rancher/rke2-upgrade
  concurrency: 2
  drain:
    force: false
```

```bash
# Label worker nodes
kubectl label node worker-1 worker-2 rke2-upgrade=worker

# Apply the worker upgrade plan
kubectl apply -f upgrade-rke2-worker.yaml
```

---

## Monitor Upgrade Progress

```bash
# Watch upgrade jobs
kubectl get jobs -n system-upgrade -w

# Check plan status
kubectl get plan -n system-upgrade

# Verify each node version after upgrade
kubectl get nodes -o wide
```

---

## Rollback Considerations

Kubernetes does not support an in-place API server downgrade. If an upgrade fails:

1. Stop the upgrade by removing the upgrade Plan.
2. Restore etcd from the pre-upgrade backup.
3. Reinstall the previous RKE2 version on affected nodes.

---

## Best Practices

- Schedule upgrades during low-traffic windows and communicate via status pages.
- Test the upgrade on a staging cluster running the same version first.
- Use **PodDisruptionBudgets** on all production workloads to ensure pods are rescheduled gracefully during node drains.
- After upgrade, re-run the **CIS benchmark scan** in Rancher to confirm compliance.
