# How to Configure K3s Node Taints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Node Management, Scheduling, DevOps

Description: Learn how to configure node taints in K3s to repel workloads from specific nodes and control pod scheduling with tolerations.

## Introduction

While node labels attract workloads via `nodeSelector` and `nodeAffinity`, **taints** work the opposite way - they repel pods from nodes. A node with a taint will block or discourage pods that don't explicitly **tolerate** that taint, depending on the taint effect. This is useful for dedicating nodes to specific workloads, protecting control plane nodes, or isolating nodes with special hardware.

## Understanding Taints and Tolerations

A taint has three components:
- **Key**: The taint name (e.g., `dedicated`)
- **Value**: The taint value (e.g., `gpu-only`)
- **Effect**: What happens to intolerant pods:
  - `NoSchedule`: Pod won't be scheduled on this node
  - `PreferNoSchedule`: Scheduler tries to avoid the node
  - `NoExecute`: Pod won't be scheduled, and existing non-tolerant pods are evicted

## Setting Taints at Agent Installation

Add taints when registering an agent node:

```bash
# Install K3s agent with a taint

curl -sfL https://get.k3s.io | \
  K3S_URL=https://<server-ip>:6443 \
  K3S_TOKEN=<node-token> \
  INSTALL_K3S_EXEC="agent \
    --node-taint dedicated=gpu:NoSchedule \
    --node-taint special-hardware=true:NoExecute" \
  sh -
```

Using a config file:

```yaml
# /etc/rancher/k3s/config.yaml (on agent node)
server: "https://<server-ip>:6443"
token: "<node-token>"
node-taint:
  - "dedicated=gpu:NoSchedule"
  - "hardware=high-memory:PreferNoSchedule"
```

## Setting Taints with kubectl

```bash
# Add a taint to a node
kubectl taint node worker-01 dedicated=gpu:NoSchedule

# Add a NoExecute taint (evicts existing non-tolerant pods)
kubectl taint node worker-01 maintenance=true:NoExecute

# Add a PreferNoSchedule taint
kubectl taint node worker-01 role=batch-processing:PreferNoSchedule

# Remove a taint (append - to the end)
kubectl taint node worker-01 dedicated:NoSchedule-

# Remove a taint by key only (removes all effects for that key)
kubectl taint node worker-01 dedicated-

# View taints on a node
kubectl describe node worker-01 | grep -A 5 Taints
```

## Control Plane Node Taints

K3s server nodes are schedulable by default. If you want to keep regular workloads off server nodes, add a taint yourself:

```bash
# Check current taints on the server node
kubectl describe node <server-node> | grep Taints

# Add a control-plane taint to keep regular workloads off the server
kubectl taint node <server-node> node-role.kubernetes.io/control-plane:NoSchedule

# Remove the control-plane taint later if needed
kubectl taint node <server-node> node-role.kubernetes.io/control-plane:NoSchedule-
```

Alternatively, add the taint when starting the K3s server:

```yaml
# /etc/rancher/k3s/config.yaml on server
node-taint:
  - "node-role.kubernetes.io/control-plane:NoSchedule"
```

## Adding Tolerations to Pods

For `NoSchedule` and `NoExecute` taints, pods need matching tolerations to land on the node. With `PreferNoSchedule`, tolerations remove the scheduler's preference against that node:

```yaml
# pod-with-toleration.yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-job
spec:
  tolerations:
    # Tolerate the gpu taint (exact match)
    - key: "dedicated"
      operator: "Equal"
      value: "gpu"
      effect: "NoSchedule"

    # Tolerate any value for this key
    - key: "hardware"
      operator: "Exists"
      effect: "PreferNoSchedule"

  # Also use nodeSelector to target gpu nodes specifically
  nodeSelector:
    hardware: gpu

  containers:
    - name: gpu-workload
      image: tensorflow/tensorflow:latest-gpu
      resources:
        limits:
          nvidia.com/gpu: 1
```

## Practical Examples

### Dedicate Nodes to Database Workloads

```bash
# Taint database nodes
kubectl taint node db-node-01 role=database:NoSchedule
kubectl taint node db-node-02 role=database:NoSchedule

# Label them for nodeSelector
kubectl label node db-node-01 role=database
kubectl label node db-node-02 role=database
```

```yaml
# statefulset-postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres # matching headless Service must already exist
  replicas: 2
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      tolerations:
        - key: "role"
          operator: "Equal"
          value: "database"
          effect: "NoSchedule"
      nodeSelector:
        role: database
      containers:
        - name: postgres
          image: postgres:15
```

### Maintenance Mode

```bash
# Put a node into maintenance mode (evict non-tolerant pods)
kubectl taint node worker-01 maintenance=in-progress:NoExecute

# Perform maintenance...

# Remove maintenance taint when done
kubectl taint node worker-01 maintenance:NoExecute-
```

### Edge Site Isolation

```bash
# Taint edge nodes so only edge workloads run there
kubectl taint node edge-store-123 site=store-123:NoSchedule
kubectl label node edge-store-123 site=store-123
```

```yaml
# edge-deployment.yaml
spec:
  template:
    spec:
      tolerations:
        - key: "site"
          operator: "Equal"
          value: "store-123"
          effect: "NoSchedule"
      nodeSelector:
        site: store-123
```

## Viewing All Taints in the Cluster

```bash
# Check taints on all nodes
kubectl get nodes -o custom-columns=\
'NAME:.metadata.name,TAINTS:.spec.taints'

# More detailed view
kubectl describe nodes | grep -E "Name:|Taints:"
```

## Taint-Based Eviction

The `NoExecute` effect combined with `tolerationSeconds` enables time-limited tolerance:

```yaml
# Pod tolerates the taint for only 300 seconds before eviction
spec:
  tolerations:
    - key: "node.kubernetes.io/not-ready"
      operator: "Exists"
      effect: "NoExecute"
      tolerationSeconds: 300
```

This is useful for handling node failures gracefully.

## Conclusion

Taints and tolerations provide a powerful "opt-in" mechanism for node isolation in K3s clusters. Use `NoSchedule` to dedicate nodes for specific workloads, `NoExecute` for maintenance or emergency isolation, and `PreferNoSchedule` for soft preferences. Combined with node labels and affinity rules, taints give you fine-grained control over pod placement across your entire cluster.
