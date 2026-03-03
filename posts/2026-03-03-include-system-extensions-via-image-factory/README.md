# How to Include System Extensions via Image Factory

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Factory, System Extensions, Kubernetes, Drivers

Description: A detailed walkthrough of including system extensions in Talos Linux images using Image Factory for hardware support, storage tools, and networking capabilities.

---

Talos Linux ships as a minimal, immutable operating system. By design, it includes only what is necessary to run Kubernetes. But production environments often demand more - specific network drivers, storage tools, GPU support, or monitoring agents. System extensions are the official mechanism for adding these capabilities to Talos, and Image Factory is the cleanest way to include them in your images from the start.

This guide explains what system extensions are, how to find the right ones for your needs, and how to bundle them into custom images using Image Factory.

## What Are System Extensions?

System extensions are pre-built packages that add functionality to Talos Linux. They run at the system level and integrate directly with the kernel and OS runtime. Unlike regular container workloads that run inside Kubernetes, system extensions operate at a lower level and can provide things like kernel modules, firmware, and system utilities.

Extensions are maintained by Sidero Labs and the community. Each extension is versioned alongside Talos releases to ensure compatibility.

## Finding Available Extensions

Before building a custom image, you need to know what extensions are available. There are several ways to discover them.

### Using the Image Factory Web UI

The easiest approach is visiting `https://factory.talos.dev` in your browser. The web interface lists all available extensions organized by category, with descriptions and version information.

### Using the API

For automation, you can query the API:

```bash
# List all available extensions for a specific Talos version
curl -s https://factory.talos.dev/version/v1.7.0/extensions/official | jq '.[]'

# Filter for storage-related extensions
curl -s https://factory.talos.dev/version/v1.7.0/extensions/official | \
  jq '.[] | select(.name | contains("iscsi") or contains("zfs") or contains("drbd"))'
```

### Using the GitHub Repository

The source code and documentation for all official extensions is available at the `siderolabs/extensions` repository on GitHub. Each extension has its own directory with a manifest and build instructions.

## Common Extension Categories

Here is a breakdown of the most commonly used extensions:

### Hardware and Firmware

```yaml
# Schematic for hardware support
customization:
  systemExtensions:
    officialExtensions:
      # CPU microcode updates
      - siderolabs/intel-ucode
      - siderolabs/amd-ucode
      # GPU firmware
      - siderolabs/i915-ucode
      # Network card firmware
      - siderolabs/bnx2-bnx2x
      - siderolabs/realtek-firmware
```

These extensions provide firmware and microcode that your hardware may need to function correctly. Intel and AMD microcode updates are strongly recommended for security patches.

### Storage Tools

```yaml
# Schematic for storage capabilities
customization:
  systemExtensions:
    officialExtensions:
      # iSCSI support for SAN storage
      - siderolabs/iscsi-tools
      # Disk management utilities
      - siderolabs/util-linux-tools
      # ZFS filesystem support
      - siderolabs/zfs
      # DRBD for replicated storage
      - siderolabs/drbd
```

Storage extensions are critical for environments using network-attached storage, software-defined storage solutions like Longhorn or OpenEBS, or distributed storage systems.

### Virtualization and Cloud

```yaml
# Schematic for virtualization platforms
customization:
  systemExtensions:
    officialExtensions:
      # QEMU/KVM guest agent
      - siderolabs/qemu-guest-agent
      # VMware guest tools
      - siderolabs/vmtoolsd
      # Hyper-V guest tools
      - siderolabs/hyperv-tools
```

When running Talos as a virtual machine, guest agents improve integration with the hypervisor. They enable features like graceful shutdown, IP address reporting, and host-to-guest communication.

### GPU and Compute

```yaml
# Schematic for GPU workloads
customization:
  systemExtensions:
    officialExtensions:
      # NVIDIA GPU drivers
      - siderolabs/nvidia-container-toolkit
      - siderolabs/nvidia-open-gpu-kernel-modules
```

GPU extensions are essential for machine learning and AI workloads that need direct access to NVIDIA hardware.

### Networking

```yaml
# Schematic for advanced networking
customization:
  systemExtensions:
    officialExtensions:
      # Tailscale VPN
      - siderolabs/tailscale
      # WireGuard VPN
      - siderolabs/wireguard
```

Network extensions add VPN capabilities and additional networking tools directly at the OS level.

## Building an Image with Multiple Extensions

In practice, you will often combine extensions from several categories. Here is a realistic schematic for a bare metal cluster with diverse requirements:

```yaml
# production-schematic.yaml
# Full production schematic for bare metal deployment
customization:
  systemExtensions:
    officialExtensions:
      # Hardware support
      - siderolabs/intel-ucode
      - siderolabs/i915-ucode
      # Storage
      - siderolabs/iscsi-tools
      - siderolabs/util-linux-tools
      # Monitoring
      - siderolabs/nut-client
      # Networking
      - siderolabs/tailscale
  extraKernelArgs:
    - net.ifnames=0
    - console=tty0
    - console=ttyS0,115200n8
```

Submit this schematic and generate your image:

```bash
# Submit the schematic
SCHEMATIC_ID=$(curl -s -X POST \
  --data-binary @production-schematic.yaml \
  https://factory.talos.dev/schematics | jq -r '.id')

# Use the schematic ID in your machine config
talosctl gen config production-cluster https://10.0.0.1:6443 \
  --install-image factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0
```

## Verifying Extensions After Deployment

Once your nodes are running, confirm that all extensions loaded correctly:

```bash
# List extensions on a specific node
talosctl get extensions --nodes 10.0.0.10

# Get detailed information about a specific extension
talosctl get extensions --nodes 10.0.0.10 intel-ucode -o yaml

# Check system logs for extension loading messages
talosctl dmesg --nodes 10.0.0.10 | grep -i "extension"
```

## Extension Compatibility and Versioning

Extensions are built for specific Talos versions. When you upgrade your cluster, Image Factory automatically builds extensions compatible with the target version. However, there are a few things to watch for:

- **Extension availability**: Not all extensions are available for every Talos version. Newer extensions may only support recent releases.
- **Breaking changes**: Occasionally, an extension may change its name or be split into multiple packages between versions. Check the release notes before upgrading.
- **Kernel module compatibility**: Extensions that provide kernel modules must be compiled against the exact kernel version in the Talos release. Image Factory handles this automatically, but if you are building extensions manually, version mismatches will cause failures.

## Managing Extensions Across Environments

For organizations with multiple clusters, maintain separate schematics for each environment:

```bash
# Directory structure for managing schematics
# schematics/
#   production/
#     bare-metal.yaml    - physical servers with full hardware support
#     cloud-aws.yaml     - AWS instances with minimal extensions
#   staging/
#     staging.yaml       - mirrors production for testing
#   development/
#     dev.yaml           - lightweight for local development

# Generate schematic IDs for each environment
for env in production/bare-metal production/cloud-aws staging/staging development/dev; do
  echo "Processing ${env}..."
  ID=$(curl -s -X POST --data-binary @"schematics/${env}.yaml" \
    https://factory.talos.dev/schematics | jq -r '.id')
  echo "${env}: ${ID}" >> schematic-ids.txt
done
```

## Troubleshooting Extension Issues

If an extension is not working as expected:

1. **Check that the extension loaded**: Use `talosctl get extensions` to confirm it appears in the list.
2. **Review system logs**: Run `talosctl dmesg` and `talosctl logs` to look for errors related to the extension.
3. **Verify the schematic**: Make sure the extension name is spelled correctly and includes the `siderolabs/` prefix.
4. **Check version compatibility**: Ensure the Talos version you are using supports the extension you need.

## Wrapping Up

System extensions transform Talos Linux from a minimal OS into a platform that can handle any workload. Image Factory makes including these extensions painless by letting you define everything in a simple YAML schematic. Whether you need storage drivers for your SAN, GPU support for machine learning, or firmware updates for your specific hardware, the process is the same: define it in a schematic, submit it to Image Factory, and generate your image. This declarative approach keeps your infrastructure reproducible and your deployments consistent.
