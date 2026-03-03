# How to Include Custom Kernel Modules via Image Factory

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Factory, Kernel Modules, Drivers, System Extensions

Description: Learn how to include custom kernel modules in Talos Linux images using Image Factory for hardware drivers, filesystem support, and networking features.

---

Talos Linux ships with a kernel that includes a broad set of built-in modules, but it cannot cover every possible hardware configuration or use case. When you need a driver for a specific network card, storage controller, or filesystem, you need to add a custom kernel module. Image Factory makes this possible through system extensions that package kernel modules alongside the Talos image.

This guide explains how kernel modules work in Talos Linux, which extensions provide additional modules, and how to include them in your custom images.

## Kernel Modules in Talos Linux

Unlike traditional Linux distributions where you can install kernel modules with package managers, Talos Linux is immutable. The root filesystem is read-only, and there is no package manager. Kernel modules must be included in the OS image at build time through system extensions.

Each system extension that provides kernel modules is compiled against the exact kernel version in the Talos release. This tight coupling ensures compatibility and stability, but it also means that you cannot simply download a kernel module from the internet and load it on a running system.

## Finding Extensions with Kernel Modules

Many official Talos extensions provide kernel modules. Here are the most common categories:

### Network Drivers

```yaml
# Network driver extensions
customization:
  systemExtensions:
    officialExtensions:
      # Broadcom NetXtreme II drivers
      - siderolabs/bnx2-bnx2x
      # Realtek network firmware
      - siderolabs/realtek-firmware
      # Thunderbolt networking
      - siderolabs/thunderbolt
```

These are essential when your servers have network cards that are not supported by the default Talos kernel. Broadcom and Realtek NICs are common in enterprise servers and consumer hardware respectively.

### Storage Drivers

```yaml
# Storage-related kernel modules
customization:
  systemExtensions:
    officialExtensions:
      # ZFS filesystem support
      - siderolabs/zfs
      # DRBD distributed replicated block device
      - siderolabs/drbd
      # iSCSI tools (includes kernel modules)
      - siderolabs/iscsi-tools
```

ZFS support is particularly popular for storage-intensive workloads. The ZFS extension includes the kernel module and the userspace tools needed to create and manage ZFS pools.

### GPU Drivers

```yaml
# GPU kernel modules
customization:
  systemExtensions:
    officialExtensions:
      # NVIDIA open-source GPU kernel modules
      - siderolabs/nvidia-open-gpu-kernel-modules
      # NVIDIA container toolkit (for GPU passthrough to containers)
      - siderolabs/nvidia-container-toolkit
```

NVIDIA GPU support requires both the kernel module for hardware access and the container toolkit for exposing GPUs to Kubernetes pods.

### Firmware and Microcode

```yaml
# CPU and hardware firmware
customization:
  systemExtensions:
    officialExtensions:
      # Intel CPU microcode updates
      - siderolabs/intel-ucode
      # AMD CPU microcode updates
      - siderolabs/amd-ucode
      # Intel i915 GPU firmware
      - siderolabs/i915-ucode
```

While technically not kernel modules in the traditional sense, firmware extensions are loaded early in the boot process and are essential for hardware stability and security.

## Building an Image with Kernel Module Extensions

Let's build a practical example for a server with NVIDIA GPUs and ZFS storage:

```yaml
# gpu-storage-schematic.yaml
# Schematic for GPU compute nodes with ZFS storage
customization:
  systemExtensions:
    officialExtensions:
      # CPU firmware
      - siderolabs/intel-ucode
      # NVIDIA GPU support
      - siderolabs/nvidia-open-gpu-kernel-modules
      - siderolabs/nvidia-container-toolkit
      # ZFS storage
      - siderolabs/zfs
      # iSCSI for network storage
      - siderolabs/iscsi-tools
  extraKernelArgs:
    # Enable IOMMU for GPU passthrough
    - intel_iommu=on
    - iommu=pt
```

Generate the image:

```bash
# Submit the schematic
SCHEMATIC_ID=$(curl -s -X POST \
  --data-binary @gpu-storage-schematic.yaml \
  https://factory.talos.dev/schematics | jq -r '.id')

TALOS_VERSION="v1.7.0"

# Generate machine config with the custom installer
talosctl gen config gpu-cluster https://10.0.0.1:6443 \
  --install-image factory.talos.dev/installer/${SCHEMATIC_ID}:${TALOS_VERSION}
```

## Verifying Kernel Modules After Boot

Once your node is running with the custom image, verify that the kernel modules are loaded:

```bash
# List all loaded kernel modules
talosctl read /proc/modules --nodes 10.0.0.50

# Check for specific modules
talosctl read /proc/modules --nodes 10.0.0.50 | grep nvidia
talosctl read /proc/modules --nodes 10.0.0.50 | grep zfs

# Check extension status
talosctl get extensions --nodes 10.0.0.50

# View kernel messages related to module loading
talosctl dmesg --nodes 10.0.0.50 | grep -i "module"
```

## NVIDIA GPU Setup

After the NVIDIA kernel modules are loaded, you need to configure Kubernetes to use the GPUs:

```bash
# Verify NVIDIA devices are detected
talosctl read /proc/driver/nvidia/version --nodes 10.0.0.50

# Deploy the NVIDIA device plugin to expose GPUs to Kubernetes
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/main/nvidia-device-plugin.yml

# Verify GPU resources are available
kubectl get nodes -o json | jq '.items[].status.capacity["nvidia.com/gpu"]'
```

The machine configuration also needs to allow the NVIDIA runtime. Add this to your machine config:

```yaml
# Machine config patch for NVIDIA support
machine:
  kernel:
    modules:
      - name: nvidia
      - name: nvidia_uvm
      - name: nvidia_drm
      - name: nvidia_modeset
  sysctls:
    # Required for NVIDIA container runtime
    net.core.bpf_jit_enable: "1"
```

## ZFS Configuration

With the ZFS kernel module loaded, you can create ZFS pools through machine configuration:

```bash
# Verify ZFS module is loaded
talosctl read /proc/modules --nodes 10.0.0.50 | grep zfs

# Check ZFS version
talosctl read /sys/module/zfs/version --nodes 10.0.0.50
```

ZFS pools and datasets are typically managed by storage operators running in Kubernetes, such as OpenEBS with the ZFS LocalPV provisioner.

## Working with DRBD

DRBD (Distributed Replicated Block Device) provides network-based disk replication. It is commonly used with LINSTOR for Kubernetes persistent storage:

```yaml
# drbd-schematic.yaml
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/drbd
      - siderolabs/iscsi-tools
```

After deploying with this schematic, the DRBD kernel module will be available for LINSTOR or Piraeus to use:

```bash
# Verify DRBD module
talosctl read /proc/modules --nodes 10.0.0.50 | grep drbd

# Check DRBD version
talosctl dmesg --nodes 10.0.0.50 | grep -i drbd
```

## Kernel Module Loading Order

Talos loads kernel modules in a specific order during boot. System extension modules are loaded after the built-in modules but before Kubernetes starts. You can control which modules are loaded and their parameters through the machine configuration:

```yaml
# Machine config section for kernel module configuration
machine:
  kernel:
    modules:
      - name: zfs
      - name: nvidia
        parameters:
          - "NVreg_OpenRmEnableUnsupportedGpus=1"
      - name: drbd
        parameters:
          - "minor_count=32"
```

The `modules` section tells Talos which modules to load explicitly. Parameters are passed to the module at load time.

## Troubleshooting Kernel Module Issues

### Module Not Loading

If a kernel module is not loading, check these common causes:

```bash
# Check dmesg for module loading errors
talosctl dmesg --nodes 10.0.0.50 | grep -i error

# Verify the extension is installed
talosctl get extensions --nodes 10.0.0.50

# Check if the module file exists
talosctl ls /lib/modules/ --nodes 10.0.0.50
```

### Version Mismatch

Kernel modules must match the exact kernel version. If you see "version magic" errors in dmesg, it means there is a mismatch between the module and the running kernel. This should not happen with Image Factory-built images, but can occur if you manually try to load modules.

### Missing Dependencies

Some kernel modules depend on other modules. For example, the NVIDIA modules need several helper modules. Check the full dependency chain:

```bash
# Check module dependencies
talosctl dmesg --nodes 10.0.0.50 | grep -i "unknown symbol"
```

If you see "unknown symbol" messages, a dependency module is missing. Check if there is an additional extension you need to include.

## Wrapping Up

Custom kernel modules extend Talos Linux to support specialized hardware and advanced features that go beyond the default kernel configuration. Image Factory makes including these modules straightforward through the same schematic-based workflow used for all customizations. Whether you need NVIDIA GPU drivers for machine learning, ZFS for advanced storage, or DRBD for replicated block devices, the process is the same: add the extension to your schematic, generate the image, and deploy. The tight integration between extensions and kernel versions ensures compatibility, and the immutable nature of Talos ensures that your module configuration is consistent across all nodes.
