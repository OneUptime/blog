# How to Set Up GPU Time-Slicing and MIG Partitioning for ML Workloads on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GPU, NVIDIA, MIG, Machine Learning, Resource Management

Description: Learn how to configure GPU time-slicing and NVIDIA Multi-Instance GPU (MIG) partitioning to maximize GPU utilization for machine learning workloads on Kubernetes.

---

GPUs are expensive resources, and running ML workloads efficiently requires making the most of every GPU. When you have small models or inference workloads that don't fully utilize a GPU, sharing that GPU across multiple pods becomes critical. NVIDIA provides two main approaches for GPU sharing: time-slicing, where pods take turns using the GPU, and MIG (Multi-Instance GPU), which creates hardware-isolated GPU partitions. This guide shows you how to configure both approaches on Kubernetes.

## Understanding GPU Sharing Options

Before diving into configuration, understand the trade-offs:

**Time-Slicing:**
- Works on most NVIDIA GPUs (Kepler and newer)
- No hardware isolation between workloads
- Best for workloads with intermittent GPU usage
- Simple to configure
- Potential for resource contention

**MIG (Multi-Instance GPU):**
- Only available on A100, A30, and H100 GPUs
- Hardware-isolated GPU partitions
- Guaranteed resources per partition
- Better for predictable performance
- More complex to configure

Choose time-slicing for development environments and non-critical workloads. Use MIG for production workloads that need performance guarantees.

## Installing the NVIDIA GPU Operator

Start by installing the GPU Operator, which manages GPU drivers and device plugins:

```bash
# Add NVIDIA Helm repository
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update

# Install GPU Operator with default settings
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace \
  --set driver.enabled=true \
  --wait

# Verify installation
kubectl get pods -n gpu-operator

# Check GPU nodes are labeled
kubectl get nodes -l nvidia.com/gpu.present=true
```

Verify GPUs are detected:

```bash
# Check GPU resources on nodes
kubectl describe node <gpu-node-name> | grep nvidia.com/gpu

# Should show something like:
# nvidia.com/gpu: 4
```

## Configuring GPU Time-Slicing

Time-slicing lets multiple pods share a single physical GPU by scheduling their workloads sequentially.

Create a time-slicing configuration:

```yaml
# time-slicing-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: time-slicing-config
  namespace: gpu-operator
data:
  # Each GPU will be shared by up to 4 pods
  time-slicing-config: |
    version: v1
    sharing:
      timeSlicing:
        resources:
        - name: nvidia.com/gpu
          replicas: 4
```

Apply the configuration:

```bash
# Create the ConfigMap
kubectl apply -f time-slicing-config.yaml

# Update GPU Operator to use time-slicing
helm upgrade gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --set devicePlugin.config.name=time-slicing-config \
  --reuse-values

# Wait for device plugin to restart
kubectl rollout status daemonset -n gpu-operator nvidia-device-plugin-daemonset

# Verify GPUs are now showing 4x capacity
kubectl describe node <gpu-node-name> | grep nvidia.com/gpu
# Should now show: nvidia.com/gpu: 16 (if you had 4 physical GPUs)
```

Deploy a test workload to verify time-slicing:

```yaml
# time-slicing-test.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gpu-timeslice-test
  namespace: default
spec:
  replicas: 8  # More replicas than physical GPUs
  selector:
    matchLabels:
      app: gpu-timeslice-test
  template:
    metadata:
      labels:
        app: gpu-timeslice-test
    spec:
      containers:
      - name: cuda-test
        image: nvidia/cuda:11.8.0-base-ubuntu22.04
        command: ["bash", "-c"]
        args:
        - |
          while true; do
            nvidia-smi
            echo "Running GPU workload..."
            sleep 30
          done
        resources:
          limits:
            nvidia.com/gpu: 1  # Each pod requests 1 "slice"
```

Deploy and verify:

```bash
kubectl apply -f time-slicing-test.yaml

# Check that all 8 pods are running
kubectl get pods -l app=gpu-timeslice-test

# Verify multiple pods are sharing GPUs
kubectl exec -it <pod-name> -- nvidia-smi
# You'll see multiple processes on the same GPU
```

## Configuring MIG Partitioning

MIG creates hardware-isolated GPU instances. First, check if your GPUs support MIG:

```bash
# SSH to GPU node or use a privileged pod
nvidia-smi mig -lgip
# If supported, you'll see available profiles like:
# 1g.5gb, 2g.10gb, 3g.20gb, etc.
```

Enable MIG mode on GPUs:

```bash
# Enable MIG mode (requires GPU reset)
nvidia-smi -mig 1

# Verify MIG is enabled
nvidia-smi -L
# Should show: GPU 0: A100-SXM4-40GB (MIG Enabled)
```

Create MIG instances:

```bash
# Create 7 equal instances (1g.5gb profile) on each A100
# This gives you 7 separate 5GB GPU instances per physical GPU

for gpu_id in 0 1 2 3; do
  # Create 7 instances on each GPU
  for i in {1..7}; do
    nvidia-smi mig -cgi 9,9,9,9,9,9,9 -C -i $gpu_id
  done
done

# Verify instances were created
nvidia-smi mig -lgi

# You should see something like:
# GPU 0: 7x 1g.5gb instances
# GPU 1: 7x 1g.5gb instances
# ...
```

Configure the GPU Operator to use MIG:

```yaml
# mig-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mig-config
  namespace: gpu-operator
data:
  mig-config: |
    version: v1
    mig-configs:
      # Configure for 1g.5gb profile (7 instances per GPU)
      all-1g.5gb:
        - devices: [0,1,2,3]  # Apply to all GPUs
          mig-enabled: true
          mig-devices:
            "1g.5gb": 7  # Create 7 instances per GPU
```

Apply MIG configuration:

```bash
# Create the ConfigMap
kubectl apply -f mig-config.yaml

# Update GPU Operator to use MIG
helm upgrade gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --set mig.strategy=mixed \
  --set devicePlugin.config.name=mig-config \
  --reuse-values

# Restart device plugin
kubectl delete pods -n gpu-operator -l app=nvidia-device-plugin-daemonset

# Verify MIG resources are available
kubectl describe node <gpu-node-name> | grep "nvidia.com/mig"
# Should show: nvidia.com/mig-1g.5gb: 28 (7 per GPU x 4 GPUs)
```

## Creating Mixed MIG Profiles

You can create different MIG profiles for different workload types:

```bash
# Example: Mix of small and large instances
# GPU 0: 3x 2g.10gb instances
nvidia-smi mig -cgi 14,14,14 -C -i 0

# GPU 1: 7x 1g.5gb instances (for inference)
nvidia-smi mig -cgi 9,9,9,9,9,9,9 -C -i 1

# GPU 2: 1x 4g.20gb instance (for training)
nvidia-smi mig -cgi 5 -C -i 2

# GPU 3: Keep as full GPU
# (don't create any MIG instances)

# Verify the configuration
nvidia-smi mig -lgi
```

Configure the operator for mixed profiles:

```yaml
# mixed-mig-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mixed-mig-config
  namespace: gpu-operator
data:
  mig-config: |
    version: v1
    mig-configs:
      mixed:
        - devices: [0]
          mig-enabled: true
          mig-devices:
            "2g.10gb": 3
        - devices: [1]
          mig-enabled: true
          mig-devices:
            "1g.5gb": 7
        - devices: [2]
          mig-enabled: true
          mig-devices:
            "4g.20gb": 1
        - devices: [3]
          mig-enabled: false
```

## Deploying Workloads on MIG Instances

Deploy inference workloads on small MIG instances:

```yaml
# inference-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bert-inference
  namespace: ml-inference
spec:
  replicas: 14  # Can run 14 replicas on 7x1g.5gb instances
  selector:
    matchLabels:
      app: bert-inference
  template:
    metadata:
      labels:
        app: bert-inference
    spec:
      containers:
      - name: inference
        image: your-registry/bert-inference:v1
        resources:
          requests:
            nvidia.com/mig-1g.5gb: 1  # Request 1 MIG instance
            memory: "4Gi"
            cpu: "2"
          limits:
            nvidia.com/mig-1g.5gb: 1
            memory: "4Gi"
            cpu: "2"
        env:
        - name: CUDA_MIG_ENABLED
          value: "1"
```

Deploy training workloads on larger MIG instances:

```yaml
# training-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: model-training
  namespace: ml-training
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: trainer
        image: your-registry/pytorch-trainer:v1
        command: ["python", "train.py"]
        resources:
          requests:
            nvidia.com/mig-2g.10gb: 1  # Larger instance for training
            memory: "16Gi"
            cpu: "4"
          limits:
            nvidia.com/mig-2g.10gb: 1
            memory: "16Gi"
            cpu: "4"
        env:
        - name: CUDA_MIG_ENABLED
          value: "1"
```

## Monitoring GPU Utilization

Deploy DCGM Exporter to monitor GPU metrics:

```bash
# Install DCGM Exporter
helm install dcgm-exporter nvidia/dcgm-exporter \
  --namespace gpu-operator \
  --set serviceMonitor.enabled=true

# Verify it's collecting metrics
kubectl port-forward -n gpu-operator svc/dcgm-exporter 9400:9400

# Query metrics
curl localhost:9400/metrics | grep DCGM
```

Query GPU utilization by MIG instance:

```promql
# GPU utilization by MIG instance
DCGM_FI_DEV_GPU_UTIL{gpu_instance_id!=""}

# Memory usage by MIG instance
DCGM_FI_DEV_FB_USED{gpu_instance_id!=""}

# Number of active processes per instance
DCGM_FI_DEV_RUNNING_PROCESSES{gpu_instance_id!=""}
```

Create alerts for GPU issues:

```yaml
# gpu-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: gpu-alerts
  namespace: gpu-operator
spec:
  groups:
  - name: gpu
    interval: 30s
    rules:
    - alert: GPUMemoryHigh
      expr: DCGM_FI_DEV_FB_USED / DCGM_FI_DEV_FB_FREE > 0.9
      for: 5m
      annotations:
        summary: "GPU memory usage above 90%"

    - alert: GPUUtilizationLow
      expr: avg_over_time(DCGM_FI_DEV_GPU_UTIL[10m]) < 20
      for: 30m
      annotations:
        summary: "GPU utilization below 20% for 30 minutes"
```

## Switching Between Time-Slicing and MIG

To switch from MIG back to time-slicing:

```bash
# Disable MIG on all GPUs
nvidia-smi -mig 0 -i 0,1,2,3

# Reset the GPUs
nvidia-smi --gpu-reset

# Update GPU Operator back to time-slicing
helm upgrade gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --set mig.strategy=none \
  --set devicePlugin.config.name=time-slicing-config \
  --reuse-values

# Restart device plugin
kubectl delete pods -n gpu-operator -l app=nvidia-device-plugin-daemonset
```

## Best Practices

Configure resource quotas for GPU namespaces:

```yaml
# gpu-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: ml-inference
spec:
  hard:
    nvidia.com/mig-1g.5gb: "10"  # Limit to 10 small instances
    requests.memory: "50Gi"
    limits.memory: "50Gi"
```

Use node affinity to control workload placement:

```yaml
# Target specific GPU types
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: nvidia.com/gpu.product
          operator: In
          values: ["A100-SXM4-40GB"]
```

## Conclusion

GPU time-slicing and MIG partitioning give you flexible options for sharing GPU resources across ML workloads on Kubernetes. Time-slicing works well for development and testing environments where simplicity matters more than isolation. MIG provides production-grade isolation with guaranteed resources, making it ideal for critical inference services and training jobs that need predictable performance. By choosing the right approach for each workload, you can maximize GPU utilization while maintaining the performance characteristics your applications need.
