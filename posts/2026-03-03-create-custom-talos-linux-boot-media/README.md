# How to Create Custom Talos Linux Boot Media

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Boot Media, Custom Images, Kubernetes, System Extensions

Description: Learn how to create customized Talos Linux boot media with extra drivers, extensions, and configurations for your specific hardware.

---

The standard Talos Linux images work well for common hardware, but sometimes you need more. Maybe your servers have network cards that require specific drivers, or you need additional system extensions for storage controllers. Creating custom boot media lets you build Talos Linux images tailored to your exact requirements.

This guide covers the tools and processes for creating customized Talos Linux boot images.

## Why Custom Boot Media?

There are several situations where custom boot media becomes necessary:

- Your hardware needs kernel modules not included in the default image
- You want to include system extensions like iSCSI support or ZFS
- You need specific firmware blobs for your network or storage controllers
- You want to embed a machine configuration directly into the boot media
- You are targeting a specific ARM board that needs device tree overlays

Talos Linux provides two main approaches for creating custom images: the Image Factory web service and the local `imager` tool.

## Using the Talos Image Factory

The Image Factory is a web service that generates custom Talos Linux images. It is the easiest way to create custom boot media without setting up a local build environment.

Visit https://factory.talos.dev in your browser. You will see options to:

1. Select the Talos Linux version
2. Choose the target platform (metal, cloud, SBC)
3. Add system extensions
4. Include overlay configurations for specific boards
5. Set custom kernel arguments

The factory generates a unique image ID based on your selections. You can then download the image directly:

```bash
# Download a custom image from the factory
# The URL includes your unique schematic ID
wget "https://factory.talos.dev/image/<SCHEMATIC_ID>/v1.9.0/metal-amd64.iso"

# Or download a raw disk image
wget "https://factory.talos.dev/image/<SCHEMATIC_ID>/v1.9.0/metal-amd64.raw.xz"
```

The schematic ID is a hash that represents your specific combination of extensions and configurations. You can save it and use it later to reproduce the exact same image.

## Using the Imager Tool Locally

For more control, use the Talos `imager` tool. It runs as a Docker container and builds images locally:

```bash
# Pull the imager for your target Talos version
docker pull ghcr.io/siderolabs/imager:v1.9.0

# Build a basic metal ISO
docker run --rm -v $(pwd)/_out:/out \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch amd64
```

This creates a standard ISO in the `_out` directory. To customize it, add flags and configuration options.

## Adding System Extensions

System extensions add functionality to Talos Linux without modifying the core OS. Common extensions include:

```bash
# Build an image with iSCSI support and Intel microcode
docker run --rm -v $(pwd)/_out:/out \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch amd64 \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4 \
  --system-extension-image ghcr.io/siderolabs/intel-ucode:20231114

# Build with NVIDIA driver support
docker run --rm -v $(pwd)/_out:/out \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch amd64 \
  --system-extension-image ghcr.io/siderolabs/nonfree-kmod-nvidia:535.129.03-v1.9.0
```

You can find the full list of available system extensions in the Talos Linux extensions repository on GitHub.

## Including Custom Kernel Arguments

Extra kernel arguments are useful for hardware compatibility, debugging, or performance tuning:

```bash
# Build with custom kernel arguments
docker run --rm -v $(pwd)/_out:/out \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch amd64 \
  --extra-kernel-arg net.ifnames=0 \
  --extra-kernel-arg console=ttyS0,115200 \
  --extra-kernel-arg intel_iommu=on
```

These kernel arguments are baked into the boot media, so they apply every time the system boots.

## Embedding Machine Configuration

You can embed a machine configuration directly into the boot media. This is useful for automated deployments where you want machines to configure themselves on first boot:

```bash
# First, generate the machine config
talosctl gen config my-cluster https://10.0.0.1:6443

# Build an ISO with embedded configuration
docker run --rm \
  -v $(pwd)/_out:/out \
  -v $(pwd)/controlplane.yaml:/config/controlplane.yaml \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch amd64 \
  --extra-kernel-arg talos.config=/config/controlplane.yaml
```

When a machine boots from this media, it will automatically apply the embedded configuration without needing a manual `talosctl apply-config` step.

## Building ARM64 Images

For ARM boards, the process is similar but you need to specify the architecture and potentially include board-specific overlays:

```bash
# Build a generic ARM64 image
docker run --rm -v $(pwd)/_out:/out \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch arm64

# Build for a specific board (e.g., Raspberry Pi 4)
docker run --rm -v $(pwd)/_out:/out \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch arm64 \
  --board-overlay ghcr.io/siderolabs/sbc-raspberrypi:v0.1.0
```

Note that you need to run this on an ARM64 host or use Docker's multi-platform support with QEMU emulation.

## Creating USB Boot Media

Once you have your custom ISO, write it to a USB drive:

```bash
# Write the custom ISO to USB
sudo dd if=_out/metal-amd64.iso of=/dev/sdX bs=4M status=progress conv=fsync
sync
```

For raw disk images:

```bash
# Decompress and write the raw image
xz -d _out/metal-amd64.raw.xz
sudo dd if=_out/metal-amd64.raw of=/dev/sdX bs=4M status=progress conv=fsync
sync
```

## Creating PXE Boot Assets

If you use PXE or iPXE for network booting, extract the kernel and initramfs from your custom image:

```bash
# Build PXE-compatible assets
docker run --rm -v $(pwd)/_out:/out \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch amd64 \
  --output-kind kernel

docker run --rm -v $(pwd)/_out:/out \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch amd64 \
  --output-kind initramfs
```

Copy these to your PXE server and update your boot configuration to point to the custom files.

## Building Images with Custom Overlays

For hardware that needs specific device tree blobs or firmware, you can create a custom overlay:

```bash
# Create a custom overlay directory structure
mkdir -p overlay/firmware
mkdir -p overlay/dtb

# Copy your firmware files
cp my-firmware.bin overlay/firmware/

# Build with the overlay
docker run --rm \
  -v $(pwd)/_out:/out \
  -v $(pwd)/overlay:/overlay \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch amd64 \
  --overlay /overlay
```

## Reproducible Builds

One of the nice things about the Image Factory approach is reproducibility. The schematic ID ensures you can always recreate the exact same image:

```bash
# Save your schematic for future use
echo "Schematic ID: abc123def456" > image-build-record.txt
echo "Talos Version: v1.9.0" >> image-build-record.txt
echo "Extensions: iscsi-tools, intel-ucode" >> image-build-record.txt

# Later, recreate the same image
wget "https://factory.talos.dev/image/abc123def456/v1.9.0/metal-amd64.iso"
```

For local builds, save your build command as a script:

```bash
#!/bin/bash
# build-talos-image.sh - Reproducible Talos image build
docker run --rm -v $(pwd)/_out:/out \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch amd64 \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4 \
  --system-extension-image ghcr.io/siderolabs/intel-ucode:20231114 \
  --extra-kernel-arg net.ifnames=0
```

## Verifying Custom Images

After building, verify that your custom image contains everything you expect:

```bash
# Mount the ISO and inspect its contents
mkdir -p /mnt/talos-iso
sudo mount -o loop _out/metal-amd64.iso /mnt/talos-iso
ls -la /mnt/talos-iso/

# Check the initramfs for included extensions
# (This requires extracting the initramfs, which is a cpio archive)
```

## Troubleshooting

If the imager fails, check that you have enough disk space and that Docker has sufficient resources. Custom images with many extensions can require significant build resources.

If a system extension causes boot failures, try building without that extension to isolate the problem. Some extensions conflict with specific hardware configurations.

For ARM images that do not boot on your board, verify that the correct device tree overlay is included. The Talos Linux documentation lists supported boards and their required overlays.

## Conclusion

Creating custom Talos Linux boot media gives you the flexibility to support diverse hardware environments while maintaining the security and simplicity that Talos is known for. Whether you use the Image Factory for convenience or the local imager for full control, the process produces reproducible images that you can deploy consistently across your infrastructure. This customization capability is what makes Talos Linux practical for real-world deployments where one-size-fits-all images rarely work.
