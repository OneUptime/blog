# How to Taint and Tolerate Nodes for Dedicated Workload Isolation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Taints, Tolerations

Description: Master taints and tolerations in Kubernetes to create dedicated node pools for specific workloads, ensuring resource isolation and preventing incompatible pods from being scheduled together.

---

In production Kubernetes clusters, you often need to isolate certain workloads. GPU nodes should only run GPU workloads, database nodes should be reserved for databases, and production nodes shouldn't run development workloads. Taints and tolerations provide this isolation mechanism.

Taints repel pods from nodes, while tolerations allow specific pods to overcome those taints. This creates a powerful system for dedicating nodes to particular workload types while preventing unwanted scheduling.

## Understanding Taints and Tolerations

A taint applied to a node tells the scheduler to avoid placing pods on that node unless the pod has a matching toleration. Taints have three components:

- **Key**: The taint identifier
- **Value**: Optional value for the taint
- **Effect**: What happens to intolerant pods (NoSchedule, PreferNoSchedule, or NoExecute)

Tolerations in pod specs match taints and allow pods to be scheduled despite the taint.

## Taint Effects Explained

**NoSchedule**: New pods without matching toleration won't be scheduled. Existing pods remain.

**PreferNoSchedule**: Scheduler tries to avoid placing pods here but may if necessary.

**NoExecute**: Existing pods without tolerations are evicted. New pods must have tolerations.

## Adding Taints to Nodes

Taint nodes for dedicated workloads:

```bash
# Taint a node for GPU workloads only
kubectl taint nodes gpu-node-1 dedicated=gpu:NoSchedule

# Taint nodes for production workloads
kubectl taint nodes prod-node-1 prod-node-2 prod-node-3 environment=production:NoSchedule

# Taint node with NoExecute to evict existing pods
kubectl taint nodes maintenance-node-1 maintenance=true:NoExecute

# Taint with PreferNoSchedule for soft isolation
kubectl taint nodes testing-node-1 workload=experimental:PreferNoSchedule

# View taints on a node
kubectl describe node gpu-node-1 | grep Taints

# List all nodes with their taints
kubectl get nodes -o json | \
  jq -r '.items[] | {name: .metadata.name, taints: .spec.taints}'
```

## Removing Taints

Remove taints when needed:

```bash
# Remove specific taint (note the minus sign at the end)
kubectl taint nodes gpu-node-1 dedicated=gpu:NoSchedule-

# Remove taint by key only
kubectl taint nodes prod-node-1 environment-

# Remove all taints from a node
kubectl taint nodes testing-node-1 workload-
```

## Pod Tolerations for GPU Nodes

Create pods that tolerate GPU node taints:

```yaml
# gpu-training-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ml-training
  namespace: ml-workloads
spec:
  template:
    spec:
      # Tolerate the GPU taint
      tolerations:
      - key: "dedicated"
        operator: "Equal"
        value: "gpu"
        effect: "NoSchedule"
      # Ensure scheduling on GPU nodes
      nodeSelector:
        accelerator: nvidia-gpu
      containers:
      - name: trainer
        image: pytorch/pytorch:2.0.0-cuda11.7-cudnn8-runtime
        resources:
          limits:
            nvidia.com/gpu: 2
            cpu: 8000m
            memory: 32Gi
          requests:
            nvidia.com/gpu: 2
            cpu: 4000m
            memory: 16Gi
      restartPolicy: Never
```

## Production Environment Isolation

Isolate production nodes from non-production workloads:

```yaml
# production-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: payment-api
  template:
    metadata:
      labels:
        app: payment-api
    spec:
      # Tolerate production taint
      tolerations:
      - key: "environment"
        operator: "Equal"
        value: "production"
        effect: "NoSchedule"
      # Require production nodes
      nodeSelector:
        environment: production
      containers:
      - name: api
        image: payment-api:v2.1
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        ports:
        - containerPort: 8080
```

## Database Node Isolation

Dedicate nodes for stateful database workloads:

```bash
# Taint database nodes
kubectl taint nodes db-node-1 db-node-2 db-node-3 \
  workload=database:NoSchedule

# Label database nodes
kubectl label nodes db-node-1 db-node-2 db-node-3 \
  workload-type=database
```

```yaml
# database-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-cluster
  namespace: databases
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
      # Tolerate database node taint
      tolerations:
      - key: "workload"
        operator: "Equal"
        value: "database"
        effect: "NoSchedule"
      nodeSelector:
        workload-type: database
      containers:
      - name: postgres
        image: postgres:15
        resources:
          requests:
            cpu: 4000m
            memory: 16Gi
          limits:
            cpu: 8000m
            memory: 32Gi
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
          storage: 500Gi
```

## Operator Exists for Wildcard Tolerations

Tolerate any value for a taint key:

```yaml
# flexible-toleration.yaml
apiVersion: v1
kind: Pod
metadata:
  name: flexible-pod
spec:
  tolerations:
  # Tolerates any value for the "team" key
  - key: "team"
    operator: "Exists"
    effect: "NoSchedule"
  # Specific toleration
  - key: "environment"
    operator: "Equal"
    value: "staging"
    effect: "NoSchedule"
  containers:
  - name: app
    image: nginx:1.21
```

## NoExecute Effect for Maintenance

Use NoExecute to drain nodes gracefully:

```bash
# Taint node for maintenance - existing pods will be evicted
kubectl taint nodes worker-node-1 maintenance=true:NoExecute
```

```yaml
# maintenance-tolerant-pod.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-monitor
spec:
  selector:
    matchLabels:
      app: node-monitor
  template:
    spec:
      # Tolerate maintenance taint with timeout
      tolerations:
      - key: "maintenance"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300  # Stay for 5 minutes after taint
      containers:
      - name: monitor
        image: node-monitor:v1.0
```

## System DaemonSets with Tolerations

System components should tolerate all taints:

```yaml
# system-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      # Tolerate all taints to run on every node
      tolerations:
      - operator: "Exists"
        effect: "NoSchedule"
      - operator: "Exists"
        effect: "NoExecute"
      - operator: "Exists"
        effect: "PreferNoSchedule"
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.15
        volumeMounts:
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
```

## Multiple Taints on Single Node

Combine taints for complex isolation:

```bash
# Node with multiple taints
kubectl taint nodes special-node-1 \
  workload=ml-training:NoSchedule \
  gpu-type=a100:NoSchedule \
  team=ml-research:NoSchedule
```

```yaml
# pod-with-multiple-tolerations.yaml
apiVersion: v1
kind: Pod
metadata:
  name: research-training
spec:
  tolerations:
  # Must tolerate all three taints
  - key: "workload"
    operator: "Equal"
    value: "ml-training"
    effect: "NoSchedule"
  - key: "gpu-type"
    operator: "Equal"
    value: "a100"
    effect: "NoSchedule"
  - key: "team"
    operator: "Equal"
    value: "ml-research"
    effect: "NoSchedule"
  nodeSelector:
    node-type: ml-training
  containers:
  - name: trainer
    image: ml-framework:latest
    resources:
      limits:
        nvidia.com/gpu: 8
```

## Automatic Taints

Kubernetes automatically adds taints for node conditions:

```bash
# View automatic taints
kubectl describe node worker-node-1 | grep Taints

# Common automatic taints:
# - node.kubernetes.io/not-ready:NoExecute
# - node.kubernetes.io/not-ready:NoSchedule
# - node.kubernetes.io/unreachable:NoExecute
# - node.kubernetes.io/unreachable:NoSchedule
# - node.kubernetes.io/memory-pressure:NoSchedule
# - node.kubernetes.io/disk-pressure:NoSchedule
# - node.kubernetes.io/network-unavailable:NoSchedule
# - node.kubernetes.io/unschedulable:NoSchedule
```

Tolerate automatic taints for resilient workloads:

```yaml
# resilient-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resilient-app
spec:
  replicas: 10
  selector:
    matchLabels:
      app: resilient-app
  template:
    spec:
      # Tolerate node pressure conditions
      tolerations:
      - key: "node.kubernetes.io/memory-pressure"
        operator: "Exists"
        effect: "NoSchedule"
      - key: "node.kubernetes.io/disk-pressure"
        operator: "Exists"
        effect: "NoSchedule"
      - key: "node.kubernetes.io/not-ready"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 60
      containers:
      - name: app
        image: nginx:1.21
```

## Taint-Based Eviction

Control how long pods stay on tainted nodes:

```yaml
# controlled-eviction.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
spec:
  replicas: 5
  selector:
    matchLabels:
      app: batch-processor
  template:
    spec:
      tolerations:
      # Stay on not-ready nodes for 5 minutes
      - key: "node.kubernetes.io/not-ready"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
      # Stay on unreachable nodes for 5 minutes
      - key: "node.kubernetes.io/unreachable"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
      containers:
      - name: processor
        image: batch-processor:v1.0
```

## Best Practices

1. **Use Consistent Keys**: Standardize taint keys across your organization
2. **Combine with NodeSelectors**: Taints prevent scheduling, nodeSelectors ensure proper placement
3. **Document Taints**: Maintain documentation of what each taint means
4. **Start with NoSchedule**: Use NoSchedule before NoExecute to avoid disruption
5. **Label Tainted Nodes**: Add corresponding labels for easier selection
6. **Monitor Taint Effects**: Track pod evictions from NoExecute taints
7. **System Pods Need Tolerations**: Ensure system DaemonSets tolerate all taints
8. **Consider PDBs**: Use PodDisruptionBudgets with NoExecute taints

## Automation with Operators

Automatically taint nodes based on conditions:

```yaml
# node-taint-controller.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: node-taint-controller
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: node-taint-controller
  template:
    spec:
      serviceAccountName: node-taint-controller
      containers:
      - name: controller
        image: node-taint-controller:v1.0
        env:
        - name: TAINT_RULES
          value: |
            - condition: "gpu-utilization < 10%"
              taint: "underutilized=true:PreferNoSchedule"
            - condition: "disk-usage > 90%"
              taint: "disk-pressure=high:NoSchedule"
```

## Troubleshooting

If pods aren't being scheduled on tainted nodes:

```bash
# Check node taints
kubectl describe node <node-name> | grep -A 5 Taints

# Verify pod tolerations
kubectl get pod <pod-name> -o jsonpath='{.spec.tolerations}' | jq

# Check why pod is pending
kubectl describe pod <pod-name> | grep -A 10 Events

# Find nodes with specific taint
kubectl get nodes -o json | \
  jq -r '.items[] | select(.spec.taints[]? | .key=="dedicated") | .metadata.name'
```

If pods are being evicted unexpectedly:

```bash
# Check for NoExecute taints
kubectl get nodes -o json | \
  jq -r '.items[] | {name: .metadata.name, taints: (.spec.taints[]? | select(.effect=="NoExecute"))}'

# View recent eviction events
kubectl get events --all-namespaces --field-selector reason=Evicted --sort-by='.lastTimestamp'

# Check pod toleration seconds
kubectl get pod <pod-name> -o jsonpath='{.spec.tolerations[*].tolerationSeconds}'
```

Taints and tolerations provide fine-grained control over pod placement in Kubernetes clusters. By properly configuring taints on nodes and tolerations on pods, you can create dedicated workload pools, isolate environments, and ensure critical workloads run on appropriate infrastructure.

