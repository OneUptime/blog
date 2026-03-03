# How to Create Custom Talos Linux ISOs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Custom ISO, Bare Metal, Installation, Kubernetes

Description: A complete guide to creating custom Talos Linux ISO images for bare metal deployments, including adding extensions, kernel parameters, and custom configurations.

---

When deploying Talos Linux on bare metal servers, ISO images are one of the most convenient installation methods. The default ISO from Sidero Labs works for many scenarios, but custom ISOs let you include specific extensions, drivers, kernel parameters, and pre-configured settings that match your hardware and requirements. Instead of manually configuring each node after booting the default ISO, you can bake everything into a custom ISO and streamline the entire deployment process.

This guide covers multiple approaches to creating custom Talos Linux ISOs, from using Image Factory to building from source.

## Why Create a Custom ISO

There are several practical reasons to create custom ISOs:

- Your servers have hardware that requires specific drivers not in the default image
- You want to include system extensions like iSCSI tools or GPU drivers
- You need custom kernel parameters for your hardware configuration
- You want to embed network configuration for air-gapped environments
- You want a consistent, repeatable installation artifact for your fleet

A custom ISO reduces the manual steps during deployment and ensures every node starts with the exact same baseline.

## Method 1: Using Image Factory

The easiest way to create a custom ISO is through Sidero Labs' Image Factory service. It takes a schematic describing your customizations and produces downloadable images.

### Creating a Schematic

Start by defining what you want in your custom ISO.

```yaml
# schematic.yaml
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/qemu-guest-agent
  extraKernelArgs:
    - net.ifnames=0
    - console=ttyS0
```

### Submitting to Image Factory

```bash
# Submit the schematic
SCHEMATIC_ID=$(curl -sX POST \
  --data-binary @schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" | jq -r '.id')

echo "Schematic ID: ${SCHEMATIC_ID}"

# Download the custom ISO
curl -o talos-custom-amd64.iso \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-amd64.iso"

# Verify the download
ls -lh talos-custom-amd64.iso
```

The Image Factory caches generated images, so subsequent requests for the same schematic are served quickly.

### Downloading for Different Platforms

Image Factory can generate images for various platforms and architectures.

```bash
# AMD64 ISO
curl -o talos-amd64.iso \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-amd64.iso"

# ARM64 ISO
curl -o talos-arm64.iso \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-arm64.iso"

# Raw disk image for AMD64
curl -o talos-amd64.raw.xz \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-amd64.raw.xz"
```

## Method 2: Using Imager Tool

For more control over the ISO creation process, use the `imager` tool directly. This approach works well in air-gapped environments or when you need to include custom (non-official) extensions.

### Setting Up Imager

```bash
# Pull the imager image
docker pull ghcr.io/siderolabs/imager:v1.7.0

# Run imager to see available options
docker run --rm ghcr.io/siderolabs/imager:v1.7.0 --help
```

### Generating an ISO with Extensions

```bash
# Generate a custom ISO with extensions
docker run --rm -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  iso \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4 \
  --system-extension-image ghcr.io/siderolabs/qemu-guest-agent:v8.2.0 \
  --extra-kernel-arg net.ifnames=0 \
  --extra-kernel-arg console=ttyS0

# Check the output
ls -lh /tmp/out/
```

### Including Custom Extensions

If you have built your own extensions, you can include them as well.

```bash
# Include a custom extension alongside official ones
docker run --rm -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  iso \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4 \
  --system-extension-image registry.example.com/my-custom-extension:v1.0.0 \
  --extra-kernel-arg net.ifnames=0
```

## Method 3: Building from Source

For complete control, build the ISO directly from the Talos source code.

```bash
# Clone the repository
git clone https://github.com/siderolabs/talos.git
cd talos

# Checkout a release tag
git checkout v1.7.0

# Build the ISO
make iso

# The ISO will be in _out/
ls -lh _out/talos-amd64.iso
```

This approach lets you modify any aspect of the image, including the kernel, initramfs, and boot process.

## Adding Custom Kernel Arguments

Kernel arguments are important for hardware compatibility. Common arguments for bare metal deployments include:

```bash
# Generate ISO with hardware-specific kernel args
docker run --rm -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  iso \
  --extra-kernel-arg net.ifnames=0 \
  --extra-kernel-arg console=tty0 \
  --extra-kernel-arg console=ttyS0,115200 \
  --extra-kernel-arg intel_iommu=on \
  --extra-kernel-arg iommu=pt \
  --extra-kernel-arg nomodeset
```

Common kernel arguments for Talos include:

- `net.ifnames=0` - Use classic network interface naming (eth0 instead of enp0s3)
- `console=ttyS0,115200` - Enable serial console output
- `intel_iommu=on` - Enable Intel IOMMU for device passthrough
- `nomodeset` - Disable kernel mode setting for problematic GPUs during install
- `talos.platform=metal` - Explicitly set the platform

## Embedding Configuration in the ISO

You can embed a partial or complete machine configuration directly into the ISO. This is useful for setting network defaults or machine-specific parameters.

```bash
# Create a machine config patch
cat > config-patch.yaml << 'EOF'
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
  time:
    servers:
      - time.cloudflare.com
cluster:
  network:
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
EOF

# Generate ISO with embedded config
docker run --rm -v /tmp/out:/out -v $(pwd):/config \
  ghcr.io/siderolabs/imager:v1.7.0 \
  iso \
  --extra-kernel-arg "talos.config=file:///config/config-patch.yaml"
```

## Writing the ISO to Media

Once you have your custom ISO, write it to a USB drive or configure it for PXE boot.

### USB Drive

```bash
# Identify your USB drive (be careful to select the right device)
lsblk

# Write the ISO to USB
sudo dd if=talos-custom-amd64.iso of=/dev/sdX bs=4M status=progress

# Sync to ensure all data is written
sync
```

### Serving via HTTP for iPXE

```bash
# Start a simple HTTP server to serve the ISO
python3 -m http.server 8080 --directory /tmp/out/

# Nodes can then boot from:
# http://your-server:8080/talos-custom-amd64.iso
```

## Verifying the Custom ISO

Before deploying to production hardware, test your custom ISO in a virtual machine.

```bash
# Test with QEMU
qemu-system-x86_64 \
  -m 4096 \
  -cpu host \
  -enable-kvm \
  -cdrom /tmp/out/talos-amd64.iso \
  -boot d \
  -drive file=test-disk.qcow2,format=qcow2,if=virtio,size=20G \
  -net nic -net user,hostfwd=tcp::50000-:50000

# After the node boots, apply configuration
talosctl apply-config --insecure \
  --nodes 127.0.0.1 \
  --file controlplane.yaml
```

Verify that your extensions are included.

```bash
# Check extensions on the booted node
talosctl -n <node-ip> get extensions

# Verify kernel arguments
talosctl -n <node-ip> read /proc/cmdline

# Check dmesg for driver loading
talosctl -n <node-ip> dmesg | grep -i driver
```

## Automating ISO Generation

For teams that regularly update their custom ISOs, automate the process.

```yaml
# .github/workflows/build-iso.yml
name: Build Custom Talos ISO
on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate ISO
        run: |
          docker run --rm -v ${{ github.workspace }}/out:/out \
            ghcr.io/siderolabs/imager:v1.7.0 \
            iso \
            --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: talos-custom-iso
          path: out/talos-amd64.iso
```

## Conclusion

Custom Talos Linux ISOs put you in control of the entire installation experience. Whether you use Image Factory for quick customizations, the imager tool for more complex builds, or compile from source for total control, the result is a repeatable, reliable installation artifact that matches your infrastructure requirements. For bare metal deployments where consistency matters, a custom ISO eliminates manual configuration steps and ensures every server in your fleet starts from the same foundation.
