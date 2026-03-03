# How to Create a Custom System Extension for Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, System Extensions, Custom Extension, Kubernetes, OCI Images, Infrastructure

Description: A step-by-step guide to creating custom system extensions for Talos Linux, from understanding the extension format to building, testing, and deploying your own extensions.

---

Talos Linux system extensions are the official way to add functionality beyond the minimal base OS. While the Siderolabs team provides many official extensions for common needs, there will be times when you need something custom. Maybe you need a proprietary driver, a monitoring agent specific to your infrastructure, or a system-level service that does not have an official extension. This guide walks you through creating your own Talos system extension from scratch.

## Understanding the Extension Format

A Talos system extension is an OCI (Open Container Initiative) image with a specific structure. When Talos boots, it overlays the extension contents onto the root filesystem. The extension image contains:

- A `manifest.yaml` file describing the extension
- Files to be placed on the filesystem (binaries, configuration, kernel modules, etc.)

The extension is not a running container - it is a filesystem layer that gets merged with the base OS at boot time.

## Extension Manifest

Every extension needs a manifest that describes it:

```yaml
# manifest.yaml
version: v1alpha1
metadata:
  name: my-custom-tool
  version: 1.0.0
  author: Your Name
  description: Custom monitoring agent for internal infrastructure
  compatibility:
    talos:
      version: ">= v1.7.0"
```

The compatibility field ensures the extension is only used with compatible Talos versions. This prevents issues from version mismatches.

## Types of Extensions

Extensions can provide different types of functionality:

### Type 1: System Service Extensions

These add a new service that runs alongside Talos system services:

```
/usr/local/etc/containers/my-service.yaml    # Service definition
/usr/local/bin/my-service                      # Binary
```

### Type 2: Kernel Module Extensions

These add kernel modules:

```
/lib/modules/<kernel-version>/extras/my-module.ko
```

### Type 3: Library/Binary Extensions

These add shared libraries or utility binaries:

```
/usr/local/lib/my-library.so
/usr/local/bin/my-tool
```

### Type 4: Firmware Extensions

These add hardware firmware files:

```
/lib/firmware/my-hardware/firmware.bin
```

## Building a Service Extension

Let's build a complete example - a custom health check agent that runs as a system service.

### Step 1: Write the Service Binary

First, create your service. For this example, we will use a simple Go program:

```go
// main.go
package main

import (
    "fmt"
    "log"
    "net/http"
    "os"
    "time"
)

func main() {
    hostname, _ := os.Hostname()
    port := os.Getenv("HEALTH_PORT")
    if port == "" {
        port = "8081"
    }

    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        fmt.Fprintf(w, "healthy: %s at %s", hostname, time.Now().UTC())
    })

    log.Printf("Health agent starting on port %s", port)
    log.Fatal(http.ListenAndServe(":"+port, nil))
}
```

### Step 2: Create the Dockerfile

The Dockerfile builds the binary and packages it as an extension:

```dockerfile
# Dockerfile

# Build stage
FROM golang:1.22-alpine AS build

WORKDIR /app
COPY main.go .
RUN CGO_ENABLED=0 GOOS=linux go build -o health-agent main.go

# Extension packaging stage
FROM scratch AS extension

# Copy the binary
COPY --from=build /app/health-agent /usr/local/bin/health-agent

# Copy the service definition
COPY health-agent.yaml /usr/local/etc/containers/health-agent.yaml

# Copy the manifest
COPY manifest.yaml /
```

### Step 3: Create the Service Definition

Talos uses a container-based service model. Create the service definition:

```yaml
# health-agent.yaml
name: health-agent
container:
  entrypoint: /usr/local/bin/health-agent
  environment:
    HEALTH_PORT: "8081"
  security:
    readOnlyRootFilesystem: true
    runAsUser: 0
  mounts: []
depends:
  - service: machined
    condition: running
restart: always
```

### Step 4: Build and Push

```bash
# Build the extension image
docker build -t my-registry.com/health-agent-extension:v1.0.0 .

# Push to your container registry
docker push my-registry.com/health-agent-extension:v1.0.0
```

## Building a Kernel Module Extension

For kernel module extensions, the process is similar but with kernel-specific build steps:

```dockerfile
# Dockerfile for a kernel module extension

# Get kernel headers from the Talos packages
FROM ghcr.io/siderolabs/pkgs:v1.7.0 AS pkgs

# Build stage
FROM ghcr.io/siderolabs/tools:v1.7.0 AS build

# Copy kernel headers
COPY --from=pkgs /lib/modules/ /lib/modules/

# Copy module source
COPY src/ /build/
WORKDIR /build

# Build the kernel module
RUN KERNEL_DIR=$(ls -d /lib/modules/*/build) && \
    make -C "$KERNEL_DIR" M=/build modules

# Extension stage
FROM scratch AS extension

COPY --from=build /build/*.ko /lib/modules/
COPY manifest.yaml /
```

## Using the Official Extensions Framework

For a more structured approach, use the Siderolabs extensions build framework:

```bash
# Clone the official extensions repo
git clone https://github.com/siderolabs/extensions.git
cd extensions

# Create your extension directory
mkdir -p custom/my-extension
```

Create the required files following the patterns in existing extensions:

```yaml
# custom/my-extension/vars.yaml
VERSION: "1.0.0"
```

```dockerfile
# custom/my-extension/Dockerfile
# Follow the patterns from official extensions
```

Build using the framework:

```bash
# Build using the make system
make REGISTRY=my-registry.com TAG=v1.0.0 custom/my-extension
```

## Testing Your Extension

### Local Testing

Test the extension by building a custom Talos image and running it in a VM or Docker:

```bash
# Create a Talos cluster with your extension
talosctl cluster create \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --extra-kernel-arg="" \
  --user-disk /dev/vdb:1GB

# Apply configuration with your extension
talosctl -n 10.5.0.2 patch machineconfig -p '[
  {
    "op": "add",
    "path": "/machine/install/extensions",
    "value": [
      {
        "image": "my-registry.com/health-agent-extension:v1.0.0"
      }
    ]
  }
]'
```

### Verification

After deploying, verify the extension is working:

```bash
# Check installed extensions
talosctl -n 192.168.1.10 get extensions

# Check if the service is running (for service extensions)
talosctl -n 192.168.1.10 services

# View extension service logs
talosctl -n 192.168.1.10 logs ext-health-agent

# Check kernel modules (for module extensions)
talosctl -n 192.168.1.10 read /proc/modules | grep my_module
```

## Deploying to Production

### Include in Machine Configuration

```yaml
machine:
  install:
    image: ghcr.io/siderolabs/installer:v1.7.0
    extensions:
      - image: my-registry.com/health-agent-extension:v1.0.0
      - image: ghcr.io/siderolabs/iscsi-tools:v1.7.0
```

### Upgrade Existing Nodes

```bash
# Upgrade with custom extension
talosctl -n 192.168.1.10 upgrade \
  --image factory.talos.dev/installer/<schematic-with-extension>:v1.7.0
```

### Rolling Deployment

Deploy to one node at a time and verify:

```bash
#!/bin/bash
NODES="192.168.1.10 192.168.1.11 192.168.1.12"

for node in $NODES; do
  echo "Upgrading $node with custom extension..."

  talosctl -n "$node" upgrade --image my-custom-installer:v1.7.0

  # Wait for the node to come back
  echo "Waiting for $node to restart..."
  sleep 120

  # Verify extension is loaded
  talosctl -n "$node" get extensions

  # Check services
  talosctl -n "$node" services

  echo "$node upgraded successfully"
  echo "---"
done
```

## Extension Development Tips

### Keep Extensions Small

Each extension adds to the OS image size and boot time. Include only what is strictly necessary:

```dockerfile
# Good: multi-stage build with minimal final image
FROM golang:1.22 AS build
# ... build steps ...

FROM scratch AS extension
COPY --from=build /app/binary /usr/local/bin/binary
COPY manifest.yaml /

# Bad: including build tools in the extension
FROM golang:1.22 AS extension
COPY . /app
# Build tools are now part of the extension - unnecessary bloat
```

### Handle Configuration Through Machine Config

Instead of hardcoding configuration in the extension, allow configuration through Talos machine config files:

```yaml
machine:
  files:
    - content: |
        port: 8081
        interval: 30s
        targets:
          - name: api-server
            url: https://localhost:6443/healthz
      path: /etc/health-agent/config.yaml
      permissions: 0644
      op: create
```

### Version Your Extensions

Maintain clear versioning that ties to both the extension functionality and the Talos version:

```bash
# Convention: extension-version_talos-version
my-registry.com/health-agent:v1.0.0_talos-v1.7.0
my-registry.com/health-agent:v1.0.0_talos-v1.8.0
```

### Set Up CI/CD

Automate extension builds for each Talos release:

```yaml
# .github/workflows/build-extension.yml
name: Build Extension
on:
  push:
    tags:
      - 'v*'
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        talos-version: ['v1.7.0', 'v1.7.1', 'v1.8.0']
    steps:
      - uses: actions/checkout@v4
      - name: Build extension
        run: |
          docker build \
            --build-arg TALOS_VERSION=${{ matrix.talos-version }} \
            -t my-registry.com/my-extension:${{ github.ref_name }}_${{ matrix.talos-version }} \
            .
      - name: Push extension
        run: docker push my-registry.com/my-extension:${{ github.ref_name }}_${{ matrix.talos-version }}
```

## Best Practices

1. **Follow the official patterns** - Study existing Siderolabs extensions before building your own.
2. **Use multi-stage builds** - Keep your extension images minimal.
3. **Test against multiple Talos versions** - Build and test for each Talos version you support.
4. **Document thoroughly** - Include clear instructions on what your extension does and how to configure it.
5. **Consider contributing upstream** - If your extension could benefit others, consider contributing it to the official extensions repository.

Creating custom system extensions for Talos Linux gives you the power to extend the OS while maintaining its security and immutability guarantees. The initial learning curve is worth it - once you have the build pipeline in place, creating new extensions becomes a straightforward process.
