# How to Use Dapr with RISC-V Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RISC-V, Architecture, Edge, Embedded

Description: Learn the current state of Dapr support on RISC-V hardware, how to cross-compile Dapr components, and what to expect when running Dapr on RISC-V edge devices.

---

RISC-V is an open-source instruction set architecture gaining traction in edge computing, IoT, and embedded systems. While Dapr's primary targets are amd64 and arm64, Dapr is written in Go which supports RISC-V cross-compilation.

## Current RISC-V Support Status

As of 2026, Dapr does not publish official RISC-V container images, but the Go-based Dapr runtime can be cross-compiled for RISC-V 64-bit (`riscv64`) targets:

- Dapr runtime (daprd): Compilable for Linux/riscv64
- Official images: Not published (must build from source)
- Kubernetes on RISC-V: Experimental (k3s has better support)
- SDK support: All Go, Python, and JavaScript SDKs run on riscv64

## Cross-Compiling Dapr for RISC-V

Clone the Dapr runtime and cross-compile:

```bash
git clone https://github.com/dapr/dapr.git
cd dapr

# Cross-compile daprd for Linux RISC-V 64-bit
GOOS=linux GOARCH=riscv64 go build \
  -o dist/daprd_riscv64 \
  ./cmd/daprd/

# Verify the binary architecture
file dist/daprd_riscv64
# dist/daprd_riscv64: ELF 64-bit LSB executable, UCB RISC-V
```

## Building a Container Image for RISC-V

```dockerfile
# Dockerfile.riscv64
FROM riscv64/ubuntu:22.04

COPY dist/daprd_riscv64 /usr/local/bin/daprd
RUN chmod +x /usr/local/bin/daprd

ENTRYPOINT ["/usr/local/bin/daprd"]
```

```bash
# Build for RISC-V target
docker buildx build \
  --platform linux/riscv64 \
  -f Dockerfile.riscv64 \
  -t myrepo/daprd:riscv64 \
  --push .
```

## Running Dapr on k3s for RISC-V

K3s is more suitable than full Kubernetes for RISC-V edge devices:

```bash
# On RISC-V device - install k3s
curl -sfL https://get.k3s.io | sh -

# Deploy your custom Dapr image via Helm
helm install dapr dapr/dapr \
  --set global.registry=myrepo \
  --set global.tag=riscv64 \
  --create-namespace \
  -n dapr-system
```

## Self-Hosted Mode for Edge Devices

For IoT devices not running Kubernetes, use Dapr in self-hosted mode:

```bash
# Copy the compiled binary to the device
scp dist/daprd_riscv64 user@risc-v-device:/usr/local/bin/daprd

# Run your application with Dapr on the device
daprd --app-id sensor-processor \
      --app-port 3000 \
      --resources-path ./components &

python3 sensor_app.py
```

Self-hosted components can use lightweight backends:

```yaml
# Use in-memory state store for resource-constrained devices
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.in-memory
  version: v1
  metadata: []
```

## Limitations on RISC-V

- No official Dapr container images; must maintain your own build pipeline
- Some Dapr components with CGo dependencies may not cross-compile cleanly
- The Dapr dashboard and observability tooling have limited RISC-V support
- Performance characteristics differ significantly from server-class hardware

## Summary

Dapr can be cross-compiled for Linux/riscv64 using Go's native cross-compilation support, enabling deployment on RISC-V edge devices. Build custom container images from source, use k3s for lightweight Kubernetes on RISC-V hardware, or run Dapr in self-hosted mode for IoT devices without Kubernetes. Expect to maintain your own build pipeline as official RISC-V images are not yet published.
