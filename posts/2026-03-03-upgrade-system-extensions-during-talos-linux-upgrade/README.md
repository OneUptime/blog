# How to Upgrade System Extensions During Talos Linux Upgrade

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, System Extensions, Kubernetes, Upgrade, Image Factory

Description: Learn how to properly upgrade system extensions alongside your Talos Linux OS upgrade using Image Factory and custom installer images.

---

System extensions in Talos Linux add functionality that the base OS does not include - things like iSCSI support, QEMU guest agent, ZFS drivers, and various other tools. When you upgrade Talos, these extensions need to be upgraded as well. They are tightly coupled to the Talos version, so an extension built for v1.6 will not work on v1.7. Getting this right is essential for a clean upgrade.

## Understanding System Extensions in Talos

Unlike traditional Linux distributions where you install packages independently, Talos takes a different approach. System extensions are baked into the OS image at build time. They become part of the immutable root filesystem and cannot be added, removed, or updated at runtime.

This means that when you upgrade Talos, you need a new installer image that includes the correct versions of all your extensions for the new Talos release.

```bash
# Check what extensions are currently installed on a node
talosctl get extensions --nodes <node-ip>

# Example output:
# NODE        NAMESPACE   TYPE              ID                   VERSION
# 10.0.0.1    runtime     ExtensionStatus   iscsi-tools          1
# 10.0.0.1    runtime     ExtensionStatus   qemu-guest-agent     1
# 10.0.0.1    runtime     ExtensionStatus   intel-ucode          1
```

## Finding Compatible Extension Versions

Every Talos release has a corresponding set of extension builds. The Siderolabs team publishes extensions in the `ghcr.io/siderolabs` container registry, tagged with the Talos version they support.

```bash
# Extension images follow this naming pattern:
# ghcr.io/siderolabs/<extension-name>:<extension-version>

# For example:
# ghcr.io/siderolabs/iscsi-tools:v0.1.4
# ghcr.io/siderolabs/qemu-guest-agent:v8.2.0

# Check the extensions repository for available versions
# https://github.com/siderolabs/extensions
```

The key point is that you cannot mix extension versions across Talos versions. If you are upgrading to Talos v1.7.0, you need extensions that were built for v1.7.0.

## Using Image Factory

Image Factory is the recommended way to build custom Talos installer images that include system extensions. It is a web service provided by Siderolabs that generates images on demand.

### Using the Web Interface

1. Visit https://factory.talos.dev
2. Select your target Talos version
3. Choose the extensions you need
4. Select your platform (metal, AWS, GCP, etc.)
5. Get the generated installer image URL

### Using the API

You can also interact with Image Factory programmatically:

```bash
# Create a schematic that defines your extensions
cat > schematic.yaml <<EOF
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/qemu-guest-agent
      - siderolabs/intel-ucode
EOF

# Submit the schematic to Image Factory
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" \
  --data-binary @schematic.yaml

# The response will include a schematic ID, for example:
# {"id":"abc123def456..."}

# Use the schematic ID to construct the installer image URL
# Format: factory.talos.dev/installer/<schematic-id>:<talos-version>
INSTALLER_IMAGE="factory.talos.dev/installer/abc123def456:v1.7.0"
```

This gives you a stable, reproducible way to generate installer images with the same set of extensions for any Talos version.

## Step-by-Step Extension Upgrade Process

### 1. Document Current Extensions

```bash
# List extensions on each node type
# Control plane nodes might have different extensions than workers
talosctl get extensions --nodes <cp-node-ip>
talosctl get extensions --nodes <worker-node-ip>

# Save the extension list
talosctl get extensions --nodes <cp-node-ip> -o yaml > cp-extensions.yaml
talosctl get extensions --nodes <worker-node-ip> -o yaml > worker-extensions.yaml
```

### 2. Generate New Installer Images

If control plane and worker nodes have different extensions, you need separate installer images:

```bash
# Control plane schematic
cat > cp-schematic.yaml <<EOF
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/intel-ucode
EOF

# Worker schematic (with storage extensions)
cat > worker-schematic.yaml <<EOF
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/intel-ucode
      - siderolabs/iscsi-tools
      - siderolabs/qemu-guest-agent
EOF

# Get schematic IDs from Image Factory
CP_SCHEMATIC_ID=$(curl -s -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" \
  --data-binary @cp-schematic.yaml | jq -r '.id')

WORKER_SCHEMATIC_ID=$(curl -s -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" \
  --data-binary @worker-schematic.yaml | jq -r '.id')

# Construct installer image URLs
CP_IMAGE="factory.talos.dev/installer/${CP_SCHEMATIC_ID}:v1.7.0"
WORKER_IMAGE="factory.talos.dev/installer/${WORKER_SCHEMATIC_ID}:v1.7.0"

echo "Control plane image: ${CP_IMAGE}"
echo "Worker image: ${WORKER_IMAGE}"
```

### 3. Verify the Images

Before using the images for a real upgrade, verify they contain the expected extensions:

```bash
# Pull and inspect the image
crane config ${CP_IMAGE} | jq '.config.Labels'

# Or check the image manifest
crane manifest ${CP_IMAGE} | jq .
```

### 4. Upgrade with the Custom Images

Now run the upgrade using the appropriate image for each node type:

```bash
# Upgrade control plane nodes with the CP image
talosctl upgrade --nodes <cp-node-1> --image ${CP_IMAGE}

# Wait for the node to come back
talosctl health --nodes <cp-node-1> --wait-timeout 5m

# Verify extensions are installed correctly
talosctl get extensions --nodes <cp-node-1>

# Continue with remaining control plane nodes
talosctl upgrade --nodes <cp-node-2> --image ${CP_IMAGE}
talosctl upgrade --nodes <cp-node-3> --image ${CP_IMAGE}

# Then upgrade workers with the worker image
talosctl upgrade --nodes <worker-node-1> --image ${WORKER_IMAGE}
talosctl upgrade --nodes <worker-node-2> --image ${WORKER_IMAGE}
```

### 5. Validate Extensions Post-Upgrade

After each node comes back, verify that the extensions are present and functional:

```bash
# Check extension status
talosctl get extensions --nodes <node-ip>

# For storage extensions like iscsi-tools, verify the
# relevant kernel modules are loaded
talosctl read /proc/modules --nodes <node-ip> | grep iscsi

# Check system logs for extension-related messages
talosctl dmesg --nodes <node-ip> | grep -i extension
```

## Adding or Removing Extensions During Upgrade

An upgrade is also a good time to add new extensions or remove ones you no longer need. Simply update your schematic to reflect the desired state:

```bash
# Adding a new extension
cat > updated-schematic.yaml <<EOF
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/intel-ucode
      - siderolabs/iscsi-tools
      - siderolabs/qemu-guest-agent
      - siderolabs/zfs    # New extension
EOF
```

Since the upgrade replaces the entire OS image, the new image will include exactly the extensions specified in the schematic, nothing more and nothing less.

## Handling Extension Deprecation

Sometimes extensions are deprecated or replaced between Talos versions. Check the release notes and extension repository for any changes. If an extension you rely on has been deprecated:

- Look for a replacement extension
- Check if the functionality was merged into the base Talos image
- Evaluate whether you still need the functionality

## Troubleshooting Extension Issues

If an extension is not working after upgrade:

```bash
# Check extension status in detail
talosctl get extensions --nodes <node-ip> -o yaml

# Look for errors in system logs
talosctl logs controller-runtime --nodes <node-ip> | grep extension

# Verify the installer image actually included the extension
talosctl version --nodes <node-ip>
# Compare the image digest with what you expected
```

## Summary

Upgrading system extensions during a Talos Linux upgrade requires generating new installer images that include the correct extension versions for the target Talos release. Image Factory makes this process manageable by letting you define schematics that can be reused across versions. Always verify that extensions are working after the upgrade, and use the upgrade as an opportunity to review whether your extension set still matches your needs.
