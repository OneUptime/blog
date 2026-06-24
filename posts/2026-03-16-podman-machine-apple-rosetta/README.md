# How to Configure Podman Machine with Apple Rosetta Translation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps, Apple Silicon, Rosetta

Description: Learn how to enable Apple Rosetta translation in Podman machines to run x86_64 containers natively on Apple Silicon Macs with near-native performance.

---

> Rosetta translation lets you run x86_64 container images on Apple Silicon Macs at near-native speed, eliminating slow QEMU emulation.

Apple Silicon Macs use ARM architecture, but many container images are still built only for x86_64. Without Rosetta, Podman uses QEMU emulation to run these images, which is significantly slower. Enabling Rosetta translation inside the Podman machine provides dramatically better performance for x86_64 workloads. This guide shows you how to set it up.

---

## Prerequisites

Rosetta support in Podman machines requires:

- An Apple Silicon Mac (M1, M2, M3, or M4 series)
- macOS 13 (Ventura) or later
- Podman 5.1 or later
- Rosetta 2 installed on the host

Podman 5.6 and later disabled Rosetta by default because of compatibility issues with newer Linux kernels, so you must explicitly opt in only on macOS and Podman machine images where Rosetta is supported.

```bash
# Install Rosetta 2 if not already installed

softwareupdate --install-rosetta --agree-to-license

# Verify Rosetta is installed
pkgutil --pkg-info com.apple.pkg.RosettaUpdateAuto
```

## Creating a Machine with Rosetta Enabled

Initialize a new Podman machine with Rosetta translation support. Add the machine settings to `~/.config/containers/containers.conf` before creating the machine:

```toml
[machine]
provider = "applehv"
rosetta = true
```

```bash
# Create a machine using Apple Virtualization Framework
podman machine init --provider applehv rosetta-machine

# Start the machine
podman machine start rosetta-machine
```

The `rosetta = true` machine setting configures the machine to use Apple's Rosetta binary translation for x86_64 binaries when the AppleHV provider supports it.

## Enabling Rosetta on an Existing Machine

To enable Rosetta on an already initialized machine, you need to stop it, remove it, and reinitialize it after setting `rosetta = true`, since `podman machine set` does not support a Rosetta option.

```toml
[machine]
provider = "applehv"
rosetta = true
```

```bash
# Stop and remove the machine
podman machine stop my-machine
podman machine rm my-machine

# Reinitialize with Rosetta enabled
podman machine init --provider applehv my-machine

# Start the machine
podman machine start my-machine
```

## Verifying Rosetta Is Active

Confirm that Rosetta translation is working inside the machine.

```bash
# Inspect the machine's Rosetta setting
podman machine inspect --format "{{.Rosetta}}" my-machine

# Check if binfmt is configured for x86_64
podman machine ssh my-machine -- cat /proc/sys/fs/binfmt_misc/rosetta
```

If Rosetta is properly configured, you will see the Rosetta binary translator registered for x86_64 binaries.

## Running x86_64 Containers

With Rosetta enabled, you can run x86_64 images with the `--platform` flag:

```bash
# Pull and run an x86_64 image
podman run --platform linux/amd64 -it --rm ubuntu:22.04 bash

# Inside the container, verify the architecture
# uname -m
# This shows x86_64, but running via Rosetta translation

# Run an x86_64 specific application
podman run --platform linux/amd64 -d --name legacy-app my-x86-image
```

## Performance Comparison

Rosetta provides significantly better performance than QEMU emulation.

```bash
# Test with Rosetta (fast)
time podman run --platform linux/amd64 --rm ubuntu:22.04 bash -c "
    apt-get update -qq > /dev/null 2>&1
    echo 'Package update completed'
"

# Compare: To use QEMU emulation instead, you would disable Rosetta
```

## Multi-Architecture Workflows

Rosetta makes it easy to work with multi-architecture images:

```bash
# Pull both ARM and x86 versions of an image
podman pull --platform linux/arm64 nginx
podman pull --platform linux/amd64 nginx

# Run the x86 version (uses Rosetta)
podman run --platform linux/amd64 -d --name nginx-x86 -p 8080:80 nginx

# Run the ARM version (native)
podman run --platform linux/arm64 -d --name nginx-arm -p 8081:80 nginx

# Both run simultaneously with good performance
```

## Building x86_64 Images

Rosetta also improves the speed of building x86_64 images:

```bash
# Build an x86_64 image on Apple Silicon
podman build --platform linux/amd64 -t myapp:amd64 .

# Build a multi-architecture image
podman build --platform linux/amd64,linux/arm64 --manifest myapp:latest .
```

## Disabling Rosetta

If you need to disable Rosetta and fall back to QEMU emulation, you need to recreate the machine with `rosetta = false`:

```toml
[machine]
provider = "applehv"
rosetta = false
```

```bash
# Stop and remove the machine
podman machine stop my-machine
podman machine rm my-machine

# Reinitialize without Rosetta
podman machine init my-machine

# Start the machine
podman machine start my-machine
```

## Troubleshooting

Common issues when using Rosetta with Podman:

```bash
# Issue: Rosetta mount not available
# Solution: Ensure the machine uses Apple Virtualization Framework
podman machine inspect --format "{{.ConfigDir.Path}}" my-machine
# The path should include "applehv" for Apple Virtualization Framework

# Issue: exec format error when running x86_64 images
# Solution: Check if Rosetta binfmt is registered
podman machine ssh my-machine -- cat /proc/sys/fs/binfmt_misc/rosetta

# Issue: Rosetta not installed on host
softwareupdate --install-rosetta --agree-to-license

# Issue: Machine was created with QEMU backend
# Solution: Create a new machine with Apple Virtualization Framework
podman machine init --provider applehv new-machine
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman machine init --provider applehv <name>` | Create a machine with AppleHV |
| `rosetta = true` in `[machine]` in `containers.conf` | Enable Rosetta for new machines |
| `podman run --platform linux/amd64 ...` | Run x86_64 container |

## Summary

Apple Rosetta translation in Podman machines provides near-native performance when running x86_64 containers on Apple Silicon Macs. Enable it with the `rosetta = true` machine setting before machine initialization. To change the Rosetta setting on an existing machine, you must recreate it. This is essential for developers on Apple Silicon who need to work with x86_64-only container images, providing a dramatic speedup over QEMU emulation.
