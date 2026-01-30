# How to Implement Kubernetes Pod Scheduling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, DevOps, Performance

Description: Control Kubernetes pod placement with node selectors, affinity rules, taints and tolerations, and topology spread constraints for optimal workload distribution.

---

Kubernetes schedules pods automatically, but default scheduling does not account for your specific infrastructure requirements. You might need GPU workloads on specific nodes, want to spread replicas across availability zones, or keep certain pods away from each other. This guide covers the scheduling primitives that give you fine-grained control over pod placement.

## Understanding the Kubernetes Scheduler

The kube-scheduler watches for newly created pods that have no node assigned. For each pod, it finds the best node to run on based on:

1. **Filtering** - Eliminates nodes that cannot run the pod (insufficient resources, taints, node selectors)
2. **Scoring** - Ranks remaining nodes based on scheduling priorities
3. **Binding** - Assigns the pod to the highest-scoring node

You can influence both filtering and scoring through the mechanisms covered in this guide.

## NodeSelector: The Simplest Approach

NodeSelector is the most straightforward way to constrain pods to nodes with specific labels. It uses exact label matching.

### Labeling Nodes

First, add labels to your nodes to categorize them.

```bash
# Add a label to identify nodes with SSDs
kubectl label nodes worker-node-1 disktype=ssd

# Add labels for environment and hardware type
kubectl label nodes worker-node-2 environment=production hardware=gpu

# View labels on all nodes
kubectl get nodes --show-labels

# View labels in a cleaner format
kubectl get nodes -L disktype,environment,hardware
```

### Using NodeSelector in Pod Specs

This pod will only schedule on nodes labeled with `disktype=ssd`.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-pod
  labels:
    app: postgres
spec:
  # nodeSelector requires exact label matches
  # The pod stays Pending if no nodes match
  nodeSelector:
    disktype: ssd
  containers:
    - name: postgres
      image: postgres:15
      resources:
        requests:
          memory: "1Gi"
          cpu: "500m"
        limits:
          memory: "2Gi"
          cpu: "1000m"
```

### NodeSelector Limitations

| Limitation | Description |
|------------|-------------|
| Exact match only | Cannot express "not equal" or "in list" conditions |
| Hard requirement | Pod stays Pending forever if no nodes match |
| No soft preferences | Cannot say "prefer SSD but accept HDD" |
| Single dimension | Difficult to express complex placement logic |

For more flexibility, use node affinity instead.

## Node Affinity: Flexible Node Selection

Node affinity expands on nodeSelector with expressive operators and soft preferences. Two types exist:

- **requiredDuringSchedulingIgnoredDuringExecution** - Hard requirement, like nodeSelector but more expressive
- **preferredDuringSchedulingIgnoredDuringExecution** - Soft preference, scheduler tries to match but does not require it

### Required Node Affinity

This configuration requires nodes in specific zones AND prefers nodes with SSD storage.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      affinity:
        nodeAffinity:
          # Hard requirement - pod will not schedule without this
          requiredDuringSchedulingIgnoredDuringExecution:
            # Multiple nodeSelectorTerms are ORed together
            nodeSelectorTerms:
              - matchExpressions:
                  # Multiple expressions in same term are ANDed
                  - key: topology.kubernetes.io/zone
                    operator: In
                    values:
                      - us-east-1a
                      - us-east-1b
                      - us-east-1c
                  - key: node.kubernetes.io/instance-type
                    operator: NotIn
                    values:
                      - t3.micro
                      - t3.small
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
```

### Node Affinity Operators

| Operator | Description | Example Use Case |
|----------|-------------|------------------|
| In | Label value in list | Zone selection |
| NotIn | Label value not in list | Exclude specific node types |
| Exists | Label key exists (any value) | Match any GPU node |
| DoesNotExist | Label key does not exist | Exclude tainted node classes |
| Gt | Label value greater than (numeric) | Nodes with more than N cores |
| Lt | Label value less than (numeric) | Avoid high-memory nodes |

### Preferred Node Affinity with Weights

Weights let you prioritize multiple preferences. The scheduler adds weights for matching preferences and picks the highest-scoring node.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-inference
spec:
  replicas: 5
  selector:
    matchLabels:
      app: ml-inference
  template:
    metadata:
      labels:
        app: ml-inference
    spec:
      affinity:
        nodeAffinity:
          # Soft preferences with weights (1-100)
          preferredDuringSchedulingIgnoredDuringExecution:
            # Strongly prefer GPU nodes (weight 80)
            - weight: 80
              preference:
                matchExpressions:
                  - key: hardware
                    operator: In
                    values:
                      - gpu
            # Moderately prefer SSD storage (weight 50)
            - weight: 50
              preference:
                matchExpressions:
                  - key: disktype
                    operator: In
                    values:
                      - ssd
            # Slightly prefer us-west-2 region (weight 20)
            - weight: 20
              preference:
                matchExpressions:
                  - key: topology.kubernetes.io/region
                    operator: In
                    values:
                      - us-west-2
      containers:
        - name: inference
          image: ml-serving:v2
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
```

### Combining Required and Preferred Affinity

You can use both types together. Required rules filter nodes, then preferred rules rank the remaining nodes.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
spec:
  replicas: 6
  selector:
    matchLabels:
      app: critical-service
  template:
    metadata:
      labels:
        app: critical-service
    spec:
      affinity:
        nodeAffinity:
          # Must be in production environment
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: environment
                    operator: In
                    values:
                      - production
          # Among production nodes, prefer specific characteristics
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: node-class
                    operator: In
                    values:
                      - high-performance
            - weight: 50
              preference:
                matchExpressions:
                  - key: topology.kubernetes.io/zone
                    operator: In
                    values:
                      - us-east-1a
      containers:
        - name: service
          image: critical-app:v3
```

## Pod Affinity and Anti-Affinity

Pod affinity schedules pods relative to other pods, not just node labels. This enables co-location and spreading patterns.

### Pod Affinity: Co-locate Related Pods

Place cache pods on the same nodes as web pods to reduce network latency.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-cache
spec:
  replicas: 3
  selector:
    matchLabels:
      app: redis-cache
  template:
    metadata:
      labels:
        app: redis-cache
    spec:
      affinity:
        podAffinity:
          # Require scheduling on nodes running web-frontend pods
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - web-frontend
              # topologyKey determines the "zone" for co-location
              # kubernetes.io/hostname means same node
              topologyKey: kubernetes.io/hostname
      containers:
        - name: redis
          image: redis:7
          ports:
            - containerPort: 6379
```

### Pod Anti-Affinity: Spread Pods Apart

Distribute replicas across nodes to improve fault tolerance.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zookeeper
spec:
  replicas: 3
  selector:
    matchLabels:
      app: zookeeper
  template:
    metadata:
      labels:
        app: zookeeper
    spec:
      affinity:
        podAntiAffinity:
          # Hard requirement: never place two zookeeper pods on same node
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: zookeeper
              topologyKey: kubernetes.io/hostname
          # Soft preference: try to spread across availability zones
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: zookeeper
                topologyKey: topology.kubernetes.io/zone
      containers:
        - name: zookeeper
          image: zookeeper:3.9
          ports:
            - containerPort: 2181
```

### Common topologyKey Values

| topologyKey | Scope | Use Case |
|-------------|-------|----------|
| kubernetes.io/hostname | Single node | Co-locate for low latency |
| topology.kubernetes.io/zone | Availability zone | HA across zones |
| topology.kubernetes.io/region | Region | Multi-region deployments |
| Custom label | User-defined | Rack awareness, network segments |

### Combining Affinity Types

A realistic example combining node and pod affinity for a database cluster.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-cluster
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      affinity:
        # Node affinity: require SSD nodes in production
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: disktype
                    operator: In
                    values:
                      - ssd
                  - key: environment
                    operator: In
                    values:
                      - production
        # Pod anti-affinity: spread across nodes and zones
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: postgres
              topologyKey: kubernetes.io/hostname
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: postgres
                topologyKey: topology.kubernetes.io/zone
      containers:
        - name: postgres
          image: postgres:15
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

## Taints and Tolerations

Taints repel pods from nodes. Tolerations allow specific pods to schedule on tainted nodes. This is the opposite of affinity, which attracts pods.

### Taint Effects

| Effect | Behavior |
|--------|----------|
| NoSchedule | Pods without toleration cannot schedule on the node |
| PreferNoSchedule | Scheduler avoids the node but can use it if necessary |
| NoExecute | Evicts existing pods and prevents new scheduling |

### Adding Taints to Nodes

```bash
# Dedicate nodes for GPU workloads
kubectl taint nodes gpu-node-1 gpu=true:NoSchedule

# Mark nodes for maintenance (evicts existing pods)
kubectl taint nodes worker-3 maintenance=true:NoExecute

# Prefer to avoid scheduling on nodes with slow storage
kubectl taint nodes storage-node-1 storage=slow:PreferNoSchedule

# Remove a taint (add minus sign at the end)
kubectl taint nodes gpu-node-1 gpu=true:NoSchedule-

# View taints on nodes
kubectl describe nodes | grep -A5 Taints
```

### Tolerating Taints

This pod tolerates GPU taints and can schedule on dedicated GPU nodes.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-training-job
spec:
  # Tolerations allow this pod to schedule on tainted nodes
  tolerations:
    # Tolerate GPU taint
    - key: "gpu"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"
    # Tolerate any taint with key "special-hardware"
    - key: "special-hardware"
      operator: "Exists"
      effect: "NoSchedule"
  # Still need node selector or affinity to target GPU nodes
  nodeSelector:
    hardware: gpu
  containers:
    - name: training
      image: tensorflow/tensorflow:latest-gpu
      resources:
        limits:
          nvidia.com/gpu: 1
```

### Toleration Operators

| Operator | Description | Example |
|----------|-------------|---------|
| Equal | Key and value must match | `key: gpu, value: "true"` |
| Exists | Only key must exist | `key: gpu` (any value) |

### NoExecute Tolerations with tolerationSeconds

Control how long a pod stays on a node after a taint is added.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resilient-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: resilient-app
  template:
    metadata:
      labels:
        app: resilient-app
    spec:
      tolerations:
        # Tolerate node unreachable for 5 minutes before eviction
        - key: "node.kubernetes.io/unreachable"
          operator: "Exists"
          effect: "NoExecute"
          tolerationSeconds: 300
        # Tolerate node not-ready for 5 minutes
        - key: "node.kubernetes.io/not-ready"
          operator: "Exists"
          effect: "NoExecute"
          tolerationSeconds: 300
      containers:
        - name: app
          image: myapp:v1
```

### Dedicated Nodes Pattern

Combine taints, tolerations, and affinity for dedicated node pools.

```yaml
# First, taint and label the dedicated nodes:
# kubectl taint nodes dedicated-pool-1 dedicated=team-ml:NoSchedule
# kubectl label nodes dedicated-pool-1 dedicated=team-ml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-workload
  namespace: team-ml
spec:
  replicas: 4
  selector:
    matchLabels:
      app: ml-workload
  template:
    metadata:
      labels:
        app: ml-workload
    spec:
      # Tolerate the dedicated taint
      tolerations:
        - key: "dedicated"
          operator: "Equal"
          value: "team-ml"
          effect: "NoSchedule"
      # Require dedicated nodes (prevents scheduling elsewhere)
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: dedicated
                    operator: In
                    values:
                      - team-ml
      containers:
        - name: workload
          image: ml-processor:v2
```

## Topology Spread Constraints

Topology spread constraints provide fine-grained control over how pods distribute across topology domains (zones, nodes, racks).

### Basic Topology Spread

Spread pods evenly across availability zones.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-service
spec:
  replicas: 6
  selector:
    matchLabels:
      app: web-service
  template:
    metadata:
      labels:
        app: web-service
    spec:
      topologySpreadConstraints:
        # Spread across zones with maximum 1 pod difference
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: web-service
      containers:
        - name: web
          image: nginx:1.25
```

### Topology Spread Parameters

| Parameter | Description |
|-----------|-------------|
| maxSkew | Maximum difference in pod count between topology domains |
| topologyKey | Node label that defines topology domains |
| whenUnsatisfiable | DoNotSchedule (hard) or ScheduleAnyway (soft) |
| labelSelector | Which pods count toward the spread calculation |
| minDomains | Minimum number of domains required (Kubernetes 1.25+) |

### Multiple Topology Constraints

Spread across both zones and nodes for maximum availability.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-api
spec:
  replicas: 9
  selector:
    matchLabels:
      app: critical-api
  template:
    metadata:
      labels:
        app: critical-api
    spec:
      topologySpreadConstraints:
        # First, spread evenly across zones (hard requirement)
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: critical-api
        # Then, spread across nodes within each zone (soft preference)
        - maxSkew: 2
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: critical-api
      containers:
        - name: api
          image: api-server:v4
          ports:
            - containerPort: 8080
```

### Topology Spread with Node Affinity

Combine topology spread with node selection.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prod-service
spec:
  replicas: 12
  selector:
    matchLabels:
      app: prod-service
  template:
    metadata:
      labels:
        app: prod-service
    spec:
      affinity:
        # Only consider production nodes
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: environment
                    operator: In
                    values:
                      - production
      topologySpreadConstraints:
        # Spread only among production nodes
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: prod-service
          # Only count pods on matching nodes (Kubernetes 1.27+)
          matchLabelKeys:
            - pod-template-hash
      containers:
        - name: service
          image: prod-app:v5
```

## Priority and Preemption

Pod priority determines which pods get scheduled first and which get evicted when resources are scarce.

### Creating PriorityClasses

```yaml
# System-critical priority (highest)
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: system-critical
value: 1000000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Critical system components that must always run"
---
# High priority for production workloads
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 100000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Production services and customer-facing applications"
---
# Default priority for standard workloads
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: default-priority
value: 10000
globalDefault: true
preemptionPolicy: PreemptLowerPriority
description: "Standard workloads"
---
# Low priority for batch jobs (can be preempted)
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: batch-priority
value: 1000
globalDefault: false
preemptionPolicy: Never
description: "Batch jobs that can wait or be preempted"
```

### Using PriorityClasses

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      # High priority ensures this service gets resources
      priorityClassName: high-priority
      containers:
        - name: payment
          image: payment-api:v2
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
---
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing
spec:
  template:
    spec:
      # Low priority - can be preempted by higher priority pods
      priorityClassName: batch-priority
      restartPolicy: OnFailure
      containers:
        - name: processor
          image: batch-processor:v1
          resources:
            requests:
              cpu: "4"
              memory: "8Gi"
```

### Preemption Policies

| Policy | Behavior |
|--------|----------|
| PreemptLowerPriority | Can evict lower priority pods to make room |
| Never | Cannot preempt other pods, only uses available resources |

## Practical Scheduling Patterns

### Pattern 1: Multi-Tier Application

```yaml
# Database tier - dedicated nodes with SSD, spread across zones
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql
  replicas: 3
  selector:
    matchLabels:
      tier: database
  template:
    metadata:
      labels:
        app: myapp
        tier: database
    spec:
      priorityClassName: high-priority
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: node-role
                    operator: In
                    values:
                      - database
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  tier: database
              topologyKey: kubernetes.io/hostname
      tolerations:
        - key: "dedicated"
          operator: "Equal"
          value: "database"
          effect: "NoSchedule"
      containers:
        - name: mysql
          image: mysql:8
---
# Application tier - spread across zones, co-locate with cache
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 6
  selector:
    matchLabels:
      tier: application
  template:
    metadata:
      labels:
        app: myapp
        tier: application
    spec:
      priorityClassName: high-priority
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              tier: application
      affinity:
        podAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 50
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    tier: cache
                topologyKey: kubernetes.io/hostname
      containers:
        - name: api
          image: api:v3
```

### Pattern 2: Development and Production Isolation

```yaml
# Label and taint nodes:
# kubectl label nodes prod-node-1 environment=production
# kubectl taint nodes prod-node-1 environment=production:NoSchedule

# Production deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  namespace: production
spec:
  replicas: 10
  selector:
    matchLabels:
      app: webapp
      env: production
  template:
    metadata:
      labels:
        app: webapp
        env: production
    spec:
      tolerations:
        - key: "environment"
          operator: "Equal"
          value: "production"
          effect: "NoSchedule"
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: environment
                    operator: In
                    values:
                      - production
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: webapp
              env: production
      containers:
        - name: webapp
          image: webapp:stable
```

### Pattern 3: GPU Workload Scheduling

```yaml
# Taint GPU nodes:
# kubectl taint nodes gpu-node-1 nvidia.com/gpu=present:NoSchedule
# kubectl label nodes gpu-node-1 accelerator=nvidia-tesla-v100

apiVersion: batch/v1
kind: Job
metadata:
  name: model-training
spec:
  parallelism: 4
  completions: 4
  template:
    spec:
      restartPolicy: OnFailure
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: accelerator
                    operator: In
                    values:
                      - nvidia-tesla-v100
                      - nvidia-tesla-a100
        podAntiAffinity:
          # Spread training pods across GPU nodes
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    job-name: model-training
                topologyKey: kubernetes.io/hostname
      containers:
        - name: trainer
          image: training-job:v2
          resources:
            limits:
              nvidia.com/gpu: 1
              memory: "32Gi"
            requests:
              nvidia.com/gpu: 1
              memory: "32Gi"
```

## Debugging Scheduling Issues

### Check Why a Pod is Pending

```bash
# View pod events for scheduling failures
kubectl describe pod <pod-name> | grep -A10 Events

# Check scheduler logs
kubectl logs -n kube-system -l component=kube-scheduler

# View node resources and allocations
kubectl describe nodes | grep -A10 "Allocated resources"

# Check which nodes match your affinity rules
kubectl get nodes -l disktype=ssd,environment=production

# Verify taints on nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints
```

### Common Scheduling Failures

| Issue | Cause | Solution |
|-------|-------|----------|
| Pending - no nodes available | No nodes match affinity rules | Check node labels and affinity config |
| Pending - insufficient resources | Nodes lack CPU/memory | Add nodes or reduce requests |
| Pending - taint not tolerated | Node has taint pod cannot tolerate | Add toleration or use different nodes |
| Pending - topology spread | Cannot achieve desired spread | Reduce replicas or relax maxSkew |

## Summary

Kubernetes provides multiple mechanisms for pod scheduling:

| Mechanism | Use Case | Complexity |
|-----------|----------|------------|
| nodeSelector | Simple node targeting | Low |
| Node Affinity | Flexible node selection | Medium |
| Pod Affinity | Co-locate related pods | Medium |
| Pod Anti-Affinity | Spread pods for HA | Medium |
| Taints/Tolerations | Dedicated or special nodes | Medium |
| Topology Spread | Even distribution | Medium |
| Priority Classes | Resource contention | Low |

Start with the simplest mechanism that meets your needs. Combine multiple mechanisms for complex scenarios, but test thoroughly since interactions between rules can produce unexpected results. Use `kubectl describe pod` to debug scheduling failures and iterate on your configuration.
