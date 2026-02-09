# How to Schedule Pods Based on Extended Resources Like GPUs and FPGAs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GPU, Extended Resources

Description: Learn how to schedule pods on nodes with specialized hardware like GPUs and FPGAs using Kubernetes extended resources, ensuring your workloads land on the right hardware.

---

Modern machine learning, scientific computing, and data processing workloads require specialized hardware accelerators like GPUs, FPGAs, and custom ASICs. Kubernetes extended resources allow you to expose and schedule these specialized resources just like you would CPU and memory.

Extended resources enable you to declare custom resource types, advertise their availability on nodes, and request them in pod specifications. The scheduler then ensures pods land on nodes that have the required hardware.

## Understanding Extended Resources

Extended resources are custom resources beyond CPU and memory that can be:

- GPUs (NVIDIA, AMD)
- FPGAs (Field-Programmable Gate Arrays)
- Custom ASICs or accelerators
- Network interface cards with specific capabilities
- Storage devices with special characteristics
- Any other countable, node-level resource

They are always integers (no fractional values) and must be advertised by device plugins or manually patched to nodes.

## GPU Resources with NVIDIA Device Plugin

The most common extended resource is NVIDIA GPUs. Install the NVIDIA device plugin:

```bash
# Deploy NVIDIA device plugin using DaemonSet
kubectl create -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.0/nvidia-device-plugin.yml

# Verify the plugin is running
kubectl get pods -n kube-system -l name=nvidia-device-plugin-ds

# Check GPU resources are advertised
kubectl get nodes -o json | \
  jq '.items[] | {name: .metadata.name, gpus: .status.capacity["nvidia.com/gpu"]}'
```

## Requesting GPU Resources in Pods

Schedule pods on GPU nodes:

```yaml
# gpu-workload.yaml
apiVersion: v1
kind: Pod
metadata:
  name: ml-training-gpu
  namespace: ml-workloads
spec:
  containers:
  - name: pytorch
    image: pytorch/pytorch:2.0.0-cuda11.7-cudnn8-runtime
    command:
    - python
    - train.py
    resources:
      limits:
        # Request 1 GPU
        nvidia.com/gpu: 1
        cpu: 4000m
        memory: 16Gi
      requests:
        nvidia.com/gpu: 1
        cpu: 2000m
        memory: 8Gi
    volumeMounts:
    - name: training-data
      mountPath: /data
  volumes:
  - name: training-data
    persistentVolumeClaim:
      claimName: ml-training-data
  # Ensure pod lands on GPU node
  nodeSelector:
    accelerator: nvidia-gpu
```

## Multi-GPU Training

Request multiple GPUs for data-parallel training:

```yaml
# multi-gpu-training.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: distributed-training
  namespace: ml-workloads
spec:
  replicas: 2  # 2 pods, each with 4 GPUs
  selector:
    matchLabels:
      app: distributed-training
  template:
    metadata:
      labels:
        app: distributed-training
    spec:
      containers:
      - name: trainer
        image: nvcr.io/nvidia/pytorch:23.12-py3
        command:
        - torchrun
        - --nproc_per_node=4
        - train_distributed.py
        resources:
          limits:
            nvidia.com/gpu: 4  # Request 4 GPUs per pod
            cpu: 16000m
            memory: 64Gi
          requests:
            nvidia.com/gpu: 4
            cpu: 8000m
            memory: 32Gi
        env:
        - name: NVIDIA_VISIBLE_DEVICES
          value: "all"
        - name: CUDA_VISIBLE_DEVICES
          value: "0,1,2,3"
```

## AMD GPU Resources

For AMD GPUs, use the AMD device plugin:

```bash
# Deploy AMD device plugin
kubectl apply -f https://raw.githubusercontent.com/RadeonOpenCompute/k8s-device-plugin/master/k8s-ds-amdgpu-dp.yaml

# Verify AMD GPUs are available
kubectl get nodes -o json | \
  jq '.items[] | {name: .metadata.name, amd_gpus: .status.capacity["amd.com/gpu"]}'
```

Request AMD GPUs:

```yaml
# amd-gpu-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: rocm-workload
spec:
  containers:
  - name: rocm
    image: rocm/pytorch:latest
    resources:
      limits:
        amd.com/gpu: 2  # Request 2 AMD GPUs
        cpu: 8000m
        memory: 32Gi
      requests:
        amd.com/gpu: 2
        cpu: 4000m
        memory: 16Gi
```

## FPGA Resources with Intel Device Plugin

Deploy the Intel FPGA device plugin:

```bash
# Clone the Intel device plugins repository
git clone https://github.com/intel/intel-device-plugins-for-kubernetes.git
cd intel-device-plugins-for-kubernetes

# Deploy FPGA plugin
kubectl apply -k deployments/fpga_plugin/overlays/af/

# Verify FPGA resources
kubectl get nodes -o json | \
  jq '.items[] | {name: .metadata.name, fpgas: .status.capacity}'
```

Schedule workloads on FPGA nodes:

```yaml
# fpga-workload.yaml
apiVersion: v1
kind: Pod
metadata:
  name: fpga-inference
  namespace: inference
spec:
  containers:
  - name: inference
    image: fpga-inference-engine:v1.0
    resources:
      limits:
        # FPGA region resource
        fpga.intel.com/arria10.dcp1.2: 1
        cpu: 2000m
        memory: 4Gi
      requests:
        fpga.intel.com/arria10.dcp1.2: 1
        cpu: 1000m
        memory: 2Gi
    env:
    - name: FPGA_BITSTREAM
      value: "/bitstreams/inference_model.aocx"
    volumeMounts:
    - name: fpga-bitstreams
      mountPath: /bitstreams
  volumes:
  - name: fpga-bitstreams
    configMap:
      name: fpga-bitstreams
```

## Custom Extended Resources

Advertise custom resources manually for specialized hardware:

```bash
# Patch a node to advertise custom resources
kubectl proxy &

# Add custom resource (example: specialized network cards)
NODE_NAME="worker-node-1"
curl --header "Content-Type: application/json-patch+json" \
  --request PATCH \
  --data '[{"op": "add", "path": "/status/capacity/example.com~1rdma-nic", "value": "2"}]' \
  http://localhost:8001/api/v1/nodes/${NODE_NAME}/status

# Verify the resource was added
kubectl get node ${NODE_NAME} -o json | \
  jq '.status.capacity'
```

Request the custom resource:

```yaml
# custom-resource-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: rdma-workload
spec:
  containers:
  - name: rdma-app
    image: rdma-application:v1.0
    resources:
      limits:
        example.com/rdma-nic: 1
        cpu: 4000m
        memory: 8Gi
      requests:
        example.com/rdma-nic: 1
        cpu: 2000m
        memory: 4Gi
```

## Device Plugin Development

Create a custom device plugin for your hardware:

```go
// custom-device-plugin.go
package main

import (
    "context"
    "fmt"
    "net"
    "os"
    "path"
    "time"

    "google.golang.org/grpc"
    pluginapi "k8s.io/kubelet/pkg/apis/deviceplugin/v1beta1"
)

const (
    resourceName = "example.com/custom-accelerator"
    socketPath   = pluginapi.DevicePluginPath + "custom-accelerator.sock"
)

type CustomDevicePlugin struct {
    devices []*pluginapi.Device
    server  *grpc.Server
}

func (p *CustomDevicePlugin) GetDevicePluginOptions(ctx context.Context, empty *pluginapi.Empty) (*pluginapi.DevicePluginOptions, error) {
    return &pluginapi.DevicePluginOptions{}, nil
}

func (p *CustomDevicePlugin) ListAndWatch(empty *pluginapi.Empty, stream pluginapi.DevicePlugin_ListAndWatchServer) error {
    // Send initial list of devices
    stream.Send(&pluginapi.ListAndWatchResponse{Devices: p.devices})

    // Keep the stream open and send updates
    for {
        time.Sleep(10 * time.Second)
        // In real implementation, monitor device health and send updates
        stream.Send(&pluginapi.ListAndWatchResponse{Devices: p.devices})
    }
}

func (p *CustomDevicePlugin) Allocate(ctx context.Context, reqs *pluginapi.AllocateRequest) (*pluginapi.AllocateResponse, error) {
    responses := pluginapi.AllocateResponse{}

    for _, req := range reqs.ContainerRequests {
        response := pluginapi.ContainerAllocateResponse{
            Devices: []*pluginapi.DeviceSpec{
                {
                    // Map device to container
                    ContainerPath: "/dev/custom-accel0",
                    HostPath:      "/dev/custom-accel0",
                    Permissions:   "rw",
                },
            },
            Envs: map[string]string{
                "CUSTOM_ACCELERATOR_ID": req.DevicesIDs[0],
            },
        }
        responses.ContainerResponses = append(responses.ContainerResponses, &response)
    }

    return &responses, nil
}

func (p *CustomDevicePlugin) PreStartContainer(ctx context.Context, req *pluginapi.PreStartContainerRequest) (*pluginapi.PreStartContainerResponse, error) {
    return &pluginapi.PreStartContainerResponse{}, nil
}

func main() {
    // Discover devices
    devices := discoverDevices()

    plugin := &CustomDevicePlugin{
        devices: devices,
    }

    // Start the gRPC server
    plugin.Start()
}

func discoverDevices() []*pluginapi.Device {
    // In real implementation, scan hardware for devices
    return []*pluginapi.Device{
        {ID: "custom-accel-0", Health: pluginapi.Healthy},
        {ID: "custom-accel-1", Health: pluginapi.Healthy},
    }
}
```

## GPU Time-Slicing

Share GPUs across multiple pods using time-slicing:

```yaml
# gpu-time-slicing-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: device-plugin-config
  namespace: kube-system
data:
  config.yaml: |
    version: v1
    sharing:
      timeSlicing:
        renameByDefault: false
        failRequestsGreaterThanOne: false
        resources:
        - name: nvidia.com/gpu
          replicas: 4  # Each physical GPU appears as 4 logical GPUs
---
# Deploy with time-slicing enabled
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvidia-device-plugin-daemonset
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: nvidia-device-plugin-ds
  template:
    spec:
      containers:
      - name: nvidia-device-plugin-ctr
        image: nvcr.io/nvidia/k8s-device-plugin:v0.14.0
        env:
        - name: CONFIG_FILE
          value: /etc/config/config.yaml
        volumeMounts:
        - name: device-plugin-config
          mountPath: /etc/config
      volumes:
      - name: device-plugin-config
        configMap:
          name: device-plugin-config
```

## MIG (Multi-Instance GPU) Support

Use NVIDIA MIG to partition A100 GPUs:

```yaml
# mig-enabled-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: mig-workload
spec:
  containers:
  - name: app
    image: nvcr.io/nvidia/cuda:11.8.0-base-ubuntu22.04
    resources:
      limits:
        # Request a MIG instance instead of full GPU
        nvidia.com/mig-1g.5gb: 1
        cpu: 2000m
        memory: 8Gi
      requests:
        nvidia.com/mig-1g.5gb: 1
        cpu: 1000m
        memory: 4Gi
```

## Node Labeling for Resource Types

Label nodes to identify hardware capabilities:

```bash
# Label nodes with GPU types
kubectl label nodes gpu-node-1 gpu-type=a100
kubectl label nodes gpu-node-2 gpu-type=v100
kubectl label nodes fpga-node-1 accelerator-type=fpga-arria10

# Use labels in nodeSelector
```

```yaml
# hardware-specific-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: a100-training
spec:
  nodeSelector:
    gpu-type: a100
  containers:
  - name: trainer
    image: ml-framework:latest
    resources:
      limits:
        nvidia.com/gpu: 8  # Request 8 A100 GPUs
```

## Resource Quotas for Extended Resources

Limit extended resource usage with quotas:

```yaml
# gpu-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: ml-team
spec:
  hard:
    requests.nvidia.com/gpu: 16  # Maximum 16 GPUs
    limits.nvidia.com/gpu: 16
    requests.cpu: "64"
    requests.memory: "256Gi"
```

## Best Practices

1. **Use Device Plugins**: Always use official device plugins rather than manually patching nodes
2. **Set Limits Equal to Requests**: Extended resources must have limits equal to requests
3. **Label Nodes**: Add descriptive labels to identify hardware capabilities
4. **Monitor Usage**: Track extended resource utilization to optimize allocation
5. **Implement Quotas**: Use ResourceQuotas to prevent resource hogging
6. **Test Affinity**: Combine with node affinity for complex scheduling requirements
7. **Health Monitoring**: Ensure device plugins report accurate health status
8. **Version Compatibility**: Keep device plugins updated with Kubernetes versions

## Troubleshooting

If pods aren't scheduled on extended resource nodes:

```bash
# Check if extended resources are advertised
kubectl get nodes -o json | \
  jq '.items[] | {name: .metadata.name, capacity: .status.capacity, allocatable: .status.allocatable}'

# Verify device plugin is running
kubectl get pods -n kube-system | grep device-plugin

# Check pod events for scheduling errors
kubectl describe pod <pod-name>

# View device plugin logs
kubectl logs -n kube-system -l name=nvidia-device-plugin-ds

# Check if resources are already allocated
kubectl describe node <node-name> | grep -A 10 "Allocated resources"
```

Extended resources enable Kubernetes to schedule specialized workloads on the right hardware, ensuring GPUs, FPGAs, and custom accelerators are efficiently utilized across your cluster.

