# How to Fix 'exec format error' in Podman (Architecture Mismatch)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Architecture, ARM, Multi-Platform

Description: Learn how to fix the 'exec format error' in Podman caused by running containers built for a different CPU architecture, and how to build and run multi-architecture images.

---

> The "exec format error" in Podman often means you are trying to run a container image built for a different CPU architecture than your host. This guide explains how to identify the mismatch and run or build images for the correct platform.

The "exec format error" is a Linux kernel error that occurs when you try to execute a binary compiled for a different CPU architecture. In the container world, this most commonly happens when you pull an x86_64 (amd64) image on an ARM (aarch64) machine or vice versa. With the growing adoption of ARM-based systems like Apple Silicon Macs, AWS Graviton instances, and Raspberry Pi devices, this error has become increasingly common.

---

## Understanding the Error

When you see this error, it looks like:

```text
Error: crun: executable file '/usr/bin/python3' exec format error: OCI runtime error
```

Or:

```text
exec /docker-entrypoint.sh: exec format error
```

This means the binaries inside the container image were compiled for a different CPU architecture than the one your system uses.

Check your host architecture:

```bash
uname -m
# x86_64 = AMD/Intel 64-bit

# aarch64 = ARM 64-bit (Apple Silicon, Graviton, Raspberry Pi 4)
# armv7l = ARM 32-bit (older Raspberry Pi)
```

Check the architecture of a container image:

```bash
podman image inspect nginx:latest --format '{{.Architecture}}'
```

If these do not match, you have found your problem.

## Fixes

### 1. Pull the Correct Architecture Image

Most popular images on Docker Hub and other registries publish multi-architecture manifests. You can explicitly request the correct architecture:

```bash
# Pull for AMD/Intel
podman pull --platform linux/amd64 nginx:latest

# Pull for ARM 64-bit
podman pull --platform linux/arm64 nginx:latest

# Pull for ARM 32-bit
podman pull --platform linux/arm/v7 nginx:latest
```

Verify what architectures an image supports:

```bash
podman manifest inspect docker.io/library/nginx:latest | grep architecture
```

### 2. Enable QEMU Emulation for Cross-Architecture Execution

If you need to run an image built for a different architecture, you can use QEMU user-mode emulation. This translates instructions from one architecture to another at runtime.

On Fedora or CentOS Stream:

```bash
sudo dnf install qemu-user-static qemu-user-binfmt
```

On RHEL, the package names and availability depend on the enabled repositories and RHEL version.

On Ubuntu or Debian:

```bash
sudo apt install qemu-user-static binfmt-support
```

After installing, register the binary formats:

```bash
# This is usually done automatically, but if needed:
sudo systemctl restart systemd-binfmt
```

Verify the registration:

```bash
ls /proc/sys/fs/binfmt_misc/
# You should see entries like qemu-aarch64, qemu-arm, etc.
```

Now you can run images for other architectures:

```bash
# Run an ARM image on an x86_64 host
podman run --platform linux/arm64 alpine uname -m
# Output: aarch64
```

Note that QEMU emulation is significantly slower than native execution. It is best used for testing and development, not production workloads.

### 3. Build Multi-Architecture Images

If you are building your own images, create multi-architecture builds so they work on any platform.

Using `podman build` with the `--platform` flag:

```bash
# Build for multiple architectures
podman build --platform linux/amd64,linux/arm64 --manifest myapp:latest .
```

For more control, use `podman manifest` to create a manifest list:

```bash
# Build for each architecture separately
podman build --platform linux/amd64 -t myapp:latest-amd64 .
podman build --platform linux/arm64 -t myapp:latest-arm64 .

# Create a manifest list
podman manifest create myapp:latest

# Add each architecture to the manifest
podman manifest add myapp:latest myapp:latest-amd64
podman manifest add myapp:latest myapp:latest-arm64

# Push the manifest list to a registry
podman manifest push myapp:latest docker://registry.example.com/myapp:latest
```

### 4. Fix Dockerfiles for Multi-Architecture Compatibility

When writing Dockerfiles for multi-architecture builds, avoid architecture-specific assumptions:

```dockerfile
# BAD: Hardcoded architecture
FROM --platform=linux/amd64 ubuntu:22.04
RUN wget https://example.com/tool-x86_64.tar.gz

# GOOD: Use build arguments for architecture-aware downloads
FROM ubuntu:22.04
ARG TARGETARCH
RUN case ${TARGETARCH} in \
      amd64) ARCH="x86_64" ;; \
      arm64) ARCH="aarch64" ;; \
      *) echo "Unsupported architecture: ${TARGETARCH}" && exit 1 ;; \
    esac && \
    wget "https://example.com/tool-${ARCH}.tar.gz"
```

Podman automatically sets the `TARGETARCH`, `TARGETOS`, and `TARGETPLATFORM` build arguments during multi-platform builds:

```dockerfile
FROM golang:1.21 AS builder
ARG TARGETARCH
ARG TARGETOS

WORKDIR /app
COPY . .
RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o myapp .

FROM alpine:3.18
COPY --from=builder /app/myapp /usr/local/bin/
CMD ["myapp"]
```

### 5. Working with Podman on Apple Silicon Macs

Apple Silicon Macs run ARM (aarch64) natively. The Podman machine VM also runs ARM. Many older images are only available for amd64, leading to exec format errors.

Check the Podman machine architecture:

```bash
podman machine info
podman info --format '{{.Host.Arch}}'
```

To run amd64 images on Apple Silicon, ensure QEMU is set up inside the Podman machine:

```bash
# SSH into the Podman machine
podman machine ssh

# Check if QEMU is registered
ls /proc/sys/fs/binfmt_misc/qemu-x86_64

# If not, install it. Default Podman machines use Fedora CoreOS.
sudo rpm-ostree install qemu-user-static qemu-user-binfmt
sudo systemctl reboot
exit
```

Now you can run amd64 images with the `--platform` flag:

```bash
podman run --platform linux/amd64 mylegacy-image:latest
```

### 6. CI/CD Pipeline Configuration

For CI/CD pipelines that need to build and test multi-architecture images:

```yaml
# GitHub Actions example
name: Build Multi-Arch
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install QEMU
        run: |
          sudo apt-get update
          sudo apt-get install -y qemu-user-static

      - name: Build multi-arch image
        run: |
          podman build --platform linux/amd64,linux/arm64 \
            --manifest myapp:${{ github.sha }} .

      - name: Test on both architectures
        run: |
          podman run --platform linux/amd64 myapp:${{ github.sha }} uname -m
          podman run --platform linux/arm64 myapp:${{ github.sha }} uname -m
```

### 7. Checking Image Architecture Before Pulling

To avoid pulling the wrong architecture, inspect the image manifest first:

```bash
# List available architectures for an image
podman manifest inspect docker.io/library/python:3.11 | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for m in data.get('manifests', []):
    p = m.get('platform', {})
    print(f\"{p.get('os', 'unknown')}/{p.get('architecture', 'unknown')}\")
"
```

Or use `skopeo` for a more detailed view:

```bash
skopeo inspect --raw docker://docker.io/library/nginx:latest | \
  python3 -m json.tool | grep architecture
```

## Conclusion

When Podman's "exec format error" is caused by an architecture mismatch between the container image and the host system, the fix depends on your situation: pull the correct architecture with `--platform`, install QEMU for cross-architecture emulation, or build multi-architecture images using manifest lists. As ARM adoption continues to grow, building multi-architecture images from the start saves time and prevents these errors downstream. Use the `TARGETARCH` build argument in your Dockerfiles to write architecture-aware build scripts that work everywhere.
