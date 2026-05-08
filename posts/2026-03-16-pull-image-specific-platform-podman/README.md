# How to Pull an Image for a Specific Platform with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Multi-Architecture

Description: Learn how to pull container images for specific CPU architectures and operating systems using Podman's platform selection options.

---

> When working with multi-architecture images, specifying the target platform ensures you get the correct binary for your hardware.

Modern container images are often published as multi-architecture manifests that support multiple CPU architectures like AMD64, ARM64, and others. Podman can pull images for specific platforms, which is essential when building for different target architectures or running containers on ARM-based systems. This guide covers how to pull platform-specific images with Podman.

---

## Understanding Multi-Architecture Images

A multi-architecture image is actually a manifest list that points to platform-specific image manifests.

```bash
# Inspect a multi-arch manifest to see available platforms

podman manifest inspect docker.io/library/nginx:1.25

# Use skopeo for a cleaner view of available platforms
skopeo inspect --raw docker://docker.io/library/nginx:1.25 | \
  python3 -m json.tool | grep -A 3 '"platform"'
```

## Checking Your Current Platform

Before pulling for a specific platform, know what platform you are on.

```bash
# Check your system architecture
uname -m
# Output: x86_64 (for AMD64) or aarch64 (for ARM64)

# Check what Podman reports as the native platform
podman info --format '{{.Host.Arch}}'

# Get the full OS/arch combination
podman info --format '{{.Host.OS}}/{{.Host.Arch}}'
```

## Pulling for a Specific Platform

Use the `--platform` flag to specify the target architecture.

```bash
# Pull the AMD64 version of nginx
podman pull --platform linux/amd64 nginx:1.25

# Pull the ARM64 version of nginx
podman pull --platform linux/arm64 nginx:1.25

# Pull the ARM v7 version for Raspberry Pi
podman pull --platform linux/arm --variant v7 alpine:3.19

# Pull the s390x version for IBM mainframes
podman pull --platform linux/s390x ubuntu:22.04
```

## Common Platform Identifiers

Here are the most commonly used platform identifiers.

```bash
# x86 64-bit (most common for servers and desktops)
podman pull --platform linux/amd64 nginx:latest

# ARM 64-bit (Apple Silicon Macs, AWS Graviton, Raspberry Pi 4)
podman pull --platform linux/arm64 nginx:latest

# ARM 32-bit v7 (older Raspberry Pi models)
podman pull --platform linux/arm --variant v7 nginx:latest

# ARM 32-bit v6 (Raspberry Pi Zero)
podman pull --platform linux/arm --variant v6 alpine:latest

# IBM Power
podman pull --platform linux/ppc64le nginx:latest

# IBM Z series
podman pull --platform linux/s390x nginx:latest
```

## Pulling Cross-Platform Images for Building

Pull images for a different platform than your host to prepare cross-platform builds.

```bash
# On an AMD64 machine, pull an ARM64 image
podman pull --platform linux/arm64 docker.io/library/golang:1.22

# Verify the pulled image's architecture
podman inspect docker.io/library/golang:1.22 \
  --format '{{.Architecture}}'

# Build a cross-platform image using the pulled base
cat > Containerfile << 'EOF'
FROM docker.io/library/golang:1.22
WORKDIR /app
COPY . .
RUN go build -o myapp .
EOF

podman build --platform linux/arm64 -t myapp:arm64 .
```

## Pulling Multiple Platforms

Pull images for multiple platforms to create your own multi-arch manifests.

```bash
# Pull the same image for two platforms
podman pull --platform linux/amd64 nginx:1.25
podman pull --platform linux/arm64 nginx:1.25

# List image IDs, then inspect each ID if you need to verify architecture
podman images --format "{{.Repository}}:{{.Tag}} {{.ID}}" | grep nginx

# Create a manifest list from both platform images
podman manifest create my-nginx:1.25

podman manifest add my-nginx:1.25 \
  docker.io/library/nginx:1.25 --arch amd64

podman manifest add my-nginx:1.25 \
  docker.io/library/nginx:1.25 --arch arm64
```

## Verifying the Platform of a Pulled Image

Confirm that the image you pulled matches the expected platform.

```bash
# Check the architecture of a pulled image
podman inspect nginx:1.25 --format '{{.Architecture}}'

# Check OS and architecture together
podman inspect nginx:1.25 --format '{{.Os}}/{{.Architecture}}'

# Get detailed platform info including variant
podman inspect nginx:1.25 \
  --format 'OS: {{.Os}}, Arch: {{.Architecture}}, Variant: {{.Variant}}'
```

## Using a Shell Helper for a Default Platform

If you frequently pull for a non-native platform, you can define a shell helper.

```bash
# Define a helper for the current session
podman-pull-arm64() {
  podman pull --platform linux/arm64 "$@"
}

podman-pull-arm64 nginx:1.25
# This will pull the ARM64 version

# Or add it to your shell profile for persistence
echo 'podman-pull-arm64() { podman pull --platform linux/arm64 "$@"; }' >> ~/.bashrc
source ~/.bashrc
```

## Summary

Podman's `--platform` flag gives you full control over which architecture variant you pull for multi-architecture images. This is essential for cross-platform development, CI/CD pipelines that build for multiple targets, and running containers on ARM-based infrastructure. Always verify the pulled image's architecture with `podman inspect` to confirm you have the correct platform variant.
