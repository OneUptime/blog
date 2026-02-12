# How to Troubleshoot EKS Pod Scheduling Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes, Troubleshooting, DevOps

Description: A practical troubleshooting guide for diagnosing and fixing pod scheduling failures on Amazon EKS, covering resource constraints, node affinity, taints, and more.

---

Your pod is stuck in Pending. The deployment rolled out but nothing's happening. This is one of the most common issues on EKS, and the causes range from simple (not enough resources) to subtle (node selector mismatch, taint tolerance, topology constraints). The good news is that Kubernetes is pretty verbose about why a pod can't be scheduled - you just need to know where to look.

This guide covers the most common scheduling failures and how to fix them.

## First Steps: Check the Events

The single most useful command when a pod won't schedule:

```bash
# Describe the stuck pod to see scheduling events
kubectl describe pod my-app-abc123

# Or check events directly, filtered to the pod
kubectl get events --field-selector involvedObject.name=my-app-abc123 --sort-by='.lastTimestamp'
```

The Events section at the bottom of `kubectl describe pod` tells you exactly what the scheduler tried and why it failed. Here are the most common messages and what to do about them.

## Insufficient Resources

**Event message:** `0/3 nodes are available: 3 Insufficient cpu` or `3 Insufficient memory`

This means none of your nodes have enough free CPU or memory to accommodate the pod's resource requests.

Diagnose it:

```bash
# Check resource allocation on all nodes
kubectl describe nodes | grep -A 5 "Allocated resources"

# Or get a summary of allocatable vs. requested resources
kubectl top nodes
```

A more detailed view:

```bash
# See how much of each node's resources are requested
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
CPU_ALLOC:.status.allocatable.cpu,\
MEM_ALLOC:.status.allocatable.memory

# Check how much is currently requested
kubectl describe node NODE_NAME | grep -A 20 "Allocated resources"
```

**Fixes:**

1. Scale up your node group (add more nodes)
2. Reduce the pod's resource requests if they're overprovisioned
3. Enable the [Cluster Autoscaler](https://oneuptime.com/blog/post/configure-eks-cluster-autoscaler/view) or [Karpenter](https://oneuptime.com/blog/post/use-karpenter-for-eks-node-provisioning/view) to add nodes automatically
4. Evict lower-priority pods with PriorityClasses

```yaml
# Reduce resource requests if overprovisioned
resources:
  requests:
    cpu: 250m     # Was 1000m but pod only uses 200m
    memory: 256Mi # Was 1Gi but pod only uses 200Mi
```

## Node Selector Mismatch

**Event message:** `0/3 nodes are available: 3 node(s) didn't match Pod's node affinity/selector`

Your pod has a nodeSelector or nodeAffinity that doesn't match any node's labels.

```bash
# Check what node labels exist
kubectl get nodes --show-labels

# Check the pod's node selector
kubectl get pod my-app-abc123 -o jsonpath='{.spec.nodeSelector}'

# Check node affinity
kubectl get pod my-app-abc123 -o jsonpath='{.spec.affinity}'
```

**Fixes:**

1. Add the missing label to your nodes:

```bash
# Label a node to match the pod's selector
kubectl label node ip-10-0-1-100.ec2.internal workload-type=compute
```

2. Update the pod's nodeSelector to match existing labels
3. Make sure you're using `preferredDuringSchedulingIgnoredDuringExecution` instead of `requiredDuringSchedulingIgnoredDuringExecution` if the constraint is a preference rather than a hard requirement

## Taints and Tolerations

**Event message:** `0/3 nodes are available: 3 node(s) had taint {key: value}, that the pod didn't tolerate`

Nodes have taints that repel pods unless the pods have matching tolerations.

```bash
# Check taints on all nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Check a specific node's taints
kubectl describe node ip-10-0-1-100.ec2.internal | grep Taints
```

Common EKS taints:
- `node.kubernetes.io/not-ready` - node isn't ready yet
- `node.kubernetes.io/disk-pressure` - node is running low on disk
- Custom taints added to specialized node groups

**Fixes:**

Add a toleration to your pod:

```yaml
# Add toleration to match the taint
spec:
  tolerations:
    - key: "workload-type"
      operator: "Equal"
      value: "compute"
      effect: "NoSchedule"
```

Or remove the taint from the node if it shouldn't be there:

```bash
# Remove a taint from a node
kubectl taint nodes ip-10-0-1-100.ec2.internal workload-type=compute:NoSchedule-
```

## Volume Topology Constraints

**Event message:** `0/3 nodes are available: 1 node(s) had volume node affinity conflict`

This happens when a PersistentVolume is bound to a specific availability zone and no nodes in that AZ have capacity.

```bash
# Check which AZ the PV is in
kubectl get pv PV_NAME -o jsonpath='{.spec.nodeAffinity}'

# Check which AZ your nodes are in
kubectl get nodes -L topology.kubernetes.io/zone
```

**Fixes:**

1. Add nodes to the AZ where the volume exists
2. Use `volumeBindingMode: WaitForFirstConsumer` in your StorageClass (prevents this from happening in the first place)
3. For shared storage needs, consider [EFS instead of EBS](https://oneuptime.com/blog/post/set-up-efs-csi-driver-for-eks-shared-storage/view)

## Pod Topology Spread Constraints

**Event message:** `0/3 nodes are available: 2 node(s) didn't match pod topology spread constraints`

TopologySpreadConstraints control how pods are distributed across zones or nodes.

```bash
# Check the pod's topology spread constraints
kubectl get pod my-app-abc123 -o yaml | grep -A 10 topologySpreadConstraints
```

**Fixes:**

1. Add more nodes in the required topology domains (zones)
2. Increase `maxSkew` to allow more imbalance
3. Change `whenUnsatisfiable` from `DoNotSchedule` to `ScheduleAnyway`

```yaml
# More lenient topology spread
topologySpreadConstraints:
  - maxSkew: 2  # Allow up to 2 pods difference between zones
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: ScheduleAnyway  # Schedule even if constraints can't be met
    labelSelector:
      matchLabels:
        app: my-app
```

## Too Many Pods on a Node

**Event message:** `0/3 nodes are available: 3 Too many pods`

Each EC2 instance type has a maximum number of pods it can run, determined by the number of ENIs and IP addresses available.

```bash
# Check max pods per node
kubectl get nodes -o custom-columns=NAME:.metadata.name,CAPACITY:.status.capacity.pods,USED:.status.allocatable.pods
```

For example, an m5.large supports 29 pods by default.

**Fixes:**

1. Use larger instance types with more ENI capacity
2. Enable prefix delegation to increase pod density:

```bash
# Enable prefix delegation on the VPC CNI (increases max pods significantly)
kubectl set env daemonset aws-node -n kube-system ENABLE_PREFIX_DELEGATION=true
kubectl set env daemonset aws-node -n kube-system WARM_PREFIX_TARGET=1
```

3. Scale up your node group

## Unschedulable Nodes

**Event message:** `0/3 nodes are available: 3 node(s) were unschedulable`

Nodes are cordoned (marked as unschedulable), usually during maintenance or drain operations.

```bash
# Check if nodes are cordoned
kubectl get nodes | grep SchedulingDisabled
```

**Fix:**

```bash
# Uncordon a node to allow scheduling
kubectl uncordon ip-10-0-1-100.ec2.internal
```

## Quick Diagnostic Script

Here's a script that checks the most common issues at once:

```bash
# Quick pod scheduling diagnostic
POD_NAME="my-app-abc123"

echo "=== Pod Status ==="
kubectl get pod $POD_NAME -o wide

echo "=== Pod Events ==="
kubectl get events --field-selector involvedObject.name=$POD_NAME --sort-by='.lastTimestamp'

echo "=== Node Resources ==="
kubectl top nodes

echo "=== Node Taints ==="
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

echo "=== Cordon Status ==="
kubectl get nodes | grep -E "NAME|SchedulingDisabled"
```

Most scheduling failures boil down to resources, labels, or taints. Check the pod events first, and nine times out of ten, the answer is right there in the event message. For [node-level issues](https://oneuptime.com/blog/post/troubleshoot-eks-node-notready-issues/view), you'll need to dig deeper into the node itself.
