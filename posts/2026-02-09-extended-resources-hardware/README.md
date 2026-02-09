# How to Use Extended Resources for Custom Hardware Allocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Hardware, Resource Management

Description: Learn how to configure and use extended resources in Kubernetes for managing custom hardware like GPUs, FPGAs, and specialized accelerators with proper scheduling and allocation.

---

Standard Kubernetes resources cover CPU, memory, and ephemeral storage, but modern applications need specialized hardware like GPUs, FPGAs, AI accelerators, and custom ASICs. Extended resources let you advertise these custom hardware types to the scheduler and control their allocation to pods.

Without extended resources, you can't guarantee that pods requiring specific hardware land on appropriate nodes. You might manually taint nodes and add tolerations, but that's error-prone and doesn't track actual hardware availability. Extended resources provide proper inventory management and scheduling integration.

## Understanding Extended Resources

Extended resources are quantities of hardware or software-defined resources that aren't part of Kubernetes' built-in resource types. They work like CPU and memory - you advertise capacity on nodes, pods request amounts, and the scheduler ensures pods land on nodes with sufficient availability.

Extended resources have several key characteristics:

**Integer quantities**: Unlike CPU (measured in millicores), extended resources must be whole numbers. You can't request 0.5 of a GPU.

**No overcommitment**: Kubernetes never overcommits extended resources. If a node has 2 GPUs and both are requested, no additional pods requiring GPUs will schedule there.

**Opaque to Kubernetes**: The kubelet doesn't track actual usage, only requested capacity. Your device plugin or external agent handles the actual hardware interaction.

## Advertising Extended Resources on Nodes

You advertise extended resources by patching node status. The resource name must be in the format `example.com/resource-name` to avoid conflicts:

```bash
# Advertise 4 FPGAs on a node
kubectl patch node worker-01 --type=json -p='[
  {
    "op": "add",
    "path": "/status/capacity/example.com~1fpga",
    "value": "4"
  }
]'

# Advertise custom AI accelerators
kubectl patch node worker-02 --type=json -p='[
  {
    "op": "add",
    "path": "/status/capacity/acme.io~1ai-accelerator",
    "value": "2"
  }
]'
```

Note the `~1` encoding for forward slashes in JSON Patch paths. After patching, verify the resource appears:

```bash
kubectl describe node worker-01 | grep -A 5 Capacity
```

You should see your extended resource listed alongside CPU and memory.

## Implementing a Device Plugin

For production use, implement a device plugin instead of manually patching nodes. Device plugins run as DaemonSets and automatically discover and advertise hardware.

Here's a simplified device plugin that advertises FPGAs:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net"
    "os"
    "path"
    "time"

    "google.golang.org/grpc"
    pluginapi "k8s.io/kubelet/pkg/apis/deviceplugin/v1beta1"
)

const (
    resourceName = "example.com/fpga"
    socketPath   = pluginapi.DevicePluginPath + "fpga.sock"
)

type FPGADevicePlugin struct {
    devices []*pluginapi.Device
    socket  string
    server  *grpc.Server
}

// ListAndWatch returns available devices
func (m *FPGADevicePlugin) ListAndWatch(e *pluginapi.Empty, s pluginapi.DevicePlugin_ListAndWatchServer) error {
    // Send initial device list
    s.Send(&pluginapi.ListAndWatchResponse{Devices: m.devices})

    // Keep connection alive and watch for changes
    for {
        time.Sleep(10 * time.Second)
    }
}

// Allocate assigns devices to containers
func (m *FPGADevicePlugin) Allocate(ctx context.Context, r *pluginapi.AllocateRequest) (*pluginapi.AllocateResponse, error) {
    responses := pluginapi.AllocateResponse{}

    for _, req := range r.ContainerRequests {
        response := pluginapi.ContainerAllocateResponse{
            Envs: map[string]string{
                "FPGA_DEVICES": fmt.Sprintf("%v", req.DevicesIDs),
            },
        }

        // Mount device files into container
        for _, id := range req.DevicesIDs {
            response.Devices = append(response.Devices, &pluginapi.DeviceSpec{
                HostPath:      fmt.Sprintf("/dev/fpga%s", id),
                ContainerPath: fmt.Sprintf("/dev/fpga%s", id),
                Permissions:   "rw",
            })
        }

        responses.ContainerResponses = append(responses.ContainerResponses, &response)
    }

    return &responses, nil
}

// Start the device plugin server
func (m *FPGADevicePlugin) Start() error {
    os.Remove(m.socket)

    sock, err := net.Listen("unix", m.socket)
    if err != nil {
        return err
    }

    m.server = grpc.NewServer()
    pluginapi.RegisterDevicePluginServer(m.server, m)

    go m.server.Serve(sock)

    // Wait for server to be ready
    time.Sleep(1 * time.Second)

    return m.Register()
}

// Register with kubelet
func (m *FPGADevicePlugin) Register() error {
    conn, err := grpc.Dial(pluginapi.KubeletSocket, grpc.WithInsecure())
    if err != nil {
        return err
    }
    defer conn.Close()

    client := pluginapi.NewRegistrationClient(conn)
    request := &pluginapi.RegisterRequest{
        Version:      pluginapi.Version,
        Endpoint:     path.Base(m.socket),
        ResourceName: resourceName,
    }

    _, err = client.Register(context.Background(), request)
    return err
}

func main() {
    // Discover FPGAs on the system
    devices := []*pluginapi.Device{
        {ID: "0", Health: pluginapi.Healthy},
        {ID: "1", Health: pluginapi.Healthy},
    }

    plugin := &FPGADevicePlugin{
        devices: devices,
        socket:  socketPath,
    }

    if err := plugin.Start(); err != nil {
        log.Fatal(err)
    }

    log.Println("FPGA device plugin started")
    select {} // Keep running
}
```

Deploy this as a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fpga-device-plugin
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: fpga-device-plugin
  template:
    metadata:
      labels:
        name: fpga-device-plugin
    spec:
      containers:
      - name: fpga-device-plugin
        image: example.com/fpga-device-plugin:v1
        securityContext:
          privileged: true
        volumeMounts:
        - name: device-plugin
          mountPath: /var/lib/kubelet/device-plugins
        - name: dev
          mountPath: /dev
      volumes:
      - name: device-plugin
        hostPath:
          path: /var/lib/kubelet/device-plugins
      - name: dev
        hostPath:
          path: /dev
```

## Requesting Extended Resources in Pods

Once extended resources are advertised, pods can request them just like CPU and memory:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fpga-workload
spec:
  containers:
  - name: fpga-app
    image: fpga-application:latest
    resources:
      limits:
        example.com/fpga: 2
        memory: "8Gi"
        cpu: "4"
      requests:
        example.com/fpga: 2
        memory: "8Gi"
        cpu: "4"
```

The scheduler will only place this pod on nodes advertising at least 2 available FPGAs. Once scheduled, the device plugin's Allocate function runs, mounting the appropriate device files into the container.

## Handling Multiple Extended Resource Types

Nodes often have multiple types of specialized hardware. You can advertise multiple extended resources on the same node:

```bash
# Node with both GPUs and FPGAs
kubectl patch node gpu-node-01 --type=json -p='[
  {
    "op": "add",
    "path": "/status/capacity/nvidia.com~1gpu",
    "value": "4"
  },
  {
    "op": "add",
    "path": "/status/capacity/example.com~1fpga",
    "value": "2"
  }
]'
```

Pods can request multiple resource types:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hybrid-workload
spec:
  containers:
  - name: ml-inference
    image: ml-app:latest
    resources:
      limits:
        nvidia.com/gpu: 1
        example.com/fpga: 1
        cpu: "8"
        memory: "16Gi"
```

This pod requires both a GPU and an FPGA, so it will only schedule on nodes that have both available.

## Using Node Selector with Extended Resources

Combine extended resources with node selectors for precise placement:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: specific-gpu-model
spec:
  nodeSelector:
    gpu-model: a100
    zone: us-west-1a
  containers:
  - name: training
    image: ml-training:latest
    resources:
      limits:
        nvidia.com/gpu: 4
```

Label nodes appropriately:

```bash
kubectl label nodes gpu-node-01 gpu-model=a100 zone=us-west-1a
kubectl label nodes gpu-node-02 gpu-model=v100 zone=us-west-1b
```

This ensures the pod gets not just any GPU, but specifically A100 GPUs in the desired availability zone.

## Monitoring Extended Resource Usage

Track extended resource allocation across your cluster:

```bash
# View resource capacity and allocation per node
kubectl describe nodes | grep -A 10 "Allocated resources"

# Get extended resource usage summary
kubectl get nodes -o json | jq '.items[] | {
  name: .metadata.name,
  fpga_capacity: .status.capacity["example.com/fpga"],
  fpga_allocatable: .status.allocatable["example.com/fpga"]
}'
```

Create Prometheus alerts for resource exhaustion:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: extended-resource-alerts
spec:
  groups:
  - name: extended-resources
    rules:
    - alert: FPGAResourcesLow
      expr: |
        (sum(kube_node_status_capacity{resource="example_com_fpga"}) -
         sum(kube_pod_container_resource_requests{resource="example_com_fpga"})) < 2
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Less than 2 FPGAs available cluster-wide"
```

## Handling Resource Updates

Device plugins should handle hardware changes dynamically. If a device fails or new devices are added, update the device list:

```go
// In your device plugin's health check routine
func (m *FPGADevicePlugin) HealthCheck() {
    for {
        time.Sleep(30 * time.Second)

        // Check device health
        for _, dev := range m.devices {
            if !isDeviceHealthy(dev.ID) {
                dev.Health = pluginapi.Unhealthy
            }
        }

        // Send updated device list
        // This triggers the ListAndWatch watchers
        m.updateDeviceList()
    }
}
```

The kubelet will automatically stop allocating unhealthy devices to new pods.

## Common Pitfalls

**Forgetting integer constraints**: Extended resources must be integers. Requesting 0.5 of a resource will fail.

**Not implementing proper cleanup**: Device plugins should clean up device allocations when pods terminate.

**Oversubscribing manually**: Don't advertise more resources than physically exist. Kubernetes trusts your advertised capacity.

**Missing device permissions**: Ensure containers have proper permissions to access device files mounted by the device plugin.

## Conclusion

Extended resources bring custom hardware into Kubernetes' resource management system. By implementing device plugins and properly advertising capacity, you get the same scheduling guarantees and resource tracking for GPUs, FPGAs, and custom accelerators as you do for CPU and memory. This enables efficient utilization of expensive specialized hardware while maintaining simple, declarative pod specifications that clearly express hardware requirements.
