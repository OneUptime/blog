# How to Build ppc64le Images with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Multi-Architecture, ppc64le, IBM Power

Description: Learn how to build container images targeting the ppc64le (IBM Power) architecture using Podman, including cross-compilation techniques and QEMU emulation setup.

---

> Building ppc64le images with Podman lets you support IBM Power systems without needing physical hardware, using QEMU emulation for seamless cross-architecture builds.

If your infrastructure includes IBM Power servers, you need container images built for the ppc64le architecture. Podman makes this straightforward with its built-in support for cross-platform builds via QEMU emulation. This guide walks you through building ppc64le images from an x86_64 or ARM host machine.

---

## Prerequisites

Before building ppc64le images, you need Podman installed and QEMU user-static binaries registered on your system.

```bash
# Install Podman (Fedora/RHEL)

sudo dnf install -y podman

# Install QEMU user-static for cross-architecture emulation
sudo dnf install -y qemu-user-static
```

On Ubuntu or Debian systems, use:

```bash
# Install on Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y podman qemu-user-static
```

Verify that the ppc64le emulation binary is registered:

```bash
# Check if ppc64le binfmt is registered
ls /proc/sys/fs/binfmt_misc/qemu-ppc64le
```

If the file exists, your system is ready to emulate ppc64le binaries.

## Building a Simple ppc64le Image

Use the `--platform` flag to target ppc64le when building:

```bash
# Create a simple Dockerfile
cat > Dockerfile <<'EOF'
FROM registry.access.redhat.com/ubi9/ubi-minimal:latest
RUN microdnf install -y python3 && microdnf clean all
COPY app.py /app/app.py
WORKDIR /app
CMD ["python3", "app.py"]
EOF

# Build the image for ppc64le
podman build --platform linux/ppc64le -t myapp:ppc64le .
```

The `--platform linux/ppc64le` flag tells Podman to pull base images for ppc64le and use QEMU to execute any RUN commands during the build.

## Verifying the Image Architecture

After building, confirm that the image targets the correct architecture:

```bash
# Inspect the image architecture
podman inspect myapp:ppc64le --format '{{.Architecture}}'
# Expected output: ppc64le

# More detailed platform info
podman inspect myapp:ppc64le --format '{{.Os}}/{{.Architecture}}'
# Expected output: linux/ppc64le
```

## Using a Containerfile Optimized for ppc64le

Some packages or build steps may differ across architectures. You can handle this with conditional logic:

```bash
cat > Containerfile <<'EOF'
FROM registry.access.redhat.com/ubi9/ubi-minimal:latest

# Install architecture-specific packages
RUN ARCH=$(uname -m) && \
    echo "Building for architecture: ${ARCH}" && \
    microdnf install -y \
        python3 \
        python3-pip \
    && microdnf clean all

# Copy application code
COPY . /app
WORKDIR /app

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

EXPOSE 8080
CMD ["python3", "server.py"]
EOF

# Build for ppc64le
podman build --platform linux/ppc64le -f Containerfile -t myapp:ppc64le .
```

## Building with Build Arguments for Architecture-Specific Configuration

```bash
# Build with architecture-aware arguments
podman build \
    --platform linux/ppc64le \
    --build-arg TARGETARCH=ppc64le \
    --build-arg GO_VERSION=1.21 \
    -t mygoapp:ppc64le .
```

A Containerfile that uses these arguments:

```dockerfile
ARG GO_VERSION=1.21
FROM golang:${GO_VERSION} AS builder
ARG TARGETARCH
ENV GOARCH=${TARGETARCH}
ENV CGO_ENABLED=0

WORKDIR /src
COPY . .
RUN go build -o /app main.go

FROM scratch
COPY --from=builder /app /app
ENTRYPOINT ["/app"]
```

## Pushing ppc64le Images to a Registry

```bash
# Tag the image for your registry
podman tag myapp:ppc64le registry.example.com/myapp:ppc64le

# Push to the registry
podman push registry.example.com/myapp:ppc64le
```

## Performance Considerations

QEMU emulation is slower than native builds. Here are tips to speed things up:

```bash
# Use multi-stage builds to minimize emulated steps
# Pre-compile on native hardware when possible

# Check current QEMU emulation status
cat /proc/sys/fs/binfmt_misc/qemu-ppc64le

# Allocate more memory if builds fail due to resource constraints
podman build --platform linux/ppc64le \
    --memory 4g \
    -t myapp:ppc64le .
```

For production workloads, consider using a Podman farm with actual ppc64le hardware to avoid the emulation overhead. Native builds on IBM Power hardware will always outperform QEMU-based cross-compilation.

## Troubleshooting Common Issues

If you encounter errors during ppc64le builds:

```bash
# Re-register QEMU binfmt handlers
sudo podman run --rm --privileged \
    multiarch/qemu-user-static --reset -p yes

# Verify registration succeeded
ls /proc/sys/fs/binfmt_misc/ | grep ppc64le

# Test basic ppc64le emulation
podman run --rm --platform linux/ppc64le \
    registry.access.redhat.com/ubi9/ubi-minimal:latest \
    uname -m
# Expected output: ppc64le
```

## Summary

Building ppc64le images with Podman requires QEMU user-static emulation on non-Power hosts. The `--platform linux/ppc64le` flag handles base image selection and build-time emulation automatically. For faster builds at scale, consider setting up a Podman farm with native ppc64le nodes.
