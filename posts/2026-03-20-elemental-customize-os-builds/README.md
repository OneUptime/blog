# How to Customize Elemental OS Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elemental, OS Customization, Docker, Kubernetes, Edge

Description: Extend the base Elemental OS image with custom packages, configurations, and services to meet specific deployment requirements.

## Introduction

Elemental OS images are standard OCI container images, which means you can extend them using standard Dockerfile syntax. This flexibility allows you to install custom software, add configuration files, integrate monitoring agents, and configure system services - all while maintaining the immutable, reproducible properties that make Elemental reliable at scale. To keep customized images bootable and upgradeable, preserve the Elemental image metadata in `/etc/os-release` and rerun `elemental init` after changing the filesystem.

## Customization Strategies

- **Dockerfile extensions**: Add packages, files, and services
- **Multi-stage builds**: Keep image size minimal
- **Build-time secrets**: Handle sensitive configuration securely
- **Version tagging**: Track which build is deployed where

## Creating a Custom Elemental Image

### Basic Package Installation

```dockerfile
# Dockerfile.elemental-custom

FROM registry.suse.com/suse/sl-micro/6.1/baremetal-os-container:latest

# Install monitoring and operations tools
RUN zypper --non-interactive install \
    curl \
    jq \
    prometheus-node_exporter \
    && zypper clean -a

# Enable node exporter on boot
RUN systemctl enable prometheus-node_exporter

ARG IMAGE_REPO=my-registry.example.com/elemental-os
ARG IMAGE_TAG=v1.2.0
RUN sed -i -e "s|^IMAGE_REPO=.*|IMAGE_REPO=\"${IMAGE_REPO}\"|g" /etc/os-release && \
    sed -i -e "s|^IMAGE_TAG=.*|IMAGE_TAG=\"${IMAGE_TAG}\"|g" /etc/os-release && \
    sed -i -e "s|^IMAGE=.*|IMAGE=\"${IMAGE_REPO}:${IMAGE_TAG}\"|g" /etc/os-release && \
    elemental init --force elemental-rootfs,grub-config,dracut-config,cloud-config-essentials,elemental-setup
```

### Adding Custom Systemd Services

```dockerfile
FROM registry.suse.com/suse/sl-micro/6.1/baremetal-os-container:latest

# Copy custom service files
COPY systemd/my-agent.service /etc/systemd/system/
COPY scripts/my-agent.sh /usr/local/bin/

# Make script executable
RUN chmod +x /usr/local/bin/my-agent.sh

# Enable the service
RUN systemctl enable my-agent.service

ARG IMAGE_REPO=my-registry.example.com/elemental-os
ARG IMAGE_TAG=v1.2.0
RUN sed -i -e "s|^IMAGE_REPO=.*|IMAGE_REPO=\"${IMAGE_REPO}\"|g" /etc/os-release && \
    sed -i -e "s|^IMAGE_TAG=.*|IMAGE_TAG=\"${IMAGE_TAG}\"|g" /etc/os-release && \
    sed -i -e "s|^IMAGE=.*|IMAGE=\"${IMAGE_REPO}:${IMAGE_TAG}\"|g" /etc/os-release && \
    elemental init --force elemental-rootfs,grub-config,dracut-config,cloud-config-essentials,elemental-setup
```

### Multi-Stage Build for Size Optimization

```dockerfile
# Build stage: compile custom tools
FROM golang:1.26 AS builder
WORKDIR /app
COPY my-tool/ .
RUN go build -o /usr/local/bin/my-tool ./cmd/my-tool

# Final image: only runtime artifacts
FROM registry.suse.com/suse/sl-micro/6.1/baremetal-os-container:latest

# Copy compiled binary from builder
COPY --from=builder /usr/local/bin/my-tool /usr/local/bin/my-tool

# Copy service definition
COPY my-tool.service /etc/systemd/system/
RUN chmod +x /usr/local/bin/my-tool && \
    systemctl enable my-tool.service

ARG IMAGE_REPO=my-registry.example.com/elemental-os
ARG IMAGE_TAG=v1.2.0
RUN sed -i -e "s|^IMAGE_REPO=.*|IMAGE_REPO=\"${IMAGE_REPO}\"|g" /etc/os-release && \
    sed -i -e "s|^IMAGE_TAG=.*|IMAGE_TAG=\"${IMAGE_TAG}\"|g" /etc/os-release && \
    sed -i -e "s|^IMAGE=.*|IMAGE=\"${IMAGE_REPO}:${IMAGE_TAG}\"|g" /etc/os-release && \
    elemental init --force elemental-rootfs,grub-config,dracut-config,cloud-config-essentials,elemental-setup
```

## Adding Custom Configuration Files

```dockerfile
FROM registry.suse.com/suse/sl-micro/6.1/baremetal-os-container:latest

# Sysctl tuning for Kubernetes nodes
COPY sysctl-kubernetes.conf /etc/sysctl.d/99-kubernetes.conf

# Custom NTP configuration
COPY chrony.conf /etc/chrony.conf

# Custom SSH daemon config
COPY sshd-custom.conf /etc/ssh/sshd_config.d/10-custom.conf

# Firewall setup script
COPY firewall-rules.sh /usr/local/bin/firewall-setup.sh
RUN chmod +x /usr/local/bin/firewall-setup.sh

ARG IMAGE_REPO=my-registry.example.com/elemental-os
ARG IMAGE_TAG=v1.2.0
RUN sed -i -e "s|^IMAGE_REPO=.*|IMAGE_REPO=\"${IMAGE_REPO}\"|g" /etc/os-release && \
    sed -i -e "s|^IMAGE_TAG=.*|IMAGE_TAG=\"${IMAGE_TAG}\"|g" /etc/os-release && \
    sed -i -e "s|^IMAGE=.*|IMAGE=\"${IMAGE_REPO}:${IMAGE_TAG}\"|g" /etc/os-release && \
    elemental init --force elemental-rootfs,grub-config,dracut-config,cloud-config-essentials,elemental-setup
```

## Integrating Monitoring Agents

```dockerfile
FROM registry.suse.com/suse/sl-micro/6.1/baremetal-os-container:latest

# Install Datadog agent from the official SUSE repository
RUN rpm --import https://keys.datadoghq.com/DATADOG_RPM_KEY_CURRENT.public && \
    zypper --non-interactive addrepo --refresh https://yum.datadoghq.com/suse/stable/7 datadog && \
    zypper --non-interactive install datadog-agent && \
    zypper clean -a

# Copy Datadog config
COPY datadog.yaml /etc/datadog-agent/datadog.yaml

# Enable Datadog
RUN systemctl enable datadog-agent

ARG IMAGE_REPO=my-registry.example.com/elemental-os
ARG IMAGE_TAG=v1.2.0
RUN sed -i -e "s|^IMAGE_REPO=.*|IMAGE_REPO=\"${IMAGE_REPO}\"|g" /etc/os-release && \
    sed -i -e "s|^IMAGE_TAG=.*|IMAGE_TAG=\"${IMAGE_TAG}\"|g" /etc/os-release && \
    sed -i -e "s|^IMAGE=.*|IMAGE=\"${IMAGE_REPO}:${IMAGE_TAG}\"|g" /etc/os-release && \
    elemental init --force elemental-rootfs,grub-config,dracut-config,cloud-config-essentials,elemental-setup
```

## Building and Publishing

```bash
# Build with version tag
docker build \
  --build-arg IMAGE_REPO=my-registry.example.com/elemental-os \
  --build-arg IMAGE_TAG=v1.2.0 \
  -t my-registry.example.com/elemental-os:v1.2.0 \
  -f Dockerfile.elemental-custom \
  .

# Run basic verification
docker run --rm my-registry.example.com/elemental-os:v1.2.0 \
  sh -c "grep '^IMAGE=' /etc/os-release && elemental --help >/dev/null"

# Push to registry
docker push my-registry.example.com/elemental-os:v1.2.0

# Create a 'latest' tag
docker tag my-registry.example.com/elemental-os:v1.2.0 \
           my-registry.example.com/elemental-os:latest
docker push my-registry.example.com/elemental-os:latest
```

## CI/CD Pipeline for OS Builds

```yaml
# .github/workflows/elemental-os-build.yaml
name: Build Elemental OS Image

on:
  push:
    branches: [main]
    paths:
      - 'Dockerfile.elemental-custom'
      - 'config/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Log in to registry
        uses: docker/login-action@v3
        with:
          registry: my-registry.example.com
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Build OS image
        run: |
          VERSION=$(git describe --tags --always)
          docker build \
            --build-arg IMAGE_REPO=my-registry.example.com/elemental-os \
            --build-arg IMAGE_TAG=${VERSION} \
            -t my-registry.example.com/elemental-os:${VERSION} \
            -f Dockerfile.elemental-custom \
            .

      - name: Push to registry
        run: |
          VERSION=$(git describe --tags --always)
          docker push my-registry.example.com/elemental-os:${VERSION}
```

## Conclusion

Customizing Elemental OS images using standard Dockerfile patterns gives you full flexibility to build the exact OS environment your nodes need. By treating OS images like application containers, you benefit from versioning, CI/CD pipelines, and registry management. This approach ensures all nodes run the exact same, tested OS image, eliminating configuration drift and making upgrades predictable and safe.
