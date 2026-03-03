# How to Set Node Taints in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Node Taints, Kubernetes, Pod Scheduling, Workload Isolation

Description: Learn how to configure node taints in Talos Linux to control pod placement, isolate workloads, and protect dedicated node pools.

---

Node taints are a Kubernetes mechanism that repels pods from being scheduled on specific nodes. They work in combination with tolerations - a taint on a node says "do not schedule here unless you tolerate me." This is the opposite of node labels and affinity, which attract pods to nodes. Taints push pods away.

In Talos Linux, node taints can be configured through the machine configuration, ensuring they are applied consistently and persist across reboots. This guide covers how to set up taints, common patterns, and practical examples.

## Understanding Taints and Tolerations

A taint consists of three parts:
- **Key** - an identifier for the taint
- **Value** - an optional value
- **Effect** - what happens to pods that do not tolerate the taint

There are three possible effects:

- `NoSchedule` - new pods that do not tolerate the taint will not be scheduled on the node
- `PreferNoSchedule` - the scheduler tries to avoid placing pods on the node but it is not guaranteed
- `NoExecute` - existing pods that do not tolerate the taint are evicted, and new pods are not scheduled

## Configuring Taints in Talos Machine Config

Talos Linux supports configuring node taints through the `machine.nodeTaints` field:

```yaml
machine:
  nodeTaints:
    dedicated: "gpu:NoSchedule"
```

This adds a taint with key `dedicated`, value `gpu`, and effect `NoSchedule` to the node.

You can also use the kubelet extra args approach:

```yaml
machine:
  kubelet:
    extraArgs:
      register-with-taints: "dedicated=gpu:NoSchedule"
```

The `machine.nodeTaints` approach is preferred for newer versions of Talos because it integrates with the Talos configuration management.

## Common Taint Patterns

### Dedicated GPU Nodes

Reserve nodes with GPUs for GPU workloads only:

```yaml
# GPU node configuration
machine:
  nodeLabels:
    hardware-type: gpu
    gpu-model: nvidia-a100
  nodeTaints:
    nvidia.com/gpu: "present:NoSchedule"
```

Pods that need GPU access must include a matching toleration:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ml-training
spec:
  tolerations:
    - key: nvidia.com/gpu
      operator: Equal
      value: present
      effect: NoSchedule
  nodeSelector:
    hardware-type: gpu
  containers:
    - name: trainer
      image: tensorflow/tensorflow:latest-gpu
      resources:
        limits:
          nvidia.com/gpu: 1
```

### High-Memory Nodes

Reserve nodes with large amounts of memory for memory-intensive workloads:

```yaml
machine:
  nodeLabels:
    node-pool: high-memory
    memory: "512Gi"
  nodeTaints:
    dedicated: "high-memory:NoSchedule"
```

### Spot/Preemptible Nodes

Mark nodes that might be reclaimed by the cloud provider:

```yaml
machine:
  nodeLabels:
    node-lifecycle: spot
  nodeTaints:
    cloud.google.com/gke-spot: "true:NoSchedule"
```

Only workloads that can handle interruptions should tolerate this taint:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
spec:
  replicas: 10
  template:
    spec:
      tolerations:
        - key: cloud.google.com/gke-spot
          operator: Equal
          value: "true"
          effect: NoSchedule
      containers:
        - name: processor
          image: batch:latest
```

### Team-Dedicated Nodes

Isolate nodes for specific teams:

```yaml
# Nodes for the data team
machine:
  nodeLabels:
    team: data-engineering
  nodeTaints:
    team: "data-engineering:NoSchedule"
```

```yaml
# Nodes for the ML team
machine:
  nodeLabels:
    team: ml-team
  nodeTaints:
    team: "ml-team:NoSchedule"
```

Each team's deployments must include the appropriate toleration:

```yaml
# Data team deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-pipeline
spec:
  template:
    spec:
      tolerations:
        - key: team
          operator: Equal
          value: data-engineering
          effect: NoSchedule
      nodeSelector:
        team: data-engineering
      containers:
        - name: pipeline
          image: data-pipeline:latest
```

## Applying Taints to Running Nodes

To add taints to nodes that are already running:

```bash
# Patch the Talos machine configuration
talosctl patch machineconfig --nodes 10.0.0.5 \
  --patch '{"machine": {"nodeTaints": {"dedicated": "gpu:NoSchedule"}}}'

# Verify the taint was applied
kubectl describe node worker-gpu-1 | grep Taints
```

You can also add taints through kubectl, but they will not persist through reboots:

```bash
# Add a taint via kubectl (not persistent)
kubectl taint nodes worker-1 dedicated=gpu:NoSchedule

# Remove a taint via kubectl
kubectl taint nodes worker-1 dedicated=gpu:NoSchedule-
```

For persistent taints, always use the Talos machine configuration.

## Multiple Taints on a Single Node

A node can have multiple taints, and a pod must tolerate all of them to be scheduled:

```yaml
machine:
  nodeTaints:
    dedicated: "gpu:NoSchedule"
    environment: "production:NoSchedule"
```

A pod scheduled on this node needs both tolerations:

```yaml
spec:
  tolerations:
    - key: dedicated
      operator: Equal
      value: gpu
      effect: NoSchedule
    - key: environment
      operator: Equal
      value: production
      effect: NoSchedule
```

## NoExecute Taints for Eviction

`NoExecute` taints are more aggressive - they evict pods that are already running:

```yaml
machine:
  nodeTaints:
    maintenance: "true:NoExecute"
```

This is useful for draining nodes for maintenance. Pods that tolerate the taint can specify how long they should stay:

```yaml
spec:
  tolerations:
    - key: maintenance
      operator: Equal
      value: "true"
      effect: NoExecute
      tolerationSeconds: 300  # Stay for 5 minutes, then leave
```

## PreferNoSchedule for Soft Isolation

When you want the scheduler to avoid a node but not strictly prevent scheduling:

```yaml
machine:
  nodeTaints:
    preferred-workload: "monitoring:PreferNoSchedule"
```

The scheduler will try to place pods elsewhere, but if no other nodes are available, it will use this node. This is a good choice when you want to guide scheduling without risking unschedulable pods.

## DaemonSet Considerations

DaemonSets often need to run on all nodes regardless of taints. Make sure your DaemonSet pods tolerate the taints:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
spec:
  template:
    spec:
      tolerations:
        # Tolerate all taints
        - operator: Exists
      containers:
        - name: collector
          image: fluentbit:latest
```

## Verifying Taints

Check taint configuration:

```bash
# View taints on all nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Detailed view
kubectl describe node worker-gpu-1 | grep -A 10 Taints

# Find nodes without taints
kubectl get nodes -o json | jq '.items[] | select(.spec.taints == null) | .metadata.name'
```

## Removing Taints

Remove a taint from the Talos configuration:

```bash
# Remove a specific taint
talosctl patch machineconfig --nodes 10.0.0.5 \
  --patch '[{"op": "remove", "path": "/machine/nodeTaints/dedicated"}]'
```

## Conclusion

Node taints in Talos Linux provide a powerful mechanism for controlling where pods can run. They are the complement to labels and affinity - while labels attract pods, taints repel them. Configure taints through the Talos machine configuration for persistence, use meaningful key-value pairs, and always ensure critical system DaemonSets tolerate all taints. The combination of taints, tolerations, labels, and affinity gives you complete control over workload placement in your cluster.
