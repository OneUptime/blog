# How to Configure Taints and Tolerations via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Taints, Toleration, Node Management

Description: Configure Kubernetes node taints and pod tolerations to dedicate nodes for specific workloads or exclude pods from certain nodes.

## Introduction

Taints repel pods from nodes unless the pod has a matching toleration. They're the inverse of node affinity-instead of attracting pods, taints repel them. This enables node dedication (GPU nodes only for GPU workloads) and maintenance workflows (marking maintenance nodes so new pods stay away and existing pods can be evicted when needed).

## Taint Effects

- **NoSchedule**: New pods without toleration are not scheduled on this node
- **PreferNoSchedule**: Soft version-tries to avoid scheduling without toleration
- **NoExecute**: Evicts existing pods that don't tolerate the taint and blocks new pods without toleration

## Adding Taints to Nodes

```bash
# Taint a node for GPU-only workloads

kubectl taint nodes gpu-node-1 hardware=gpu:NoSchedule
kubectl label nodes gpu-node-1 hardware=gpu

# Mark a node as dedicated for database workloads
kubectl taint nodes db-node-1 workload=database:NoSchedule
kubectl label nodes db-node-1 workload=database

# Mark a node for maintenance (evicts non-tolerating pods)
kubectl taint nodes worker3 maintenance=true:NoExecute

# Verify taints
kubectl describe node gpu-node-1 | grep Taints

# Remove a taint
kubectl taint nodes worker3 maintenance=true:NoExecute-
```

In Portainer, go to `Cluster` -> `Details`, select the node, then use the `Labels` and `Taints` sections to add or remove the matching labels and taints. In Portainer Business Edition, you can also edit the node YAML and apply the change as a patch.

## Pod Tolerations in Portainer YAML

```yaml
# gpu-workload.yml - only runs on GPU nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-training
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ml-training
  template:
    metadata:
      labels:
        app: ml-training
    spec:
      tolerations:
      # Tolerate the GPU taint
      - key: "hardware"
        operator: "Equal"
        value: "gpu"
        effect: "NoSchedule"
      # Also require the matching GPU node label
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: hardware
                operator: In
                values:
                - gpu
      containers:
      - name: trainer
        image: ml-trainer:latest
        resources:
          limits:
            nvidia.com/gpu: 1
---
# database-pod.yml - dedicated database node
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      tolerations:
      - key: "workload"
        operator: "Equal"
        value: "database"
        effect: "NoSchedule"
      nodeSelector:
        workload: database
      containers:
      - name: postgres
        image: postgres:15
```

## DaemonSets That Tolerate Everything

If you intentionally want a DaemonSet to tolerate any taint, use:

```yaml
# DaemonSet that runs on all nodes including tainted ones
spec:
  template:
    spec:
      tolerations:
      - operator: "Exists"  # Tolerate ANY taint
```

## Maintenance Workflow with Taints

```bash
#!/bin/bash
# maintenance-taint.sh - safely prepare node for maintenance

NODE="worker2"

echo "Preparing $NODE for maintenance..."

# Step 1: Taint to prevent new pods (NoSchedule)
kubectl taint nodes $NODE maintenance=true:NoSchedule

# Step 2: Cordon the node (prevent scheduling)
kubectl cordon $NODE

# Step 3: Drain existing pods
kubectl drain $NODE \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=120s

echo "$NODE is now drained. Proceed with maintenance."

# After maintenance:
# kubectl uncordon $NODE
# kubectl taint nodes $NODE maintenance=true:NoSchedule-
```

## Common Taint Patterns

```bash
# Dedicated nodes for specific teams
kubectl taint nodes team-node workload=team-a:NoSchedule

# High-memory nodes
kubectl taint nodes bigmem-node memory=high:NoSchedule

# Spot/preemptible instances
kubectl taint nodes spot-node cloud.google.com/gke-spot=true:NoSchedule

# Node with degraded disk
kubectl taint nodes disk-node disk=degraded:NoSchedule
```

## Conclusion

Taints and tolerations in Kubernetes managed via Portainer provide powerful workload isolation. By tainting specialized hardware nodes and adding tolerations only to appropriate workloads, you ensure GPU jobs run on GPU nodes, databases run on storage-optimized nodes, and general workloads don't consume specialized resources. This improves resource utilization and provides clear operational boundaries in multi-tenant clusters.
