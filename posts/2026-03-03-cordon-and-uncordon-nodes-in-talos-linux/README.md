# How to Cordon and Uncordon Nodes in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Node Scheduling, Cordon, Cluster Management

Description: Understand how to cordon and uncordon nodes in Talos Linux to control pod scheduling during maintenance and troubleshooting.

---

Cordoning and uncordoning nodes is a basic but powerful Kubernetes operation. When you cordon a node, you tell the scheduler to stop placing new pods on it. When you uncordon it, you reverse that decision. In a Talos Linux cluster, this is your first line of defense during maintenance operations, troubleshooting sessions, and capacity management. This guide covers everything you need to know about using these commands effectively.

## What Does Cordoning a Node Do?

When you cordon a node, Kubernetes adds the `node.kubernetes.io/unschedulable` taint and sets the `spec.unschedulable` field to `true`. This has a specific and limited effect:

- New pods will not be scheduled on the node
- Existing pods continue running undisturbed
- DaemonSet pods can still be placed on the node (they ignore the unschedulable taint)

Cordoning does not evict or terminate any running workloads. It is purely a scheduling directive.

## The Cordon Command

```bash
# Cordon a node to prevent new pod scheduling
kubectl cordon <node-name>
```

After cordoning, the node status shows:

```bash
# Check the node status
kubectl get nodes
```

Output will look like:

```text
NAME          STATUS                     ROLES           AGE   VERSION
talos-cp-1    Ready                      control-plane   30d   v1.29.0
talos-cp-2    Ready                      control-plane   30d   v1.29.0
talos-w-1     Ready,SchedulingDisabled   worker          30d   v1.29.0
talos-w-2     Ready                      worker          30d   v1.29.0
```

Notice the `SchedulingDisabled` status on the cordoned node.

## The Uncordon Command

```bash
# Uncordon a node to allow pod scheduling again
kubectl uncordon <node-name>
```

After uncordoning, the `SchedulingDisabled` status disappears and the scheduler will consider this node for new pods again.

## When to Cordon Without Draining

Cordon and drain are often used together, but there are cases where cordoning alone is enough:

### Investigating a Problem

If a node is behaving strangely but its existing pods are fine, cordon it to prevent making the situation worse:

```bash
# Cordon the problematic node while you investigate
kubectl cordon <node-name>

# Now investigate without worrying about new pods landing here
talosctl dmesg --nodes <node-ip>
talosctl services --nodes <node-ip>
```

The existing pods keep running, so there is no disruption. You can take your time investigating.

### Preparing for Maintenance

If maintenance is scheduled for later, you can cordon the node ahead of time:

```bash
# Cordon now, drain later when the maintenance window starts
kubectl cordon <node-name>
```

This gradually reduces the workload on the node as pods naturally terminate and are rescheduled elsewhere. By the time you actually drain, there may be fewer pods to evict.

### Testing Node Health After Recovery

After fixing an issue, you might want to bring the node back gradually:

```bash
# Node is fixed but we want to test with a few pods first
kubectl uncordon <node-name>

# Watch what gets scheduled
kubectl get pods --all-namespaces --field-selector spec.nodeName=<node-name> -w
```

## Checking Cordon Status

### From kubectl

```bash
# List all nodes and their scheduling status
kubectl get nodes

# Get detailed info about a specific node
kubectl describe node <node-name> | grep -A5 "Taints"
```

The unschedulable taint looks like:

```text
Taints: node.kubernetes.io/unschedulable:NoSchedule
```

### Programmatically

```bash
# Check if a node is cordoned using jsonpath
kubectl get node <node-name> -o jsonpath='{.spec.unschedulable}'
# Returns "true" if cordoned, empty if not
```

```bash
# List all cordoned nodes
kubectl get nodes -o json | jq '.items[] | select(.spec.unschedulable == true) | .metadata.name'
```

## Cordon and Talos Linux Operations

Several Talos operations work well with manual cordoning:

### Before Talos Upgrades

```bash
# Cordon the node before starting the upgrade
kubectl cordon <node-name>

# Start the Talos upgrade
talosctl upgrade --nodes <node-ip> --image ghcr.io/siderolabs/installer:v1.7.0

# The upgrade process handles the rest, but pre-cordoning
# prevents any new pods from being scheduled during the upgrade
```

### Before Configuration Changes

```bash
# Cordon before applying a config that might cause instability
kubectl cordon <node-name>

# Apply the configuration
talosctl apply-config --nodes <node-ip> --file new-config.yaml

# If a reboot is needed, the cordoned state persists across reboots
```

### Resource Pressure Situations

If a node is running low on resources, cordoning prevents the scheduler from making things worse:

```bash
# Check resource usage
kubectl top nodes

# If a node is near capacity, cordon it
kubectl cordon <node-name>

# Investigate and resolve the resource issue
kubectl top pods --sort-by=memory --all-namespaces | head -20
```

## Bulk Operations

### Cordon All Worker Nodes

```bash
# Cordon all worker nodes at once
kubectl get nodes --selector='!node-role.kubernetes.io/control-plane' -o name | \
    xargs -I {} kubectl cordon {}
```

### Uncordon All Nodes

```bash
# Uncordon all nodes in the cluster
kubectl get nodes -o name | xargs -I {} kubectl uncordon {}
```

### Cordon by Label

If your nodes have labels, you can target specific groups:

```bash
# Cordon all nodes in a specific zone
kubectl get nodes --selector='topology.kubernetes.io/zone=us-east-1a' -o name | \
    xargs -I {} kubectl cordon {}
```

## How Cordon Interacts with DaemonSets

DaemonSets are designed to run one pod per node, and they ignore the `NoSchedule` taint added by cordoning. This means:

- If you cordon a node, DaemonSet pods already running on it stay
- If a new DaemonSet is created, it will place a pod on the cordoned node
- If a DaemonSet pod crashes on a cordoned node, it will be restarted

This behavior is intentional. DaemonSets are for node-level services (log collectors, monitoring agents, network plugins) that should run regardless of scheduling status.

If you need to prevent even DaemonSet pods from running on a node, you need to add a different taint:

```bash
# Add a custom taint that DaemonSets do not tolerate by default
kubectl taint nodes <node-name> maintenance=true:NoExecute
```

The `NoExecute` effect will evict all pods that do not tolerate this taint, including DaemonSet pods.

## Cordon State Persistence

The cordoned state is stored in the Kubernetes API server, not on the node itself. This means:

- If you reboot a Talos node, the cordon state persists (assuming the API server is available)
- If you reset a node and rejoin it to the cluster, it starts uncordoned
- If the API server restarts, cordon state is preserved in etcd

## Common Patterns

### Maintenance Window Pattern

```bash
# Before maintenance window
kubectl cordon <node-name>
# Wait for natural pod turnover to reduce load...

# During maintenance window
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
# Perform maintenance...

# After maintenance
kubectl uncordon <node-name>
```

### Rolling Update Pattern

```bash
# Update nodes one at a time
for node in node1 node2 node3; do
    kubectl cordon $node
    kubectl drain $node --ignore-daemonsets --delete-emptydir-data
    # Perform update...
    kubectl uncordon $node
    # Wait for stabilization
    sleep 120
done
```

### Canary Pattern

```bash
# Cordon most nodes, apply changes to one
kubectl cordon node2
kubectl cordon node3

# Apply changes to node1 (uncordoned)
# Test and verify...

# If everything looks good, uncordon the rest
kubectl uncordon node2
kubectl uncordon node3
```

## Conclusion

Cordoning and uncordoning are simple commands with significant operational value. In a Talos Linux cluster, they give you precise control over where the scheduler places pods. Use cordon as your first step before any maintenance operation, as a precaution during troubleshooting, and as a tool for gradual capacity management. Combined with drain for full workload eviction when needed, these commands form the foundation of safe cluster operations.
