# How to Use Image Factory Schematics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Factory, Schematics, Infrastructure as Code, DevOps

Description: A comprehensive guide to understanding and using Talos Image Factory schematics for declarative, reproducible image definitions.

---

Schematics are the core concept behind Talos Image Factory. They provide a declarative way to define exactly what goes into a Talos Linux image - from system extensions and kernel arguments to custom configurations. If you have used Dockerfiles to define container images, think of schematics as the equivalent for your operating system. They give you a versioned, reproducible definition that you can share across your team and track in source control.

This guide dives deep into how schematics work, their structure, and best practices for managing them in production environments.

## What Is a Schematic?

A schematic is a YAML document that describes the customizations you want applied to a standard Talos Linux image. When you submit a schematic to Image Factory, it gets hashed into a unique identifier. That identifier can then be used to generate images, installer containers, and boot assets that contain your specified customizations.

Here is the simplest possible schematic:

```yaml
# minimal-schematic.yaml
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
```

This tells Image Factory to include the iSCSI tools extension. That is it. The schematic format is intentionally simple and focused.

## Schematic Structure

The schematic YAML has a defined structure with several top-level fields:

```yaml
# Full schematic structure
customization:
  # System extensions to include in the image
  systemExtensions:
    officialExtensions:
      - siderolabs/extension-name-1
      - siderolabs/extension-name-2
  # Additional kernel boot arguments
  extraKernelArgs:
    - argument1=value1
    - argument2=value2
  # Meta values (key-value pairs stored in Talos metadata)
  meta:
    - key: 0xa
      value: "some-value"
```

### System Extensions

The `systemExtensions` section lists the extensions to include. Extensions must be referenced by their full name with the `siderolabs/` prefix:

```yaml
customization:
  systemExtensions:
    officialExtensions:
      # Storage extensions
      - siderolabs/iscsi-tools
      - siderolabs/util-linux-tools
      - siderolabs/zfs
      # Hardware firmware
      - siderolabs/intel-ucode
      - siderolabs/amd-ucode
      # Virtualization
      - siderolabs/qemu-guest-agent
      - siderolabs/vmtoolsd
```

### Extra Kernel Arguments

The `extraKernelArgs` section adds kernel command-line parameters. These are appended to the default kernel arguments that Talos uses:

```yaml
customization:
  extraKernelArgs:
    # Serial console output
    - console=ttyS0,115200n8
    # Traditional network interface naming
    - net.ifnames=0
    # Enable IOMMU
    - intel_iommu=on
    # Custom kernel parameters for performance tuning
    - transparent_hugepage=never
```

### Meta Values

Meta values are stored in a special metadata partition on the Talos disk. They can be used to pass configuration data to the system during boot:

```yaml
customization:
  meta:
    - key: 0xa
      value: "{\"some\": \"json-config\"}"
```

## The Schematic ID

When you submit a schematic to Image Factory, you get back an ID:

```bash
# Submit a schematic
curl -s -X POST --data-binary @my-schematic.yaml \
  https://factory.talos.dev/schematics

# Returns: {"id":"376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba"}
```

This ID is a content-addressable hash of the schematic. This has several important implications:

- **Deterministic**: The same schematic always produces the same ID, no matter when or where you submit it.
- **Immutable**: You cannot change a schematic after creation. If you need different extensions, you create a new schematic with a new ID.
- **Shareable**: You can share schematic IDs with teammates, store them in CI/CD variables, or embed them in documentation. Anyone with the ID can generate the same image.

## Working with Schematics in Practice

### Storing Schematics in Version Control

Treat your schematics as infrastructure code. Store them alongside your cluster configurations:

```text
# Repository structure
infrastructure/
  clusters/
    production/
      cluster-config.yaml
      schematic.yaml          # Production schematic
    staging/
      cluster-config.yaml
      schematic.yaml          # Staging schematic
  schematics/
    base.yaml                 # Shared base schematic
    gpu-nodes.yaml           # Schematic for GPU worker nodes
    storage-nodes.yaml       # Schematic for storage-heavy nodes
```

### Generating and Caching Schematic IDs

In your CI/CD pipeline, generate schematic IDs and cache them:

```bash
#!/bin/bash
# ci-generate-schematics.sh
# Run this in CI to generate schematic IDs for all environments

SCHEMATIC_DIR="./infrastructure/schematics"
OUTPUT_FILE="./schematic-ids.env"

# Clear previous output
> "${OUTPUT_FILE}"

# Process each schematic file
for file in "${SCHEMATIC_DIR}"/*.yaml; do
  name=$(basename "$file" .yaml)

  # Submit to Image Factory
  id=$(curl -s -X POST --data-binary @"$file" \
    https://factory.talos.dev/schematics | jq -r '.id')

  # Write to env file
  echo "SCHEMATIC_${name^^}=${id}" >> "${OUTPUT_FILE}"
  echo "Processed ${name}: ${id}"
done

# Source the file to use in subsequent steps
source "${OUTPUT_FILE}"
```

### Comparing Schematics

Since schematic IDs are content hashes, you can easily detect changes:

```bash
# Compare current schematic ID with what is deployed
CURRENT_ID=$(curl -s -X POST --data-binary @schematic.yaml \
  https://factory.talos.dev/schematics | jq -r '.id')

DEPLOYED_ID=$(talosctl get machinestatus --nodes 10.0.0.10 -o yaml | \
  yq '.spec.status.schematicId')

if [ "$CURRENT_ID" != "$DEPLOYED_ID" ]; then
  echo "Schematic has changed. Node needs an upgrade."
  echo "Current: $CURRENT_ID"
  echo "Deployed: $DEPLOYED_ID"
else
  echo "Schematics match. No upgrade needed."
fi
```

## Building Schematics for Different Node Roles

In many clusters, different node types need different extensions. Create separate schematics for each role:

```yaml
# control-plane-schematic.yaml
# Minimal extensions for control plane nodes
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/intel-ucode
```

```yaml
# worker-schematic.yaml
# Workers need storage and networking support
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/intel-ucode
      - siderolabs/iscsi-tools
      - siderolabs/util-linux-tools
```

```yaml
# gpu-worker-schematic.yaml
# GPU workers need NVIDIA drivers
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/intel-ucode
      - siderolabs/iscsi-tools
      - siderolabs/nvidia-container-toolkit
      - siderolabs/nvidia-open-gpu-kernel-modules
```

Then generate configs for each role:

```bash
# Generate schematic IDs
CP_ID=$(curl -s -X POST --data-binary @control-plane-schematic.yaml \
  https://factory.talos.dev/schematics | jq -r '.id')
WORKER_ID=$(curl -s -X POST --data-binary @worker-schematic.yaml \
  https://factory.talos.dev/schematics | jq -r '.id')

# Use different installer images per role
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --install-image factory.talos.dev/installer/${CP_ID}:v1.7.0

# Then patch worker configs with the worker installer
yq -i ".machine.install.image = \"factory.talos.dev/installer/${WORKER_ID}:v1.7.0\"" \
  worker.yaml
```

## Schematic Validation

Before submitting a schematic, validate it locally:

```bash
# Check YAML syntax
yamllint my-schematic.yaml

# Verify extension names are valid
curl -s https://factory.talos.dev/version/v1.7.0/extensions/official | \
  jq -r '.[].name' > valid-extensions.txt

# Check each extension in your schematic against the valid list
yq '.customization.systemExtensions.officialExtensions[]' my-schematic.yaml | \
  while read ext; do
    if ! grep -q "^${ext}$" valid-extensions.txt; then
      echo "WARNING: Unknown extension: ${ext}"
    fi
  done
```

## Migrating Between Schematics

When you need to change extensions on running nodes, the process involves creating a new schematic and upgrading:

```bash
# Create the new schematic with additional extensions
NEW_ID=$(curl -s -X POST --data-binary @updated-schematic.yaml \
  https://factory.talos.dev/schematics | jq -r '.id')

# Upgrade nodes to use the new schematic
talosctl upgrade --nodes 10.0.0.50 \
  --image factory.talos.dev/installer/${NEW_ID}:v1.7.0
```

Even if you are not changing the Talos version, upgrading with a new schematic ID will apply the new set of extensions.

## Wrapping Up

Schematics bring infrastructure-as-code principles to OS image management. By defining your image requirements in a simple YAML file, you get reproducible builds, easy version control, and straightforward collaboration. The content-addressable ID system ensures that identical requirements always produce identical images, eliminating the "works on my machine" problem at the OS level. Whether you are managing a single cluster or dozens of environments, schematics provide the foundation for consistent, auditable Talos Linux deployments.
