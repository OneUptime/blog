# How to Configure Talos Linux for ARM64 Devices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, ARM64, AArch64, Kubernetes, Embedded Systems

Description: Learn how to configure and deploy Talos Linux on ARM64 devices, including platform-specific settings, kernel parameters, and system extension management.

---

ARM64 hardware has become a mainstream option for running Kubernetes. From cloud instances like AWS Graviton and Ampere Altra to single-board computers like Raspberry Pi and NVIDIA Jetson, the ARM64 ecosystem offers compelling price-performance ratios. Talos Linux has first-class ARM64 support, but getting the configuration right requires understanding some platform-specific details that differ from x86.

This guide covers the practical aspects of configuring Talos Linux for ARM64 devices, including image selection, device tree overlays, kernel parameters, and system extensions.

## Understanding ARM64 Boot on Talos

ARM64 devices boot differently than x86 systems. While x86 machines use a standardized BIOS/UEFI process, ARM64 devices often rely on device trees (DTBs) that describe the hardware to the kernel. Talos handles this through platform-specific images that include the right firmware, device trees, and kernel modules for each hardware platform.

The main Talos image variants for ARM64 are:

- `metal-arm64` - Generic ARM64 image for UEFI-capable hardware
- `metal-rpi_generic-arm64` - Raspberry Pi specific image
- Platform-specific images for cloud providers (AWS, Azure, GCP, Oracle)

```bash
# Download the generic ARM64 metal image
curl -LO https://github.com/siderolabs/talos/releases/latest/download/metal-arm64.iso

# Download the Raspberry Pi variant
curl -LO https://github.com/siderolabs/talos/releases/latest/download/metal-rpi_generic-arm64.raw.xz
```

## Choosing the Right Image

Selecting the correct image is critical on ARM64 because hardware support varies significantly between devices:

| Device | Image | Boot Method |
|--------|-------|-------------|
| Raspberry Pi 4/5 | rpi_generic-arm64 | EEPROM/DTB |
| NVIDIA Jetson | Custom with Jetson extensions | UEFI |
| Ampere Altra | metal-arm64 | UEFI |
| AWS Graviton | aws-arm64 | Cloud image |
| Generic UEFI boards | metal-arm64 | UEFI |
| Pine64/Rock boards | Custom with SBC overlays | U-Boot/DTB |

For devices that use UEFI boot (like server-grade ARM64 hardware), the generic `metal-arm64` image works out of the box. For SBC devices, you typically need a specialized image.

## Generating ARM64 Machine Configuration

The machine configuration process is the same regardless of architecture, but some settings need adjustment for ARM64:

```bash
# Generate base config
talosctl gen config arm-cluster https://<ENDPOINT_IP>:6443

# Apply ARM64-specific patches
talosctl gen config arm-cluster https://<ENDPOINT_IP>:6443 \
  --config-patch @arm64-patches.yaml
```

Create an ARM64-specific patch file:

```yaml
# arm64-patches.yaml
# Adjust install disk for common ARM64 devices
- op: add
  path: /machine/install/disk
  value: /dev/mmcblk0  # For SD card based devices
# Or /dev/nvme0n1 for NVMe
# Or /dev/sda for USB drives

# Set appropriate kernel parameters
- op: add
  path: /machine/install/extraKernelArgs
  value:
    - console=ttyAMA0,115200  # UART console for debugging
    - earlycon=uart8250,mmio32,0xfe215040  # Early console output
```

## Device Tree Overlays

Many ARM64 boards require device tree overlays to enable specific hardware features. In Talos, you can include custom overlays through the machine configuration:

```yaml
# Machine config for SBC with custom DTB overlay
machine:
  install:
    disk: /dev/mmcblk0
    extraKernelArgs:
      - console=ttyS2,1500000n8
  kernel:
    modules:
      - name: gpio_keys
      - name: pwm_fan
```

For boards that need completely custom device trees, you may need to build a custom Talos image using the Image Factory:

```bash
# Use the Talos Image Factory to create a custom image
# with specific overlays for your board
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/json" \
  -d '{
    "customization": {
      "systemExtensions": {
        "officialExtensions": [
          "siderolabs/usb-modem-drivers"
        ]
      }
    },
    "overlay": {
      "name": "rpi_generic",
      "image": "siderolabs/sbc-rpi"
    }
  }'
```

## System Extensions for ARM64

Talos system extensions add functionality to the base OS. Not all extensions are available for ARM64, so check compatibility before planning your deployment.

Commonly used ARM64 extensions include:

```yaml
# Machine config with ARM64-compatible extensions
machine:
  install:
    extensions:
      # Storage drivers
      - image: ghcr.io/siderolabs/iscsi-tools:latest

      # Networking
      - image: ghcr.io/siderolabs/tailscale:latest

      # Container runtime
      - image: ghcr.io/siderolabs/gvisor:latest

      # USB and serial support for SBCs
      - image: ghcr.io/siderolabs/usb-modem-drivers:latest
```

Verify extension availability for your architecture:

```bash
# List available extensions and their architectures
crane ls ghcr.io/siderolabs/iscsi-tools

# Check if a specific tag supports arm64
crane manifest ghcr.io/siderolabs/iscsi-tools:latest | jq '.manifests[].platform'
```

## Network Configuration for ARM64 Devices

ARM64 devices often have different network interface naming compared to x86. The interface names depend on the bus topology of the specific device:

```yaml
# Network config - interface names vary by device
machine:
  network:
    interfaces:
      # Raspberry Pi typically uses eth0
      - interface: eth0
        dhcp: true

      # Some ARM64 servers use enpXsY naming
      # - interface: enp1s0
      #   dhcp: true
```

To find the correct interface name on a running Talos node:

```bash
# List network interfaces
talosctl -n <NODE_IP> get links

# Or check the network status
talosctl -n <NODE_IP> get addresses
```

## Kernel Parameters for ARM64

Some kernel parameters behave differently or are only relevant on ARM64:

```yaml
machine:
  install:
    extraKernelArgs:
      # Serial console for debugging (common on SBCs)
      - console=ttyAMA0,115200

      # CMA allocation for GPU memory sharing
      - cma=128M

      # Disable transparent hugepages on low-memory devices
      - transparent_hugepage=never

  sysctls:
    # Adjust OOM behavior for low-memory devices
    vm.overcommit_memory: "1"
    vm.panic_on_oom: "0"

    # Network tuning for ARM64
    net.core.rmem_max: "16777216"
    net.core.wmem_max: "16777216"
```

## CPU Governor and Performance

ARM64 processors often support multiple performance states. By default, Talos uses the `schedutil` CPU frequency governor, which dynamically adjusts clock speeds. For Kubernetes workloads where consistent latency matters, you might want `performance` mode:

```yaml
machine:
  sysctls:
    # Force performance governor (requires cpufreq support)
    kernel.sched_energy_aware: "0"
```

On SBCs with limited cooling, the performance governor can cause thermal throttling. Monitor temperatures and adjust accordingly.

## Multi-Architecture Clusters

Talos supports mixed-architecture clusters where ARM64 and AMD64 nodes coexist. Kubernetes handles scheduling with node labels:

```bash
# ARM64 nodes automatically get the arch label
kubectl get nodes -L kubernetes.io/arch

# Schedule workloads to specific architectures
kubectl label node pi-worker-1 node-type=arm64
```

Make sure your container images support both architectures using multi-arch manifests:

```yaml
# Pod spec with architecture affinity
apiVersion: v1
kind: Pod
metadata:
  name: arm-workload
spec:
  nodeSelector:
    kubernetes.io/arch: arm64
  containers:
    - name: app
      image: nginx:latest  # nginx provides multi-arch images
```

## Troubleshooting ARM64 Issues

If the device does not boot, check that you are using the correct image variant. Using the generic ARM64 image on a device that needs platform-specific firmware will not work.

If the node boots but has no network, the most common cause is an incorrect interface name in the configuration. Boot without a network config first (DHCP will be used by default), then check the actual interface names.

If performance is poor, check for thermal throttling and verify that the CPU governor is appropriate for your workload. Also check that you are not running out of memory, as ARM64 devices typically have less RAM than x86 servers.

```bash
# Check system resource usage
talosctl -n <NODE_IP> stats
talosctl -n <NODE_IP> memory
```

## Wrapping Up

Configuring Talos Linux for ARM64 devices requires attention to platform-specific details like image selection, device trees, and boot parameters. Once you get past these initial configuration hurdles, the day-to-day experience of managing an ARM64 Talos cluster is identical to x86. The growing ARM64 ecosystem, combined with Talos's clean API-driven approach, makes it a strong choice for edge computing, cost-effective cloud deployments, and homelab environments.
