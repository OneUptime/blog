# How to Set Up AKS Cluster Autoscaler with Custom Scale-Down Delay and Utilization Thresholds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Kubernetes, Cluster Autoscaler, Azure, Auto Scaling, Cost Optimization, Cloud Infrastructure

Description: Learn how to configure the AKS cluster autoscaler with custom scale-down delays and utilization thresholds to balance performance and cost.

---

Running Kubernetes workloads on Azure Kubernetes Service (AKS) gets expensive fast if your cluster is over-provisioned. The cluster autoscaler helps by adding and removing nodes based on demand, but the default settings are rarely ideal for production workloads. This guide walks through configuring the autoscaler with custom scale-down delays and utilization thresholds so your cluster responds appropriately to traffic patterns.

## Why Default Autoscaler Settings Fall Short

Out of the box, the AKS cluster autoscaler uses conservative defaults. The scale-down delay after a scale-up event is 10 minutes. The utilization threshold - the point below which a node becomes a candidate for removal - sits at 50%. For many workloads, especially those with bursty traffic or long startup times, these defaults lead to either too-aggressive scaling or wasted resources.

Consider an application that handles batch processing jobs every hour. With default settings, the autoscaler might scale down nodes right before the next batch arrives, causing pods to sit in Pending state while new nodes spin up. Tuning the delay and threshold values prevents this kind of thrashing.

## Prerequisites

Before diving in, make sure you have the following ready:

- An AKS cluster running Kubernetes 1.24 or later
- Azure CLI version 2.40 or newer installed
- kubectl configured to point at your AKS cluster
- Contributor or Owner role on the AKS resource

## Enabling the Cluster Autoscaler on a Node Pool

If you have not yet enabled the autoscaler on your node pool, start here. The following command enables it on the default node pool with a minimum of 2 nodes and a maximum of 10.

```bash
# Enable cluster autoscaler on the default node pool
# --min-count sets the floor, --max-count sets the ceiling
az aks nodepool update \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name nodepool1 \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 10
```

This turns on the autoscaler with default settings. The next step is customizing the behavior.

## Understanding Key Autoscaler Parameters

The autoscaler exposes several parameters through the AKS cluster profile. Here are the ones that matter most for scale-down behavior:

- **scan-interval**: How often the autoscaler evaluates the cluster (default: 10s)
- **scale-down-delay-after-add**: Time to wait after a scale-up before considering scale-down (default: 10m)
- **scale-down-delay-after-delete**: Time to wait after a node deletion before trying again (default: scan-interval)
- **scale-down-delay-after-failure**: Time to wait after a failed scale-down attempt (default: 3m)
- **scale-down-unneeded-time**: How long a node must be underutilized before removal (default: 10m)
- **scale-down-utilization-threshold**: The utilization level below which a node is considered underutilized (default: 0.5)

## Configuring Custom Scale-Down Delay

The scale-down delay after an add event is the most commonly tuned parameter. If your workloads need time to stabilize after a scale-up - for example, because pods take several minutes to become ready - you want a longer delay.

The following command sets the scale-down delay after add to 20 minutes and the unneeded time to 15 minutes.

```bash
# Update the autoscaler profile with custom scale-down delays
# scale-down-delay-after-add: wait 20 minutes after adding a node before considering removal
# scale-down-unneeded-time: node must be underutilized for 15 minutes before removal
az aks update \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --cluster-autoscaler-profile \
    scale-down-delay-after-add=20m \
    scale-down-unneeded-time=15m \
    scale-down-delay-after-failure=5m
```

With these settings, the autoscaler waits 20 minutes after adding a node before it even considers removing any node. Once a node is flagged as underutilized, it must stay that way for 15 minutes before the autoscaler actually removes it.

## Setting Custom Utilization Thresholds

The utilization threshold determines when a node is considered a candidate for removal. The default of 0.5 means a node must be using less than 50% of its requested resources to be eligible for scale-down.

For workloads that need headroom - like web applications that handle sudden traffic spikes - you might want a lower threshold. For batch processing clusters where cost is the priority, a higher threshold works better.

```bash
# Set the utilization threshold to 0.65 (65%)
# Nodes using less than 65% of requested resources become scale-down candidates
az aks update \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --cluster-autoscaler-profile \
    scale-down-utilization-threshold=0.65
```

Setting the threshold to 0.65 means nodes need to be less than 65% utilized before the autoscaler considers removing them. This is more aggressive about reclaiming unused capacity.

## Combining Multiple Parameters

In practice, you will tune multiple parameters together. Here is a complete configuration for a production workload that processes periodic batch jobs and serves API traffic.

```bash
# Full autoscaler profile for a mixed workload cluster
# Balances cost savings with stability for bursty traffic
az aks update \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --cluster-autoscaler-profile \
    scan-interval=30s \
    scale-down-delay-after-add=15m \
    scale-down-delay-after-delete=10s \
    scale-down-delay-after-failure=5m \
    scale-down-unneeded-time=10m \
    scale-down-utilization-threshold=0.6 \
    max-graceful-termination-sec=600 \
    skip-nodes-with-local-storage=false \
    skip-nodes-with-system-pods=true
```

Breaking this down:

- The scan interval is set to 30 seconds, which is a good balance between responsiveness and API load.
- After adding a node, the autoscaler waits 15 minutes before considering removals.
- After a deletion, it only waits 10 seconds before looking for the next candidate.
- Nodes must be under 60% utilized for 10 minutes to be removed.
- Pods get up to 10 minutes (600 seconds) for graceful termination during scale-down.
- Nodes with local storage can be removed (useful for ephemeral caches).
- Nodes running system pods are protected from removal.

## Verifying Your Configuration

After updating the profile, verify that the settings took effect.

```bash
# Check the current autoscaler profile settings
az aks show \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --query "autoScalerProfile" \
  --output table
```

You should see your custom values reflected in the output. If any value still shows the default, double-check the parameter names for typos.

## Monitoring Autoscaler Behavior

Once the autoscaler is configured, you need visibility into its decisions. The autoscaler writes events to the cluster that you can inspect with kubectl.

```bash
# View recent autoscaler events
# Look for ScaleUp and ScaleDown events
kubectl get events --field-selector reason=ScaleUp -A
kubectl get events --field-selector reason=ScaleDown -A
```

For deeper insight, check the autoscaler status configmap.

```bash
# View the autoscaler status configmap
# This shows the current state of each node group
kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml
```

The status configmap includes details about scale-up and scale-down candidates, which helps you understand whether your threshold settings are working as expected.

## Common Pitfalls

**Pod Disruption Budgets blocking scale-down**: If you have PDBs that prevent pod eviction, the autoscaler cannot remove nodes even when they are underutilized. Check your PDBs if nodes are not being removed as expected.

**DaemonSet resource requests inflating utilization**: DaemonSet pods run on every node and their resource requests count toward utilization. If your DaemonSets request significant resources, the utilization calculation may never drop below your threshold. Account for DaemonSet overhead when setting the threshold.

**System pods preventing node removal**: By default, the autoscaler will not remove nodes running kube-system pods. If you set `skip-nodes-with-system-pods=true`, some nodes may never scale down. Consider using pod anti-affinity rules to spread system pods across fewer nodes.

## Tuning Tips for Specific Workload Types

For **web applications** with unpredictable traffic, use a lower utilization threshold (0.4-0.5) and a longer scale-down delay (15-20 minutes). This keeps spare capacity available for sudden spikes.

For **batch processing** workloads with predictable schedules, use a higher utilization threshold (0.7-0.8) and a shorter scale-down delay (5-10 minutes). Cost savings matter more than instant availability.

For **mixed workloads**, use separate node pools with different autoscaler configurations. You can set the autoscaler min/max per node pool, and the cluster-level profile applies to all pools.

## Wrapping Up

The AKS cluster autoscaler is a powerful tool, but only when its parameters match your workload patterns. Start with the defaults, monitor the autoscaler's decisions for a few days, and then adjust the scale-down delay and utilization threshold based on what you observe. The goal is finding the balance between cost efficiency and having enough headroom to handle traffic without pod scheduling delays. Small adjustments to these two parameters can make a big difference in both your cloud bill and your application's responsiveness.
