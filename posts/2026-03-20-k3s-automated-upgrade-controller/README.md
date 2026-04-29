# How to Upgrade K3s Using the Automated Upgrade Controller

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Upgrade, Automation, DevOps

Description: Learn how to use the System Upgrade Controller to automate K3s upgrades across your cluster with minimal downtime.

## Introduction

Keeping your K3s cluster up to date is critical for security patches, bug fixes, and new features. While manual upgrades are straightforward, the **System Upgrade Controller (SUC)** from Rancher automates the process using Kubernetes-native custom resources called `Plans`. This guide walks you through deploying the controller and configuring upgrade plans for both server and agent nodes.

## Prerequisites

- A running K3s cluster (single-node or multi-node). If the cluster is managed by Rancher, use Rancher's upgrade workflow instead of these steps unless version management has been disabled.
- `kubectl` configured to communicate with your cluster
- Sufficient permissions to deploy cluster-scoped resources

## Step 1: Install the System Upgrade Controller

Deploy the System Upgrade Controller into your cluster using the official manifest:

```bash
# Apply the System Upgrade Controller CRD and controller manifest
kubectl apply \
  -f https://github.com/rancher/system-upgrade-controller/releases/latest/download/crd.yaml \
  -f https://github.com/rancher/system-upgrade-controller/releases/latest/download/system-upgrade-controller.yaml

# Verify the controller pod is running
kubectl get pods -n system-upgrade
```

Wait until the `system-upgrade-controller` pod is in the `Running` state before proceeding.

## Step 2: Verify Your Node Labels

The upgrade plans use node selectors to target specific node roles. In a standard K3s server/agent cluster, control-plane nodes already have the `node-role.kubernetes.io/control-plane=true` label, and agent nodes can be targeted by matching nodes where that label does not exist:

```bash
# Verify control-plane labels
kubectl get nodes -L node-role.kubernetes.io/control-plane
```

## Step 3: Create an Upgrade Plan for Server Nodes

Create a `Plan` resource targeting your K3s server nodes:

Choose a supported target version for your cluster, and do not skip intermediate Kubernetes minor versions.

```yaml
# server-upgrade-plan.yaml
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: k3s-server-upgrade
  namespace: system-upgrade
spec:
  # Replace with the next supported K3s version for your cluster
  version: v1.35.4+k3s1
  serviceAccountName: system-upgrade
  # Number of nodes to upgrade concurrently
  concurrency: 1
  # Only upgrade control-plane nodes
  nodeSelector:
    matchExpressions:
      - key: node-role.kubernetes.io/control-plane
        operator: In
        values:
          - "true"
  upgrade:
    image: rancher/k3s-upgrade
  # Drain the node before upgrading; drain also cordons it
  drain:
    force: true
    skipWaitForDeleteTimeout: 60
```

Apply the plan:

```bash
kubectl apply -f server-upgrade-plan.yaml
```

## Step 4: Create an Upgrade Plan for Agent Nodes

After the server plan is in place, create an agent plan that waits for the server upgrades to complete:

```yaml
# agent-upgrade-plan.yaml
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: k3s-agent-upgrade
  namespace: system-upgrade
spec:
  version: v1.35.4+k3s1
  serviceAccountName: system-upgrade
  # Allow 2 agents to upgrade concurrently
  concurrency: 2
  nodeSelector:
    matchExpressions:
      - key: node-role.kubernetes.io/control-plane
        operator: DoesNotExist
  # Wait for the server plan to complete before upgrading agents
  prepare:
    image: rancher/k3s-upgrade
    args:
      - prepare
      - k3s-server-upgrade
  upgrade:
    image: rancher/k3s-upgrade
  drain:
    force: true
    skipWaitForDeleteTimeout: 60
    # Ignore DaemonSets during drain
    ignoreDaemonSets: true
```

Apply the agent plan:

```bash
kubectl apply -f agent-upgrade-plan.yaml
```

## Step 5: Monitor the Upgrade Progress

Track upgrade progress using kubectl:

```bash
# Watch upgrade jobs being created
kubectl get jobs -n system-upgrade -w

# Check plan status
kubectl get plans -n system-upgrade

# Describe a plan for detailed status
kubectl describe plan k3s-server-upgrade -n system-upgrade

# Check logs of an upgrade job
kubectl logs -n system-upgrade job/<job-name>
```

## Step 6: Using Channel-Based Upgrades

Instead of pinning a specific version, you can track a release channel:

```yaml
# channel-upgrade-plan.yaml
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: k3s-latest-upgrade
  namespace: system-upgrade
spec:
  # Use stable channel instead of a fixed version
  channel: https://update.k3s.io/v1-release/channels/stable
  serviceAccountName: system-upgrade
  concurrency: 1
  nodeSelector:
    matchExpressions:
      - key: node-role.kubernetes.io/control-plane
        operator: In
        values:
          - "true"
  cordon: true
  upgrade:
    image: rancher/k3s-upgrade
```

## Troubleshooting

**Plan not triggering jobs:**
- Verify node labels match the plan's `nodeSelector`
- Check the controller logs: `kubectl logs -n system-upgrade deployment/system-upgrade-controller`

**Job stuck in Pending:**
- Check for resource constraints on the node
- Verify the `rancher/k3s-upgrade` image can be pulled

**Node not draining:**
- Check for pods with strict PodDisruptionBudgets
- Use `force: true` and `ignoreDaemonSets: true` in the plan's `drain` section

## Conclusion

The System Upgrade Controller provides a declarative, Kubernetes-native way to manage K3s upgrades. By defining upgrade `Plans`, you get controlled, rolling upgrades with automatic cordon/drain behavior, reducing the risk of downtime. For production clusters, always test upgrades on a staging environment first and use `concurrency: 1` for server nodes to avoid control plane disruption.
