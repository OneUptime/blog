# How to List Available System Extensions for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, System Extensions, Kubernetes, Infrastructure, Configuration

Description: A complete guide to discovering and listing available system extensions for Talos Linux, including official extensions, community extensions, and how to find the right ones for your needs.

---

One of the defining features of Talos Linux is its minimal footprint. The base OS includes only what is needed to run Kubernetes, and everything else is added through system extensions. This keeps the attack surface small and the OS predictable. But it also means you need to know what extensions are available and how to find them. This post covers everything about discovering and listing system extensions for Talos Linux.

## What Are System Extensions?

System extensions in Talos Linux are OCI (Open Container Initiative) images that add functionality to the base OS. They can include kernel modules, firmware, system services, and other components that run at the OS level rather than in containers.

Unlike Kubernetes add-ons that run as pods, system extensions operate below the container runtime. They become part of the OS itself when the node boots. This makes them ideal for things like:

- Storage drivers (iSCSI, ZFS, DRBD)
- Network drivers and VPN clients (Tailscale)
- GPU drivers (NVIDIA)
- Virtualization guest agents (QEMU guest agent, VMware tools)
- Container runtime handlers (gVisor, Kata Containers)
- Custom kernel modules

## Listing Official Extensions

The primary source for Talos Linux system extensions is the official Siderolabs extensions repository on GitHub. You can browse it directly or use command-line tools.

### Method 1: GitHub Repository

The official extensions repository is at `github.com/siderolabs/extensions`. You can browse it to see all available extensions:

```bash
# Clone the extensions repository to browse locally

git clone https://github.com/siderolabs/extensions.git
ls extensions/
```

Each directory in the repository represents an extension with its build configuration and documentation.

### Method 2: Container Registry

Extensions are published as OCI images to the GitHub Container Registry. You can list them using container tools:

```bash
# List available extension images using crane
# Install crane: go install github.com/google/go-containerregistry/cmd/crane@latest

# List tags for a specific extension
crane ls ghcr.io/siderolabs/iscsi-tools

# List tags for the NVIDIA extensions
crane ls ghcr.io/siderolabs/nvidia-container-toolkit

# List tags for Tailscale
crane ls ghcr.io/siderolabs/tailscale
```

### Method 3: Image Factory

The Talos Image Factory at `factory.talos.dev` provides an interactive way to discover extensions and build custom Talos images with them included:

```bash
# The Image Factory provides a web interface and API
# Web: https://factory.talos.dev
# API reference: https://github.com/siderolabs/image-factory/blob/main/docs/api.md

# Query supported Talos versions via the API
curl -s https://factory.talos.dev/versions | jq .

# List the official extensions available for a specific Talos version
curl -s https://factory.talos.dev/version/v1.7.0/extensions/official | jq .
```

### Method 4: Check Installed Extensions

On a running Talos node, you can see which extensions are currently installed:

```bash
# List installed extensions on a node
talosctl -n 192.168.1.10 get extensions

# Get detailed information about installed extensions
talosctl -n 192.168.1.10 get extensions -o yaml
```

## Categories of Available Extensions

Extensions fall into several categories. Here is a comprehensive list of the major ones available:

### Storage Extensions

```bash
# iSCSI tools for network storage
ghcr.io/siderolabs/iscsi-tools

# ZFS filesystem support
ghcr.io/siderolabs/zfs

# DRBD for distributed replicated storage
ghcr.io/siderolabs/drbd

# Utilities for storage management
ghcr.io/siderolabs/util-linux-tools
```

### GPU Extensions

```bash
# NVIDIA container toolkit
ghcr.io/siderolabs/nvidia-container-toolkit

# NVIDIA open kernel modules
ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules

# NVIDIA proprietary drivers
ghcr.io/siderolabs/nonfree-kmod-nvidia
```

### Networking Extensions

```bash
# Tailscale VPN
ghcr.io/siderolabs/tailscale

# Thunderbolt/networking drivers
ghcr.io/siderolabs/thunderbolt
```

### Virtualization Guest Agents

```bash
# QEMU guest agent
ghcr.io/siderolabs/qemu-guest-agent

# VMware (talos-vmtoolsd)
ghcr.io/siderolabs/vmtoolsd-guest-agent

# Xen guest agent
ghcr.io/siderolabs/xen-guest-agent
```

### Container Runtime Extensions

```bash
# gVisor runtime
ghcr.io/siderolabs/gvisor

# Kata Containers runtime
ghcr.io/siderolabs/kata-containers

# Stargz snapshotter for lazy-loading images
ghcr.io/siderolabs/stargz-snapshotter

# WasmEdge runtime for WebAssembly containers
ghcr.io/siderolabs/wasmedge
```

### Firmware

```bash
# Intel microcode updates
ghcr.io/siderolabs/intel-ucode

# AMD microcode updates
ghcr.io/siderolabs/amd-ucode

# Device-specific firmware packages, for example:
ghcr.io/siderolabs/amdgpu-firmware
ghcr.io/siderolabs/chelsio-firmware
ghcr.io/siderolabs/intel-ice-firmware
ghcr.io/siderolabs/qlogic-firmware
ghcr.io/siderolabs/realtek-firmware
```

### Monitoring and Utilities

```bash
# USB modem support
ghcr.io/siderolabs/usb-modem-drivers

# Nut UPS monitoring (network-ups-tools upsmon)
ghcr.io/siderolabs/nut-client
```

## Checking Extension Compatibility

Not all extensions work with every version of Talos. Extension tag conventions vary by extension type: kernel-module extensions (such as `btrfs`, `thunderbolt`, `zfs`, `drbd`) are built against a specific Talos kernel and carry a `-v<talos-version>` suffix, while userspace tools and firmware extensions use their own upstream or date-based versions (for example, `tailscale:1.62.1`, `intel-ucode:20240312`). The Image Factory always returns the correct, compatible tag for a given Talos version:

```bash
# Check your Talos version
talosctl -n 192.168.1.10 version

# Ask the Image Factory which tag is compatible with your Talos version
curl -s https://factory.talos.dev/version/v1.7.0/extensions/official | \
  jq '.[] | select(.name=="siderolabs/iscsi-tools") | .ref'

# You can also list all tags for an extension directly from the registry
crane ls ghcr.io/siderolabs/iscsi-tools
```

In modern Talos (v1.5+), extensions are baked into the installer image via the Image Factory rather than declared in the machine config. The legacy `machine.install.extensions` field is deprecated and has no effect in Talos v1.10+. The recommended approach is to reference an Image Factory installer that already contains your extensions:

```yaml
machine:
  install:
    # An installer image built by the Image Factory with the
    # selected extensions baked in.
    image: factory.talos.dev/installer/<schematic-id>:v1.7.0
```

## Using the Image Factory to Explore Extensions

The Talos Image Factory is the most user-friendly way to discover and configure extensions. It provides:

1. A list of all available extensions for your Talos version
2. The ability to select extensions and generate a custom installer image
3. A schematic ID that encodes your extension selections for reproducibility

```bash
# Using the Image Factory API to list extensions
# Get available extensions for a specific Talos version
curl -s https://factory.talos.dev/version/v1.7.0/extensions/official | jq .

# Create a schematic with specific extensions
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/json" \
  -d '{
    "customization": {
      "systemExtensions": {
        "officialExtensions": [
          "siderolabs/iscsi-tools",
          "siderolabs/tailscale"
        ]
      }
    }
  }'
```

The API returns a schematic ID that you can use to reference this specific combination of extensions:

```bash
# Use the schematic to generate an installer
# factory.talos.dev/installer/<schematic-id>:v1.7.0
```

## Inspecting Extension Details

Before installing an extension, you may want to inspect what it contains:

```bash
# Inspect extension manifest (use a tag that actually exists for the extension)
crane manifest ghcr.io/siderolabs/iscsi-tools:v0.1.4 | jq .

# Pull and examine the extension contents
crane export ghcr.io/siderolabs/iscsi-tools:v0.1.4 - | tar -tf -
```

This shows you exactly what files the extension will add to the system.

## Searching for Specific Functionality

If you know what you need but are not sure which extension provides it, you have several options:

```bash
# Search the extensions repository on GitHub
# github.com/siderolabs/extensions - use the search feature

# Check the Talos documentation
# talos.dev/docs - the documentation lists extensions for common use cases

# Search GitHub container registry
# Look at the siderolabs organization packages
# github.com/orgs/siderolabs/packages
```

## Creating a Custom Extension List

For your cluster, maintain a documented list of required extensions:

```yaml
# cluster-extensions.yaml - Document your extension requirements

# Storage
extensions:
  - name: iscsi-tools
    image: ghcr.io/siderolabs/iscsi-tools
    purpose: "Required for Longhorn and iSCSI-based storage"

  - name: zfs
    image: ghcr.io/siderolabs/zfs
    purpose: "Required for OpenEBS with ZFS backend"

  # GPU (worker nodes only)
  - name: nvidia-container-toolkit
    image: ghcr.io/siderolabs/nvidia-container-toolkit
    purpose: "Required for GPU workloads on ML nodes"

  # Networking
  - name: tailscale
    image: ghcr.io/siderolabs/tailscale
    purpose: "Mesh VPN for cross-datacenter connectivity"

  # Monitoring
  - name: qemu-guest-agent
    image: ghcr.io/siderolabs/qemu-guest-agent
    purpose: "VM management integration for Proxmox"
```

## Best Practices

1. **Only install what you need** - Each extension increases the OS footprint and potential attack surface. Only add extensions that are actually required for your workloads.

2. **Pin extension versions** - Always use specific version tags rather than `latest` to ensure reproducibility.

3. **Test in staging** - Before adding an extension to production nodes, test it in a non-critical environment.

4. **Document your extensions** - Maintain a list of which extensions you use and why. This helps future team members understand the cluster configuration.

5. **Check compatibility** - When upgrading Talos, verify that all your extensions have compatible versions available for the new Talos release.

Knowing what extensions are available and how to find them is fundamental to getting the most out of Talos Linux. The minimal base OS combined with a rich extension ecosystem gives you the flexibility to build exactly the infrastructure you need without unnecessary bloat.
