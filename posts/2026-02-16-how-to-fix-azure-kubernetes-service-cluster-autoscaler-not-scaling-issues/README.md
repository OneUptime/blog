# How to Fix Azure Kubernetes Service Cluster Autoscaler Not Scaling Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, AKS, Kubernetes, Cluster Autoscaler, Scaling, Troubleshooting, Container Orchestration

Description: Diagnose and fix Azure Kubernetes Service cluster autoscaler issues where node pools fail to scale up or down in response to workload demands.

---

The AKS cluster autoscaler is supposed to handle the tedious work of adding and removing nodes based on workload demand. When it works, it is one of the best features of running Kubernetes on Azure. When it does not work, you end up with pods stuck in Pending state for hours while the autoscaler sits idle, or nodes that never scale down despite being mostly empty.

I have debugged cluster autoscaler issues on AKS clusters ranging from 5 to 500 nodes. The root causes fall into a few well-known categories, and once you know what to look for, you can usually fix the problem in minutes.

## How the Cluster Autoscaler Works

The AKS cluster autoscaler checks every 10 seconds (by default) for unschedulable pods. If it finds pods that cannot be scheduled due to insufficient resources, it calculates how many nodes to add and triggers a scale-up. For scale-down, it checks every 10 seconds for nodes that have been underutilized (below 50% resource requests) for more than 10 minutes.

The key phrase there is "resource requests." The autoscaler does not look at actual CPU or memory usage. It looks at the resource requests defined in your pod specs. If your pods do not have resource requests set, the autoscaler has no data to work with.

## Problem: Pods Stuck in Pending but No Scale-Up

This is the most common complaint. You have pods in Pending state, the autoscaler is enabled, but no new nodes are being added.

First, verify the autoscaler is actually enabled on your node pool.

```bash
# Check autoscaler status on all node pools
az aks nodepool list \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --query "[].{name:name, enableAutoScaling:enableAutoScaling, minCount:minCount, maxCount:maxCount, count:count}" \
  -o table
```

If `enableAutoScaling` is false, that is your problem. Enable it.

```bash
# Enable cluster autoscaler on a node pool
az aks nodepool update \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name nodepool1 \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 10
```

If autoscaling is enabled, check the autoscaler's logs to understand why it is not scaling.

```bash
# Get cluster autoscaler logs from the kube-system namespace
kubectl logs -n kube-system -l app=cluster-autoscaler --tail=100
```

Common reasons the autoscaler decides not to scale up:

### Max node count reached

If your node pool is already at its maximum count, the autoscaler cannot add more nodes. Check the current count vs the maximum.

### Pod resource requests exceed any available node SKU

If a pod requests 64 GB of memory but your node pool uses a VM size with only 16 GB, the autoscaler knows it cannot satisfy the request regardless of how many nodes it adds.

### Pod affinity or anti-affinity constraints

If pods have node affinity rules that do not match any node pool, or anti-affinity rules that prevent colocation, the autoscaler may determine that scaling will not help.

### PodDisruptionBudget blocking scheduling

PDBs can prevent the scheduler from placing pods, which confuses the autoscaler in some scenarios.

## Problem: Autoscaler Scale-Up Is Too Slow

Even when the autoscaler decides to scale up, adding a new node takes time. The VM needs to be provisioned, the OS booted, the kubelet registered, and container images pulled. This can take 3-7 minutes on standard AKS configurations.

To speed things up:

**Use smaller container images.** Large images take longer to pull on new nodes. Multi-stage Docker builds and minimal base images reduce pull times.

**Pre-pull images using DaemonSets.** Create a DaemonSet that pulls your application images on every node. When a new node joins, the DaemonSet runs and pulls the images before your application pods are scheduled there.

**Enable overprovisioning.** Deploy low-priority "placeholder" pods that consume resources. When real workloads need those resources, the placeholder pods get evicted, instantly freeing capacity. The autoscaler then scales up to replace the placeholder pods, but your real workload is already running.

```yaml
# Overprovisioning deployment: placeholder pods that keep warm capacity
apiVersion: apps/v1
kind: Deployment
metadata:
  name: overprovisioner
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: overprovisioner
  template:
    metadata:
      labels:
        app: overprovisioner
    spec:
      # Very low priority so real pods preempt these
      priorityClassName: overprovisioner-priority
      containers:
        - name: pause
          image: registry.k8s.io/pause:3.9
          resources:
            requests:
              # Reserve enough for a typical application pod
              cpu: "1"
              memory: "2Gi"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: overprovisioner-priority
value: -1
globalDefault: false
description: "Priority class for overprovisioning pods"
```

## Problem: Nodes Not Scaling Down

The autoscaler scales down nodes that have been underutilized for a configurable period (default 10 minutes). But several conditions can prevent scale-down.

**Pods with local storage.** If a pod uses emptyDir volumes or hostPath volumes, the autoscaler will not evict it by default because the data would be lost.

**Pods without a controller.** Standalone pods (not managed by a Deployment, StatefulSet, or similar controller) block scale-down because the autoscaler cannot recreate them on another node.

**System pods.** Pods in the kube-system namespace block scale-down by default. DaemonSet pods are an exception since they run on every node.

**PodDisruptionBudgets.** If evicting a pod would violate a PDB, the autoscaler skips that node.

Check why a specific node is not being scaled down:

```bash
# Check autoscaler status configmap for detailed scale-down information
kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml
```

To allow scale-down of pods with local storage, add the annotation:

```yaml
# Add this annotation to pods that are safe to evict despite local storage
metadata:
  annotations:
    cluster-autoscaler.kubernetes.io/safe-to-evict: "true"
```

## Problem: Wrong Node Pool Scaling

If you have multiple node pools, the autoscaler might scale the wrong one. For example, you might want GPU workloads to scale the GPU node pool, but the autoscaler scales the CPU node pool instead.

Use node selectors or taints and tolerations to ensure pods are scheduled to the correct node pool.

```yaml
# Ensure this pod only runs on the GPU node pool
spec:
  nodeSelector:
    kubernetes.azure.com/agentpool: gpunodepool
  tolerations:
    - key: "sku"
      operator: "Equal"
      value: "gpu"
      effect: "NoSchedule"
```

## Autoscaler Configuration Tuning

The default autoscaler configuration works for most workloads, but you can tune it through the cluster autoscaler profile.

```bash
# Update autoscaler profile settings
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --cluster-autoscaler-profile \
    scan-interval=10s \
    scale-down-delay-after-add=10m \
    scale-down-unneeded-time=10m \
    scale-down-utilization-threshold=0.5 \
    max-graceful-termination-sec=600 \
    expander=least-waste
```

Key settings:
- **scan-interval**: How often the autoscaler checks for scaling needs
- **scale-down-delay-after-add**: Cooldown after adding a node before allowing scale-down
- **scale-down-unneeded-time**: How long a node must be underutilized before removal
- **scale-down-utilization-threshold**: The utilization threshold below which a node is considered underutilized
- **expander**: Strategy for choosing which node pool to scale (least-waste, random, most-pods, priority)

The cluster autoscaler is a critical component of any production AKS deployment. When it is not working, start by checking whether it is enabled, then look at the autoscaler logs, and finally verify your pod resource requests and scheduling constraints. Most issues come down to missing resource requests, max node limits, or pods blocking scale-down.
