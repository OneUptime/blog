# How to Create Custom Installer Images with Image Factory

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Factory, Installer Images, Kubernetes, Cluster Management

Description: Learn how to create custom Talos Linux installer images using Image Factory for consistent node provisioning and upgrades across your cluster.

---

The Talos Linux installer image is a container image that handles the actual installation and upgrade of Talos on a node's disk. While the default installer works for basic deployments, production environments typically need a custom installer image that includes specific system extensions, firmware, and kernel configurations. Image Factory lets you create these custom installer images with a simple schematic definition.

This guide walks through creating custom installer images, using them in machine configurations, and managing them across your cluster lifecycle.

## Understanding the Installer Image

When you apply a machine configuration to a Talos node, the node pulls the installer image specified in the config and uses it to write Talos to the disk. The installer image contains the root filesystem, kernel, initramfs, and any system extensions. During upgrades, the new installer image replaces the existing OS partition while preserving configuration and state.

The default installer image is `ghcr.io/siderolabs/installer:v1.7.0`. A custom installer image from Image Factory looks like `factory.talos.dev/installer/{schematic-id}:v1.7.0`. Both work the same way, but the custom version includes your specified extensions.

## Creating a Custom Installer Image

### Step 1: Define Your Schematic

Create a YAML file that describes what your installer should contain:

```yaml
# installer-schematic.yaml
# Custom installer with storage and networking extensions
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/util-linux-tools
      - siderolabs/intel-ucode
      - siderolabs/i915-ucode
```

### Step 2: Get the Schematic ID

Submit the schematic to Image Factory:

```bash
# Submit and capture the schematic ID
SCHEMATIC_ID=$(curl -s -X POST \
  --data-binary @installer-schematic.yaml \
  https://factory.talos.dev/schematics | jq -r '.id')

echo "Schematic ID: ${SCHEMATIC_ID}"
# Save this ID - you will use it in machine configs
```

### Step 3: Reference the Installer in Machine Configs

When generating your Talos machine configuration, specify the custom installer image:

```bash
# Set your variables
CLUSTER_NAME="production"
CLUSTER_ENDPOINT="https://10.0.0.1:6443"
TALOS_VERSION="v1.7.0"
INSTALL_IMAGE="factory.talos.dev/installer/${SCHEMATIC_ID}:${TALOS_VERSION}"

# Generate configs with the custom installer
talosctl gen config ${CLUSTER_NAME} ${CLUSTER_ENDPOINT} \
  --install-image ${INSTALL_IMAGE}
```

This creates `controlplane.yaml` and `worker.yaml` files that reference your custom installer. Every node configured with these files will use your custom image.

### Step 4: Verify the Installer Image Reference

Check that the generated config includes the correct installer:

```bash
# Check the installer image in the control plane config
yq '.machine.install.image' controlplane.yaml
# Should output: factory.talos.dev/installer/{schematic-id}:v1.7.0

# Check the worker config too
yq '.machine.install.image' worker.yaml
```

## Using Custom Installers for Initial Provisioning

When provisioning new nodes, the workflow depends on how you boot them.

### PXE Boot Workflow

For PXE-booted nodes, the installer image is pulled after the node receives its machine configuration:

```bash
# Boot the node via PXE (it enters maintenance mode)
# Then apply the config with the custom installer
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file controlplane.yaml
```

The node will pull the custom installer image, write Talos to disk with all extensions included, and reboot.

### ISO Boot Workflow

If you are booting from an ISO, use a custom ISO from Image Factory with the same schematic:

```bash
# Download a matching ISO
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/metal-amd64.iso"

# Boot the server from this ISO, then apply config
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file controlplane.yaml
```

Using the same schematic for both the ISO and the installer ensures consistency. The ISO provides extensions during the initial boot, and the installer image ensures they persist after installation to disk.

## Upgrading with Custom Installer Images

One of the biggest advantages of custom installer images is seamless upgrades. When a new Talos version is released, you simply change the version tag:

```bash
# Upgrade a single node
talosctl upgrade --nodes 10.0.0.50 \
  --image factory.talos.dev/installer/${SCHEMATIC_ID}:v1.8.0

# Upgrade all control plane nodes sequentially
for node in 10.0.0.10 10.0.0.11 10.0.0.12; do
  echo "Upgrading ${node}..."
  talosctl upgrade --nodes ${node} \
    --image factory.talos.dev/installer/${SCHEMATIC_ID}:v1.8.0
  # Wait for the node to come back
  talosctl health --nodes ${node} --wait-timeout 5m
  echo "${node} upgraded successfully"
done
```

The schematic ID stays the same across versions, so your extensions carry forward automatically. Image Factory builds the new version with the same set of extensions.

## Patching Machine Configs to Change the Installer

If you need to change the installer image on an existing node, you can patch the machine configuration:

```bash
# Create a patch file to update the installer image
cat > installer-patch.yaml << 'EOF'
machine:
  install:
    image: factory.talos.dev/installer/NEW_SCHEMATIC_ID:v1.7.0
EOF

# Apply the patch to a running node
talosctl patch machineconfig --nodes 10.0.0.50 \
  --patch @installer-patch.yaml
```

The change takes effect on the next upgrade or reinstall. The currently running system is not affected until the installer is invoked again.

## Managing Installer Images Across Multiple Clusters

Large organizations often maintain different installer configurations for different purposes. Here is a practical approach to managing them:

```bash
#!/bin/bash
# manage-installers.sh - manage installer images for multiple environments

# Define schematics for each environment
declare -A SCHEMATICS
SCHEMATICS[bare-metal]="schematics/bare-metal.yaml"
SCHEMATICS[cloud-aws]="schematics/aws.yaml"
SCHEMATICS[cloud-azure]="schematics/azure.yaml"
SCHEMATICS[edge]="schematics/edge.yaml"

# Generate and store schematic IDs
for env in "${!SCHEMATICS[@]}"; do
  file="${SCHEMATICS[$env]}"
  if [ -f "$file" ]; then
    ID=$(curl -s -X POST --data-binary @"$file" \
      https://factory.talos.dev/schematics | jq -r '.id')
    echo "${env}=${ID}" >> installer-ids.env
    echo "Environment: ${env} -> Schematic ID: ${ID}"
  fi
done
```

Store the `installer-ids.env` file in your infrastructure repository so your CI/CD pipelines can reference the correct installer for each environment.

## Verifying the Installed Extensions

After a node has been provisioned or upgraded with a custom installer, verify that everything is in place:

```bash
# List installed extensions
talosctl get extensions --nodes 10.0.0.50

# Check the installed image version
talosctl get machinestatus --nodes 10.0.0.50 -o yaml | \
  yq '.spec.status.installedVersion'

# Verify specific extension functionality
# For example, check that iSCSI tools are available
talosctl read /proc/modules --nodes 10.0.0.50 | grep iscsi
```

## Handling Installer Image Pull Failures

If a node cannot pull the installer image, the upgrade or install will fail. Common causes and fixes:

- **Network issues**: Ensure the node can reach `factory.talos.dev` on port 443. Check firewall rules and DNS resolution.
- **Registry rate limits**: Image Factory serves images through a container registry. In high-volume environments, you may hit rate limits. Consider mirroring images to a local registry.
- **Invalid schematic ID**: Double-check that the schematic ID in your config matches what Image Factory returned. A single character difference will cause a 404 error.

```bash
# Test image pull from a machine with Docker access
docker pull factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0

# If the pull succeeds, the image is valid and available
```

## Mirroring Custom Installer Images

For air-gapped environments or to reduce external dependencies, mirror the custom installer to your private registry:

```bash
# Pull the image
docker pull factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0

# Tag for your private registry
docker tag factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0 \
  registry.internal.com/talos/installer:v1.7.0-custom

# Push to private registry
docker push registry.internal.com/talos/installer:v1.7.0-custom
```

Then reference your private registry in machine configs instead of `factory.talos.dev`.

## Wrapping Up

Custom installer images are a foundational piece of any Talos Linux deployment. They ensure that every node in your cluster, whether newly provisioned or recently upgraded, runs the exact same OS image with the exact same extensions. By leveraging Image Factory's schematic system, you maintain a single source of truth for your OS configuration that works across all Talos versions. Combined with proper version control and CI/CD integration, custom installer images make your infrastructure truly reproducible.
