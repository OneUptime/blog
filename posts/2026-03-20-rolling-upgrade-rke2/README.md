# How to Perform a Rolling Upgrade of RKE2 - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Rolling Upgrade, Kubernetes, System Upgrade Controller, Zero Downtime, SUSE Rancher

Description: Learn how to perform a zero-downtime rolling upgrade of RKE2 clusters using the System Upgrade Controller to automate node-by-node upgrades with configurable concurrency and drain settings.

---

The System Upgrade Controller (SUC) automates rolling upgrades in self-managed RKE2 clusters by creating upgrade `Plan` resources that upgrade nodes sequentially with configurable concurrency, helping workloads remain available when they are replicated and protected by disruption budgets.

---

## Step 1: Install the System Upgrade Controller

```bash
# Install SUC into the cluster

kubectl apply -f \
  https://github.com/rancher/system-upgrade-controller/releases/latest/download/crd.yaml \
  -f \
  https://github.com/rancher/system-upgrade-controller/releases/latest/download/system-upgrade-controller.yaml

# Verify the controller pod is running
kubectl get pods -n system-upgrade
```

---

## Step 2: Create an Upgrade Plan for Server Nodes

The server plan upgrades control plane nodes first. Set concurrency to 1 to upgrade one at a time:

```yaml
# plan-rke2-server.yaml
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: rke2-server
  namespace: system-upgrade
spec:
  # Target Kubernetes version
  version: v1.34.6+rke2r3

  # Only target nodes labeled as server nodes
  nodeSelector:
    matchExpressions:
      - key: node-role.kubernetes.io/control-plane
        operator: In
        values: ["true"]

  # Upgrade one server at a time
  concurrency: 1

  # Drain the node before upgrading
  drain:
    force: false
    skipWaitForDeleteTimeout: 60

  serviceAccountName: system-upgrade

  upgrade:
    # Use the official RKE2 upgrade image
    image: rancher/rke2-upgrade

  tolerations:
    - key: node-role.kubernetes.io/control-plane
      effect: NoSchedule
      operator: Exists
```

---

## Step 3: Create an Upgrade Plan for Agent Nodes

The agent plan waits for the server plan to complete before starting:

```yaml
# plan-rke2-agent.yaml
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: rke2-agent
  namespace: system-upgrade
spec:
  version: v1.34.6+rke2r3

  nodeSelector:
    matchExpressions:
      - key: node-role.kubernetes.io/control-plane
        operator: DoesNotExist

  # Upgrade up to 2 worker nodes simultaneously
  concurrency: 2

  drain:
    force: false
    skipWaitForDeleteTimeout: 60
    ignoreDaemonSets: true
    deleteEmptydirData: true

  serviceAccountName: system-upgrade

  # Wait for the server plan to complete before upgrading workers
  prepare:
    image: rancher/rke2-upgrade
    args:
      - prepare
      - rke2-server

  upgrade:
    image: rancher/rke2-upgrade
```

---

## Step 4: Apply the Plans

```bash
# Apply server plan first
kubectl apply -f plan-rke2-server.yaml

# Apply agent plan (it will wait for servers to complete)
kubectl apply -f plan-rke2-agent.yaml
```

---

## Step 5: Monitor Upgrade Progress

```bash
# Watch upgrade jobs
kubectl get jobs -n system-upgrade -w

# Check plan status
kubectl get plan -n system-upgrade -o wide

# Check individual node upgrade status
kubectl describe plan rke2-server -n system-upgrade

# Watch nodes being upgraded
kubectl get nodes -w
```

---

## Rollback if Needed

If a node fails to upgrade, delete the upgrade plans to stop the rollout:

```bash
# Stop additional upgrade jobs by deleting the plans
kubectl delete plan rke2-server rke2-agent -n system-upgrade

# Deleting the plans does not roll back an upgraded node
# Restore from an etcd snapshot and roll back the RKE2 binary if the control plane is broken
```

---

## Best Practices

- Set `concurrency: 1` for server nodes - losing two control plane nodes simultaneously can break etcd quorum.
- Use `drain.skipWaitForDeleteTimeout: 60` to avoid waiting indefinitely on pods with a `DeletionTimestamp` older than 60 seconds.
- Apply `PodDisruptionBudgets` to all production deployments before running upgrades.
- Label a canary worker node and upgrade it first before applying the plan to all workers.
