# How to Use Scheduler Hints for Placement Preferences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Pod Placement

Description: Master Kubernetes scheduler hints and placement preferences using node selectors, affinity rules, and scheduling policies to control where your pods run for optimal performance and cost efficiency.

---

The Kubernetes scheduler makes decisions about where to place pods, but sometimes you know better than the default algorithm. Maybe you want GPU workloads on specific nodes, or you need to keep certain pods together for performance. Scheduler hints let you guide these placement decisions.

Unlike hard constraints that prevent scheduling entirely, hints express preferences that the scheduler considers alongside other factors. Understanding how to use these hints effectively gives you fine-grained control over your workload placement.

## Node Selectors: The Simplest Hint

Node selectors are the most straightforward way to guide pod placement. They match pods to nodes based on labels:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-workload
spec:
  nodeSelector:
    accelerator: nvidia-tesla-v100
    disk-type: ssd
  containers:
  - name: training
    image: ml/training:latest
    resources:
      limits:
        nvidia.com/gpu: 1
```

This pod will only be scheduled on nodes that have both labels. Node selectors are hard constraints, so they're more like requirements than hints. But they're simple and effective for basic placement needs.

Label your nodes to support these selectors:

```bash
# Add labels to nodes
kubectl label nodes node-1 accelerator=nvidia-tesla-v100
kubectl label nodes node-1 disk-type=ssd
kubectl label nodes node-2 accelerator=nvidia-tesla-v100
kubectl label nodes node-2 disk-type=nvme

# View node labels
kubectl get nodes --show-labels
```

## Node Affinity: Flexible Preferences

Node affinity provides more expressive rules than node selectors. You can specify required rules and preferred rules:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      affinity:
        nodeAffinity:
          # Required: must have these labels
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/os
                operator: In
                values:
                - linux
              - key: node.kubernetes.io/instance-type
                operator: In
                values:
                - m5.large
                - m5.xlarge
                - m5.2xlarge
          # Preferred: nice to have these labels
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 80
            preference:
              matchExpressions:
              - key: topology.kubernetes.io/zone
                operator: In
                values:
                - us-east-1a
          - weight: 20
            preference:
              matchExpressions:
              - key: disk-type
                operator: In
                values:
                - ssd
      containers:
      - name: web
        image: nginx:1.21
```

The required rules are hard constraints. The preferred rules are weighted hints. The scheduler calculates a score for each node based on how many preferred rules match and their weights.

## Pod Affinity: Keep Pods Together

Pod affinity lets you place pods near other pods. This is useful when you want low latency between services:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cache
  template:
    metadata:
      labels:
        app: cache
        tier: cache
    spec:
      affinity:
        podAffinity:
          # Prefer to run on nodes that have app=web pods
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - web
              topologyKey: kubernetes.io/hostname
      containers:
      - name: redis
        image: redis:6.2
        ports:
        - containerPort: 6379
```

This deployment prefers to place cache pods on the same nodes as web pods, reducing network latency between them.

## Pod Anti-Affinity: Keep Pods Apart

Pod anti-affinity does the opposite, keeping pods away from each other. This improves availability:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 4
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      affinity:
        podAntiAffinity:
          # Strongly prefer different nodes
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: api
              topologyKey: kubernetes.io/hostname
          # Require different zones
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: api
            topologyKey: topology.kubernetes.io/zone
      containers:
      - name: api
        image: myapp/api:v1
```

This configuration requires that no two api pods run in the same availability zone, and prefers that they run on different nodes within zones.

## Combining Multiple Hints

You can combine different types of hints to create sophisticated placement strategies:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  replicas: 3
  serviceName: db
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
        component: storage
    spec:
      affinity:
        # Node preferences
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              # Must have fast storage
              - key: disk-type
                operator: In
                values:
                - nvme
                - ssd
              # Must be in preferred zones
              - key: topology.kubernetes.io/zone
                operator: In
                values:
                - us-east-1a
                - us-east-1b
                - us-east-1c
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 50
            preference:
              matchExpressions:
              # Prefer dedicated database nodes
              - key: workload-type
                operator: In
                values:
                - database
        # Keep database replicas on different nodes
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: db
            topologyKey: kubernetes.io/hostname
        # Keep databases away from compute-heavy workloads
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 80
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: workload-type
                  operator: In
                  values:
                  - compute-intensive
              topologyKey: kubernetes.io/hostname
      containers:
      - name: postgres
        image: postgres:14
        resources:
          requests:
            cpu: 2000m
            memory: 8Gi
            ephemeral-storage: 10Gi
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 500Gi
      storageClassName: fast-ssd
```

This StatefulSet has multiple layers of hints ensuring database pods get the resources they need while avoiding interference from other workloads.

## Taints and Tolerations: Reserving Nodes

Taints mark nodes as special-purpose, and tolerations allow specific pods to schedule on tainted nodes:

```bash
# Taint nodes for GPU workloads
kubectl taint nodes gpu-node-1 workload=gpu:NoSchedule
kubectl taint nodes gpu-node-2 workload=gpu:NoSchedule

# Taint nodes for production only
kubectl taint nodes prod-node-1 environment=production:NoSchedule
```

Then create pods that tolerate these taints:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: gpu-training
spec:
  template:
    spec:
      tolerations:
      # Tolerate GPU taint
      - key: workload
        operator: Equal
        value: gpu
        effect: NoSchedule
      # Prefer GPU nodes
      nodeSelector:
        accelerator: nvidia-gpu
      containers:
      - name: training
        image: ml/training:v2
        resources:
          limits:
            nvidia.com/gpu: 2
      restartPolicy: Never
```

## Priority Classes: Scheduling Hints Through Priority

Priority classes influence scheduling by giving some pods precedence over others:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000
globalDefault: false
description: "High priority for critical workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 100
globalDefault: false
description: "Low priority for batch workloads"
```

Use priority classes in your pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: critical-service
spec:
  priorityClassName: high-priority
  containers:
  - name: service
    image: myapp/critical:latest
---
apiVersion: batch/v1
kind: Job
metadata:
  name: background-job
spec:
  template:
    spec:
      priorityClassName: low-priority
      containers:
      - name: worker
        image: myapp/batch:latest
      restartPolicy: Never
```

When resources are tight, low-priority pods may be preempted to make room for high-priority ones.

## Scheduler Profiles: Different Strategies

You can run multiple scheduler profiles with different configurations:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: default-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesBalancedAllocation
        weight: 1
      - name: NodeResourcesFit
        weight: 2
- schedulerName: bin-packing-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesFit
        weight: 10
      disabled:
      - name: NodeResourcesBalancedAllocation
```

Then specify which scheduler to use:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: packed-workload
spec:
  schedulerName: bin-packing-scheduler
  containers:
  - name: app
    image: myapp:latest
```

## Debugging Placement Decisions

When pods don't land where you expect, debug the scheduler's decision:

```bash
# Check why a pod is pending
kubectl describe pod <pod-name> | grep -A 20 Events

# View scheduler logs
kubectl logs -n kube-system \
  $(kubectl get pods -n kube-system -l component=kube-scheduler -o name) | \
  grep <pod-name>

# Check node conditions and resources
kubectl describe nodes | grep -A 10 "Allocatable\|Conditions"
```

## Testing Your Hints

Validate that your scheduler hints work as expected:

```bash
# Create test pods
kubectl apply -f test-deployment.yaml

# Check where pods landed
kubectl get pods -o wide -l app=test

# Verify node labels match expectations
for pod in $(kubectl get pods -l app=test -o name); do
  node=$(kubectl get $pod -o jsonpath='{.spec.nodeName}')
  echo "Pod: $pod"
  echo "Node: $node"
  kubectl get node $node --show-labels
  echo "---"
done
```

## Best Practices

Follow these guidelines for effective scheduler hints:

1. **Start with soft preferences**: Use preferred rules before required rules. This gives the scheduler flexibility.
2. **Avoid over-constraining**: Too many hard constraints can make pods unschedulable.
3. **Use appropriate topology keys**: Choose topology keys that match your actual failure domains.
4. **Test under load**: Verify your hints work when the cluster is under resource pressure.
5. **Document your strategy**: Explain why certain hints are used so others understand the intent.
6. **Monitor scheduling metrics**: Track scheduling latency and failed scheduling attempts.

Scheduler hints give you powerful control over pod placement while working with, not against, the scheduler. By expressing preferences rather than absolute requirements, you help the scheduler make better decisions that balance your needs with cluster efficiency.
