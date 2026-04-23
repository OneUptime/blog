# How to Configure GPU Resource Limits in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, GPU, Resource-limits, Kubernetes, Quota

Description: Guide to setting up GPU resource limits, requests, and quotas in Rancher to prevent overallocation and ensure fair GPU sharing.

## Introduction

GPU resources are expensive and finite. Without proper limits and quotas, a single workload can monopolize all GPU capacity in a cluster. This guide explains how to configure GPU resource management in Rancher.

## Understanding GPU Resource Types

Kubernetes tracks GPU resources as extended resources:
- `nvidia.com/gpu`: Physical GPU count
- `nvidia.com/mig-<slice_count>g.<memory_size>gb`: MIG resources when the NVIDIA device plugin uses the `mixed` MIG strategy
- `amd.com/gpu`: AMD GPU resources

Labels such as `nvidia.com/gpu.memory` can be added to nodes by NVIDIA GPU Feature Discovery, but they are not standard schedulable extended resources.

## Setting GPU Limits on Pods

```yaml
# gpu-resource-pod.yaml

apiVersion: v1
kind: Pod
metadata:
  name: gpu-workload
spec:
  containers:
  - name: ml-container
    image: tensorflow/tensorflow:2.14.0-gpu
    resources:
      requests:
        nvidia.com/gpu: 1    # Request 1 GPU
        memory: "8Gi"
        cpu: "4"
      limits:
        nvidia.com/gpu: 1    # Limit to 1 GPU (should equal request)
        memory: "16Gi"
        cpu: "8"
    # Note: Extended resource requests and limits must be equal if both are set
    # Kubernetes itself does not overcommit extended resources
```

## Namespace-Level GPU Quotas

```yaml
# gpu-namespace-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-limits
  namespace: data-science
spec:
  hard:
    # GPU quotas
    requests.nvidia.com/gpu: "4"
    # Companion CPU/memory quotas
    requests.cpu: "32"
    requests.memory: "128Gi"
    limits.cpu: "64"
    limits.memory: "256Gi"
    # Count limits
    pods: "20"
    count/jobs.batch: "10"
```

## LimitRange for GPU Caps and Defaults

```yaml
# gpu-limitrange.yaml - Set CPU/memory defaults and cap GPU usage
apiVersion: v1
kind: LimitRange
metadata:
  name: gpu-defaults
  namespace: data-science
spec:
  limits:
  - type: Container
    default:
      # Default limits if not specified
      cpu: "2"
      memory: "4Gi"
    defaultRequest:
      cpu: "1"
      memory: "2Gi"
    max:
      # Maximum allowed requests/limits
      nvidia.com/gpu: "4"   # No container can request more than 4 GPUs
      cpu: "16"
      memory: "64Gi"
```

## Rancher Projects for GPU Quota Management

```text
# In Rancher, add GPU quota to the project as a Custom resource quota.
# Resource Identifier: requests.nvidia.com/gpu
# Project Limit: 8
# Namespace Default Limit: 4
#
# Rancher propagates the namespace default quota to namespaces in the project.
```

## Monitoring GPU Quota Usage

```bash
# Check GPU quota status per namespace
kubectl get resourcequota -A -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.status.used.requests\.nvidia\.com/gpu}{"\t"}{.status.hard.requests\.nvidia\.com/gpu}{"\n"}{end}'

# View GPU allocation per node
kubectl get nodes -o custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu

# DCGM metrics for GPU memory usage
kubectl exec -n gpu-operator "$(kubectl get pods -n gpu-operator -l app=nvidia-dcgm-exporter -o jsonpath='{.items[0].metadata.name}')" -- sh -c 'curl -s localhost:9400/metrics | grep DCGM_FI_DEV_FB_USED'
```

## GPU Autoscaling Considerations

```yaml
# HPA based on GPU utilization (requires custom metrics)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gpu-inference-hpa
  namespace: inference
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: model-server
  minReplicas: 1
  maxReplicas: 4
  metrics:
  - type: External
    external:
      metric:
        name: nvidia_gpu_utilization
        selector:
          matchLabels:
            app: model-server
      target:
        type: AverageValue
        averageValue: "80"    # Scale when GPU util > 80%
```

## Conclusion

Proper GPU resource limits prevent overallocation and ensure fair sharing of expensive GPU hardware. Combining pod-level limits, namespace quotas, and Rancher project quotas gives operators fine-grained control over GPU resource consumption. Monitor usage regularly to optimize allocation and identify underutilized or oversubscribed GPU resources.
