# How to Troubleshoot Node Affinity Rules Preventing Collector DaemonSet from Running on Specific Node Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, DaemonSet, Node Affinity, Kubernetes

Description: Troubleshoot and fix node affinity and toleration issues that prevent Collector DaemonSet pods from running on all nodes.

You deployed the OpenTelemetry Collector as a DaemonSet expecting it to run on every node, but some nodes have no Collector pod. Logs from pods on those nodes are not collected, and kubeletstats metrics are missing. The usual culprit is node affinity rules, taints, or tolerations that prevent scheduling.

## Identifying the Problem

```bash
# Check which nodes have Collector pods and which do not
kubectl get pods -n observability -l app=otel-collector -o wide

# Compare with the full node list
kubectl get nodes -o wide

# If some nodes are missing, check why the pod is not scheduled
kubectl describe daemonset otel-collector -n observability | grep -A20 "Events"
```

Look for events like:

```
Warning  FailedScheduling  0/5 nodes are available: 2 node(s) had untolerated taint
{node-pool=gpu: NoSchedule}, 3 node(s) matched pod affinity/anti-affinity rules
```

## Common Cause 1: Node Taints Without Tolerations

Nodes in specialized node pools (GPU nodes, spot instances, high-memory nodes) often have taints. If the DaemonSet does not have matching tolerations, pods will not be scheduled on those nodes.

```bash
# Check taints on all nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Example output:
# NAME           TAINTS
# node-1         <none>
# node-2         <none>
# gpu-node-1     [map[effect:NoSchedule key:nvidia.com/gpu value:true]]
# spot-node-1    [map[effect:NoSchedule key:cloud.google.com/gke-spot value:true]]
```

Add tolerations to the DaemonSet for all node taints:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
  namespace: observability
spec:
  template:
    spec:
      tolerations:
        # Tolerate GPU nodes
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
        # Tolerate spot/preemptible nodes
        - key: cloud.google.com/gke-spot
          operator: Exists
          effect: NoSchedule
        # Tolerate all taints (use with caution)
        # - operator: Exists
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
```

To tolerate ALL taints (so the Collector runs on every node regardless):

```yaml
tolerations:
  - operator: Exists
```

This is generally safe for a DaemonSet Collector since its purpose is to run everywhere.

## Common Cause 2: Node Affinity Rules

The DaemonSet might have node affinity rules that restrict it to certain nodes:

```bash
# Check if the DaemonSet has node affinity
kubectl get daemonset otel-collector -n observability -o yaml | \
  grep -A20 "affinity"
```

If you see something like:

```yaml
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
        - matchExpressions:
            - key: node-type
              operator: In
              values:
                - worker
```

This restricts the DaemonSet to nodes with the `node-type=worker` label. Nodes without this label will not get a Collector pod.

Fix by removing the affinity or broadening it:

```yaml
# Option 1: Remove the affinity entirely
spec:
  template:
    spec:
      # No affinity section = runs on all nodes

# Option 2: Include all node types
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
        - matchExpressions:
            - key: node-type
              operator: In
              values:
                - worker
                - gpu
                - spot
                - system
```

## Common Cause 3: Node Selector

A `nodeSelector` is a simpler form of affinity that might be limiting scheduling:

```yaml
# This restricts to nodes with a specific label
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: linux  # Fine, but add this check just in case
        monitoring: enabled       # This might exclude some nodes!
```

Remove any unnecessary nodeSelector labels, or add the required label to nodes:

```bash
# Label all nodes to match the selector
kubectl label nodes --all monitoring=enabled
```

## Common Cause 4: Resource Constraints

Nodes with limited resources might not have room for the Collector pod:

```bash
# Check node resources
kubectl describe node gpu-node-1 | grep -A10 "Allocated resources"

# If the node is fully allocated, the Collector pod cannot be scheduled
# Reduce the Collector's resource requests
```

```yaml
resources:
  requests:
    cpu: 100m       # Minimal CPU request
    memory: 128Mi   # Minimal memory request
  limits:
    cpu: 500m
    memory: 512Mi
```

## Verifying Coverage

After fixing the scheduling issues, verify the DaemonSet has a pod on every node:

```bash
# Check DaemonSet status
kubectl get daemonset otel-collector -n observability

# Output should show desired = current = ready
# NAME             DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE
# otel-collector   5         5         5       5            5

# Verify pods are on all nodes
kubectl get pods -n observability -l app=otel-collector -o wide | awk '{print $7}' | sort

# Compare with all nodes
kubectl get nodes --no-headers | awk '{print $1}' | sort
```

If the counts match, you have full coverage. If not, check the specific nodes that are missing and repeat the diagnosis steps for those nodes.

## The Nuclear Option

If you want the Collector to absolutely run everywhere, set tolerations for all taints and remove all affinity/nodeSelector constraints:

```yaml
spec:
  template:
    spec:
      tolerations:
        - operator: Exists  # Tolerate everything
      # No nodeSelector
      # No affinity
      priorityClassName: system-node-critical  # High priority to prevent eviction
```

The `system-node-critical` priority class ensures the Collector pod is one of the last to be evicted during resource pressure. This is appropriate for a monitoring DaemonSet that needs to run everywhere.
