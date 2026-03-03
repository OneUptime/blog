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
# ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules
# ghcr.io/siderolabs/zfs
# ghcr.io/siderolabs/iscsi-tools
# ghcr.io/siderolabs/tailscale
# ghcr.io/siderolabs/qemu-guest-agent
# ghcr.io/siderolabs/gvisor
```

You can also check the official Talos documentation for the most up-to-date list of supported extensions and their compatibility with your Talos version.

## Adding Extensions During Installation

The simplest way to add extensions is to include them in your machine configuration before installing Talos.

First, generate your machine configuration.

```bash
# Generate config with default settings
talosctl gen config my-cluster https://10.0.0.1:6443
```

Then edit the generated configuration to add extensions. Open the `controlplane.yaml` or `worker.yaml` file and add the extensions section.

```yaml
# controlplane.yaml or worker.yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.4
      - image: ghcr.io/siderolabs/qemu-guest-agent:v8.2.0
```

Apply the configuration to your node.

```bash
# Apply to a new node during initial setup
talosctl apply-config --insecure \
  --nodes 10.0.0.10 \
  --file controlplane.yaml
```

The node will download the extension images and include them in the installation.

## Adding Extensions to an Existing Cluster

If you have a running cluster and need to add extensions after the fact, you can update the machine configuration and trigger a reboot.

```bash
# Get the current machine config
talosctl -n 10.0.0.10 get machineconfig -o yaml > current-config.yaml

# Edit the config to add extensions
# Add under machine.install.extensions
```

Apply the updated configuration.

```bash
# Apply the config change
talosctl -n 10.0.0.10 apply-config --file current-config.yaml

# The node needs to be upgraded or reinstalled to apply new extensions
# Trigger an upgrade (even to the same version) to apply extensions
talosctl -n 10.0.0.10 upgrade \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

The upgrade process will reinstall the OS with the new extensions included.

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

```yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/tailscale:v1.62.0
  files:
    - content: |
        TS_AUTHKEY=tskey-auth-xxxxx
        TS_ROUTES=10.0.0.0/24
      permissions: 0o644
      path: /var/etc/tailscale/auth.env
      op: create
```

### Example: Configuring NVIDIA GPU

```yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules:535.129.03-v1.7.0
      - image: ghcr.io/siderolabs/nvidia-container-toolkit:535.129.03-v1.14.3
  kernel:
    modules:
      - name: nvidia
      - name: nvidia_uvm
      - name: nvidia_drm
      - name: nvidia_modeset
```

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

When upgrading Talos, make sure to update your extension versions to match.

```yaml
# Before Talos upgrade - check extension compatibility
machine:
  install:
    extensions:
      # Update these versions when upgrading Talos
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.5  # Updated for v1.8.0
      - image: ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules:535.129.03-v1.8.0
```

## Removing Extensions

To remove an extension, update the machine configuration to remove it from the extensions list and trigger an upgrade.

```bash
# Edit the machine config and remove the extension entry
# Then apply and upgrade
talosctl -n 10.0.0.10 apply-config --file updated-config.yaml
talosctl -n 10.0.0.10 upgrade \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

## Extension Load Order

Extensions are loaded in the order they appear in the configuration. This matters when one extension depends on another. For example, the NVIDIA container toolkit extension depends on the NVIDIA kernel module extension, so the kernel module extension should be listed first.

```yaml
machine:
  install:
    extensions:
      # Kernel modules first
      - image: ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules:535.129.03-v1.7.0
      # Then higher-level tools that depend on them
      - image: ghcr.io/siderolabs/nvidia-container-toolkit:535.129.03-v1.14.3
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
