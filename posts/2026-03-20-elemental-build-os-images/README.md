# How to Build Elemental OS Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elemental, Kubernetes, OS Images, Edge, Rancher

Description: A comprehensive guide to building custom Elemental OS images using the elemental-toolkit for deploying to bare metal and edge nodes.

## Introduction

Elemental OS images are immutable, container-based operating system images built from standard OCI images. The base image can be any Linux distribution compatible with the chosen Elemental flavor. These images are designed for edge and bare metal deployments where consistency and reproducibility are critical. The elemental-toolkit provides the tooling to build, customize, and publish OS images.

## Prerequisites

- Docker or Podman installed
- Access to a container registry
- `elemental` CLI installed (or use the container image)

## Installing the Elemental CLI

```bash
# Run the CLI as a container
docker run -it --rm \
  ghcr.io/rancher/elemental-toolkit/elemental-cli:latest \
  version

# Or build the CLI from source
git clone https://github.com/rancher/elemental-toolkit
cd elemental-toolkit
make build-cli
./build/elemental version
```

## Understanding Elemental Image Layers

Elemental OS images are built as OCI container images with a specific layer structure:

```text
Base OS Layer (compatible Linux distribution)
    └── Required boot components (kernel, initrd, grub2, dracut)
        └── Elemental toolkit components
            └── Custom packages and configuration
```

## Building a Basic OS Image

### Create a Dockerfile

```dockerfile
# Dockerfile.elemental
# Start from the official Elemental toolkit image
ARG OS_IMAGE=registry.opensuse.org/opensuse/tumbleweed
ARG OS_VERSION=latest
FROM ghcr.io/rancher/elemental-toolkit/elemental-cli:latest AS toolkit
FROM ${OS_IMAGE}:${OS_VERSION}

ARG REPO=my-registry.example.com/elemental-os
ARG VERSION=v1.0.0
ENV REPO=${REPO}
ENV VERSION=${VERSION}

# Install the packages required to make the image bootable with Elemental
RUN ARCH=$(uname -m); \
    if [[ "${ARCH}" != "riscv64" ]]; then \
      ADD_PKGS+=" shim"; \
      [[ "${ARCH}" == "aarch64" ]] && ARCH="arm64"; \
    fi; \
    zypper --non-interactive removerepo repo-update || true; \
    zypper --non-interactive --gpg-auto-import-keys install --no-recommends -- \
    kernel-default \
    device-mapper \
    dracut \
    grub2 \
    grub2-${ARCH}-efi \
    haveged \
    systemd \
    NetworkManager \
    openssh-server \
    openssh-clients \
    timezone \
    parted \
    e2fsprogs \
    dosfstools \
    mtools \
    xorriso \
    findutils \
    gptfdisk \
    rsync \
    squashfs \
    lvm2 \
    tar \
    gzip \
    vim \
    which \
    less \
    sudo \
    curl \
    sed \
    iproute2 \
    podman \
    audit \
    patterns-microos-selinux \
    btrfsprogs \
    btrfsmaintenance \
    snapper \
    xterm-resize \
    htop \
    ${ADD_PKGS} && \
    zypper clean --all

# Add the Elemental CLI and initialize the bootable image
COPY --from=toolkit /usr/bin/elemental /usr/bin/elemental
RUN systemctl enable NetworkManager.service && \
    systemctl enable sshd.service && \
    systemd-sysusers && \
    elemental --debug init --force

# Copy custom configuration files
COPY custom-config/ /etc/

# Set OS release information
RUN echo IMAGE_REPO=\"${REPO}\"             >> /etc/os-release && \
    echo IMAGE_TAG=\"${VERSION}\"           >> /etc/os-release && \
    echo IMAGE=\"${REPO}:${VERSION}\"       >> /etc/os-release && \
    echo TIMESTAMP="`date +'%Y%m%d%H%M%S'`" >> /etc/os-release && \
    echo GRUB_ENTRY_NAME=\"Elemental\"      >> /etc/os-release
```

```bash
# Build the container image
docker build \
  --build-arg REPO=my-registry.example.com/elemental-os \
  --build-arg VERSION=v1.0.0 \
  -t my-registry.example.com/elemental-os:v1.0.0 \
  -f Dockerfile.elemental \
  .

# Push to registry
docker push my-registry.example.com/elemental-os:v1.0.0
```

## Building with the ManagedOSVersionChannel

Define a channel to track OS versions:

```yaml
# os-version-channel.yaml
apiVersion: elemental.cattle.io/v1beta1
kind: ManagedOSVersionChannel
metadata:
  name: my-os-channel
  namespace: fleet-default
spec:
  # Sync interval
  syncInterval: 1h
  type: custom
  options:
    # Custom syncer image that outputs ManagedOSVersion JSON to /data/output
    image: "my-registry.example.com/elemental-os-channel:latest"
```

## Creating a ManagedOSVersion

```yaml
# managed-os-version.yaml
apiVersion: elemental.cattle.io/v1beta1
kind: ManagedOSVersion
metadata:
  labels:
    elemental.cattle.io/channel: my-os-channel
  name: elemental-v1.0.0
  namespace: fleet-default
spec:
  metadata:
    displayName: Custom Elemental OS v1.0.0
    upgradeImage: "my-registry.example.com/elemental-os:v1.0.0"
  type: container
  version: "v1.0.0"
```

## Customizing the OS Build

### Adding Custom Packages

```dockerfile
FROM my-registry.example.com/elemental-os:v1.0.0

# Add custom repository
RUN zypper addrepo https://packages.example.com/repo my-repo

# Install additional packages
RUN zypper --non-interactive --gpg-auto-import-keys install \
    jq \
    tcpdump \
    && zypper clean -a
```

### Adding Custom Systemd Services

```dockerfile
FROM my-registry.example.com/elemental-os:v1.0.0

# Copy custom systemd unit
COPY my-service.service /etc/systemd/system/

# Enable the service
RUN systemctl enable my-service.service
```

## Building ISO Images

To create bootable ISO images for initial provisioning:

```bash
# Use the elemental CLI to build an ISO
docker run --rm -ti -v $(pwd):/build \
  ghcr.io/rancher/elemental-toolkit/elemental-cli:latest \
  --debug \
  build-iso \
  --name elemental-custom \
  --bootloader-in-rootfs \
  -o /build \
  docker:my-registry.example.com/elemental-os:v1.0.0

# The ISO will be created in the current directory
ls -la elemental-custom.iso
```

## Validating the Image

```bash
# Inspect the image layers
docker inspect my-registry.example.com/elemental-os:v1.0.0

# Run a quick sanity check
docker run --rm my-registry.example.com/elemental-os:v1.0.0 \
  cat /etc/os-release
```

## Conclusion

Building custom Elemental OS images gives you complete control over the software stack deployed to your edge and bare metal nodes. By combining OCI container tooling with the Elemental operator's declarative model, you can version, test, and roll out OS changes with the same practices used for application containers.
