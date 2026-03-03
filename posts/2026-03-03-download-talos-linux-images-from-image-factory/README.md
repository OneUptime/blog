# How to Download Talos Linux Images from Image Factory

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Factory, Installation, System Extensions, Custom Images

Description: Use the Talos Linux Image Factory to download standard and custom images with system extensions for your specific hardware.

---

The Talos Linux Image Factory is an online service that builds Talos Linux images on demand. While you can always grab standard images from the GitHub releases page, the Image Factory lets you create custom images that include specific system extensions - things like additional hardware drivers, storage tools, or utilities that are not part of the default Talos image.

This is particularly useful for bare metal deployments where your hardware might need drivers that Talos does not ship by default.

## What Is the Image Factory

The Image Factory lives at `https://factory.talos.dev`. It takes a "schematic" - a definition of which system extensions to include - and produces downloadable images in various formats: ISO, raw disk images, installer images, and more.

The idea behind it is that Talos stays minimal by default, but you can customize the image to include exactly the extensions your environment needs. This could be anything from Intel microcode updates to iSCSI tools for storage, to specific NIC drivers.

## Downloading Standard Images

If you do not need any custom extensions, you can download standard images directly from the Image Factory or from GitHub releases. Both provide the same base image.

### From GitHub Releases

```bash
# Download the standard amd64 ISO
curl -LO https://github.com/siderolabs/talos/releases/latest/download/talos-amd64.iso

# Download the standard arm64 ISO
curl -LO https://github.com/siderolabs/talos/releases/latest/download/talos-arm64.iso
```

### From the Image Factory Web Interface

1. Navigate to `https://factory.talos.dev` in your browser
2. Select the Talos version you want
3. Choose your target platform (bare metal, cloud, VM, etc.)
4. Select any system extensions you need
5. Download the generated image

The web interface is the easiest way to get started because it walks you through the options visually.

## Understanding Schematics

A schematic is a YAML document that defines which system extensions to include in the image. Here is an example:

```yaml
# schematic.yaml
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/intel-ucode
      - siderolabs/i915-ucode
      - siderolabs/iscsi-tools
```

Each extension is referenced by its name in the Sidero Labs extensions repository. You can browse available extensions at `https://github.com/siderolabs/extensions`.

## Creating a Custom Schematic

To generate a custom image, first create your schematic and submit it to the Image Factory API:

```bash
# Create your schematic file
cat > schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/intel-ucode
      - siderolabs/i915-ucode
EOF

# Submit the schematic to the Image Factory
curl -X POST --data-binary @schematic.yaml https://factory.talos.dev/schematics

# The response will include a schematic ID, something like:
# {"id":"376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba"}
```

The schematic ID is a hash of your customization. It is deterministic, so the same set of extensions always produces the same ID.

## Downloading Custom Images

Once you have your schematic ID, use it to download images:

```bash
# Replace <schematic-id> with your actual schematic ID
# Replace <version> with the Talos version (e.g., v1.9.0)

# Download an ISO
curl -LO "https://factory.talos.dev/image/<schematic-id>/<version>/metal-amd64.iso"

# Download a raw disk image
curl -LO "https://factory.talos.dev/image/<schematic-id>/<version>/nocloud-amd64.raw.xz"

# Download an installer image reference (for upgrades)
echo "factory.talos.dev/installer/<schematic-id>:<version>"
```

For example, with a real schematic ID:

```bash
# Download a custom ISO with Intel microcode and i915 firmware
SCHEMATIC="376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba"
VERSION="v1.9.0"

curl -LO "https://factory.talos.dev/image/${SCHEMATIC}/${VERSION}/metal-amd64.iso"
```

## Common System Extensions

Here are the most commonly used system extensions:

### Hardware and Firmware

```yaml
customization:
  systemExtensions:
    officialExtensions:
      # Intel CPU microcode updates
      - siderolabs/intel-ucode
      # Intel GPU firmware
      - siderolabs/i915-ucode
      # AMD CPU microcode updates
      - siderolabs/amd-ucode
```

### Storage

```yaml
customization:
  systemExtensions:
    officialExtensions:
      # iSCSI support (needed for some storage solutions like Longhorn)
      - siderolabs/iscsi-tools
      # Utility for managing drives
      - siderolabs/util-linux-tools
```

### Networking

```yaml
customization:
  systemExtensions:
    officialExtensions:
      # Realtek NIC drivers (common in consumer hardware)
      - siderolabs/realtek-firmware
      # Broadcom NIC drivers
      - siderolabs/bnx2-bnx2x
```

### NVIDIA GPU Support

```yaml
customization:
  systemExtensions:
    officialExtensions:
      # NVIDIA GPU drivers (for GPU workloads)
      - siderolabs/nonfree-kmod-nvidia
      - siderolabs/nvidia-container-toolkit
```

## Available Image Formats

The Image Factory produces images in multiple formats depending on your target platform:

| Format | Use Case |
|--------|----------|
| `metal-amd64.iso` | Bare metal / USB boot |
| `nocloud-amd64.raw.xz` | QEMU, KVM, generic VMs |
| `vmware-amd64.ova` | VMware ESXi / vSphere |
| `aws-amd64.raw.xz` | Amazon Web Services |
| `gcp-amd64.raw.tar.gz` | Google Cloud Platform |
| `azure-amd64.vhd.xz` | Microsoft Azure |
| `oracle-amd64.raw.xz` | Oracle Cloud |
| `digital-ocean-amd64.raw.xz` | DigitalOcean |

Replace `amd64` with `arm64` for ARM-based systems.

## Using the Image Factory for Upgrades

When you upgrade Talos Linux on an existing cluster, you reference an installer image rather than downloading an ISO. The Image Factory provides installer images that include your custom extensions:

```bash
# Upgrade a node using a custom installer image from the Image Factory
talosctl upgrade --nodes 192.168.1.101 \
  --image "factory.talos.dev/installer/${SCHEMATIC}:${VERSION}"
```

This is one of the main reasons to use the Image Factory. You define your schematic once, and every time you upgrade, you use the same schematic ID with the new Talos version. Your extensions carry forward automatically.

## Using imager Locally

If you cannot use the online Image Factory (perhaps you are in an air-gapped environment), you can run the `imager` tool locally:

```bash
# Pull the imager container
docker pull ghcr.io/siderolabs/imager:v1.9.0

# Build a custom ISO locally
docker run --rm -t \
  -v /dev:/dev --privileged \
  ghcr.io/siderolabs/imager:v1.9.0 \
  metal --system-extension-image ghcr.io/siderolabs/intel-ucode:latest \
  --system-extension-image ghcr.io/siderolabs/i915-ucode:latest
```

The resulting image is placed in the current directory. This approach is slower but works without internet access to the Image Factory.

## Verifying Your Image

After downloading, verify the image includes your extensions. Boot a node with the image and check:

```bash
# After the node is running, check installed extensions
talosctl get extensions --nodes 192.168.1.101
```

This lists all system extensions present on the node. You should see the extensions from your schematic listed there.

The Image Factory simplifies Talos Linux image management significantly. Instead of building custom images from scratch, you declare what you need, and the factory handles the rest. This keeps your workflow clean and reproducible across environments.
