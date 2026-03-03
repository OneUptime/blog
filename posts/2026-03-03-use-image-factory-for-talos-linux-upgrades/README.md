# How to Use Image Factory for Talos Linux Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Factory, System Extensions, Kubernetes, Custom Images

Description: Learn how to use Talos Image Factory to build custom installer images with system extensions for seamless Talos Linux upgrades.

---

Image Factory is a service provided by Siderolabs that generates custom Talos Linux images on demand. Instead of manually building installer images that include your system extensions, kernel arguments, and other customizations, you submit a specification (called a schematic) and Image Factory produces the image for you. This is especially valuable during upgrades when you need matching images for a new Talos version.

## What Image Factory Does

At its core, Image Factory takes a base Talos release and layers your customizations on top. The result is a container image that you can use with `talosctl upgrade` or for fresh installations.

Customizations include:

- System extensions (iscsi-tools, qemu-guest-agent, nvidia drivers, etc.)
- Extra kernel arguments
- Custom overlay configurations
- Platform-specific settings

The generated images are cached, so requesting the same schematic and version combination multiple times returns the same image instantly.

## Understanding Schematics

A schematic is a YAML document that defines what customizations you want in your Talos image. Here is a basic example:

```yaml
# schematic.yaml
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/qemu-guest-agent
```

And a more complex example with kernel arguments:

```yaml
# schematic-advanced.yaml
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/qemu-guest-agent
      - siderolabs/intel-ucode
      - siderolabs/i915-ucode
  extraKernelArgs:
    - net.ifnames=0
    - biosdevname=0
```

The schematic does not include a Talos version. That is specified separately when you request the image, which means you can reuse the same schematic across multiple Talos versions.

## Using Image Factory via the Web Interface

The simplest way to use Image Factory is through the web interface at https://factory.talos.dev.

1. Select the target Talos version
2. Choose your platform (bare metal, cloud, VM)
3. Pick the system extensions you need
4. Add any extra kernel arguments
5. Download the generated image or copy the image URL

The web interface is great for one-off operations or when you are exploring which extensions are available.

## Using Image Factory via the API

For automation and reproducibility, use the API directly.

### Step 1: Create a Schematic

```bash
# Submit your schematic to get a schematic ID
SCHEMATIC_ID=$(curl -s -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" \
  --data-binary @schematic.yaml | jq -r '.id')

echo "Schematic ID: ${SCHEMATIC_ID}"
# Example output: 376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba
```

The schematic ID is a hash of your schematic content. The same input always produces the same ID, which makes it deterministic and cacheable.

### Step 2: Construct the Image URL

```bash
# The installer image URL follows this pattern:
# factory.talos.dev/installer/<schematic-id>:<talos-version>

TALOS_VERSION="v1.7.0"
INSTALLER_IMAGE="factory.talos.dev/installer/${SCHEMATIC_ID}:${TALOS_VERSION}"

echo "Installer image: ${INSTALLER_IMAGE}"
```

### Step 3: Use the Image for Upgrades

```bash
# Upgrade a node using the custom image
talosctl upgrade --nodes <node-ip> --image ${INSTALLER_IMAGE}
```

That is it. Image Factory builds the image on demand when it is first pulled, and caches it for subsequent requests.

## Generating Different Image Types

Image Factory can produce various image types beyond just installer containers:

```bash
# ISO for bare metal installation
# https://factory.talos.dev/image/<schematic-id>/<talos-version>/metal-amd64.iso

# Raw disk image
# https://factory.talos.dev/image/<schematic-id>/<talos-version>/metal-amd64.raw.xz

# AWS AMI
# https://factory.talos.dev/image/<schematic-id>/<talos-version>/aws-amd64.raw.xz

# VMware OVA
# https://factory.talos.dev/image/<schematic-id>/<talos-version>/vmware-amd64.ova
```

For upgrades, you typically only need the installer container image. The other formats are useful for provisioning new nodes.

## Managing Schematics for Different Node Roles

Control plane and worker nodes often need different extensions. Create separate schematics for each:

```bash
# Control plane schematic - minimal extensions
cat > cp-schematic.yaml <<EOF
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/intel-ucode
EOF

# Worker schematic - includes storage and hardware extensions
cat > worker-schematic.yaml <<EOF
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/intel-ucode
      - siderolabs/iscsi-tools
      - siderolabs/nvidia-open-gpu-kernel-modules
      - siderolabs/nvidia-container-toolkit
EOF

# Get schematic IDs
CP_ID=$(curl -s -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" \
  --data-binary @cp-schematic.yaml | jq -r '.id')

WORKER_ID=$(curl -s -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" \
  --data-binary @worker-schematic.yaml | jq -r '.id')

# Use different images for different node types
CP_IMAGE="factory.talos.dev/installer/${CP_ID}:v1.7.0"
WORKER_IMAGE="factory.talos.dev/installer/${WORKER_ID}:v1.7.0"
```

## Upgrading Across Talos Versions with the Same Schematic

One of the best features of Image Factory is schematic reuse. When you upgrade to a new Talos version, you just change the version tag:

```bash
# Same schematic, different versions
V16_IMAGE="factory.talos.dev/installer/${SCHEMATIC_ID}:v1.6.7"
V17_IMAGE="factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0"

# The schematic ID stays the same as long as your
# extension requirements do not change
```

This makes version upgrades predictable. You know exactly what extensions are included because the schematic has not changed.

## Verifying Image Contents

Before using an image for production upgrades, verify it contains what you expect:

```bash
# Pull the image and inspect its layers
crane config ${INSTALLER_IMAGE} | jq .

# Check the image manifest
crane manifest ${INSTALLER_IMAGE} | jq .

# You can also verify after installation by checking
# the extensions on a running node
talosctl get extensions --nodes <node-ip>
```

## Storing Schematics in Version Control

Keep your schematics in your infrastructure repository alongside other cluster configuration:

```text
infrastructure/
  talos/
    schematics/
      controlplane.yaml
      worker-standard.yaml
      worker-gpu.yaml
    configs/
      controlplane.yaml
      worker.yaml
    scripts/
      upgrade.sh
```

This way, your entire Talos configuration - including which extensions to use - is tracked and reviewable.

```bash
# upgrade.sh example
#!/bin/bash
TARGET_VERSION=$1

# Get schematic IDs from stored schematics
CP_ID=$(curl -s -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" \
  --data-binary @schematics/controlplane.yaml | jq -r '.id')

WORKER_ID=$(curl -s -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" \
  --data-binary @schematics/worker-standard.yaml | jq -r '.id')

CP_IMAGE="factory.talos.dev/installer/${CP_ID}:${TARGET_VERSION}"
WORKER_IMAGE="factory.talos.dev/installer/${WORKER_ID}:${TARGET_VERSION}"

echo "Control plane image: ${CP_IMAGE}"
echo "Worker image: ${WORKER_IMAGE}"

# Proceed with upgrade...
```

## Image Factory in Air-Gapped Environments

If your production cluster is air-gapped, use Image Factory on a connected machine to generate the images, then mirror them to your internal registry:

```bash
# Generate the image on a connected machine
crane copy ${INSTALLER_IMAGE} \
  registry.internal.example.com/talos/installer:v1.7.0-custom

# Use the mirrored image for upgrades
talosctl upgrade --nodes <node-ip> \
  --image registry.internal.example.com/talos/installer:v1.7.0-custom
```

## Summary

Image Factory simplifies Talos Linux upgrades by providing a reliable, reproducible way to generate custom installer images. Define your extensions in a schematic, submit it to get a schematic ID, and use that ID combined with the target Talos version to get your image. The same schematic works across versions, making upgrades a matter of changing a version tag. Store your schematics in version control and integrate Image Factory into your upgrade scripts for a streamlined, repeatable process.
