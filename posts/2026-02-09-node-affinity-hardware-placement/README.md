# How to Use Node Affinity for Hardware-Specific Workload Placement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Node Affinity, Scheduling, Hardware Optimization, Performance

Description: Implement node affinity rules to place workloads on nodes with specific hardware characteristics like GPUs, SSDs, or CPU architectures for optimal performance.

---

Node affinity controls which nodes can host specific pods based on node labels. This enables matching workload requirements to hardware capabilities - placing GPU workloads on GPU nodes, CPU-intensive tasks on high-performance processors, and storage-heavy applications on nodes with fast local SSDs.

## Node Affinity vs Node Selectors

Node selectors provide simple node selection based on exact label matches:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  nodeSelector:
    gpu: "true"
  containers:
  - name: ml-training
    image: tensorflow:latest
```

Node affinity extends this with more expressive rules:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: accelerator
            operator: In
            values:
            - nvidia-tesla-v100
            - nvidia-tesla-t4
  containers:
  - name: ml-training
    image: tensorflow:latest
```

Node affinity supports operators like In, NotIn, Exists, DoesNotExist, Gt, and Lt, enabling complex placement logic.

## Required vs Preferred Affinity

Required affinity acts as a hard constraint. Pods only schedule on matching nodes:

```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: instance-type
            operator: In
            values:
            - c5.metal
            - c5n.metal
```

If no nodes match, the pod stays pending.

Preferred affinity acts as a soft preference. The scheduler tries to match but schedules elsewhere if needed:

```yaml
spec:
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 80
        preference:
          matchExpressions:
          - key: disk-type
            operator: In
            values:
            - nvme
      - weight: 20
        preference:
          matchExpressions:
          - key: network-speed
            operator: In
            values:
            - 10gbps
```

The scheduler scores nodes based on weights. Higher-weight preferences matter more but do not block scheduling if unavailable.

## GPU Workload Placement

Direct GPU workloads to GPU-enabled nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-training
spec:
  replicas: 4
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: accelerator-type
                operator: In
                values:
                - nvidia-tesla-v100
              - key: accelerator-count
                operator: Gt
                values:
                - "1"
      containers:
      - name: trainer
        image: ml-training:v1
        resources:
          limits:
            nvidia.com/gpu: 2
```

This ensures pods only schedule on nodes with V100 GPUs and multiple GPU devices.

Label GPU nodes appropriately:

```bash
kubectl label node gpu-node-1 \
  accelerator-type=nvidia-tesla-v100 \
  accelerator-count=4 \
  gpu-memory=32gb
```

## High-Performance CPU Selection

Place compute-intensive workloads on nodes with specific CPU types:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: scientific-computation
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: cpu-family
                operator: In
                values:
                - intel-xeon-platinum
                - intel-xeon-gold
              - key: cpu-generation
                operator: Gt
                values:
                - "3"
      containers:
      - name: compute
        image: scientific-app:v1
        resources:
          requests:
            cpu: "16"
            memory: "64Gi"
```

This targets Intel Xeon Platinum or Gold processors, generation 4 or newer, ensuring AVX-512 instruction set availability for vectorized computations.

## Storage Performance Optimization

Place database workloads on nodes with fast local storage:

```yaml
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
              - key: storage-type
                operator: In
                values:
                - nvme-ssd
              - key: storage-iops
                operator: Gt
                values:
                - "50000"
      containers:
      - name: postgres
        image: postgres:14
        volumeMounts:
        - name: pgdata
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: pgdata
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: local-nvme
      resources:
        requests:
          storage: 500Gi
```

Combined with local volume provisioner, this ensures databases run on nodes with high-performance NVMe storage.

## Network Performance Requirements

Direct latency-sensitive workloads to nodes with enhanced networking:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hft-trading
spec:
  replicas: 2
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: network-enhanced
                operator: Exists
              - key: network-bandwidth-gbps
                operator: Gt
                values:
                - "25"
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: hft-trading
            topologyKey: kubernetes.io/hostname
      containers:
      - name: trading
        image: trading-engine:v1
```

The node affinity ensures enhanced networking. The pod anti-affinity spreads replicas across nodes for redundancy.

## ARM vs x86 Architecture Selection

In heterogeneous clusters with both ARM and x86 nodes:

```yaml
# ARM-optimized workload
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend-arm
spec:
  replicas: 10
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/arch
                operator: In
                values:
                - arm64
      containers:
      - name: web
        image: web-frontend:v1-arm64
---
# x86-only workload
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-app
spec:
  replicas: 3
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/arch
                operator: In
                values:
                - amd64
      containers:
      - name: legacy
        image: legacy-app:v1
```

This allows running ARM nodes for cost savings on compatible workloads while maintaining x86 nodes for legacy applications.

## Multi-Constraint Affinity

Combine multiple requirements:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ml-inference
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: accelerator-type
            operator: In
            values:
            - nvidia-tesla-t4
          - key: zone
            operator: In
            values:
            - us-east-1a
            - us-east-1b
          - key: instance-category
            operator: In
            values:
            - compute-optimized
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions:
          - key: spot-instance
            operator: DoesNotExist
      - weight: 50
        preference:
          matchExpressions:
          - key: network-bandwidth-gbps
            operator: Gt
            values:
            - "10"
  containers:
  - name: inference
    image: ml-inference:v1
    resources:
      limits:
        nvidia.com/gpu: 1
```

Required rules ensure T4 GPU in specific zones on compute-optimized instances. Preferred rules favor on-demand over spot and higher network bandwidth.

## Node Affinity with Taints and Tolerations

Combine node affinity with taints for exclusive resource pools:

```yaml
# Taint GPU nodes
apiVersion: v1
kind: Node
metadata:
  name: gpu-node-1
spec:
  taints:
  - key: nvidia.com/gpu
    value: "true"
    effect: NoSchedule
---
# GPU workload with affinity and toleration
apiVersion: v1
kind: Pod
metadata:
  name: gpu-workload
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: accelerator-type
            operator: Exists
  tolerations:
  - key: nvidia.com/gpu
    operator: Equal
    value: "true"
    effect: NoSchedule
  containers:
  - name: gpu-app
    image: gpu-app:v1
```

The taint prevents non-GPU workloads from consuming GPU nodes. Only pods with matching tolerations and node affinity schedule there.

## Dynamic Node Labeling

Automate node labeling based on hardware detection:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-labeler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: node-labeler
  template:
    metadata:
      labels:
        app: node-labeler
    spec:
      hostPID: true
      hostNetwork: true
      containers:
      - name: labeler
        image: node-labeler:v1
        securityContext:
          privileged: true
        volumeMounts:
        - name: sysfs
          mountPath: /sys
          readOnly: true
      volumes:
      - name: sysfs
        hostPath:
          path: /sys
```

The DaemonSet detects hardware and applies labels:

```bash
#!/bin/bash
# Detect GPU
if lspci | grep -i nvidia > /dev/null; then
  kubectl label node $NODE_NAME accelerator-type=nvidia
fi

# Detect NVMe
if ls /sys/block/ | grep -q nvme; then
  kubectl label node $NODE_NAME storage-type=nvme
fi

# Detect CPU family
CPU_MODEL=$(lscpu | grep "Model name" | awk -F: '{print $2}' | xargs)
kubectl label node $NODE_NAME cpu-model="$CPU_MODEL"
```

## Monitoring Affinity Impact

Track scheduling decisions based on affinity:

```promql
# Pods by required node affinity
count by (node_affinity_required) (kube_pod_info)

# Pending pods with unsatisfied affinity
kube_pod_status_phase{phase="Pending"} *
on(pod, namespace) group_left
kube_pod_spec_node_affinity_required_nodefield_selector{key="instance-type"}
```

Alert on pods pending due to affinity constraints:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: affinity-alerts
spec:
  groups:
  - name: scheduling
    rules:
    - alert: AffinityBlockingPods
      expr: |
        kube_pod_status_phase{phase="Pending"} > 0
      for: 15m
      annotations:
        summary: "Pods pending for 15+ minutes, check affinity rules"
```

## Cost Optimization with Affinity

Use affinity to balance cost and performance:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processing
spec:
  replicas: 50
  template:
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: capacity-type
                operator: In
                values:
                - spot
          - weight: 80
            preference:
              matchExpressions:
              - key: instance-generation
                operator: In
                values:
                - graviton3  # ARM for 20% cost savings
          - weight: 50
            preference:
              matchExpressions:
              - key: instance-size
                operator: In
                values:
                - large
                - xlarge
      containers:
      - name: processor
        image: batch-processor:v1-multi-arch
```

The scheduler prefers spot instances first, then Graviton3 ARM instances for cost savings, then right-sized instances, but schedules anywhere if these are unavailable.

## Troubleshooting Affinity Issues

Pods not scheduling:

```bash
kubectl describe pod <pending-pod> | grep -A 10 "Events:"
```

Look for:
- "MatchNodeSelector" failures
- "MatchNodeAffinity" failures
- No nodes matching affinity rules

Verify node labels exist:

```bash
kubectl get nodes --show-labels | grep <expected-label>
```

Check if node label values match affinity expressions exactly. Case sensitivity matters.

Test affinity rules:

```bash
# Create test pod
kubectl run test-affinity --image=nginx --dry-run=client -o yaml > test.yaml

# Add affinity rules
# Apply and check scheduling
kubectl apply -f test.yaml
kubectl get pod test-affinity -o wide
```

Node affinity transforms Kubernetes from a generic compute platform into a hardware-aware orchestration system. Proper use ensures workloads run on optimal hardware, improving performance while controlling costs through strategic instance selection.
