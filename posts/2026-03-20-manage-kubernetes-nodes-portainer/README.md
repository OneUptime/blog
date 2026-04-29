# How to Manage Kubernetes Nodes from Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Node Management, Cluster Administration, DevOps

Description: Learn how to view, inspect, cordon, drain, and manage Kubernetes nodes directly from the Portainer UI.

## Accessing Nodes in Portainer

1. Select your Kubernetes environment in Portainer.
2. In the left sidebar, go to **Cluster > Details**.
3. Scroll to the **Nodes** section. The node list shows all nodes with their status and role, and lets you inspect usage stats when the metrics API is enabled.

## Node Status Indicators

| Status | Meaning |
|--------|---------|
| Ready | Node is healthy and ready to accept pods |
| NotReady | Node is not healthy and is not accepting pods |
| SchedulingDisabled | Node is cordoned and unschedulable |

## Inspecting a Node

Click a node name to view:
- Hostname, Kubernetes API endpoint, role, and kubelet version
- Creation date, status, and availability
- Resource reservation and usage (CPU/memory usage requires the metrics API)
- Labels and taints
- Node-related events
- Applications running on the node

```bash
# CLI equivalent

kubectl describe node <node-name>

# List node conditions only
kubectl get node <node-name> \
  -o jsonpath='{range .status.conditions[*]}{.type}={.status}{"\n"}{end}'
```

## Cordoning a Node (Disable Scheduling)

Cordoning prevents new pods from being scheduled on a node without evicting existing pods:

```bash
# Cordon a node via CLI
kubectl cordon <node-name>

# Uncordon a node to re-enable scheduling
kubectl uncordon <node-name>
```

In Portainer, open the node details page and use the **Availability** control: set it to **Pause** to stop scheduling new pods, or **Active** to allow scheduling again.

## Draining a Node (Evict Workloads for Maintenance)

Draining first cordons the node, then evicts pods so workloads can move elsewhere. It will not evict DaemonSet-managed pods, and `--delete-emptydir-data` allows the drain to continue when pods use `emptyDir` data:

```bash
# Drain a node for maintenance
kubectl drain <node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=30

# After maintenance, uncordon the node
kubectl uncordon <node-name>
```

## Adding Labels to Nodes

Labels are used for pod scheduling constraints:

```bash
# Add a label to a node
kubectl label node <node-name> environment=production

# Remove a label
kubectl label node <node-name> environment-

# View labels on all nodes
kubectl get nodes --show-labels
```

## Adding Taints to Nodes

Taints prevent pods from scheduling on a node unless they have a matching toleration:

```bash
# Add a taint to reserve a node for specific workloads
kubectl taint nodes <node-name> dedicated=gpu:NoSchedule

# Remove the taint
kubectl taint nodes <node-name> dedicated=gpu:NoSchedule-
```

## Checking Node Resource Pressure

Resource usage output requires the Kubernetes Metrics API (for example, Metrics Server):

```bash
# Check resource usage per node
kubectl top node

# Check if any nodes are under pressure
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
MEMORYPRESSURE:.status.conditions[?(@.type=="MemoryPressure")].status,\
DISKPRESSURE:.status.conditions[?(@.type=="DiskPressure")].status
```

## Conclusion

Portainer provides a visual interface for common Kubernetes node management tasks. For operations like draining and cordoning, Portainer abstracts the kubectl commands into clear UI actions - making cluster maintenance accessible to team members who aren't kubectl experts.
