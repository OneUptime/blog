# How to Assign Pods to Specific Nodes on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Pod Assignment, Node Affinity, Kubernetes, Scheduling

Description: Learn multiple techniques for assigning pods to specific nodes on Talos Linux including nodeSelector, affinity rules, and nodeName.

---

In Kubernetes, the scheduler automatically decides which node each pod runs on based on resource availability and constraints. But sometimes you need more control. Maybe a pod needs to run on a node with specific hardware, in a particular availability zone, or alongside certain other pods. Talos Linux supports all the standard Kubernetes mechanisms for assigning pods to specific nodes.

This guide covers every technique available for controlling pod placement in a Talos Linux cluster.

## Technique 1: nodeName (Direct Assignment)

The simplest method is specifying the exact node name in the pod spec:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fixed-node-pod
spec:
  nodeName: worker-3
  containers:
    - name: app
      image: nginx:latest
```

This bypasses the scheduler entirely. The pod is placed directly on `worker-3`. If that node does not exist or is not ready, the pod will not start.

Use this only for debugging or very specific one-off situations. It is not suitable for production deployments because it creates a single point of failure.

## Technique 2: nodeSelector (Label Matching)

The nodeSelector is a simple constraint that requires nodes to have specific labels:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  nodeSelector:
    hardware-type: gpu
  containers:
    - name: trainer
      image: tensorflow/tensorflow:latest-gpu
```

First, make sure your Talos nodes have the right labels configured:

```yaml
# In the Talos machine config for GPU nodes
machine:
  nodeLabels:
    hardware-type: gpu
    gpu-model: nvidia-a100
```

The scheduler will only place the pod on nodes that have the `hardware-type: gpu` label.

To match multiple labels:

```yaml
spec:
  nodeSelector:
    hardware-type: gpu
    environment: production
    zone: us-east-1a
```

All labels must match. The pod will not be scheduled if no node has all the specified labels.

## Technique 3: Node Affinity (Flexible Rules)

Node affinity is a more expressive version of nodeSelector with support for both hard and soft requirements:

### Required (Hard) Affinity

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  # Must be a production node
                  - key: environment
                    operator: In
                    values:
                      - production
                  # Must not be a GPU node
                  - key: hardware-type
                    operator: NotIn
                    values:
                      - gpu
      containers:
        - name: web
          image: nginx:latest
```

### Preferred (Soft) Affinity

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: api-service
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 80
              preference:
                matchExpressions:
                  - key: zone
                    operator: In
                    values:
                      - us-east-1a
            - weight: 20
              preference:
                matchExpressions:
                  - key: zone
                    operator: In
                    values:
                      - us-east-1b
      containers:
        - name: api
          image: myapi:latest
```

The weights determine preference strength. The scheduler tries to honor preferences but will still schedule pods on non-preferred nodes if necessary.

### Combining Required and Preferred

```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: environment
                operator: In
                values:
                  - production
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          preference:
            matchExpressions:
              - key: zone
                operator: In
                values:
                  - us-east-1a
```

This says: the pod must run on a production node, and it should preferably be in zone us-east-1a.

## Technique 4: Pod Affinity and Anti-Affinity

Sometimes you want to co-locate or separate pods based on what other pods are running:

### Pod Affinity (Co-location)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache-client
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: cache-client
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - redis
              topologyKey: kubernetes.io/hostname
      containers:
        - name: client
          image: cache-client:latest
```

This ensures cache-client pods run on the same node as redis pods, minimizing network latency.

### Pod Anti-Affinity (Separation)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ha-database
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: ha-database
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - ha-database
              topologyKey: kubernetes.io/hostname
      containers:
        - name: db
          image: postgres:16
```

This ensures no two ha-database pods run on the same node, spreading them for high availability.

## Technique 5: Topology Spread Constraints

For even distribution across topology domains:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: balanced-app
spec:
  replicas: 6
  template:
    metadata:
      labels:
        app: balanced-app
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: balanced-app
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: balanced-app
      containers:
        - name: app
          image: myapp:latest
```

This distributes pods evenly across zones (strictly) and across nodes within zones (best effort).

## Setting Up Talos Nodes for Effective Scheduling

To use these scheduling techniques, your Talos nodes need proper labels. Here is a comprehensive example:

```yaml
# Control plane node in zone A
machine:
  type: controlplane
  nodeLabels:
    environment: production
    topology.kubernetes.io/zone: us-east-1a
    topology.kubernetes.io/region: us-east-1
    node-pool: control-plane
```

```yaml
# GPU worker in zone A
machine:
  type: worker
  nodeLabels:
    environment: production
    topology.kubernetes.io/zone: us-east-1a
    hardware-type: gpu
    gpu-model: nvidia-a100
    node-pool: gpu-workers
  nodeTaints:
    dedicated: "gpu:NoSchedule"
```

```yaml
# Standard worker in zone B
machine:
  type: worker
  nodeLabels:
    environment: production
    topology.kubernetes.io/zone: us-east-1b
    hardware-type: standard
    node-pool: general-workers
```

## Practical Example: Full Application Stack

Here is a complete example assigning different components of an application to appropriate nodes:

```yaml
# Database - spread across zones, avoid GPU nodes
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  replicas: 3
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: hardware-type
                    operator: In
                    values:
                      - standard
                      - high-memory
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: postgres
              topologyKey: topology.kubernetes.io/zone
      containers:
        - name: postgres
          image: postgres:16
---
# ML Training - requires GPU nodes
apiVersion: batch/v1
kind: Job
metadata:
  name: model-training
spec:
  template:
    spec:
      tolerations:
        - key: dedicated
          value: gpu
          effect: NoSchedule
      nodeSelector:
        hardware-type: gpu
      containers:
        - name: trainer
          image: ml-trainer:latest
          resources:
            limits:
              nvidia.com/gpu: 1
      restartPolicy: Never
```

## Debugging Scheduling Decisions

When pods are not being scheduled where you expect:

```bash
# Check why a pod is pending
kubectl describe pod <pod-name> | grep -A 20 Events

# Check node labels
kubectl get nodes --show-labels

# Check node taints
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Check available resources on each node
kubectl describe nodes | grep -A 5 "Allocated resources"
```

Common scheduling failures include no nodes matching the required affinity, all matching nodes being full, and conflicting topology spread constraints.

## Conclusion

Talos Linux supports every Kubernetes pod assignment technique. Start with nodeSelector for simple cases, use node affinity for more complex requirements, add pod affinity and anti-affinity for inter-pod placement rules, and use topology spread constraints for even distribution. The key to effective scheduling is having well-labeled nodes, which is easy to set up through the Talos machine configuration. Plan your label taxonomy early, apply it consistently across all nodes, and your scheduling rules will work predictably.
