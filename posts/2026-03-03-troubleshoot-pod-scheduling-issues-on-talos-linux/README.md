# How to Troubleshoot Pod Scheduling Issues on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Pod Scheduling, Troubleshooting, Resource Management

Description: Practical guide to diagnosing and fixing pod scheduling failures on Talos Linux clusters, covering resource constraints, taints, tolerations, and affinity rules.

---

When pods refuse to be scheduled on your Talos Linux cluster, they sit in a Pending state indefinitely. The scheduler tries to find a suitable node for each pod, but when no node meets the requirements, the pod just waits. This is frustrating because the error messages can be cryptic and the reasons varied. This guide breaks down the most common scheduling failures and shows you how to fix them.

## Understanding Why Pods Get Stuck in Pending

The Kubernetes scheduler evaluates several criteria when placing a pod on a node:

1. Does the node have enough CPU and memory?
2. Does the node have the right taints and tolerations?
3. Does the pod have node affinity or anti-affinity rules?
4. Does the pod have nodeSelector constraints?
5. Are there PersistentVolume requirements that can only be met on specific nodes?

A failure at any of these checks will prevent scheduling.

## Step 1: Check the Pod Events

The first diagnostic step is always to describe the pending pod:

```bash
# Describe the pending pod to see scheduler events
kubectl describe pod <pod-name> -n <namespace>
```

Look at the Events section at the bottom. The scheduler will tell you exactly why it could not place the pod. Common messages include:

- `0/3 nodes are available: 3 Insufficient cpu`
- `0/3 nodes are available: 3 node(s) had taints that the pod didn't tolerate`
- `0/3 nodes are available: 3 node(s) didn't match Pod's node affinity/selector`

## Step 2: Resource Constraints

The most common scheduling failure is insufficient resources. Check what each node has available:

```bash
# See allocated vs capacity for all nodes
kubectl describe nodes | grep -A 10 "Allocated resources"

# Get a quick overview
kubectl top nodes
```

On Talos Linux, the system itself consumes some resources. The kubelet also reserves resources for system daemons. Check the actual allocatable capacity:

```bash
# Check allocatable resources
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU:.status.allocatable.cpu,MEM:.status.allocatable.memory
```

If nodes are running out of CPU or memory, you have several options:

1. Add more nodes to the cluster
2. Reduce resource requests on existing pods
3. Adjust kubelet resource reservations in the Talos config

```yaml
machine:
  kubelet:
    extraArgs:
      system-reserved: "cpu=200m,memory=512Mi"
      kube-reserved: "cpu=200m,memory=512Mi"
```

## Step 3: Check Taints and Tolerations

Talos Linux control plane nodes have a taint by default that prevents regular workloads from being scheduled on them:

```bash
# Check taints on all nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints
```

Control plane nodes will have the `node-role.kubernetes.io/control-plane:NoSchedule` taint. If you only have control plane nodes and no workers, all your pods will be Pending.

To allow scheduling on control plane nodes (not recommended for production), you can remove the taint:

```bash
# Remove the control plane taint (use with caution)
kubectl taint nodes <node-name> node-role.kubernetes.io/control-plane:NoSchedule-
```

Or add a toleration to your pod spec:

```yaml
spec:
  tolerations:
    - key: node-role.kubernetes.io/control-plane
      operator: Exists
      effect: NoSchedule
```

Also check for custom taints that may have been added to nodes:

```bash
# Describe a specific node to see all its taints
kubectl describe node <node-name> | grep -A5 Taints
```

## Step 4: Node Selector and Affinity

If your pod has a `nodeSelector` or `nodeAffinity`, it will only be scheduled on nodes that match:

```bash
# Check if the pod has a nodeSelector
kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A5 nodeSelector

# Check if the pod has node affinity
kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A20 affinity
```

Verify that nodes have the required labels:

```bash
# List all node labels
kubectl get nodes --show-labels

# Check if any node matches a specific label
kubectl get nodes -l <label-key>=<label-value>
```

If no nodes have the required label, add it:

```bash
# Add a label to a node
kubectl label node <node-name> <label-key>=<label-value>
```

## Step 5: PersistentVolume Constraints

Pods that request PersistentVolumeClaims (PVCs) can only be scheduled on nodes where the volume is available. This is especially relevant for local storage:

```bash
# Check PVC status
kubectl get pvc -n <namespace>

# If the PVC is Pending, describe it
kubectl describe pvc <pvc-name> -n <namespace>
```

If you are using a storage class that provisions local volumes, the pod may be stuck waiting for a volume to be created on a specific node:

```bash
# Check storage classes
kubectl get storageclass

# Check available PersistentVolumes
kubectl get pv
```

## Step 6: Pod Disruption Budgets

PodDisruptionBudgets (PDBs) can prevent pods from being scheduled during disruptions:

```bash
# Check PDBs
kubectl get pdb -A

# Describe a specific PDB
kubectl describe pdb <pdb-name> -n <namespace>
```

If a PDB is configured too restrictively, it can prevent rescheduling after a node failure.

## Step 7: Resource Quotas

Namespace resource quotas can prevent new pods from being created:

```bash
# Check resource quotas in the namespace
kubectl get resourcequota -n <namespace>

# Describe quota to see usage vs limits
kubectl describe resourcequota -n <namespace>
```

If the namespace has hit its CPU or memory quota, no new pods will be scheduled.

## Step 8: Talos-Specific Scheduling Issues

On Talos Linux, there are a few Talos-specific things that can affect scheduling:

**Node not fully joined:** If a Talos node is still bootstrapping, it will not be Ready and the scheduler will skip it:

```bash
# Check node status
kubectl get nodes

# If a node is NotReady, check why
talosctl -n <node-ip> service kubelet
talosctl -n <node-ip> logs kubelet --tail 50
```

**System pod priority:** Talos system pods (like CoreDNS, kube-proxy) run with higher priority. If resources are tight, your workload pods will be preempted in favor of system pods:

```bash
# Check pod priority classes
kubectl get priorityclasses
```

**DaemonSet resource usage:** DaemonSets run on every node and consume resources before your workload pods get scheduled. Account for this when sizing nodes:

```bash
# Check DaemonSet resource usage per node
kubectl -n kube-system get pods -o wide --field-selector spec.nodeName=<node-name>
```

## Step 9: Scheduler Logs

If none of the above reveals the issue, check the scheduler logs directly:

```bash
# On Talos, the scheduler runs as a static pod on control plane nodes
talosctl -n <cp-ip> logs kube-scheduler --tail 100
```

The scheduler logs will show detailed information about why pods could not be placed.

## Summary

Pod scheduling issues on Talos Linux almost always come down to resource constraints, taints, or node selectors. Always start with `kubectl describe pod` to see the scheduler message, then work backwards to find the cause. Check resource availability, verify node labels and taints, and look for PVC constraints. If your cluster is small, remember that Talos control plane nodes are tainted by default, so you need worker nodes for regular workloads.
