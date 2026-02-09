# How to Write a Device Plugin for Custom Hardware in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Device Plugin, Hardware

Description: Build a Kubernetes device plugin from scratch to automatically discover, advertise, and allocate custom hardware resources like GPUs, FPGAs, or specialized accelerators.

---

Device plugins let Kubernetes discover and allocate hardware resources automatically. Unlike manual extended resources, device plugins handle health checks, hot-plug events, and per-device allocation. This guide walks you through building a device plugin for custom hardware.

## What Is a Device Plugin?

A device plugin is a gRPC server that runs on each node and communicates with the kubelet. It tells the kubelet what devices are available, reports health status, and handles device allocation when pods schedule.

Device plugins are the standard way to expose hardware like:

- GPUs (NVIDIA, AMD)
- FPGAs
- InfiniBand adapters
- SR-IOV network devices
- Custom accelerators

The kubelet calls your plugin via gRPC to discover devices and allocate them to containers.

## Device Plugin Architecture

The plugin implements the Device Plugin API, which defines these methods:

- `GetDevicePluginOptions`: Returns plugin capabilities
- `ListAndWatch`: Streams device availability to kubelet
- `Allocate`: Called when a pod requests devices
- `GetPreferredAllocation`: Optional hint for device selection
- `PreStartContainer`: Optional pre-start hook

The plugin registers itself with the kubelet at `/var/lib/kubelet/device-plugins/kubelet.sock` and serves gRPC on its own socket.

## Plugin Lifecycle

1. Plugin starts and discovers devices on the node
2. Plugin registers with kubelet over Unix socket
3. Plugin streams device list to kubelet via `ListAndWatch`
4. Kubelet advertises devices as extended resources
5. When a pod requests devices, kubelet calls `Allocate`
6. Plugin returns environment variables and device paths
7. Container runtime mounts devices into container

## Building a Simple FPGA Device Plugin

Let's build a device plugin for FPGA cards. We'll use Go and the official device plugin framework.

First, set up the project:

```bash
mkdir fpga-device-plugin
cd fpga-device-plugin
go mod init example.com/fpga-plugin
go get k8s.io/kubelet/pkg/apis/deviceplugin/v1beta1
```

Create the main plugin structure:

```go
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
    resourceName = "example.com/fpga"
    socketPath   = "/var/lib/kubelet/device-plugins/"
)

type FPGAPlugin struct {
    socket     string
    devices    []*pluginapi.Device
    server     *grpc.Server
    health     chan *pluginapi.Device
}

func NewFPGAPlugin() *FPGAPlugin {
    return &FPGAPlugin{
        socket:  path.Join(socketPath, "fpga.sock"),
        devices: discoverFPGAs(),
        health:  make(chan *pluginapi.Device),
    }
}

func discoverFPGAs() []*pluginapi.Device {
    // Discover FPGA devices on the system
    // This is where you'd scan /dev or use vendor APIs
    devices := []*pluginapi.Device{}

    // Example: discover 2 FPGAs
    for i := 0; i < 2; i++ {
        devices = append(devices, &pluginapi.Device{
            ID:     fmt.Sprintf("fpga-%d", i),
            Health: pluginapi.Healthy,
        })
    }

    return devices
}
```

Implement the device plugin API:

```go
func (p *FPGAPlugin) GetDevicePluginOptions(ctx context.Context, empty *pluginapi.Empty) (*pluginapi.DevicePluginOptions, error) {
    return &pluginapi.DevicePluginOptions{
        PreStartRequired: false,
    }, nil
}

func (p *FPGAPlugin) ListAndWatch(empty *pluginapi.Empty, stream pluginapi.DevicePlugin_ListAndWatchServer) error {
    // Send initial device list
    if err := stream.Send(&pluginapi.ListAndWatchResponse{Devices: p.devices}); err != nil {
        return err
    }

    // Watch for health changes
    for {
        select {
        case device := <-p.health:
            // Update device health
            for _, dev := range p.devices {
                if dev.ID == device.ID {
                    dev.Health = device.Health
                }
            }
            // Send updated list
            if err := stream.Send(&pluginapi.ListAndWatchResponse{Devices: p.devices}); err != nil {
                return err
            }
        }
    }
}

func (p *FPGAPlugin) Allocate(ctx context.Context, req *pluginapi.AllocateRequest) (*pluginapi.AllocateResponse, error) {
    responses := &pluginapi.AllocateResponse{}

    for _, containerReq := range req.ContainerRequests {
        containerResp := &pluginapi.ContainerAllocateResponse{}

        for _, deviceID := range containerReq.DevicesIDs {
            // Map device ID to device path
            devicePath := fmt.Sprintf("/dev/fpga%s", deviceID[len("fpga-"):])

            // Add device to container
            containerResp.Devices = append(containerResp.Devices, &pluginapi.DeviceSpec{
                HostPath:      devicePath,
                ContainerPath: devicePath,
                Permissions:   "rw",
            })

            // Add environment variables
            containerResp.Envs = map[string]string{
                "FPGA_DEVICE": deviceID,
            }
        }

        responses.ContainerResponses = append(responses.ContainerResponses, containerResp)
    }

    return responses, nil
}

func (p *FPGAPlugin) PreStartContainer(ctx context.Context, req *pluginapi.PreStartContainerRequest) (*pluginapi.PreStartContainerResponse, error) {
    return &pluginapi.PreStartContainerResponse{}, nil
}

func (p *FPGAPlugin) GetPreferredAllocation(ctx context.Context, req *pluginapi.PreferredAllocationRequest) (*pluginapi.PreferredAllocationResponse, error) {
    return &pluginapi.PreferredAllocationResponse{}, nil
}
```

Register the plugin with kubelet:

```go
func (p *FPGAPlugin) Register() error {
    conn, err := grpc.Dial(
        pluginapi.KubeletSocket,
        grpc.WithInsecure(),
        grpc.WithDialer(func(addr string, timeout time.Duration) (net.Conn, error) {
            return net.DialTimeout("unix", addr, timeout)
        }),
    )
    if err != nil {
        return err
    }
    defer conn.Close()

    client := pluginapi.NewRegistrationClient(conn)
    request := &pluginapi.RegisterRequest{
        Version:      pluginapi.Version,
        Endpoint:     path.Base(p.socket),
        ResourceName: resourceName,
    }

    _, err = client.Register(context.Background(), request)
    return err
}
```

Start the gRPC server:

```go
func (p *FPGAPlugin) Serve() error {
    // Remove old socket if exists
    os.Remove(p.socket)

    listener, err := net.Listen("unix", p.socket)
    if err != nil {
        return err
    }

    p.server = grpc.NewServer()
    pluginapi.RegisterDevicePluginServer(p.server, p)

    go func() {
        p.server.Serve(listener)
    }()

    // Wait for server to start
    time.Sleep(1 * time.Second)

    return p.Register()
}

func (p *FPGAPlugin) Stop() {
    if p.server != nil {
        p.server.Stop()
    }
    os.Remove(p.socket)
}
```

Wire it all together:

```go
func main() {
    plugin := NewFPGAPlugin()

    if err := plugin.Serve(); err != nil {
        fmt.Fprintf(os.Stderr, "Failed to start plugin: %v\n", err)
        os.Exit(1)
    }

    fmt.Println("FPGA device plugin started")

    // Block forever
    select {}
}
```

## Deploying as a DaemonSet

Package the plugin as a container and deploy as a DaemonSet:

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
      hostNetwork: true
      containers:
      - name: fpga-plugin
        image: example.com/fpga-device-plugin:latest
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

The plugin needs access to `/var/lib/kubelet/device-plugins` to register with kubelet and `/dev` to discover devices.

## Using the Plugin in Pods

Once deployed, pods can request FPGAs:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fpga-job
spec:
  containers:
  - name: fpga-app
    image: fpga-workload:latest
    resources:
      limits:
        example.com/fpga: "1"
```

The container will have `/dev/fpga0` mounted and the `FPGA_DEVICE` environment variable set.

## Implementing Health Checks

Add health monitoring to mark unhealthy devices:

```go
func (p *FPGAPlugin) monitorHealth() {
    for {
        time.Sleep(30 * time.Second)

        for _, device := range p.devices {
            // Check device health
            healthy := checkFPGAHealth(device.ID)

            newHealth := pluginapi.Healthy
            if !healthy {
                newHealth = pluginapi.Unhealthy
            }

            if device.Health != newHealth {
                device.Health = newHealth
                p.health <- device
            }
        }
    }
}

func checkFPGAHealth(deviceID string) bool {
    // Implement actual health check
    // Query device, check temperature, run diagnostic
    return true
}
```

Start the health monitor in `main`:

```go
func main() {
    plugin := NewFPGAPlugin()

    if err := plugin.Serve(); err != nil {
        fmt.Fprintf(os.Stderr, "Failed to start plugin: %v\n", err)
        os.Exit(1)
    }

    go plugin.monitorHealth()

    fmt.Println("FPGA device plugin started")
    select {}
}
```

## Handling Hot-Plug Events

If devices can be added or removed, update the device list and send via `ListAndWatch`:

```go
func (p *FPGAPlugin) watchForDeviceChanges() {
    ticker := time.NewTicker(10 * time.Second)
    defer ticker.Stop()

    for range ticker.C {
        newDevices := discoverFPGAs()
        if !devicesEqual(p.devices, newDevices) {
            p.devices = newDevices
            // Trigger ListAndWatch update
            // Implementation depends on your stream handling
        }
    }
}
```

## Best Practices

- Run as privileged containers with host network access
- Implement robust health checks
- Handle kubelet restarts gracefully
- Use gRPC keepalives to detect connection loss
- Log device allocation and deallocation events
- Version your plugin API carefully
- Test with pods requesting multiple devices
- Document device naming and paths

## Common Issues

**Plugin Not Registering**: Check that `/var/lib/kubelet/device-plugins` is mounted correctly and the kubelet socket exists.

**Devices Not Appearing**: Verify `ListAndWatch` is streaming device updates and the resource name matches.

**Permission Denied**: Ensure the container runs as privileged and has access to `/dev`.

**Stale Devices**: If kubelet restarts, re-register the plugin and resend the device list.

## Conclusion

Device plugins automate hardware resource management in Kubernetes. They're more complex than extended resources but handle discovery, health, and allocation automatically. Use the device plugin framework to integrate any hardware into Kubernetes. Start simple, add health checks, then layer on hot-plug support. Your plugin becomes part of the scheduling process, making specialized hardware a first-class citizen in your cluster.
