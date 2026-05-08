# How to Build s390x Images with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Multi-Architecture, s390x, IBM Z

Description: Learn how to build container images for IBM Z (s390x) architecture using Podman with QEMU emulation, including setup, optimization, and testing.

---

> Building s390x images with Podman lets you target IBM Z mainframes from standard x86 or ARM development machines, enabling hybrid cloud workflows.

IBM Z mainframes use the s390x (System/390 extended) architecture. Organizations running workloads on IBM Z increasingly adopt containers for modernization. With Podman and QEMU emulation, you can build and test s390x container images on any development machine without access to actual mainframe hardware.

---

## Setting Up s390x Emulation

Install QEMU user-static to enable s390x binary emulation.

```bash
# Fedora/RHEL/CentOS

sudo dnf install qemu-user-static
sudo systemctl restart systemd-binfmt

# Ubuntu/Debian
sudo apt-get install qemu-user-static binfmt-support
sudo systemctl restart binfmt-support

# Verify s390x emulation is available
cat /proc/sys/fs/binfmt_misc/qemu-s390x
# Should show: enabled

# Quick test
podman run --rm --platform linux/s390x alpine:3.23 uname -m
# Expected output: s390x
```

## Basic s390x Image Build

```bash
mkdir -p ~/s390x-demo && cd ~/s390x-demo

cat > Containerfile <<'EOF'
FROM alpine:3.23
RUN apk add --no-cache curl
RUN echo "Architecture: $(uname -m)" > /build-info.txt
CMD ["cat", "/build-info.txt"]
EOF

# Build for s390x
podman build --platform linux/s390x -t myapp:s390x .

# Verify
podman inspect myapp:s390x --format '{{.Architecture}}'
# Output: s390x

podman run --rm myapp:s390x
# Output: Architecture: s390x
```

## Choosing Base Images with s390x Support

Not all base images support s390x. Check before building.

```bash
# Check if a base image supports s390x
podman manifest inspect docker://alpine:3.23 | \
  jq '.manifests[] | select(.platform.architecture == "s390x")'

# Common base images with s390x support:
# alpine:3.23         - YES
# ubuntu:22.04        - YES
# debian:bookworm     - YES
# fedora:44           - YES
# golang:1.26         - YES
# node:24             - YES
# python:3.12         - YES
# rust:1.94           - YES

# Check support for a specific image
for IMAGE in alpine:3.23 ubuntu:22.04 node:24-alpine golang:1.26-alpine; do
  printf "%-25s " "${IMAGE}"
  if podman manifest inspect "docker://${IMAGE}" 2>/dev/null | \
     jq -e '.manifests[] | select(.platform.architecture == "s390x")' >/dev/null 2>&1; then
    echo "s390x: YES"
  else
    echo "s390x: NO"
  fi
done
```

## Building a Go Application for s390x

Go has excellent cross-compilation support for s390x.

```bash
cat > main.go <<'EOF'
package main

import (
    "fmt"
    "runtime"
)

func main() {
    fmt.Printf("OS: %s, Arch: %s\n", runtime.GOOS, runtime.GOARCH)
    fmt.Println("Hello from IBM Z!")
}
EOF

cat > go.mod <<'EOF'
module s390x-demo
go 1.26
EOF

cat > Containerfile <<'EOF'
# Cross-compile natively (fast, no QEMU for compilation)
ARG BUILDPLATFORM
FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /src
COPY go.mod main.go ./

RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} CGO_ENABLED=0 \
    go build -ldflags="-s -w" -o /app

# Runtime image for s390x
FROM alpine:3.23
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF

# Build for s390x (compilation runs natively; the target image is s390x)
podman build --platform linux/s390x -t myapp:s390x .

# Test
podman run --rm myapp:s390x
# Output: OS: linux, Arch: s390x
#         Hello from IBM Z!
```

## Building a Node.js Application for s390x

```bash
cat > package.json <<'EOF'
{
  "name": "s390x-app",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  }
}
EOF

cat > index.js <<'EOF'
const os = require('os');
console.log(`Platform: ${os.platform()}`);
console.log(`Architecture: ${os.arch()}`);
console.log(`Hostname: ${os.hostname()}`);
EOF

cat > Containerfile <<'EOF'
FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY index.js ./
CMD ["npm", "start"]
EOF

podman build --platform linux/s390x -t nodeapp:s390x .
podman run --rm nodeapp:s390x
```

## Building a Python Application for s390x

```bash
cat > app.py <<'EOF'
import platform
import sys

print(f"Python: {sys.version}")
print(f"Machine: {platform.machine()}")
print(f"Platform: {platform.platform()}")
EOF

cat > requirements.txt <<'EOF'
requests==2.32.5
EOF

cat > Containerfile <<'EOF'
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py ./
CMD ["python", "app.py"]
EOF

podman build --platform linux/s390x -t pyapp:s390x .
podman run --rm pyapp:s390x
```

## Multi-Architecture Build Including s390x

Build for all major architectures including s390x.

```bash
# Build for AMD64, ARM64, and s390x
podman build \
  --platform linux/amd64,linux/arm64,linux/s390x \
  --manifest myapp:latest \
  .

# Verify all platforms
podman manifest inspect myapp:latest | \
  jq '.manifests[] | {arch: .platform.architecture}'

# Push to registry
podman manifest push --all myapp:latest docker://registry.example.com/myapp:latest
```

## Testing s390x Images

```bash
# Run interactive shell
podman run --rm -it --platform linux/s390x myapp:s390x /bin/sh

# Verify the architecture
podman run --rm --platform linux/s390x myapp:s390x uname -m
# Output: s390x

# Check binary architecture
podman run --rm --platform linux/s390x myapp:s390x sh -c \
  'apk add --no-cache file >/dev/null && file /usr/local/bin/app'
# Output: ELF 64-bit MSB executable, IBM S/390

# Note: s390x is big-endian (MSB), unlike most other platforms
```

## Performance Considerations

s390x emulation through QEMU is slower than native execution. Optimize your builds.

```bash
# Measure build time
time podman build --platform linux/s390x -t myapp:s390x .

# Use cross-compilation to minimize QEMU overhead
# Go, Rust, and C/C++ can cross-compile for s390x

# Minimize emulated RUN steps
# Combine operations into fewer layers
RUN apk add --no-cache curl wget jq && \
    mkdir -p /app/config /app/data && \
    echo "setup complete"
```

## CI/CD Pipeline for s390x

```bash
#!/bin/bash
# ci-s390x-build.sh

REGISTRY="registry.example.com"
IMAGE="${REGISTRY}/myapp"
TAG="${CI_COMMIT_TAG:-latest}"

# Verify s390x emulation is available
if ! podman run --rm --platform linux/s390x alpine:3.23 true 2>/dev/null; then
  echo "ERROR: s390x emulation not available"
  echo "Install qemu-user-static and restart binfmt"
  exit 1
fi

# Build for s390x
podman build --platform linux/s390x -t "${IMAGE}:${TAG}-s390x" .

# Test
podman run --rm --platform linux/s390x "${IMAGE}:${TAG}-s390x" uname -m

# Push
podman push "${IMAGE}:${TAG}-s390x"

echo "Published: ${IMAGE}:${TAG}-s390x"
```

## Troubleshooting

### Emulation Not Available

```bash
# Check if qemu-s390x is registered
ls /proc/sys/fs/binfmt_misc/qemu-s390x

# If missing, re-register
sudo systemctl restart systemd-binfmt

# Or use the container method
podman run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

### Base Image Does Not Support s390x

```bash
# If your base image lacks s390x support, find an alternative
# Check: podman manifest inspect docker://your-image:tag | jq '.manifests[].platform'

# Use a known s390x-compatible base image
FROM ubuntu:22.04  # Supports s390x
# Instead of:
# FROM some-niche-image:latest  # May not support s390x
```

### Package Installation Failures

```bash
# Some packages may not be available for s390x
# Check availability first
podman run --rm --platform linux/s390x alpine:3.23 apk search <package>

# Use alternative packages or build from source if needed
```

## Summary

Building s390x images with Podman requires QEMU user-static for emulation on non-s390x hosts. Install QEMU, verify s390x support, and use `--platform linux/s390x` in your build commands. Most popular base images (Alpine, Ubuntu, Debian, Fedora) support s390x. For compiled languages, use cross-compilation to avoid slow QEMU emulation during compilation. Include s390x alongside AMD64 and ARM64 in your multi-architecture manifest lists to support hybrid cloud deployments that include IBM Z infrastructure.
