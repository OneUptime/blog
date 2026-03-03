# How to Upgrade the Talos Linux Installer Image

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Installer Images, Custom Images, System Extensions, Container Registry

Description: Learn how to upgrade the Talos Linux installer image, build custom images with system extensions, and manage installer images across your cluster lifecycle.

---

The Talos Linux installer image is the container image that carries the kernel, initramfs, and installation tooling needed to install or upgrade Talos on a node. When you upgrade Talos, you are essentially swapping the old installer image for a new one. Understanding how installer images work, how to customize them, and how to manage them is essential for maintaining a Talos cluster.

## What Is the Installer Image?

The Talos installer image is an OCI container image that contains:

- The Linux kernel compiled for Talos
- The initramfs with the Talos init system
- The installer binary that handles disk partitioning and writing
- System extension overlays (if using a custom image)

The official installer images are published at `ghcr.io/siderolabs/installer` with tags matching Talos version numbers:

```
ghcr.io/siderolabs/installer:v1.6.0
ghcr.io/siderolabs/installer:v1.6.1
ghcr.io/siderolabs/installer:v1.7.0
```

## Checking Your Current Installer Image

To see which installer image a node was installed with:

```bash
# Check the machine configuration for the install image
talosctl get machineconfig --nodes 192.168.1.10 -o yaml | grep -A 5 "install:"

# Example output:
# install:
#   disk: /dev/sda
#   image: ghcr.io/siderolabs/installer:v1.6.0
#   wipe: false
```

The `machine.install.image` field in the configuration shows the image that was used. However, when you upgrade, you specify the new image directly in the upgrade command rather than changing the config.

## Upgrading to a New Official Image

The standard upgrade process uses the new installer image:

```bash
# Upgrade using the official installer image
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# After the upgrade, the node will be running the version
# corresponding to the new installer image
```

The upgrade command pulls the new image, extracts the kernel and initramfs, writes them to the inactive boot slot, and reboots the node.

## Building Custom Installer Images

Many production deployments need custom installer images that include system extensions. Extensions add kernel modules, firmware, or user-space tools that are not in the default Talos image.

### Using the Talos Imager

The official way to build custom installer images is with the `imager` tool:

```bash
# Build a custom installer with NVIDIA drivers and iSCSI tools
docker run --rm -t -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  installer \
  --system-extension-image ghcr.io/siderolabs/nvidia-container-toolkit:535.54.03-v1.13.5 \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4

# The output is saved to /tmp/out/installer-amd64.tar (or arm64)
```

You can include multiple extensions:

```bash
# Build with several extensions
docker run --rm -t -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  installer \
  --system-extension-image ghcr.io/siderolabs/nvidia-container-toolkit:535.54.03-v1.13.5 \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4 \
  --system-extension-image ghcr.io/siderolabs/qemu-guest-agent:8.2.2 \
  --system-extension-image ghcr.io/siderolabs/gasket-driver:1.0-v1.7.0
```

### Pushing to a Container Registry

After building, push the image to your container registry:

```bash
# Load the tarball and push
crane push /tmp/out/installer-amd64.tar myregistry.com/talos-installer:v1.7.0-custom

# Or use docker
docker load -i /tmp/out/installer-amd64.tar
docker tag ghcr.io/siderolabs/installer:v1.7.0 myregistry.com/talos-installer:v1.7.0-custom
docker push myregistry.com/talos-installer:v1.7.0-custom
```

### Using the Custom Image for Upgrades

```bash
# Upgrade using your custom installer image
talosctl upgrade --nodes 192.168.1.10 \
  --image myregistry.com/talos-installer:v1.7.0-custom
```

## Using Talos Image Factory

The Talos Image Factory is an online service that builds custom installer images on demand. You define a schematic (a list of extensions) and the factory generates the image.

```bash
# Create a schematic YAML
cat > schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/nvidia-container-toolkit
      - siderolabs/iscsi-tools
      - siderolabs/qemu-guest-agent
EOF

# Generate the schematic ID
# (The factory uses a hash-based ID system)

# Use the factory URL in your upgrade
talosctl upgrade --nodes 192.168.1.10 \
  --image factory.talos.dev/installer/<schematic-id>:v1.7.0
```

The Image Factory is convenient because you do not need to build and host images yourself. The factory caches generated images, so subsequent requests for the same schematic are fast.

## Managing Installer Images Across Versions

When you upgrade Talos, you need to upgrade the installer image to match. If you use custom images, this means rebuilding them for each new Talos version.

### Tracking Your Image Configuration

Keep your extension list in version control:

```yaml
# talos-installer-extensions.yaml
# Used to build custom Talos installer images

talos_version: v1.7.0
extensions:
  - ghcr.io/siderolabs/nvidia-container-toolkit:535.54.03-v1.13.5
  - ghcr.io/siderolabs/iscsi-tools:v0.1.4
  - ghcr.io/siderolabs/qemu-guest-agent:8.2.2
```

### Automating Image Builds

Create a CI pipeline that builds new installer images when you update the Talos version:

```bash
#!/bin/bash
# build-installer.sh
# Builds a custom Talos installer image

TALOS_VERSION=${1:-"v1.7.0"}
REGISTRY="myregistry.com"
IMAGE_NAME="talos-installer"

EXTENSIONS=(
  "--system-extension-image ghcr.io/siderolabs/nvidia-container-toolkit:535.54.03-v1.13.5"
  "--system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4"
  "--system-extension-image ghcr.io/siderolabs/qemu-guest-agent:8.2.2"
)

echo "Building Talos installer image for $TALOS_VERSION..."

docker run --rm -t -v /tmp/out:/out \
  "ghcr.io/siderolabs/imager:$TALOS_VERSION" \
  installer \
  ${EXTENSIONS[@]}

echo "Pushing to registry..."
crane push "/tmp/out/installer-amd64.tar" \
  "$REGISTRY/$IMAGE_NAME:$TALOS_VERSION-custom"

echo "Image available at: $REGISTRY/$IMAGE_NAME:$TALOS_VERSION-custom"
```

## Updating the Install Image in Machine Configuration

The `machine.install.image` field in the machine configuration is used during initial installation. For upgrades, the image is specified on the command line. However, it is good practice to update the configuration to match:

```bash
# After upgrading, update the machine config to reflect the new image
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '[{"op": "replace", "path": "/machine/install/image", "value": "ghcr.io/siderolabs/installer:v1.7.0"}]'
```

This ensures that if the node is ever reinstalled (for example, after a disk replacement), it uses the correct image version.

## Air-Gapped Environments

In air-gapped environments where nodes cannot pull images from the internet, you need to pre-load installer images into a local registry:

```bash
# On a machine with internet access, pull the image
crane pull ghcr.io/siderolabs/installer:v1.7.0 installer-v1.7.0.tar

# Transfer the tar file to the air-gapped environment

# Push to the local registry
crane push installer-v1.7.0.tar registry.internal:5000/talos/installer:v1.7.0

# Use the local registry URL for upgrades
talosctl upgrade --nodes 192.168.1.10 \
  --image registry.internal:5000/talos/installer:v1.7.0
```

If you use custom images with extensions, build them on the internet-connected side and transfer the complete custom image.

## Image Verification

Verify that an installer image is valid before using it for upgrades:

```bash
# Check the image manifest
crane manifest ghcr.io/siderolabs/installer:v1.7.0

# Check the image size and layers
crane ls ghcr.io/siderolabs/installer

# Verify the image architecture
crane config ghcr.io/siderolabs/installer:v1.7.0 | jq '.architecture'
```

For security, you can verify image signatures if the images are signed:

```bash
# Check for cosign signatures (Talos images are signed)
cosign verify --key <key-file> ghcr.io/siderolabs/installer:v1.7.0
```

## Multi-Architecture Considerations

Talos supports both amd64 and arm64 architectures. Make sure you use the correct image for your hardware:

```bash
# The official images support multi-arch manifests
# The correct architecture is pulled automatically

# For custom images, you may need to build both architectures
docker run --rm -t -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  installer \
  --arch amd64 \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4

docker run --rm -t -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  installer \
  --arch arm64 \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4
```

## Troubleshooting Image Issues

### Image Pull Failures

```bash
# If the upgrade fails because the image cannot be pulled:
# 1. Check network connectivity from the node
talosctl get addresses --nodes 192.168.1.10

# 2. Check DNS resolution
talosctl get resolvers --nodes 192.168.1.10

# 3. Verify the image exists and is accessible
crane manifest ghcr.io/siderolabs/installer:v1.7.0

# 4. Check for registry authentication issues
# If using a private registry, ensure the node has pull credentials
```

### Extension Compatibility

When building custom images, extension versions must be compatible with the Talos version:

```bash
# Check available extension versions for a specific Talos release
# Visit the extensions repository:
# https://github.com/siderolabs/extensions

# Extensions are tagged with compatible Talos versions
# Use the correct tag when building custom images
```

## Best Practices

1. Always use tagged versions (not `latest`) for installer images
2. Store custom image build scripts in version control
3. Automate image builds as part of your upgrade pipeline
4. Test custom images in staging before production
5. Keep the install image field in machine configuration in sync with the actual installed version
6. Mirror images to a local registry for reliability and speed
7. Verify image signatures in security-sensitive environments

## Conclusion

The Talos Linux installer image is the vehicle for delivering new versions and system extensions to your nodes. Whether you use the official images or build custom ones with extensions, understanding how to manage these images is key to a smooth upgrade workflow. By keeping your image builds automated, your configurations in sync, and your registries stocked with the right images, you ensure that upgrades go smoothly across your entire fleet.
