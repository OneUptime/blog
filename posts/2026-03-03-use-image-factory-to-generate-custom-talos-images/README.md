# How to Use Image Factory to Generate Custom Talos Images

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Factory, Custom Images, Kubernetes, Deployments

Description: Learn how to use Sidero Labs Image Factory to generate custom Talos Linux images with system extensions, kernel arguments, and platform-specific formats.

---

Image Factory is a hosted service from Sidero Labs that generates custom Talos Linux images on demand. Instead of setting up a build environment and compiling images yourself, you describe what you want through a schematic, submit it to the service, and download ready-to-use images. It supports ISOs, raw disk images, cloud provider formats, and installer images, all with your chosen system extensions and kernel parameters pre-configured.

This guide covers everything you need to know about using Image Factory effectively for your Talos Linux deployments.

## What Is Image Factory

Image Factory is a web service that runs at `factory.talos.dev`. It accepts schematics - YAML descriptions of your desired image customization - and generates Talos Linux images that match your specifications. The service handles the compilation, packaging, and hosting of the resulting images.

The key benefits of using Image Factory include:

- No local build environment needed
- Consistent, reproducible builds
- Support for all Talos-supported platforms and architectures
- Automatic caching of generated images
- Integration with the Talos upgrade process

## How Schematics Work

A schematic is a YAML document that describes your customizations. When you submit a schematic, Image Factory generates a unique ID based on its content. This ID is deterministic, meaning the same schematic always produces the same ID, which makes the results cacheable.

```yaml
# schematic.yaml - A basic schematic
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/qemu-guest-agent
```

The schematic ID is a content hash, so two identical schematics submitted by different people will produce the same ID and share the cached image.

## Submitting Your First Schematic

Let us start with a simple example. We want a Talos image with iSCSI tools and the QEMU guest agent.

```bash
# Create your schematic file
cat > schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/qemu-guest-agent
EOF

# Submit to Image Factory
curl -sX POST \
  --data-binary @schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml"

# Response looks like:
# {"id":"376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba"}
```

Save the schematic ID - you will use it to download images.

```bash
# Store the ID in a variable
SCHEMATIC_ID="376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba"
```

## Downloading Images

Once you have a schematic ID, you can download images in various formats by constructing the right URL.

### ISO Images

```bash
# AMD64 ISO
curl -Lo talos-amd64.iso \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-amd64.iso"

# ARM64 ISO
curl -Lo talos-arm64.iso \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-arm64.iso"
```

### Raw Disk Images

```bash
# AMD64 raw disk image (compressed)
curl -Lo talos-metal-amd64.raw.xz \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-amd64.raw.xz"

# Decompress
xz -d talos-metal-amd64.raw.xz
```

### Installer Images

```bash
# The installer image URL for use in machine configs
# Use this in machine.install.image
echo "factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0"
```

### Cloud Platform Images

```bash
# AWS
curl -Lo talos-aws.raw.xz \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/aws-amd64.raw.xz"

# GCP
curl -Lo talos-gcp.raw.tar.gz \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/gcp-amd64.raw.tar.gz"

# Azure
curl -Lo talos-azure.vhd.xz \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/azure-amd64.vhd.xz"
```

## Advanced Schematic Options

Schematics support more than just extension selection. You can also configure kernel arguments and overlay configurations.

### Custom Kernel Arguments

```yaml
# schematic.yaml with kernel args
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
  extraKernelArgs:
    - net.ifnames=0
    - console=ttyS0,115200
    - intel_iommu=on
```

### Multiple Extensions

```yaml
# schematic.yaml with many extensions
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/qemu-guest-agent
      - siderolabs/tailscale
      - siderolabs/nvidia-open-gpu-kernel-modules
      - siderolabs/nvidia-container-toolkit
      - siderolabs/gvisor
```

## Using Image Factory with talosctl

You can reference Image Factory installer images directly in your `talosctl` commands.

```bash
# Generate config using Image Factory installer
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --install-image factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0

# Upgrade a node using Image Factory installer
talosctl upgrade \
  --image factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0 \
  --nodes 10.0.0.10
```

This is one of the most practical uses of Image Factory. Instead of building and hosting your own installer images, you point directly at Image Factory.

## Using Image Factory in Machine Configurations

Reference the Image Factory installer in your machine configuration files.

```yaml
# controlplane.yaml
machine:
  install:
    image: factory.talos.dev/installer/376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba:v1.7.0
    disk: /dev/sda
```

When the node installs or upgrades, it pulls the custom installer image from Image Factory, which includes all your specified extensions.

## Upgrading with Image Factory

One of the biggest advantages of Image Factory is how it simplifies upgrades. When a new Talos version is released, you just change the version in the URL and your schematic is applied to the new version.

```bash
# Current version
CURRENT="factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0"

# Upgrade to new version - just change the version tag
NEW="factory.talos.dev/installer/${SCHEMATIC_ID}:v1.8.0"

# Perform the upgrade
talosctl upgrade --image ${NEW} --nodes 10.0.0.10
```

Your extensions and kernel arguments carry over to the new version automatically.

## Managing Multiple Schematics

In larger environments, you might have different schematics for different node roles.

```bash
# Worker nodes - need storage and GPU
cat > worker-schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/nvidia-open-gpu-kernel-modules
      - siderolabs/nvidia-container-toolkit
EOF

# Control plane nodes - minimal extensions
cat > cp-schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/qemu-guest-agent
EOF

# Submit both
WORKER_ID=$(curl -sX POST --data-binary @worker-schematic.yaml \
  https://factory.talos.dev/schematics -H "Content-Type: application/yaml" | jq -r '.id')

CP_ID=$(curl -sX POST --data-binary @cp-schematic.yaml \
  https://factory.talos.dev/schematics -H "Content-Type: application/yaml" | jq -r '.id')

echo "Worker schematic: ${WORKER_ID}"
echo "Control plane schematic: ${CP_ID}"
```

## Self-Hosted Image Factory

For air-gapped environments or when you need complete control, you can run your own Image Factory instance.

```bash
# Run Image Factory locally
docker run -d \
  --name image-factory \
  -p 8080:8080 \
  -v /var/lib/image-factory:/data \
  ghcr.io/siderolabs/image-factory:latest

# Submit schematics to your local instance
curl -sX POST \
  --data-binary @schematic.yaml \
  http://localhost:8080/schematics \
  -H "Content-Type: application/yaml"
```

A self-hosted instance requires access to the extension images and Talos base images, either from the internet or from a local registry mirror.

## Scripting Image Factory Workflows

Automate your image management with scripts.

```bash
#!/bin/bash
# generate-images.sh - Generate all images for a Talos release

TALOS_VERSION="v1.7.0"
SCHEMATIC_FILE="schematic.yaml"

# Submit schematic
SCHEMATIC_ID=$(curl -sX POST \
  --data-binary @${SCHEMATIC_FILE} \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" | jq -r '.id')

echo "Schematic ID: ${SCHEMATIC_ID}"

# Download all image formats
mkdir -p images/${TALOS_VERSION}

# ISO
curl -Lo "images/${TALOS_VERSION}/talos-amd64.iso" \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/metal-amd64.iso"

# Raw disk
curl -Lo "images/${TALOS_VERSION}/talos-metal.raw.xz" \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/metal-amd64.raw.xz"

echo "Images downloaded to images/${TALOS_VERSION}/"
echo "Installer: factory.talos.dev/installer/${SCHEMATIC_ID}:${TALOS_VERSION}"
```

## Conclusion

Image Factory eliminates the need to maintain a local build environment for custom Talos Linux images. By describing your customizations in a simple YAML schematic, you get access to ISOs, disk images, and installer images across all supported platforms and architectures. The deterministic schematic IDs make builds reproducible, and the caching system keeps subsequent requests fast. Whether you are deploying a small lab cluster or managing hundreds of nodes across multiple environments, Image Factory provides a clean, maintainable workflow for custom Talos image generation.
