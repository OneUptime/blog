# How to Build Custom Talos Linux Images from Source

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Custom Images, Build from Source, Kubernetes, Immutable OS

Description: Learn how to build custom Talos Linux images from source code, including setting up the build toolchain, configuring build options, and producing bootable artifacts.

---

Talos Linux is a minimal, immutable operating system designed specifically for running Kubernetes. While the official releases cover most use cases, there are situations where you need to build images from source. Maybe you need to patch the kernel, include a custom extension, or simply want to understand the build process for contributing back to the project. Whatever your reason, building Talos from source is a well-documented and repeatable process once you know the steps.

In this guide, we will walk through the entire process of cloning the Talos repository, setting up the build environment, and compiling custom images that you can deploy to bare metal or virtual machines.

## Prerequisites

Before you start building, make sure your development machine meets these requirements:

- A Linux machine or VM with at least 8 GB of RAM and 50 GB of free disk space
- Docker installed and running (the build process uses containerized builds)
- Go 1.21 or later installed
- Make installed
- Git installed

You will also want `talosctl` available for testing the generated images.

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Verify installation
talosctl version --client
```

## Cloning the Repository

Start by cloning the official Talos Linux repository from GitHub.

```bash
# Clone the Talos repository
git clone https://github.com/siderolabs/talos.git
cd talos

# Check out a specific release tag if you want a stable base
git checkout v1.7.0
```

The repository is organized into several key directories. The `internal` directory contains the core system components. The `pkg` directory holds shared packages. The `hack` directory has build scripts and utilities. Understanding this layout helps when you need to make modifications later.

## Understanding the Build System

Talos uses a Makefile-driven build system that leverages Docker for reproducible builds. The build process compiles everything inside containers, so your host system does not need most build dependencies beyond Docker and Make.

The key build targets you should know about are:

```bash
# List all available make targets
make help
```

The most important targets include `kernel` for building the Linux kernel, `initramfs` for the initial RAM filesystem, `installer` for the installer image, and `talosctl` for the CLI tool.

## Building the Installer Image

The installer image is what you use to install Talos on a machine. Building it from source gives you complete control over what goes into the image.

```bash
# Build the installer image
make installer

# This produces a Docker image tagged as:
# ghcr.io/siderolabs/installer:latest
```

The build process takes some time on the first run because it needs to download base images and compile the kernel. Subsequent builds are faster thanks to Docker layer caching.

## Building Individual Components

Sometimes you do not need a full image. You might want to build specific components for testing.

```bash
# Build just the kernel
make kernel

# Build the initramfs
make initramfs

# Build talosctl from source
make talosctl

# Build all container images
make images
```

Building individual components is useful during development when you are iterating on a specific part of the system.

## Customizing the Build

The build system accepts several environment variables that let you customize the output.

```bash
# Set a custom image tag
export TAG=my-custom-v1.7.0

# Set the container registry
export REGISTRY=my-registry.example.com

# Build with custom tag and registry
make installer TAG=${TAG} REGISTRY=${REGISTRY}
```

You can also modify the build configuration by editing files in the `hack` directory. The `Makefile` at the root of the project references these configurations.

## Building ISO Images

If you need a bootable ISO for bare metal installations, the build system can produce those as well.

```bash
# Build the ISO image
make iso

# The ISO will be output to _out/talos-amd64.iso
ls -la _out/
```

The ISO includes the Talos installer and can be written to a USB drive or mounted in a virtual machine for installation.

## Building for Different Architectures

Talos supports both AMD64 and ARM64 architectures. You can cross-compile images for either platform.

```bash
# Build for ARM64
make installer ARCH=arm64

# Build for AMD64 (default)
make installer ARCH=amd64

# Build ISO for ARM64
make iso ARCH=arm64
```

Cross-compilation requires QEMU user-mode emulation if you are building on a different architecture than the target.

```bash
# Set up QEMU for cross-platform builds
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

## Including Custom Patches

One of the main reasons to build from source is to include custom patches. You can apply patches to the kernel, the init system, or any other component.

```bash
# Create a patch directory
mkdir -p patches/kernel

# Add your kernel patches
cp my-custom-driver.patch patches/kernel/

# The build system will automatically apply patches from this directory
make kernel
```

For more structured changes, create a Git branch and make your modifications directly.

```bash
# Create a feature branch
git checkout -b custom-modifications

# Make your changes to the source
# Edit files as needed

# Build with your changes
make installer
```

## Testing Your Custom Image

After building, you should test the image before deploying it to production. The easiest way is to use a local VM.

```bash
# Create a test cluster using your custom installer
talosctl cluster create \
  --install-image=ghcr.io/siderolabs/installer:latest \
  --nodes 3

# Check the cluster status
talosctl cluster show
```

If you are using QEMU or libvirt, you can boot from the ISO directly.

```bash
# Create a VM with the custom ISO
qemu-system-x86_64 \
  -m 4096 \
  -cpu host \
  -enable-kvm \
  -cdrom _out/talos-amd64.iso \
  -boot d \
  -drive file=talos-disk.img,format=qcow2,if=virtio \
  -net nic -net user
```

## Pushing Images to a Registry

Once you are satisfied with your custom build, push the images to a container registry so they can be used across your infrastructure.

```bash
# Login to your registry
docker login my-registry.example.com

# Push the installer image
docker push my-registry.example.com/installer:my-custom-v1.7.0

# Push additional images if needed
docker push my-registry.example.com/talos:my-custom-v1.7.0
```

## Automating the Build Process

For production workflows, consider automating the build using CI/CD pipelines. Here is a basic GitHub Actions example.

```yaml
# .github/workflows/build-talos.yml
name: Build Custom Talos
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build installer
        run: make installer TAG=${{ github.sha }}
      - name: Push to registry
        run: |
          docker login -u ${{ secrets.REGISTRY_USER }} -p ${{ secrets.REGISTRY_PASS }} registry.example.com
          docker push registry.example.com/installer:${{ github.sha }}
```

## Troubleshooting Common Build Issues

A few common issues you might encounter during the build process:

If the build fails with out-of-memory errors, increase Docker's memory allocation. The kernel compilation in particular can use a lot of RAM. At least 8 GB is recommended for Docker.

If you see permission errors, make sure your user is in the `docker` group or run the build with appropriate privileges.

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Log out and back in, then try again
make installer
```

If the build cache becomes corrupted, you can clean it and start fresh.

```bash
# Clean all build artifacts
make clean

# Remove Docker build cache
docker builder prune -a

# Start a fresh build
make installer
```

## Conclusion

Building Talos Linux from source gives you full control over every component in your Kubernetes infrastructure OS. While the official releases work great for most deployments, the ability to customize the build opens up possibilities for specialized hardware support, custom security configurations, and deep integration with your specific environment. The containerized build system makes the process reproducible and straightforward, so you can maintain custom builds with confidence across your entire fleet.
