# How to Generate Custom ISOs with Image Factory

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Factory, ISO, Custom Images, Bare Metal

Description: A practical guide to generating custom Talos Linux ISO images using Image Factory for bare metal deployments and testing environments.

---

When deploying Talos Linux on bare metal servers or in local test environments, you often need a bootable ISO image. The default Talos ISO works fine for basic setups, but real-world deployments usually require additional drivers, firmware, or kernel arguments that the stock image does not include. Talos Image Factory solves this problem by letting you generate custom ISOs that come pre-loaded with everything your hardware needs.

This guide covers the complete workflow for generating custom ISO images with Image Factory, from defining your requirements to booting your first node.

## When You Need a Custom ISO

The stock Talos ISO includes a minimal set of drivers and tools. You will need a custom ISO in these situations:

- Your network cards require drivers not included in the default kernel (common with newer Intel or Mellanox NICs)
- You need specific firmware packages for your hardware
- Your storage setup requires iSCSI, multipath, or other non-default tools
- You want to set kernel boot arguments like console output redirection or specific memory allocations
- You need NVIDIA GPU drivers for machine learning workloads

## Defining Your ISO Requirements

The first step is creating a schematic that describes what your ISO should contain. Let's build one for a typical bare metal server with Intel hardware:

```yaml
# bare-metal-schematic.yaml
# Schematic for Intel-based bare metal servers
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/intel-ucode
      - siderolabs/i915-ucode
      - siderolabs/iscsi-tools
      - siderolabs/nut-client
  extraKernelArgs:
    - console=ttyS0,115200n8
    - net.ifnames=0
```

This schematic includes Intel CPU and GPU firmware, iSCSI tools for SAN storage, the NUT client for UPS monitoring, a serial console configuration, and traditional network interface naming.

## Submitting the Schematic

Send your schematic to Image Factory to get a unique identifier:

```bash
# Submit the schematic to Image Factory
SCHEMATIC_ID=$(curl -s -X POST \
  --data-binary @bare-metal-schematic.yaml \
  https://factory.talos.dev/schematics | jq -r '.id')

# Print the schematic ID for reference
echo "Schematic ID: ${SCHEMATIC_ID}"
```

Save this ID somewhere safe. Because it is a content hash, submitting the same schematic will always return the same ID. You can store it in your infrastructure repository alongside the schematic file.

## Downloading the Custom ISO

With the schematic ID in hand, you can download your custom ISO:

```bash
# Set your desired Talos version
TALOS_VERSION="v1.7.0"

# Download the custom ISO for AMD64 architecture
wget -O talos-custom-amd64.iso \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/metal-amd64.iso"

# Verify the download
ls -lh talos-custom-amd64.iso
```

The URL pattern follows a predictable structure: `https://factory.talos.dev/image/{schematic-id}/{version}/{image-type}`. For ISOs, the image type is `metal-{arch}.iso` where arch is either `amd64` or `arm64`.

## Available ISO Variants

Image Factory can generate several ISO variants depending on your deployment method:

```bash
# Standard metal ISO for BIOS and UEFI boot
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/metal-amd64.iso"

# SecureBoot-enabled ISO
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/metal-amd64-secureboot.iso"

# ARM64 ISO for ARM-based servers
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/metal-arm64.iso"
```

The SecureBoot variant is particularly important for enterprise environments where UEFI Secure Boot is a compliance requirement.

## Writing the ISO to USB

For physical servers, you will typically write the ISO to a USB drive:

```bash
# List available drives (on Linux)
lsblk

# Write the ISO to a USB drive (replace /dev/sdX with your USB device)
# WARNING: This will erase all data on the target drive
sudo dd if=talos-custom-amd64.iso of=/dev/sdX bs=4M status=progress conv=fsync
```

On macOS, you can use a similar approach:

```bash
# List disks
diskutil list

# Unmount the USB drive
diskutil unmountDisk /dev/diskN

# Write the ISO
sudo dd if=talos-custom-amd64.iso of=/dev/rdiskN bs=4m
```

## Booting from the Custom ISO

Once you boot a server from the custom ISO, it enters maintenance mode. At this point, the node is waiting for a machine configuration. You can apply one using talosctl:

```bash
# Generate a machine configuration
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --install-image factory.talos.dev/installer/${SCHEMATIC_ID}:${TALOS_VERSION}

# Apply the configuration to the booted node
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file controlplane.yaml
```

Notice that we use the same schematic ID for the installer image in the machine config. This ensures that when the node installs to disk, it uses the same set of extensions that were in the ISO.

## Automating ISO Generation

For teams that need to generate ISOs regularly, you can script the entire process:

```bash
#!/bin/bash
# generate-iso.sh - automated ISO generation script

set -euo pipefail

TALOS_VERSION="${1:-v1.7.0}"
SCHEMATIC_FILE="${2:-schematic.yaml}"
OUTPUT_DIR="${3:-./output}"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Submit schematic
echo "Submitting schematic..."
SCHEMATIC_ID=$(curl -s -X POST \
  --data-binary @"${SCHEMATIC_FILE}" \
  https://factory.talos.dev/schematics | jq -r '.id')

echo "Schematic ID: ${SCHEMATIC_ID}"

# Download ISO
echo "Downloading ISO for version ${TALOS_VERSION}..."
wget -q -O "${OUTPUT_DIR}/talos-custom-amd64.iso" \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/metal-amd64.iso"

# Generate checksums
cd "${OUTPUT_DIR}"
sha256sum talos-custom-amd64.iso > talos-custom-amd64.iso.sha256

echo "ISO saved to ${OUTPUT_DIR}/talos-custom-amd64.iso"
echo "Checksum saved to ${OUTPUT_DIR}/talos-custom-amd64.iso.sha256"
```

## Verifying Extensions in the ISO

After booting from your custom ISO, you can verify that all expected extensions are present:

```bash
# Check installed extensions on a running node
talosctl get extensions --nodes 10.0.0.50

# You should see output listing each extension, for example:
# NODE       NAMESPACE   TYPE        ID              VERSION
# 10.0.0.50  runtime     Extension   intel-ucode     1
# 10.0.0.50  runtime     Extension   i915-ucode      1
# 10.0.0.50  runtime     Extension   iscsi-tools     1
```

If an extension is missing, double-check your schematic file for typos in the extension names.

## Comparing ISOs Between Versions

When upgrading Talos versions, it is a good practice to verify that your custom ISO works correctly with the new version before rolling it out:

```bash
# Generate ISOs for both old and new versions
wget -O talos-v1.7.0.iso \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-amd64.iso"
wget -O talos-v1.8.0.iso \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.8.0/metal-amd64.iso"

# Compare sizes to spot any major differences
ls -lh talos-v1.7.0.iso talos-v1.8.0.iso
```

## Troubleshooting ISO Issues

A few common problems and their solutions:

**ISO will not boot on your hardware**: Check that you downloaded the correct architecture and that your BIOS/UEFI settings allow booting from USB. Some servers need legacy boot mode disabled or enabled depending on the ISO variant.

**Extensions not loading**: Verify the extension names in your schematic match exactly what Image Factory expects. Extension names are case-sensitive and must include the `siderolabs/` prefix.

**Kernel panic on boot**: This can happen if kernel arguments conflict. Remove any custom kernel arguments and try again with just the extensions.

**ISO download fails**: Image Factory builds images on demand. If a particular combination of extensions and version has not been built before, there may be a short delay. Retry after a minute or two.

## Wrapping Up

Generating custom ISOs with Image Factory is a straightforward process that gives you complete control over what goes into your Talos Linux boot media. By maintaining your schematics as code, you get reproducible builds that can be regenerated for any Talos version. This approach eliminates the tedious post-boot configuration that traditional Linux distributions require and gives your team a reliable, automated path from bare hardware to running Kubernetes nodes.
