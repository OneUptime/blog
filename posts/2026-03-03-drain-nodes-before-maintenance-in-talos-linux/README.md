# How to Drain Nodes Before Maintenance in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Node Drain, Maintenance, Workload Management

Description: A complete guide to draining nodes before maintenance in Talos Linux, including handling edge cases and stuck pods.

---

Draining a node is the process of safely evicting all pods before performing maintenance. In a Talos Linux cluster, this is a critical step before reboots, upgrades, hardware repairs, or any operation that takes a node offline. Getting it right means zero downtime for your applications. Getting it wrong can leave pods in a broken state or cause unexpected outages.

## What Happens During a Node Drain

When you drain a node, Kubernetes does the following:

1. Marks the node as unschedulable (cordon)
2. Evicts all pods on the node, respecting PodDisruptionBudgets
3. Waits for pods to terminate gracefully
4. DaemonSet pods are left alone (they are supposed to run on every node)

The evicted pods are rescheduled on other available nodes by the Kubernetes scheduler, assuming there is enough capacity.

## Basic Drain Command

The standard drain command for a Talos Linux node:

```bash
# Drain a node before maintenance
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
```

Let us break down the flags:

- `--ignore-daemonsets` - DaemonSet pods run on every node and cannot be rescheduled. This flag tells kubectl to skip them.
- `--delete-emptydir-data` - Pods using emptyDir volumes will lose their data when evicted. This flag acknowledges that risk.

Without these flags, the drain command will refuse to proceed if it encounters DaemonSet pods or pods with emptyDir volumes.

## Step-by-Step Maintenance Drain

### Step 1: Identify the Node

```bash
# Find the node name from its IP address
kubectl get nodes -o wide
```

In Talos Linux, node names are often the IP address or a hostname you configured. Note the exact name.

### Step 2: Check What Is Running

Before draining, understand what will be affected:

```bash
# List all pods on the node
kubectl get pods --all-namespaces --field-selector spec.nodeName=<node-name> -o wide

# Count the pods
kubectl get pods --all-namespaces --field-selector spec.nodeName=<node-name> --no-headers | wc -l
```

Pay attention to:

- Pods belonging to StatefulSets (they have specific scheduling requirements)
- Pods with local persistent volumes (they cannot move to other nodes easily)
- Pods managed by Jobs or CronJobs (they may need to complete before eviction)

### Step 3: Check Pod Disruption Budgets

PodDisruptionBudgets (PDBs) can block eviction:

```bash
# List all PDBs
kubectl get pdb --all-namespaces

# Check if any PDBs would be violated
kubectl get pdb --all-namespaces -o json | jq '.items[] | select(.status.disruptionsAllowed == 0) | .metadata.name'
```

If a PDB shows zero allowed disruptions, the drain will hang waiting for that condition to change.

### Step 4: Cordon the Node

```bash
# Mark the node as unschedulable
kubectl cordon <node-name>

# Verify the cordon
kubectl get node <node-name>
# Should show "SchedulingDisabled" in the STATUS column
```

Cordoning is separate from draining. You can cordon a node to prevent new pods from being scheduled while existing pods continue running. This is useful if you need to observe the node before deciding to drain it.

### Step 5: Drain

```bash
# Drain with a timeout to avoid hanging forever
kubectl drain <node-name> \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --timeout=600s \
    --grace-period=60
```

The `--timeout=600s` flag sets a maximum wait time of 10 minutes. If the drain has not completed by then, it will fail and you can investigate.

The `--grace-period=60` flag gives each pod 60 seconds to shut down gracefully. Override this if your applications need more or less time.

## Handling Common Drain Issues

### Pods Stuck in Terminating

Sometimes pods get stuck in a Terminating state:

```bash
# Find stuck pods
kubectl get pods --all-namespaces --field-selector spec.nodeName=<node-name> | grep Terminating

# Force delete a stuck pod as a last resort
kubectl delete pod <pod-name> -n <namespace> --grace-period=0 --force
```

Force deletion should be a last resort. Check why the pod is stuck first - it might be waiting for a finalizer or a volume to detach.

### PDB Blocking Eviction

If a PodDisruptionBudget is blocking the drain:

```bash
# Check the current disruption status
kubectl get pdb <pdb-name> -n <namespace> -o yaml
```

Options to resolve this:

1. Scale up the deployment to satisfy the PDB's minimum availability
2. Wait for other pods to become healthy
3. Temporarily modify the PDB (be careful with this in production)

```bash
# Scale up to create headroom for the PDB
kubectl scale deployment <deployment-name> -n <namespace> --replicas=<current+1>

# Retry the drain
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
```

### Pods Without a Controller

Bare pods (not managed by a Deployment, StatefulSet, or other controller) will be permanently deleted when evicted. They will not be rescheduled. The drain command warns about this:

```bash
# To proceed even with unmanaged pods
kubectl drain <node-name> \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --force
```

The `--force` flag allows eviction of pods not managed by a ReplicationController, ReplicaSet, Job, DaemonSet, or StatefulSet.

## Draining Before Talos-Specific Operations

Some Talos operations automatically handle draining, but it is still good practice to do it manually for more control.

### Before Talos Upgrade

```bash
# Drain first, then upgrade
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --timeout=600s

# Then perform the upgrade
talosctl upgrade --nodes <node-ip> --image ghcr.io/siderolabs/installer:v1.7.0
```

### Before Configuration Changes

```bash
# Drain before applying config changes that require a reboot
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --timeout=600s

# Apply the config
talosctl apply-config --nodes <node-ip> --file updated-config.yaml
```

### Before Reset

```bash
# Drain before resetting a node
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --timeout=600s

# Reset the node
talosctl reset --nodes <node-ip>
```

## Verifying the Drain

After draining, verify that only DaemonSet pods remain:

```bash
# These should all be DaemonSet-managed pods
kubectl get pods --all-namespaces --field-selector spec.nodeName=<node-name>
```

Check that evicted pods have been rescheduled elsewhere:

```bash
# All deployments should show desired replica count
kubectl get deployments --all-namespaces

# StatefulSets should have all pods running
kubectl get statefulsets --all-namespaces
```

## After Maintenance: Uncordon

When maintenance is complete and the node is back:

```bash
# Allow scheduling on the node again
kubectl uncordon <node-name>

# Verify the node is schedulable
kubectl get nodes
```

Pods will not automatically move back to the uncordoned node. Kubernetes only schedules new pods or rescheduled pods there. Over time, as pods are created and terminated naturally, the workload will rebalance.

If you want to rebalance immediately, you can use the descheduler project or manually restart deployments.

## Conclusion

Draining nodes before maintenance is a fundamental skill for operating Talos Linux clusters. The process is straightforward - cordon, drain, perform maintenance, uncordon - but the edge cases around PDBs, stuck pods, and unmanaged workloads require attention. Always check what is running on a node before draining, set appropriate timeouts, and verify that workloads have been rescheduled successfully. Making this a standard part of your maintenance workflow prevents surprises and keeps your applications running smoothly.
