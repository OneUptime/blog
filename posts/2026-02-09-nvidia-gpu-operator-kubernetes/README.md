# How to Configure NVIDIA GPU Operator for Automated Driver Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NVIDIA, GPU, GPU Operator, Infrastructure

Description: Configure the NVIDIA GPU Operator on Kubernetes to automate GPU driver installation, device plugin deployment, and monitoring for machine learning workloads.

---

Managing NVIDIA GPU drivers and related components across a Kubernetes cluster can be tedious and error-prone. The NVIDIA GPU Operator automates the entire GPU software stack deployment, including drivers, container runtime, device plugins, and monitoring tools. This eliminates manual driver installation on each node and ensures consistent GPU configuration across your cluster.

This guide shows you how to deploy and configure the GPU Operator for production ML workloads.

## Understanding the GPU Operator Components

The GPU Operator manages these components:

- **NVIDIA Driver**: GPU drivers installed as containers
- **NVIDIA Container Toolkit**: Container runtime for GPU access
- **NVIDIA Device Plugin**: Exposes GPUs to Kubernetes
- **GPU Feature Discovery**: Labels nodes with GPU capabilities
- **DCGM Exporter**: Prometheus metrics for GPUs
- **MIG Manager**: Multi-Instance GPU configuration

## Prerequisites

Ensure your cluster meets requirements:

```bash
# Check kernel version (must be supported by NVIDIA drivers)

kubectl debug node/<node-name> -it --image=ubuntu -- uname -r

# Verify NVIDIA GPUs are visible on the host
kubectl debug node/<gpu-node-name> -it --image=ubuntu -- bash -c "apt-get update && apt-get install -y pciutils && lspci | grep -i nvidia"

# Check for existing GPU drivers
# If drivers are already installed on the host, install the operator with driver.enabled=false
kubectl debug node/<gpu-node-name> -it --image=ubuntu -- bash -c "lsmod | grep nvidia"
```

## Installing the GPU Operator

Add the NVIDIA Helm repository:

```bash
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update

# View available versions
helm search repo nvidia/gpu-operator --versions | head -10
```

Install with default configuration:

```bash
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace \
  --version v26.3.2 \
  --wait

# Watch pods come up
kubectl get pods -n gpu-operator -w
```

Verify installation:

```bash
# Check all operator pods are running
kubectl get pods -n gpu-operator

# Expected pods:
# - gpu-operator
# - nvidia-driver-daemonset
# - nvidia-container-toolkit-daemonset
# - nvidia-device-plugin-daemonset
# - gpu-feature-discovery
# - nvidia-dcgm-exporter

# Verify GPU nodes are labeled
kubectl get nodes --show-labels | grep nvidia

# Check GPU capacity
kubectl describe node <gpu-node-name> | grep -A 10 "Capacity"
```

## Configuring Driver Installation

Customize driver installation for your environment:

```yaml
# gpu-operator-values.yaml
driver:
  enabled: true

  # Driver version (match your GPU generation)
  version: "580.126.20"

  # Kernel module type: auto, proprietary, or open
  kernelModuleType: "auto"

  # Use precompiled drivers for faster installation
  usePrecompiled: true

  # Driver repository
  repository: nvcr.io/nvidia

  # Resource limits for driver pods
  resources:
    limits:
      cpu: "1"
      memory: "2Gi"
    requests:
      cpu: "100m"
      memory: "128Mi"

toolkit:
  enabled: true
  version: "v1.19.1"

devicePlugin:
  enabled: true
  version: "v0.19.2"

daemonsets:
  # Tolerations for GPU operand daemonsets
  tolerations:
  - key: nvidia.com/gpu
    operator: Exists
    effect: NoSchedule
```

Upgrade with custom values:

```bash
helm upgrade gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --values gpu-operator-values.yaml \
  --wait
```

## Configuring Node Feature Discovery

Enable automatic GPU feature labeling:

```yaml
gfd:
  enabled: true
  version: "v0.19.2"

nfd:
  enabled: true

node-feature-discovery:
  master:
    config:
      extraLabelNs: ["nvidia.com"]
```

Check discovered features:

```bash
# View GPU-related labels
kubectl get node <gpu-node-name> --show-labels | tr ',' '\n' | grep nvidia

# Example labels:
# nvidia.com/gpu.present=true
# nvidia.com/gpu.product=Tesla-V100-SXM2-32GB
# nvidia.com/cuda.driver.major=535
# nvidia.com/cuda.driver.minor=129
# nvidia.com/gpu.count=8
# nvidia.com/gpu.memory=32510
```

## Setting Up GPU Monitoring with DCGM

Enable DCGM Exporter for GPU metrics:

```yaml
dcgmExporter:
  enabled: true
  version: "4.5.3-4.8.2-distroless"

  # Service monitor for Prometheus
  serviceMonitor:
    enabled: true
    interval: 30s
    honorLabels: true

  # Metrics configuration
  config:
    name: dcgm-exporter-config

  # Resource limits
  resources:
    limits:
      cpu: "1"
      memory: "1Gi"
    requests:
      cpu: "100m"
      memory: "128Mi"
```

Query GPU metrics:

```promql
# GPU utilization
DCGM_FI_DEV_GPU_UTIL

# GPU memory usage
DCGM_FI_DEV_FB_USED / (DCGM_FI_DEV_FB_USED + DCGM_FI_DEV_FB_FREE) * 100

# GPU temperature
DCGM_FI_DEV_GPU_TEMP

# Power usage
DCGM_FI_DEV_POWER_USAGE

# SM clock frequency
DCGM_FI_DEV_SM_CLOCK
```

Create Grafana dashboard for GPU monitoring:

```bash
# Import NVIDIA DCGM Exporter Dashboard
# Dashboard ID: 12239
curl -X POST http://admin:admin@localhost:3000/api/dashboards/import \
  -H "Content-Type: application/json" \
  -d "$(curl -s https://grafana.com/api/dashboards/12239/revisions/latest/download | jq -c '{dashboard: ., overwrite: true, inputs: [{name: "DS_PROMETHEUS", type: "datasource", pluginId: "prometheus", value: "Prometheus"}]}')"
```

## Configuring MIG (Multi-Instance GPU)

Enable MIG support for A100 GPUs:

```yaml
migManager:
  enabled: true
  version: "v0.14.2"

  # MIG configuration
  config:
    name: mig-config
    create: false
    default: all-disabled

mig:
  # MIG strategy for device plugin
  strategy: mixed
```

Create MIG configuration:

```yaml
# mig-parted-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mig-config
  namespace: gpu-operator
data:
  config.yaml: |
    version: v1
    mig-configs:
      all-1g.5gb:
        - devices: all
          mig-enabled: true
          mig-devices:
            "1g.5gb": 7

      all-2g.10gb:
        - devices: all
          mig-enabled: true
          mig-devices:
            "2g.10gb": 3

      mixed:
        - devices: [0,1]
          mig-enabled: true
          mig-devices:
            "1g.5gb": 7
        - devices: [2,3]
          mig-enabled: true
          mig-devices:
            "3g.20gb": 2
```

Apply MIG configuration:

```bash
kubectl apply -f mig-parted-config.yaml

# Label nodes to apply MIG config
kubectl label node <gpu-node> nvidia.com/mig.config=all-1g.5gb --overwrite

# Verify MIG instances
kubectl describe node <gpu-node> | grep nvidia.com/mig
```

## Configuring GPU Time-Slicing

Enable time-slicing for GPU sharing:

```yaml
# time-slicing-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: time-slicing-config
  namespace: gpu-operator
data:
  any: |
    version: v1
    sharing:
      timeSlicing:
        renameByDefault: false
        failRequestsGreaterThanOne: false
        resources:
        - name: nvidia.com/gpu
          replicas: 4  # Each GPU shared by 4 pods
```

Apply and update operator:

```bash
kubectl apply -f time-slicing-config.yaml

helm upgrade gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --set devicePlugin.config.name=time-slicing-config \
  --set devicePlugin.config.default=any \
  --reuse-values
```

## Troubleshooting GPU Operator

Check operator logs:

```bash
# GPU Operator controller logs
kubectl logs -n gpu-operator deployment/gpu-operator

# Driver installation logs
kubectl logs -n gpu-operator daemonset/nvidia-driver-daemonset -c nvidia-driver-ctr

# Device plugin logs
kubectl logs -n gpu-operator daemonset/nvidia-device-plugin-daemonset

# DCGM Exporter logs
kubectl logs -n gpu-operator daemonset/nvidia-dcgm-exporter
```

Verify GPU access from pod:

```bash
# Run test pod
kubectl run gpu-test --image=nvidia/cuda:11.8.0-base-ubuntu22.04 \
  --limits=nvidia.com/gpu=1 \
  --command -- sleep 3600

# Check GPU access
kubectl exec gpu-test -- nvidia-smi

# Run CUDA sample
kubectl exec gpu-test -- bash -c "apt update && apt install -y cuda-samples-11-8 && cd /usr/local/cuda/samples/1_Utilities/deviceQuery && make && ./deviceQuery"

# Cleanup
kubectl delete pod gpu-test
```

Common issues and fixes:

```bash
# Driver pod in CrashLoopBackOff
# Check kernel compatibility
kubectl logs -n gpu-operator -l app=nvidia-driver-daemonset --tail=50

# Device plugin not discovering GPUs
# Restart device plugin
kubectl rollout restart daemonset -n gpu-operator nvidia-device-plugin-daemonset

# Stale GPU capacity on nodes
# Restart kubelet on affected nodes
kubectl debug node/<node-name> -it --image=ubuntu -- bash -c "nsenter -t 1 -m -- systemctl restart kubelet"
```

## Upgrading GPU Drivers

Perform rolling driver upgrades:

```bash
# Update driver version
helm upgrade gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --set driver.version="580.126.20" \
  --reuse-values

# Monitor upgrade
kubectl rollout status daemonset -n gpu-operator nvidia-driver-daemonset

# Driver upgrades run one node at a time by default
# GPU pods are evicted before driver reload; full node drain requires driver.upgradePolicy.drain.enable=true
```

## Setting Up Node Taints for GPU Nodes

Prevent non-GPU workloads from scheduling on GPU nodes:

```bash
# Taint GPU nodes
kubectl taint nodes -l node-role.kubernetes.io/gpu nvidia.com/gpu=present:NoSchedule

# GPU workloads need tolerations
tolerations:
- key: nvidia.com/gpu
  operator: Exists
  effect: NoSchedule
```

Configure operator to tolerate GPU taints:

```yaml
# In values.yaml
daemonsets:
  tolerations:
  - key: nvidia.com/gpu
    operator: Exists
    effect: NoSchedule
```

## Conclusion

The NVIDIA GPU Operator simplifies GPU cluster management by automating driver installation, runtime configuration, and monitoring setup. It eliminates the need for manual driver installation on nodes and provides a consistent, declarative way to manage GPU resources. With support for MIG, time-slicing, and comprehensive monitoring, the GPU Operator provides everything needed to run production ML workloads on Kubernetes with GPUs.
