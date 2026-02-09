# How to Configure containerd NRI Plugins for Custom Container Resource Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, containerd, NRI, Resource Management, Performance

Description: Learn how to use containerd's Node Resource Interface (NRI) plugins to implement custom resource management policies and optimize container resource allocation in Kubernetes clusters.

---

The Node Resource Interface (NRI) allows extending containerd's resource management without modifying core code. NRI plugins intercept container lifecycle events and can adjust resource allocations, configure devices, or enforce policies dynamically. This guide shows you how to build and deploy NRI plugins for custom resource management in Kubernetes.

## Understanding NRI Architecture

NRI provides a plugin framework where external binaries receive notifications about container lifecycle events. Plugins can inspect and modify container configurations before they're created, responding to events like container creation, startup, and deletion. This enables implementing custom resource allocation policies that adapt to workload characteristics.

NRI plugins run as separate processes that communicate with containerd via Unix sockets. When containerd creates a container, it invokes registered NRI plugins, passing container specifications. Plugins can modify resource limits, add devices, configure cgroups, or reject containers that violate policies. This architecture keeps custom logic separate from the runtime while maintaining tight integration.

## Installing NRI Support

Enable NRI in containerd configuration.

```toml
# /etc/containerd/config.toml
version = 2

[plugins."io.containerd.nri.v1.nri"]
  # Enable NRI
  disable = false
  # Plugin configuration directory
  config_file = "/etc/nri/nri.conf"
  # Plugin binary directory
  plugin_path = "/opt/nri/plugins"
  # Socket path
  socket_path = "/var/run/nri/nri.sock"
```

Create NRI directories:

```bash
sudo mkdir -p /etc/nri /opt/nri/plugins /var/run/nri
sudo chmod 755 /opt/nri/plugins
```

Restart containerd:

```bash
sudo systemctl restart containerd
```

## Building a Resource Adjustment Plugin

Create an NRI plugin that adjusts container resources based on priority.

```go
// priority-adjuster/main.go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/containerd/nri/pkg/api"
    "github.com/containerd/nri/pkg/stub"
)

type PriorityAdjuster struct {
    stub stub.Stub
}

func (p *PriorityAdjuster) Configure(config, runtime, version string) (stub.EventMask, error) {
    log.Printf("Configuring plugin for runtime %s %s", runtime, version)

    // Subscribe to container creation events
    return api.MustParseEventMask("RunPodSandbox,CreateContainer"), nil
}

func (p *PriorityAdjuster) CreateContainer(ctx context.Context, pod *api.PodSandbox, container *api.Container) (*api.ContainerAdjustment, []*api.ContainerUpdate, error) {
    log.Printf("Creating container %s in pod %s", container.Name, pod.Name)

    // Extract priority from pod annotations
    priority := pod.Annotations["priority"]
    if priority == "" {
        priority = "normal"
    }

    adjustment := &api.ContainerAdjustment{}

    // Adjust resources based on priority
    switch priority {
    case "high":
        // Increase CPU shares for high priority
        adjustment.Linux = &api.LinuxContainerAdjustment{
            Resources: &api.LinuxResources{
                Cpu: &api.LinuxCPU{
                    Shares: proto.Uint64(2048),
                    Quota:  proto.Int64(200000),
                    Period: proto.Uint64(100000),
                },
            },
        }
        log.Printf("Applied high priority resources to %s", container.Name)

    case "low":
        // Reduce CPU shares for low priority
        adjustment.Linux = &api.LinuxContainerAdjustment{
            Resources: &api.LinuxResources{
                Cpu: &api.LinuxCPU{
                    Shares: proto.Uint64(512),
                    Quota:  proto.Int64(50000),
                    Period: proto.Uint64(100000),
                },
            },
        }
        log.Printf("Applied low priority resources to %s", container.Name)

    default:
        // Standard resources
        adjustment.Linux = &api.LinuxContainerAdjustment{
            Resources: &api.LinuxResources{
                Cpu: &api.LinuxCPU{
                    Shares: proto.Uint64(1024),
                },
            },
        }
    }

    return adjustment, nil, nil
}

func main() {
    plugin := &PriorityAdjuster{}

    opts := []stub.Option{
        stub.WithPluginName("priority-adjuster"),
        stub.WithPluginIdx("00"),
    }

    if s, err := stub.New(plugin, opts...); err != nil {
        log.Fatalf("Failed to create plugin stub: %v", err)
    } else {
        plugin.stub = s
        if err := plugin.stub.Run(context.Background()); err != nil {
            log.Fatalf("Plugin execution failed: %v", err)
        }
    }
}
