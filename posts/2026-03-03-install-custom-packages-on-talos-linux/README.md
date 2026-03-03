# How to Install Custom Packages on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, System Extensions, Custom Packages, Kubernetes, Container Runtime, Immutable OS

Description: Guide to installing custom packages and system extensions on Talos Linux, an immutable operating system without a package manager.

---

If you come from a traditional Linux background, your instinct when you need a tool or library on a server is to run `apt install` or `yum install`. Talos Linux does not have a package manager. There is no apt, no yum, no dnf, and no pacman. The operating system is immutable, meaning the root filesystem is read-only and cannot be modified at runtime.

So how do you install custom packages? The answer is system extensions, and this guide shows you how to use them.

## Why Talos Does Not Have a Package Manager

Talos Linux is designed around the principle that the operating system should be minimal and immutable. Every Talos node runs the exact same base image, which contains only what is needed to run Kubernetes. This approach eliminates configuration drift (where servers gradually diverge from each other), reduces the attack surface, and makes upgrades predictable.

A package manager would undermine all of these benefits. If administrators could install arbitrary packages, each node would eventually become unique, making troubleshooting and upgrades much harder.

## System Extensions: The Talos Way

System extensions are the official mechanism for adding functionality to Talos Linux. They are OCI (container) images that get layered onto the base Talos image at install or upgrade time. Extensions become part of the OS image, surviving reboots and running at the same level as the base system.

Extensions are available for things like:

- Additional kernel modules (for specific hardware)
- Storage drivers (iSCSI, Ceph, ZFS)
- Network tools and drivers
- GPU drivers (NVIDIA)
- Monitoring agents
- Custom firmware

## Finding Available Extensions

Sidero Labs maintains an official extensions repository. You can browse available extensions:

```bash
# List available official extensions using crane
crane ls ghcr.io/siderolabs/extensions

# Or check the GitHub repository
# https://github.com/siderolabs/extensions
```

Some commonly used extensions include:

- `siderolabs/iscsi-tools` - iSCSI initiator tools for storage
- `siderolabs/nvidia-container-toolkit` - NVIDIA GPU support
- `siderolabs/qemu-guest-agent` - QEMU/KVM guest agent
- `siderolabs/intel-ucode` - Intel CPU microcode updates
- `siderolabs/gvisor` - gVisor container runtime

## Installing Extensions via Machine Configuration

The most common way to add extensions is through the machine configuration. You specify which extensions to include, and Talos installs them during the next upgrade or reinstall:

```yaml
# In your machine configuration
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.4
      - image: ghcr.io/siderolabs/qemu-guest-agent:v8.2.0
```

After updating the configuration, apply it and trigger an upgrade:

```bash
# Apply the updated configuration
talosctl apply-config --nodes 192.168.1.10 --file config.yaml

# Trigger an upgrade to install the extensions
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

The upgrade process rebuilds the node image with the specified extensions included.

## Using the Image Factory

Sidero Labs provides an Image Factory service that creates custom Talos images with extensions pre-baked. This is particularly useful for initial installations:

```bash
# Generate a custom image with extensions using the image factory
# Visit https://factory.talos.dev to create a custom image

# You can also use the imager tool locally
docker run --rm -t -v /tmp:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4 \
  --system-extension-image ghcr.io/siderolabs/qemu-guest-agent:v8.2.0 \
  metal
```

This produces an ISO or disk image that already includes the extensions. When you boot a node from this image, the extensions are available immediately without needing a separate upgrade step.

## Building Custom Extensions

If the official extension you need does not exist, you can build your own. Extensions are just OCI images with a specific directory structure:

```dockerfile
# Dockerfile for a custom extension
FROM scratch

# Extension metadata
COPY manifest.yaml /
# Extension files that will be overlaid onto the root filesystem
COPY rootfs/ /rootfs/
```

The `manifest.yaml` describes the extension:

```yaml
version: v1alpha1
metadata:
  name: my-custom-extension
  version: 1.0.0
  author: Your Name
  description: A custom extension for Talos Linux
  compatibility:
    talos:
      version: ">= v1.6.0"
```

The `rootfs` directory contains files that will be placed on the Talos filesystem:

```
rootfs/
  usr/
    local/
      bin/
        my-tool
      lib/
        libcustom.so
```

Build and push the extension:

```bash
# Build the extension image
docker build -t ghcr.io/myorg/my-extension:v1.0.0 .

# Push to a container registry
docker push ghcr.io/myorg/my-extension:v1.0.0
```

Then include it in your machine configuration like any other extension.

## Adding Kernel Modules

Some software requires specific kernel modules that are not included in the default Talos kernel. Extensions can provide these:

```yaml
machine:
  install:
    extensions:
      # Add the drbd kernel module for LINBIT/LINSTOR storage
      - image: ghcr.io/siderolabs/drbd:9.2.0-v1.7.0
  kernel:
    modules:
      - name: drbd
```

The `kernel.modules` section tells Talos to load the specified modules at boot time.

## Verifying Installed Extensions

After installing extensions, verify they are present:

```bash
# List installed extensions
talosctl get extensions --nodes 192.168.1.10

# Check extension details
talosctl get extensions --nodes 192.168.1.10 -o yaml
```

The output shows each installed extension, its version, and its status.

## Running Custom Software as Containers

For many use cases, you do not need a system extension at all. If your software runs in a container, you can deploy it through Kubernetes:

```yaml
# Deploy custom software as a DaemonSet to run on every node
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: my-agent
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: my-agent
  template:
    metadata:
      labels:
        app: my-agent
    spec:
      containers:
        - name: agent
          image: myorg/my-agent:latest
          securityContext:
            privileged: true
          volumeMounts:
            - name: host-root
              mountPath: /host
              readOnly: true
      volumes:
        - name: host-root
          hostPath:
            path: /
```

This approach works for monitoring agents, log collectors, and other tools that need to run on every node but do not need to be part of the base OS.

## Extension Version Compatibility

Extensions must be compatible with your Talos version. Each extension specifies which Talos versions it supports. Using an incompatible extension will cause the upgrade to fail:

```bash
# Check extension compatibility before upgrading
crane manifest ghcr.io/siderolabs/iscsi-tools:v0.1.4 | jq .
```

When upgrading Talos, always check that updated extension versions are available for the new Talos version.

## Common Extension Scenarios

### Adding iSCSI Support for Storage

```yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.4
```

Required for storage solutions like Longhorn, OpenEBS, and democratic-csi.

### Adding NVIDIA GPU Support

```yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/nvidia-container-toolkit:535.104.05-v1.14.1
      - image: ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules:535.104.05
```

Required for running GPU workloads on nodes with NVIDIA GPUs.

### Adding Guest Agent for Virtual Machines

```yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/qemu-guest-agent:v8.2.0
```

Provides better integration with QEMU/KVM hypervisors, including graceful shutdown support.

## Conclusion

Installing custom packages on Talos Linux requires a different mindset than traditional Linux distributions. Instead of installing packages at runtime, you build them into the OS image through system extensions. This approach maintains the immutability and consistency that make Talos Linux reliable. For software that does not need OS-level integration, running it as a Kubernetes workload is the simpler path. Between system extensions and containerized workloads, you can run virtually anything on Talos Linux without compromising its security model.
