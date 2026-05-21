# How to Add System Extensions to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, System Extensions, Kubernetes, Configuration, Cluster Management

Description: Learn how to add and manage system extensions on Talos Linux, including installing official extensions, configuring them in machine configs, and verifying they load correctly.

---

System extensions are the primary mechanism for adding functionality to Talos Linux beyond what ships in the base image. Since Talos is an immutable operating system, you cannot simply SSH in and install packages. Instead, extensions are layered onto the root filesystem during boot, providing kernel modules, firmware, container runtimes, and other system-level components in a clean, reproducible way.

This guide explains how to find, install, configure, and manage system extensions on your Talos Linux cluster.

## Understanding System Extensions

Talos Linux is intentionally minimal. The base image contains only what is needed to run Kubernetes. Everything else - from storage drivers to GPU support to VPN clients - is delivered through system extensions.

Extensions are OCI container images that contain files to be overlaid onto the root filesystem. They are specified in the machine configuration and applied during installation or upgrade. Once applied, they become part of the immutable filesystem and persist across reboots.

## Finding Available Extensions

Sidero Labs maintains a collection of official extensions that cover common use cases. You can browse them in the extensions repository.

```bash
# List official extensions using crane

crane ls ghcr.io/siderolabs

# Some commonly used extensions:
# ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules-production
# ghcr.io/siderolabs/zfs
# ghcr.io/siderolabs/iscsi-tools
# ghcr.io/siderolabs/tailscale
# ghcr.io/siderolabs/qemu-guest-agent
# ghcr.io/siderolabs/gvisor
```

You can also check the official Talos documentation for the most up-to-date list of supported extensions and their compatibility with your Talos version.

## Adding Extensions During Installation

The recommended way to add extensions is to bake them into a custom installer image using Image Factory, then point `machine.install.image` at that custom installer. The legacy `.machine.install.extensions` field was deprecated in Talos v1.5 and has no effect starting with Talos v1.10, so any new setup should use Image Factory (covered later in this post).

First, generate your machine configuration.

```bash
# Generate config with default settings
talosctl gen config my-cluster https://10.0.0.1:6443
```

Then edit the generated configuration to point at a custom installer image that already contains your extensions (generated via Image Factory - see the section below).

```yaml
# controlplane.yaml or worker.yaml
machine:
  install:
    # Custom installer built by Image Factory with the extensions baked in
    image: factory.talos.dev/installer/<schematic-id>:v1.7.6
```

Apply the configuration to your node.

```bash
# Apply to a new node during initial setup
talosctl apply-config --insecure \
  --nodes 10.0.0.10 \
  --file controlplane.yaml
```

The node will pull the custom installer image, which already contains the extensions, and use it for the installation.

## Adding Extensions to an Existing Cluster

If you have a running cluster and need to add extensions after the fact, generate a new Image Factory schematic that includes the extra extensions, then trigger an upgrade pointing at the new custom installer image. Extensions are part of the immutable installer image, so adding them always requires an upgrade - there is no way to load them at runtime without rebooting into a new install image.

```bash
# Submit a schematic that includes the extensions you want
# (see the Image Factory section for the schematic format)
curl -X POST --data-binary @schematic.yaml https://factory.talos.dev/schematics

# The response returns a schematic ID, for example:
# {"id":"376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba"}
```

Trigger the upgrade using the custom installer image:

```bash
# Upgrade to the same (or new) Talos version using the custom installer
talosctl -n 10.0.0.10 upgrade \
  --image factory.talos.dev/installer/<schematic-id>:v1.7.6
```

The upgrade process will reinstall the OS from the custom installer, which already contains the new extensions.

## Using Image Factory for Extensions

Image Factory is a service provided by Sidero Labs that generates custom Talos images with extensions pre-baked in. This is often easier than managing extensions in machine configs.

```bash
# Generate a schematic that includes your desired extensions
cat > schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/qemu-guest-agent
      - siderolabs/tailscale
EOF

# Submit the schematic to Image Factory
curl -X POST --data-binary @schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml"

# The response includes a schematic ID
# Use it to download custom images
# https://factory.talos.dev/image/<schematic-id>/v1.7.0/metal-amd64.iso
```

The advantage of Image Factory is that extensions are baked into the image itself, so nodes do not need to pull extension images separately during installation.

## Configuring Extensions

Some extensions require additional configuration in the machine config. This is typically done through extra kernel arguments, environment variables, or config file patches.

### Example: Configuring Tailscale

The Tailscale extension is configured via an `ExtensionServiceConfig` document, which is applied as a separate machine config document alongside the main `MachineConfig`:

```yaml
apiVersion: v1alpha1
kind: ExtensionServiceConfig
name: tailscale
environment:
  - TS_AUTHKEY=tskey-auth-xxxxx
  - TS_ROUTES=10.0.0.0/24
```

### Example: Configuring NVIDIA GPU

NVIDIA extensions are now published in `-production` and `-lts` variants - pick the one matching your driver branch.

```yaml
machine:
  kernel:
    modules:
      - name: nvidia
      - name: nvidia_uvm
      - name: nvidia_drm
      - name: nvidia_modeset
```

Combine this with an Image Factory schematic that includes both the NVIDIA kernel module extension (for example `siderolabs/nvidia-open-gpu-kernel-modules-production`) and `siderolabs/nvidia-container-toolkit-production`.

## Verifying Extensions

After installing or upgrading with extensions, verify they are properly loaded.

```bash
# List installed extensions
talosctl -n 10.0.0.10 get extensions

# Example output:
# NODE       NAMESPACE   TYPE        ID                    VERSION   NAME              VERSION
# 10.0.0.10  runtime     Extension   0                     1         iscsi-tools       v0.1.4
# 10.0.0.10  runtime     Extension   1                     1         qemu-guest-agent  v8.2.0

# Check extension details
talosctl -n 10.0.0.10 get extensions -o yaml

# Verify kernel modules from extensions are loaded
talosctl -n 10.0.0.10 read /proc/modules

# Check system logs for extension-related messages
talosctl -n 10.0.0.10 dmesg | grep -i "extension\|module"
```

## Managing Extension Versions

Extensions are versioned independently from Talos itself. However, many extensions are tied to specific Talos versions because they include kernel modules compiled against a particular kernel version.

```bash
# Check available versions of an extension
crane ls ghcr.io/siderolabs/iscsi-tools

# Tags often include the Talos version they are compatible with
# Example: v0.1.4 (check the extension docs for compatibility)
```

When upgrading Talos, make sure to generate a new Image Factory schematic that pins the matching extension versions and use the resulting custom installer for the upgrade.

```yaml
# schematic.yaml - generate a new schematic ID when bumping Talos versions
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/nvidia-open-gpu-kernel-modules-production
```

## Removing Extensions

To remove an extension, generate a new Image Factory schematic without that extension and trigger an upgrade pointing at the new custom installer.

```bash
# After submitting the new schematic and getting a new ID:
talosctl -n 10.0.0.10 upgrade \
  --image factory.talos.dev/installer/<new-schematic-id>:v1.7.6
```

## Extension Dependencies

Some extensions depend on others - for example, the NVIDIA container toolkit extension depends on the NVIDIA kernel module extension. When using Image Factory, include both in the same schematic; Image Factory will compose them into a single installer image.

```yaml
# schematic.yaml
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/nvidia-open-gpu-kernel-modules-production
      - siderolabs/nvidia-container-toolkit-production
```

## Troubleshooting Extension Issues

If an extension is not working as expected, here are some debugging steps.

```bash
# Check if the extension was recognized during boot
talosctl -n 10.0.0.10 dmesg | grep -i extension

# Look at the installation log
talosctl -n 10.0.0.10 logs machined

# Verify the extension image is accessible
crane manifest ghcr.io/siderolabs/iscsi-tools:v0.1.4

# Check for compatibility issues
talosctl -n 10.0.0.10 get extensions -o yaml
# Look for any error messages in the status field
```

Common issues include version mismatches between the extension and Talos version, registry authentication problems, and network issues preventing the extension image from being pulled.

## Conclusion

System extensions are the right way to customize Talos Linux for your specific needs. They maintain the immutable, secure nature of the operating system while giving you the flexibility to add drivers, tools, and services as needed. Whether you are using official extensions from Sidero Labs or building your own, the process is straightforward and integrates naturally with the Talos configuration management workflow. Start with the extensions you need, verify they load correctly, and keep them updated alongside your Talos version to maintain a healthy cluster.
