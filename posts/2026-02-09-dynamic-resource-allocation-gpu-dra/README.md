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
- Support for device-specific features such as GPU partitioning (MIG) and sharing, when the installed DRA driver implements them

DRA is stable in Kubernetes v1.35 and enabled by default. Some newer extensions, such as partitionable devices and consumable capacity, are still beta and may require their own feature gates.

## DRA vs Device Plugins

Device plugins work for homogeneous devices. You request "2 GPUs" and get 2 GPUs. But what if you need:

- A GPU with at least 16GB memory
- A fractional GPU (MIG instance)
- GPUs with specific capabilities (Tensor Cores, NVLink)
- GPUs in the same NUMA domain

DRA handles these cases with structured resource claims.

## Enabling DRA

On Kubernetes v1.35 and later, the core DRA APIs are enabled by default. On Kubernetes v1.34, confirm that the `resource.k8s.io/v1` API group is enabled and that your cluster has a DRA driver installed:

```bash
kubectl version
kubectl api-resources --api-group=resource.k8s.io
```

For beta DRA extensions such as partitionable devices or consumable capacity, enable the specific feature gates required by that extension on the components listed in the Kubernetes documentation.

## Understanding DeviceClasses

A DeviceClass defines a category of devices and the configuration or selectors that apply when claims request that category. For GPUs, create a DeviceClass:

```yaml
apiVersion: resource.k8s.io/v1
kind: DeviceClass
metadata:
  name: gpu.example.com
spec:
  selectors:
  - cel:
      expression: device.driver == "gpu.resource.example.com"
```

The driver publishes device inventory and handles device preparation on the node. You'll need to deploy a DRA driver for your hardware.

## Creating ResourceClaims

A ResourceClaim is like a PVC but for hardware resources. It requests resources based on parameters:

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaim
metadata:
  name: gpu-claim
  namespace: default
spec:
  devices:
    requests:
    - name: gpu
      exactly:
        deviceClassName: gpu.example.com
        selectors:
        - cel:
            expression: device.capacity["gpu.resource.example.com"].memory.compareTo(quantity("16Gi")) >= 0
        - cel:
            expression: device.attributes["gpu.resource.example.com"].tensorCores == true
        - cel:
            expression: device.attributes["gpu.resource.example.com"].nvlink == true
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
    resourceClaimName: gpu-claim
  containers:
  - name: training
    image: pytorch:latest
    command: ["python", "train.py"]
    resources:
      claims:
      - name: gpu
```

The pod won't schedule until the claim is allocated. Kubernetes and the DRA driver allocate a matching GPU and provide it to the container.

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
    resourceClaimTemplateName: gpu-template
  containers:
  - name: training
    image: pytorch:latest
    resources:
      claims:
      - name: gpu
---
apiVersion: resource.k8s.io/v1
kind: ResourceClaimTemplate
metadata:
  name: gpu-template
spec:
  spec:
    devices:
      requests:
      - name: gpu
        exactly:
          deviceClassName: gpu.example.com
          selectors:
          - cel:
              expression: device.capacity["gpu.resource.example.com"].memory.compareTo(quantity("16Gi")) >= 0
```

This creates a new claim for each pod, useful for ephemeral workloads.

## GPU Partitioning with MIG

NVIDIA Multi-Instance GPU (MIG) lets you partition A100 GPUs into smaller instances. DRA supports requesting specific MIG profiles:

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaim
metadata:
  name: mig-instance
spec:
  devices:
    requests:
    - name: gpu
      exactly:
        deviceClassName: gpu.example.com
        selectors:
        - cel:
            expression: device.attributes["gpu.resource.example.com"].migProfile == "1g.5gb"
```

The DRA driver exposes or prepares a matching MIG instance and allocates it to the pod.

## Implementing a DRA Driver

A DRA driver publishes ResourceSlices for available devices and runs a kubelet plugin that prepares allocated devices on the node. The Kubernetes scheduler allocates devices by updating ResourceClaim status. Here's a simplified example structure for publishing GPU inventory:

```go
package main

import (
    "context"

    resourcev1 "k8s.io/api/resource/v1"
    "k8s.io/apimachinery/pkg/api/resource"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

type GPUDriver struct {
    clientset *kubernetes.Clientset
}

func (d *GPUDriver) PublishNodeResources(ctx context.Context, nodeName string) error {
    slice := &resourcev1.ResourceSlice{
        ObjectMeta: metav1.ObjectMeta{
            Name: "gpu-" + nodeName,
        },
        Spec: resourcev1.ResourceSliceSpec{
            Driver:   "gpu.resource.example.com",
            NodeName: &nodeName,
            Pool: resourcev1.ResourcePool{
                Name:               nodeName,
                Generation:         1,
                ResourceSliceCount: 1,
            },
            Devices: []resourcev1.Device{
                {
                    Name: "gpu-0",
                    Attributes: map[resourcev1.QualifiedName]resourcev1.DeviceAttribute{
                        "gpu.resource.example.com/tensorCores": {BoolValue: ptr(true)},
                        "gpu.resource.example.com/nvlink":      {BoolValue: ptr(true)},
                    },
                    Capacity: map[resourcev1.QualifiedName]resourcev1.DeviceCapacity{
                        "gpu.resource.example.com/memory": {
                            Value: resource.MustParse("40Gi"),
                        },
                    },
                },
            },
        },
    }

    _, err := d.clientset.ResourceV1().ResourceSlices().Create(ctx, slice, metav1.CreateOptions{})
    return err
}

func ptr[T any](value T) *T { return &value }
```

The driver usually includes a controller component that publishes ResourceSlices and a node-local kubelet plugin that prepares, exposes, health-checks, and cleans up devices for pods.

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

Grant the driver RBAC permissions to read nodes, create and update ResourceSlices, and perform the ResourceClaim status operations required by your Kubernetes version.

## Sharing GPUs with DRA

DRA supports sharing resources across multiple pods when the driver advertises devices as multiply allocatable. The driver can publish a ResourceSlice with consumable capacity:

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceSlice
metadata:
  name: shared-gpu
spec:
  driver: gpu.resource.example.com
  nodeName: gpu-node-1
  pool:
    name: gpu-node-1
    generation: 1
    resourceSliceCount: 1
  devices:
  - name: gpu-0
    allowMultipleAllocations: true
    capacity:
      gpu.resource.example.com/memory:
        value: 40Gi
```

Then configure claims to request part of that capacity:

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaim
metadata:
  name: shared-gpu
spec:
  devices:
    requests:
    - name: gpu
      exactly:
        deviceClassName: gpu.example.com
        capacity:
          requests:
            gpu.resource.example.com/memory: 4Gi
```

The scheduler tracks consumed capacity so the total requested capacity doesn't exceed what the device advertises. The driver still handles the hardware-specific sharing behavior.

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
- Version any driver-specific configuration APIs carefully
- Document supported DeviceClass selectors and device attributes
- Test claim deletion and pod rescheduling
- Implement proper cleanup in your driver

## Migration from Device Plugins

If you're migrating from device plugins:

1. Deploy the DRA driver alongside existing device plugins
2. Create DeviceClasses matching your current device types
3. Update new workloads to use ResourceClaims
4. Gradually migrate existing workloads
5. Remove device plugins once migration is complete

Both can coexist during transition.

## Common Issues

**Claims Not Satisfied**: Check driver logs and verify that DeviceClass selectors match devices published by your deployed driver.

**DRA API Not Available**: Verify the `resource.k8s.io/v1` API group with `kubectl api-resources --api-group=resource.k8s.io`.

**Driver Not Allocating**: Ensure the driver has proper RBAC permissions and can communicate with the API server.

**Pod Stuck Pending**: Check ResourceClaim status for allocation errors. The claim must be satisfied before scheduling.

## Real-World Example: Multi-GPU Training

Request 4 GPUs with NVLink for distributed training:

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaimTemplate
metadata:
  name: training-gpu-template
spec:
  spec:
    devices:
      requests:
      - name: gpu
        exactly:
          deviceClassName: gpu.example.com
          count: 4
          selectors:
          - cel:
              expression: device.capacity["gpu.resource.example.com"].memory.compareTo(quantity("40Gi")) >= 0
          - cel:
              expression: device.attributes["gpu.resource.example.com"].nvlink == true
---
apiVersion: v1
kind: Pod
metadata:
  name: distributed-trainer
spec:
  resourceClaims:
  - name: gpus
    resourceClaimTemplateName: training-gpu-template
  containers:
  - name: trainer
    image: horovod:latest
    resources:
      claims:
      - name: gpus
```

Kubernetes allocates four matching GPUs for the claim, and the driver exposes those devices to the pod. The exact topology guarantees depend on the attributes and constraints the driver publishes.

## Conclusion

DRA brings sophisticated resource management to Kubernetes. It's perfect for complex resources like GPUs where simple counting isn't enough. Use DRA when you need structured parameters, resource sharing, or advanced allocation policies. While some GPU-specific extensions are still evolving, core DRA is stable and ready to evaluate for hardware resource management in Kubernetes.
