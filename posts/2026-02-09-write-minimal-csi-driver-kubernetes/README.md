# How to Write a Minimal CSI Driver for Kubernetes from Scratch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, Storage, Go

Description: Learn how to build a minimal Container Storage Interface (CSI) driver for Kubernetes from scratch, understanding the core components and gRPC interfaces required for custom storage integration.

---

The Container Storage Interface (CSI) provides a standard way to expose arbitrary block and file storage systems to containerized workloads in Kubernetes. Writing your own CSI driver gives you complete control over storage provisioning and management in your cluster.

## Understanding CSI Architecture

A CSI driver consists of three main components:

1. **Controller Plugin** - Handles volume creation, deletion, and attachment operations
2. **Node Plugin** - Manages volume mounting and unmounting on individual nodes
3. **Identity Service** - Provides driver information and capabilities

Each component implements specific gRPC services defined in the CSI specification. The controller plugin runs as a single replica, while the node plugin runs as a DaemonSet on every node.

## Setting Up the Project Structure

First, create a basic Go project structure for your CSI driver:

```bash
# Create the project directory
mkdir minimal-csi-driver
cd minimal-csi-driver

# Initialize Go module
go mod init github.com/yourusername/minimal-csi-driver

# Install required dependencies
go get github.com/container-storage-interface/spec/lib/go/csi
go get google.golang.org/grpc
go get github.com/kubernetes-csi/csi-lib-utils/rpc
```

Create the following directory structure:

```
minimal-csi-driver/
├── cmd/
│   └── driver/
│       └── main.go
├── pkg/
│   ├── driver/
│   │   ├── identity.go
│   │   ├── controller.go
│   │   └── node.go
│   └── server/
│       └── server.go
└── deploy/
    └── kubernetes/
```

## Implementing the Identity Service

The identity service provides basic information about your driver. Create `pkg/driver/identity.go`:

```go
package driver

import (
    "context"
    "github.com/container-storage-interface/spec/lib/go/csi"
)

type IdentityServer struct {
    driverName string
    version    string
}

// GetPluginInfo returns metadata about the plugin
func (ids *IdentityServer) GetPluginInfo(ctx context.Context, req *csi.GetPluginInfoRequest) (*csi.GetPluginInfoResponse, error) {
    return &csi.GetPluginInfoResponse{
        Name:          ids.driverName,
        VendorVersion: ids.version,
    }, nil
}

// GetPluginCapabilities reports what optional features this plugin supports
func (ids *IdentityServer) GetPluginCapabilities(ctx context.Context, req *csi.GetPluginCapabilitiesRequest) (*csi.GetPluginCapabilitiesResponse, error) {
    return &csi.GetPluginCapabilitiesResponse{
        Capabilities: []*csi.PluginCapability{
            {
                Type: &csi.PluginCapability_Service_{
                    Service: &csi.PluginCapability_Service{
                        Type: csi.PluginCapability_Service_CONTROLLER_SERVICE,
                    },
                },
            },
        },
    }, nil
}

// Probe allows Kubernetes to verify the driver is ready
func (ids *IdentityServer) Probe(ctx context.Context, req *csi.ProbeRequest) (*csi.ProbeResponse, error) {
    return &csi.ProbeResponse{
        Ready: &wrappers.BoolValue{Value: true},
    }, nil
}
```

## Implementing the Controller Service

The controller service handles volume lifecycle operations. Create `pkg/driver/controller.go`:

```go
package driver

import (
    "context"
    "fmt"
    "github.com/container-storage-interface/spec/lib/go/csi"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type ControllerServer struct {
    volumes map[string]*csi.Volume
}

func NewControllerServer() *ControllerServer {
    return &ControllerServer{
        volumes: make(map[string]*csi.Volume),
    }
}

// CreateVolume provisions a new volume
func (cs *ControllerServer) CreateVolume(ctx context.Context, req *csi.CreateVolumeRequest) (*csi.CreateVolumeResponse, error) {
    if req.GetName() == "" {
        return nil, status.Error(codes.InvalidArgument, "Volume name missing")
    }

    // Check if volume already exists
    if vol, exists := cs.volumes[req.GetName()]; exists {
        return &csi.CreateVolumeResponse{Volume: vol}, nil
    }

    // Get requested size (default to 1GB if not specified)
    size := int64(1 * 1024 * 1024 * 1024)
    if req.GetCapacityRange() != nil {
        size = req.GetCapacityRange().GetRequiredBytes()
    }

    // Create the volume
    volume := &csi.Volume{
        VolumeId:      req.GetName(),
        CapacityBytes: size,
        VolumeContext: req.GetParameters(),
    }

    cs.volumes[req.GetName()] = volume

    return &csi.CreateVolumeResponse{Volume: volume}, nil
}

// DeleteVolume removes a volume
func (cs *ControllerServer) DeleteVolume(ctx context.Context, req *csi.DeleteVolumeRequest) (*csi.DeleteVolumeResponse, error) {
    if req.GetVolumeId() == "" {
        return nil, status.Error(codes.InvalidArgument, "Volume ID missing")
    }

    delete(cs.volumes, req.GetVolumeId())
    return &csi.DeleteVolumeResponse{}, nil
}

// ControllerPublishVolume attaches a volume to a node
func (cs *ControllerServer) ControllerPublishVolume(ctx context.Context, req *csi.ControllerPublishVolumeRequest) (*csi.ControllerPublishVolumeResponse, error) {
    return &csi.ControllerPublishVolumeResponse{}, nil
}

// ControllerUnpublishVolume detaches a volume from a node
func (cs *ControllerServer) ControllerUnpublishVolume(ctx context.Context, req *csi.ControllerUnpublishVolumeRequest) (*csi.ControllerUnpublishVolumeResponse, error) {
    return &csi.ControllerUnpublishVolumeResponse{}, nil
}

// ValidateVolumeCapabilities checks if a volume supports requested capabilities
func (cs *ControllerServer) ValidateVolumeCapabilities(ctx context.Context, req *csi.ValidateVolumeCapabilitiesRequest) (*csi.ValidateVolumeCapabilitiesResponse, error) {
    if req.GetVolumeId() == "" {
        return nil, status.Error(codes.InvalidArgument, "Volume ID missing")
    }

    if _, exists := cs.volumes[req.GetVolumeId()]; !exists {
        return nil, status.Error(codes.NotFound, "Volume not found")
    }

    return &csi.ValidateVolumeCapabilitiesResponse{
        Confirmed: &csi.ValidateVolumeCapabilitiesResponse_Confirmed{
            VolumeCapabilities: req.GetVolumeCapabilities(),
        },
    }, nil
}

// ControllerGetCapabilities reports what operations the controller supports
func (cs *ControllerServer) ControllerGetCapabilities(ctx context.Context, req *csi.ControllerGetCapabilitiesRequest) (*csi.ControllerGetCapabilitiesResponse, error) {
    return &csi.ControllerGetCapabilitiesResponse{
        Capabilities: []*csi.ControllerServiceCapability{
            {
                Type: &csi.ControllerServiceCapability_Rpc{
                    Rpc: &csi.ControllerServiceCapability_RPC{
                        Type: csi.ControllerServiceCapability_RPC_CREATE_DELETE_VOLUME,
                    },
                },
            },
        },
    }, nil
}
```

## Implementing the Node Service

The node service handles volume mounting operations on individual nodes. Create `pkg/driver/node.go`:

```go
package driver

import (
    "context"
    "github.com/container-storage-interface/spec/lib/go/csi"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    "os"
    "os/exec"
)

type NodeServer struct {
    nodeID string
}

func NewNodeServer(nodeID string) *NodeServer {
    return &NodeServer{nodeID: nodeID}
}

// NodeStageVolume prepares a volume for use on a node
func (ns *NodeServer) NodeStageVolume(ctx context.Context, req *csi.NodeStageVolumeRequest) (*csi.NodeStageVolumeResponse, error) {
    return &csi.NodeStageVolumeResponse{}, nil
}

// NodeUnstageVolume reverses NodeStageVolume
func (ns *NodeServer) NodeUnstageVolume(ctx context.Context, req *csi.NodeUnstageVolumeRequest) (*csi.NodeUnstageVolumeResponse, error) {
    return &csi.NodeUnstageVolumeResponse{}, nil
}

// NodePublishVolume mounts the volume to the target path
func (ns *NodeServer) NodePublishVolume(ctx context.Context, req *csi.NodePublishVolumeRequest) (*csi.NodePublishVolumeResponse, error) {
    targetPath := req.GetTargetPath()

    // Create the target directory if it doesn't exist
    if err := os.MkdirAll(targetPath, 0755); err != nil {
        return nil, status.Errorf(codes.Internal, "Failed to create target directory: %v", err)
    }

    // For a real driver, you would mount the volume here
    // This example just creates an empty directory

    return &csi.NodePublishVolumeResponse{}, nil
}

// NodeUnpublishVolume unmounts the volume from the target path
func (ns *NodeServer) NodeUnpublishVolume(ctx context.Context, req *csi.NodeUnpublishVolumeRequest) (*csi.NodeUnpublishVolumeResponse, error) {
    targetPath := req.GetTargetPath()

    // Unmount the volume
    if err := exec.Command("umount", targetPath).Run(); err != nil {
        // Ignore errors if already unmounted
    }

    // Remove the directory
    os.RemoveAll(targetPath)

    return &csi.NodeUnpublishVolumeResponse{}, nil
}

// NodeGetCapabilities returns the capabilities of the node service
func (ns *NodeServer) NodeGetCapabilities(ctx context.Context, req *csi.NodeGetCapabilitiesRequest) (*csi.NodeGetCapabilitiesResponse, error) {
    return &csi.NodeGetCapabilitiesResponse{
        Capabilities: []*csi.NodeServiceCapability{
            {
                Type: &csi.NodeServiceCapability_Rpc{
                    Rpc: &csi.NodeServiceCapability_RPC{
                        Type: csi.NodeServiceCapability_RPC_STAGE_UNSTAGE_VOLUME,
                    },
                },
            },
        },
    }, nil
}

// NodeGetInfo returns information about the node
func (ns *NodeServer) NodeGetInfo(ctx context.Context, req *csi.NodeGetInfoRequest) (*csi.NodeGetInfoResponse, error) {
    return &csi.NodeGetInfoResponse{
        NodeId: ns.nodeID,
    }, nil
}
```

## Creating the Main Driver Entry Point

Now create the main driver logic in `cmd/driver/main.go`:

```go
package main

import (
    "flag"
    "fmt"
    "os"

    "github.com/yourusername/minimal-csi-driver/pkg/driver"
    "github.com/kubernetes-csi/csi-lib-utils/rpc"
)

func main() {
    var (
        endpoint   = flag.String("endpoint", "unix:///csi/csi.sock", "CSI endpoint")
        driverName = flag.String("driver-name", "minimal.csi.example.com", "Name of the driver")
        nodeID     = flag.String("node-id", "", "Node ID")
        version    = flag.String("version", "1.0.0", "Driver version")
    )
    flag.Parse()

    if *nodeID == "" {
        *nodeID = os.Getenv("NODE_ID")
        if *nodeID == "" {
            fmt.Println("node-id is required")
            os.Exit(1)
        }
    }

    // Create the driver
    identityServer := &driver.IdentityServer{
        DriverName: *driverName,
        Version:    *version,
    }
    controllerServer := driver.NewControllerServer()
    nodeServer := driver.NewNodeServer(*nodeID)

    // Start the gRPC server
    server := rpc.NewNonBlockingGRPCServer()
    server.Start(*endpoint, identityServer, controllerServer, nodeServer)
    server.Wait()
}
```

## Deploying the CSI Driver

Create a basic Kubernetes deployment manifest in `deploy/kubernetes/driver.yaml`:

```yaml
# Controller plugin deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minimal-csi-controller
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minimal-csi-controller
  template:
    metadata:
      labels:
        app: minimal-csi-controller
    spec:
      serviceAccountName: minimal-csi-controller
      containers:
        - name: csi-provisioner
          image: k8s.gcr.io/sig-storage/csi-provisioner:v3.0.0
          args:
            - "--csi-address=/csi/csi.sock"
            - "--v=5"
          volumeMounts:
            - name: socket-dir
              mountPath: /csi
        - name: minimal-csi-driver
          image: yourusername/minimal-csi-driver:latest
          args:
            - "--endpoint=/csi/csi.sock"
            - "--node-id=$(NODE_ID)"
          env:
            - name: NODE_ID
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
          volumeMounts:
            - name: socket-dir
              mountPath: /csi
      volumes:
        - name: socket-dir
          emptyDir: {}
---
# Node plugin DaemonSet
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: minimal-csi-node
spec:
  selector:
    matchLabels:
      app: minimal-csi-node
  template:
    metadata:
      labels:
        app: minimal-csi-node
    spec:
      serviceAccountName: minimal-csi-node
      containers:
        - name: csi-node-driver-registrar
          image: k8s.gcr.io/sig-storage/csi-node-driver-registrar:v2.5.0
          args:
            - "--csi-address=/csi/csi.sock"
            - "--kubelet-registration-path=/var/lib/kubelet/plugins/minimal.csi.example.com/csi.sock"
          volumeMounts:
            - name: socket-dir
              mountPath: /csi
            - name: registration-dir
              mountPath: /registration
        - name: minimal-csi-driver
          image: yourusername/minimal-csi-driver:latest
          args:
            - "--endpoint=/csi/csi.sock"
            - "--node-id=$(NODE_ID)"
          env:
            - name: NODE_ID
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
          securityContext:
            privileged: true
          volumeMounts:
            - name: socket-dir
              mountPath: /csi
            - name: pods-mount-dir
              mountPath: /var/lib/kubelet/pods
              mountPropagation: Bidirectional
      volumes:
        - name: socket-dir
          hostPath:
            path: /var/lib/kubelet/plugins/minimal.csi.example.com
            type: DirectoryOrCreate
        - name: registration-dir
          hostPath:
            path: /var/lib/kubelet/plugins_registry
            type: Directory
        - name: pods-mount-dir
          hostPath:
            path: /var/lib/kubelet/pods
            type: Directory
```

## Building and Testing

Build your CSI driver:

```bash
# Build the binary
CGO_ENABLED=0 GOOS=linux go build -o bin/minimal-csi-driver cmd/driver/main.go

# Build the Docker image
docker build -t yourusername/minimal-csi-driver:latest .

# Push to registry
docker push yourusername/minimal-csi-driver:latest
```

Deploy the driver to your cluster:

```bash
kubectl apply -f deploy/kubernetes/rbac.yaml
kubectl apply -f deploy/kubernetes/driver.yaml
```

This minimal CSI driver provides the foundation for building more sophisticated storage solutions. You can extend it with features like snapshots, cloning, volume expansion, and integration with actual storage backends. The key is understanding the CSI specification and implementing the required gRPC interfaces correctly.
