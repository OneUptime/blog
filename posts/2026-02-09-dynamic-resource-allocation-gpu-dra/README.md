# How to Use Dynamic Resource Allocation for GPUs with DRA in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GPU, DRA

Description: Learn how to use Kubernetes Dynamic Resource Allocation (DRA) for advanced GPU scheduling with features like GPU partitioning, multi-instance GPUs, and flexible resource claims.

---

Dynamic Resource Allocation (DRA) represents the future of resource management in Kubernetes. Unlike device plugins that treat resources as simple integers, DRA supports structured parameters, resource pooling, and complex allocation logic. This guide covers DRA for GPU workloads.

## What Is Dynamic Resource Allocation?

DRA is a Kubernetes feature that moves beyond the simple device plugin model. It introduces:

- Structured resource parameters (not just quantities)
- Resource claims separate from pod specs
- Flexible allocation policies
- Support for resource pooling and sharing
- First-class support for GPU partitioning (MIG, MPS)

DRA is currently in alpha/beta and requires feature gates. It's designed for complex resources where simple counting isn't enough.

## DRA vs Device Plugins

Device plugins work for homogeneous devices. You request "2 GPUs" and get 2 GPUs. But what if you need:

- A GPU with at least 16GB memory
- A fractional GPU (MIG instance)
- GPUs with specific capabilities (Tensor Cores, NVLink)
- GPUs in the same NUMA domain

DRA handles these cases with structured resource claims.

## Enabling DRA

Enable the DRA feature gate on the API server and kubelet:

```yaml
# API server
--feature-gates=DynamicResourceAllocation=true

# Kubelet
--feature-gates=DynamicResourceAllocation=true
```

Restart the control plane and kubelets after enabling the feature.

## Understanding ResourceClasses

A ResourceClass defines a type of resource and how to allocate it. For GPUs, create a ResourceClass:

```yaml
apiVersion: resource.k8s.io/v1alpha2
kind: ResourceClass
metadata:
  name: gpu-class
driverName: gpu.resource.example.com
```

The driver is a custom controller that handles allocation logic. You'll need to deploy a DRA driver for your hardware.

## Creating ResourceClaims

A ResourceClaim is like a PVC but for hardware resources. It requests resources based on parameters:

```yaml
apiVersion: resource.k8s.io/v1alpha2
kind: ResourceClaim
metadata:
  name: gpu-claim
  namespace: default
spec:
  resourceClassName: gpu-class
  parametersRef:
    apiGroup: gpu.resource.example.com/v1alpha1
    kind: GpuClaimParameters
    name: high-memory-gpu
```

Define the parameters in a custom resource:

```yaml
apiVersion: gpu.resource.example.com/v1alpha1
kind: GpuClaimParameters
metadata:
  name: high-memory-gpu
  namespace: default
spec:
  memory: "16Gi"
  capabilities:
    - tensorCores
    - nvlink
```

This claim requests a GPU with at least 16GB memory and specific capabilities.

## Using ResourceClaims in Pods

Reference the claim in your pod spec:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-workload
spec:
  resourceClaims:
  - name: gpu
    source:
      resourceClaimName: gpu-claim
  containers:
  - name: training
    image: pytorch:latest
    command: ["python", "train.py"]
    resources:
      claims:
      - name: gpu
```

The pod won't schedule until the claim is satisfied. The DRA driver allocates a matching GPU and provides it to the container.

## Inline ResourceClaims

You can also define claims inline:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-workload
spec:
  resourceClaims:
  - name: gpu
    source:
      resourceClaimTemplateName: gpu-template
  containers:
  - name: training
    image: pytorch:latest
    resources:
      claims:
      - name: gpu
---
apiVersion: resource.k8s.io/v1alpha2
kind: ResourceClaimTemplate
metadata:
  name: gpu-template
spec:
  spec:
    resourceClassName: gpu-class
    parametersRef:
      apiGroup: gpu.resource.example.com/v1alpha1
      kind: GpuClaimParameters
      name: high-memory-gpu
```

This creates a new claim for each pod, useful for ephemeral workloads.

## GPU Partitioning with MIG

NVIDIA Multi-Instance GPU (MIG) lets you partition A100 GPUs into smaller instances. DRA supports requesting specific MIG profiles:

```yaml
apiVersion: gpu.resource.example.com/v1alpha1
kind: GpuClaimParameters
metadata:
  name: mig-instance
spec:
  migProfile: "1g.5gb"  # 1 GPU slice with 5GB memory
```

The DRA driver creates the MIG instance and allocates it to the pod.

## Implementing a DRA Driver

A DRA driver is a controller that watches ResourceClaims and allocates resources. Here's a simplified example structure:

```go
package main

import (
    "context"
    "fmt"

    resourcev1alpha2 "k8s.io/api/resource/v1alpha2"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

type GPUDriver struct {
    clientset *kubernetes.Clientset
}

func (d *GPUDriver) Allocate(ctx context.Context, claim *resourcev1alpha2.ResourceClaim) error {
    // 1. Parse claim parameters
    params := parseGPUParameters(claim)

    // 2. Find matching GPU on nodes
    gpu := d.findMatchingGPU(params)
    if gpu == nil {
        return fmt.Errorf("no matching GPU found")
    }

    // 3. Create allocation result
    allocation := &resourcev1alpha2.AllocationResult{
        AvailableOnNodes: nodeSelector(gpu.NodeName),
        ResourceHandles: []resourcev1alpha2.ResourceHandle{{
            DriverName: "gpu.resource.example.com",
            Data:       gpu.Serialize(),
        }},
    }

    // 4. Update claim status
    claim.Status.Allocation = allocation
    _, err := d.clientset.ResourceV1alpha2().ResourceClaims(claim.Namespace).
        UpdateStatus(ctx, claim, metav1.UpdateOptions{})

    return err
}

func (d *GPUDriver) findMatchingGPU(params GPUParameters) *GPU {
    // Query available GPUs from nodes
    // Match based on memory, capabilities, etc.
    // Return best match
    return nil
}
```

The driver runs as a deployment and watches ResourceClaim objects. When a claim is created, it finds a matching GPU and updates the claim status with allocation details.

## Deploying the DRA Driver

Deploy your driver as a Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gpu-dra-driver
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: gpu-dra-driver
  template:
    metadata:
      labels:
        app: gpu-dra-driver
    spec:
      serviceAccountName: gpu-dra-driver
      containers:
      - name: driver
        image: example.com/gpu-dra-driver:latest
        args:
        - --driver-name=gpu.resource.example.com
```

Grant the driver RBAC permissions to read nodes, update ResourceClaims, and read custom parameters.

## Sharing GPUs with DRA

DRA supports sharing resources across multiple pods. Set the sharing mode in the ResourceClass:

```yaml
apiVersion: resource.k8s.io/v1alpha2
kind: ResourceClass
metadata:
  name: shared-gpu-class
driverName: gpu.resource.example.com
suitableNodes:
  nodeSelectorTerms:
  - matchExpressions:
    - key: gpu.present
      operator: Exists
```

Then configure claims to request shared access:

```yaml
apiVersion: gpu.resource.example.com/v1alpha1
kind: GpuClaimParameters
metadata:
  name: shared-gpu
spec:
  mode: shared
  memoryLimit: "4Gi"
```

The driver handles multiplexing, ensuring total memory usage doesn't exceed GPU capacity.

## Monitoring DRA Allocations

Check claim status with kubectl:

```bash
kubectl get resourceclaims
kubectl describe resourceclaim gpu-claim
```

The status shows allocation results, including which node has the resource and driver-specific details.

## Best Practices

- Use structured parameters for complex requirements
- Implement driver logic to handle edge cases
- Monitor claim satisfaction time
- Use ResourceClaimTemplates for dynamic workloads
- Version your parameter CRDs carefully
- Document supported parameter combinations
- Test claim deletion and pod rescheduling
- Implement proper cleanup in your driver

## Migration from Device Plugins

If you're migrating from device plugins:

1. Deploy the DRA driver alongside existing device plugins
2. Create ResourceClasses matching your current device types
3. Update new workloads to use ResourceClaims
4. Gradually migrate existing workloads
5. Remove device plugins once migration is complete

Both can coexist during transition.

## Common Issues

**Claims Not Satisfied**: Check driver logs and verify the ResourceClass driver name matches your deployed driver.

**Feature Gate Not Enabled**: DRA requires feature gates on both API server and kubelet. Verify with `kubectl get --raw /api | jq`.

**Driver Not Allocating**: Ensure the driver has proper RBAC permissions and can communicate with the API server.

**Pod Stuck Pending**: Check ResourceClaim status for allocation errors. The claim must be satisfied before scheduling.

## Real-World Example: Multi-GPU Training

Request 4 GPUs with NVLink for distributed training:

```yaml
apiVersion: gpu.resource.example.com/v1alpha1
kind: GpuClaimParameters
metadata:
  name: distributed-training
spec:
  count: 4
  topology: nvlink
  memoryPerGpu: "40Gi"
---
apiVersion: v1
kind: Pod
metadata:
  name: distributed-trainer
spec:
  resourceClaims:
  - name: gpus
    source:
      resourceClaimTemplateName: training-gpu-template
  containers:
  - name: trainer
    image: horovod:latest
    resources:
      claims:
      - name: gpus
```

The DRA driver ensures all 4 GPUs are on the same node and interconnected via NVLink.

## Conclusion

DRA brings sophisticated resource management to Kubernetes. It's perfect for complex resources like GPUs where simple counting isn't enough. Use DRA when you need structured parameters, resource sharing, or advanced allocation policies. While still evolving, DRA represents the future of hardware resource management in Kubernetes. Start experimenting now to prepare for wider adoption as the feature stabilizes.
