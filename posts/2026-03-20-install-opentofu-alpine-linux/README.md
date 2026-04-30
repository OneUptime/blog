# How to Install OpenTofu on Alpine Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Alpine Linux, Installation, Docker, Infrastructure as Code, DevOps

Description: A guide to installing OpenTofu on Alpine Linux, commonly used in Docker containers and lightweight environments.

## Introduction

Alpine Linux is a security-focused, lightweight Linux distribution commonly used as a base for Docker containers. Installing OpenTofu on Alpine is useful for running infrastructure automation in containerized CI/CD pipelines or minimal environments.

## Prerequisites

- Alpine Linux 3.19 or later for the stable APK repository method
- Root or `sudo` access
- Internet connectivity

## Method 1: Install via APK Repository

On Alpine Linux 3.19 and later, OpenTofu is available through the community repository:

```bash
# Enable the community repository if not already enabled
grep -q '/community$' /etc/apk/repositories || \
  echo "https://dl-cdn.alpinelinux.org/alpine/v$(cut -d'.' -f1,2 /etc/alpine-release)/community" >> /etc/apk/repositories

# Update the package index
apk update

# Install OpenTofu
apk add opentofu
```

## Method 2: Install from Binary

For specific versions or if the package is not in the repository:

```bash
TOFU_VERSION="1.11.6"

# Install required tools
apk add curl unzip

TOFU_ARCH="$(apk --print-arch)"
case "$TOFU_ARCH" in
  x86_64) TOFU_ARCH="amd64" ;;
  aarch64) TOFU_ARCH="arm64" ;;
  armv7|armhf) TOFU_ARCH="arm" ;;
  x86) TOFU_ARCH="386" ;;
  *) echo "Unsupported architecture: $TOFU_ARCH" >&2; exit 1 ;;
esac

# Download OpenTofu binary
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_${TOFU_ARCH}.zip"

# Extract and install
unzip "tofu_${TOFU_VERSION}_linux_${TOFU_ARCH}.zip"
mv tofu /usr/local/bin/
chmod +x /usr/local/bin/tofu

# Clean up
rm "tofu_${TOFU_VERSION}_linux_${TOFU_ARCH}.zip"
```

## Using OpenTofu in a Docker Container

Alpine is commonly used as a Docker base image. Here is a minimal Dockerfile:

```dockerfile
# Dockerfile using Alpine as base
FROM alpine:3.23

# Set OpenTofu version as build argument
ARG TOFU_VERSION=1.11.6

# Install dependencies
RUN apk add --no-cache \
    curl \
    unzip \
    git \
    openssh-client \
    && ARCH="$(apk --print-arch)" \
    && case "$ARCH" in \
         x86_64) TOFU_ARCH="amd64" ;; \
         aarch64) TOFU_ARCH="arm64" ;; \
         armv7|armhf) TOFU_ARCH="arm" ;; \
         x86) TOFU_ARCH="386" ;; \
         *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;; \
       esac \
    && curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_${TOFU_ARCH}.zip" \
    && unzip "tofu_${TOFU_VERSION}_linux_${TOFU_ARCH}.zip" \
    && mv tofu /usr/local/bin/ \
    && chmod +x /usr/local/bin/tofu \
    && rm "tofu_${TOFU_VERSION}_linux_${TOFU_ARCH}.zip"

# Verify installation
RUN tofu version

WORKDIR /workspace

ENTRYPOINT ["tofu"]
```

```bash
# Build the Docker image
docker build -t opentofu-alpine .

# Test it
docker run --rm opentofu-alpine version
```

## Method 3: Using the Official OpenTofu Docker Image

```bash
# Pull the official image (currently based on Alpine)
docker pull ghcr.io/opentofu/opentofu:latest

# Run OpenTofu commands
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  ghcr.io/opentofu/opentofu:latest \
  version
```

## Verifying the Installation

```bash
# Check version
tofu version

# Check binary location
which tofu
```

## Working with musl libc

Alpine uses musl libc instead of glibc. The official OpenTofu binaries are statically compiled and work on Alpine without any additional compatibility layers:

```bash
# Verify the binary works with musl libc
ldd "$(command -v tofu)"
# Should report that the binary is statically linked or not a dynamic executable
```

## Quick Test on Alpine

```hcl
# /tmp/test/main.tf
terraform {
  required_version = ">= 1.6"
}

output "os_info" {
  value = "Running OpenTofu on Alpine Linux"
}
```

```bash
mkdir -p /tmp/test && cd /tmp/test
# Create main.tf
tofu init
tofu apply -auto-approve
```

## Updating OpenTofu

```bash
# Update via apk
apk update && apk upgrade opentofu

# If installed manually, download and replace the binary
```

## Conclusion

OpenTofu installs cleanly on Alpine Linux, making it ideal for lightweight Docker-based CI/CD pipelines. The small footprint of Alpine combined with OpenTofu's capabilities creates an efficient infrastructure automation environment that minimizes container image sizes.
