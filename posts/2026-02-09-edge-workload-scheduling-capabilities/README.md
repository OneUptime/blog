# How to Implement Edge Workload Scheduling Based on Node Capabilities in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Edge Computing, Scheduling

Description: Learn how to implement intelligent workload scheduling for edge Kubernetes clusters based on node capabilities like GPU presence, storage type, network connectivity, and sensor access, ensuring applications run on suitable hardware.

---

Edge nodes have diverse hardware capabilities. Some have GPUs for inference, others have high-speed storage for caching, and some connect to specific sensors or equipment. Standard Kubernetes scheduling treats nodes uniformly, potentially placing workloads on incompatible hardware. Capability-based scheduling ensures applications land on nodes with required resources.

In this guide, you'll implement capability-based scheduling using node labels, taints/tolerations, and custom schedulers to match edge workloads with appropriate hardware.

## Understanding Node Capabilities

Edge nodes vary in:

- **Compute**: CPU architecture (x86, ARM), GPU presence
- **Storage**: SSD vs HDD, storage capacity, IOPS
- **Network**: Bandwidth, latency, connectivity type
- **Devices**: USB cameras, sensors, industrial equipment
- **Location**: Geographic zone, facility type

Workloads must schedule only on nodes providing required capabilities.

## Labeling Nodes with Capabilities

Add capability labels to nodes:

```bash
# Hardware capabilities
kubectl label node edge-node-01 \
  gpu=nvidia-t4 \
  storage-type=nvme \
  storage-size=1tb \
  cpu-arch=x86_64

# Network capabilities
kubectl label node edge-node-01 \
  network-bandwidth=1gbps \
  connectivity=cellular \
  has-wifi=true

# Device capabilities
kubectl label node edge-node-01 \
  has-usb-camera=true \
  has-thermal-sensor=true \
  opc-ua-compatible=true

# Location capabilities
kubectl label node edge-node-01 \
  location=warehouse-a \
  zone=production-floor \
  facility-type=manufacturing
```

View node capabilities:

```bash
kubectl get nodes --show-labels
```

## Scheduling Based on Hardware Requirements

Deploy workloads with hardware requirements:

```yaml
# gpu-inference-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-inference
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-inference
  template:
    metadata:
      labels:
        app: ml-inference
    spec:
      nodeSelector:
        gpu: nvidia-t4  # Require specific GPU
        storage-type: nvme  # Need fast storage
      containers:
      - name: inference
        image: ml-inference:v1
        resources:
          requests:
            nvidia.com/gpu: 1
          limits:
            nvidia.com/gpu: 1
```

## Using Node Affinity for Complex Requirements

Express complex capability requirements:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: video-processor
spec:
  replicas: 2
  selector:
    matchLabels:
      app: video-processor
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              # Must have USB camera
              - key: has-usb-camera
                operator: In
                values: ["true"]
              # Must have either GPU or high-core CPU
              - key: gpu
                operator: Exists
              - key: cpu-cores
                operator: Gt
                values: ["8"]
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              # Prefer nodes with NVMe storage
              - key: storage-type
                operator: In
                values: ["nvme"]
          - weight: 50
            preference:
              matchExpressions:
              # Prefer nodes with high bandwidth
              - key: network-bandwidth
                operator: In
                values: ["10gbps", "1gbps"]
      containers:
      - name: processor
        image: video-processor:v1
```

## Implementing Taints for Specialized Nodes

Reserve specialized nodes for specific workloads:

```bash
# Taint GPU nodes
kubectl taint node edge-gpu-01 \
  gpu=nvidia:NoSchedule

# Taint nodes with industrial equipment access
kubectl taint node edge-industrial-01 \
  equipment-access=plc:NoSchedule
```

Workloads must tolerate taints:

```yaml
spec:
  tolerations:
  - key: "gpu"
    operator: "Equal"
    value: "nvidia"
    effect: "NoSchedule"
  - key: "equipment-access"
    operator: "Equal"
    value: "plc"
    effect: "NoSchedule"
```

## Creating Capability-Aware Custom Scheduler

Build a custom scheduler for complex capability matching:

```yaml
# capability-scheduler.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: capability-scheduler
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: capability-scheduler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: capability-scheduler
  template:
    metadata:
      labels:
        app: capability-scheduler
    spec:
      serviceAccountName: capability-scheduler
      containers:
      - name: scheduler
        image: your-registry/capability-scheduler:v1
        command:
        - /scheduler
        - --config=/etc/kubernetes/scheduler-config.yaml
```

## Scheduling Based on Storage Capabilities

Match workloads to storage requirements:

```yaml
# database-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: timeseries-db
spec:
  serviceName: timeseries-db
  replicas: 3
  selector:
    matchLabels:
      app: timeseries-db
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: storage-type
                operator: In
                values: ["nvme", "ssd"]
              - key: storage-size
                operator: In
                values: ["1tb", "2tb", "4tb"]
              - key: storage-iops
                operator: Gt
                values: ["10000"]
      containers:
      - name: db
        image: timescaledb:latest
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: high-iops
      resources:
        requests:
          storage: 500Gi
```

## Implementing Network-Aware Scheduling

Schedule based on network capabilities:

```yaml
# streaming-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: video-streaming
spec:
  replicas: 5
  selector:
    matchLabels:
      app: streaming
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: network-bandwidth
                operator: In
                values: ["10gbps", "1gbps"]
              - key: network-latency
                operator: Lt
                values: ["10ms"]
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: connectivity
                operator: In
                values: ["fiber", "ethernet"]
      containers:
      - name: streamer
        image: streaming-app:v1
```

## Device-Aware Scheduling

Schedule based on connected devices:

```yaml
# sensor-collector.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: sensor-collector
spec:
  selector:
    matchLabels:
      app: sensor-collector
  template:
    spec:
      nodeSelector:
        has-thermal-sensor: "true"
        has-pressure-sensor: "true"
      containers:
      - name: collector
        image: sensor-collector:v1
        securityContext:
          privileged: true
        volumeMounts:
        - name: dev
          mountPath: /dev
      volumes:
      - name: dev
        hostPath:
          path: /dev
```

## Implementing Dynamic Capability Discovery

Automatically discover and label node capabilities:

```yaml
# capability-discovery-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: capability-discovery
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: capability-discovery
  template:
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: discovery
        image: alpine:latest
        command:
        - sh
        - -c
        - |
          # Discover GPU
          if lspci | grep -i nvidia; then
            kubectl label node $NODE_NAME gpu=nvidia --overwrite
          fi

          # Discover storage
          STORAGE_TYPE=$(lsblk -d -o NAME,ROTA | grep '0$' && echo nvme || echo hdd)
          kubectl label node $NODE_NAME storage-type=$STORAGE_TYPE --overwrite

          # Discover USB devices
          if lsusb | grep -i camera; then
            kubectl label node $NODE_NAME has-usb-camera=true --overwrite
          fi

          sleep 3600
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
```

## Monitoring Capability-Based Scheduling

Track scheduling decisions:

```yaml
# prometheusrule.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: scheduling-alerts
spec:
  groups:
  - name: capability-scheduling
    rules:
    - alert: PodsUnschedulableDueToCapabilities
      expr: |
        kube_pod_status_phase{phase="Pending"} > 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Pods pending due to missing node capabilities"
```

## Implementing Capability Scoring

Custom scoring for optimal placement:

```python
# capability-scorer.py
def score_node(node, pod_requirements):
    score = 0

    # GPU match
    if pod_requirements.get('gpu') == node.labels.get('gpu'):
        score += 100

    # Storage match
    if node.labels.get('storage-type') == 'nvme':
        score += 50

    # Network quality
    bandwidth = int(node.labels.get('network-bandwidth', '0').replace('gbps', ''))
    score += bandwidth * 10

    # Location preference
    if node.labels.get('location') in pod_requirements.get('preferred_locations', []):
        score += 30

    return score
```

## Conclusion

Capability-based scheduling ensures edge workloads run on hardware that meets their specific requirements. By combining node labels, affinity rules, taints, and custom schedulers, you create intelligent placement logic that maximizes resource utilization while maintaining application performance.

Start with simple capability labels for critical resources, monitor scheduling patterns, then refine placement logic based on actual workload behavior. The flexibility of Kubernetes scheduling primitives enables sophisticated edge deployments that adapt to heterogeneous hardware topologies.
