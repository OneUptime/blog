# How to Use Talos Image Factory for Custom Images

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Factory, Custom Images, Kubernetes, Infrastructure

Description: Learn how to use Talos Image Factory to build custom images tailored to your infrastructure needs, including system extensions and platform-specific configurations.

---

Talos Linux takes a unique approach to operating system management by treating the OS as immutable and API-driven. One of the most powerful tools in the Talos ecosystem is Image Factory, a service that lets you build custom Talos Linux images with specific extensions, kernel arguments, and platform configurations baked right in. If you have ever struggled with post-boot configuration or wanted a single image that includes everything your nodes need from the start, Image Factory is the answer.

In this guide, we will walk through the entire process of using Talos Image Factory to create custom images for your clusters.

## What Is Talos Image Factory?

Image Factory is a hosted service provided by Sidero Labs that generates Talos Linux images on demand. Instead of downloading a generic Talos image and then layering on extensions after boot, you define a schematic that describes exactly what your image should contain. Image Factory then builds a custom image based on that schematic.

The service is available at `factory.talos.dev` and provides both a web UI and an API. You can use it to generate ISOs, disk images, installer images, and PXE boot assets - all customized to your specifications.

## Why Use Custom Images?

There are several practical reasons to build custom images rather than using the stock Talos release:

- **Hardware support**: Your servers may need specific drivers or firmware that are not included in the default image. Network cards, storage controllers, and GPU devices often require additional kernel modules.
- **Platform requirements**: Different deployment targets like AWS, Azure, VMware, or bare metal each have their own requirements for guest agents, cloud-init providers, and disk layouts.
- **Reproducibility**: By defining your image as a schematic, you can rebuild the exact same image at any time. This is valuable for auditing, disaster recovery, and consistent deployments across environments.
- **Reduced boot time**: When extensions are baked into the image, nodes do not need to download and install them on first boot. This can shave minutes off your provisioning time.

## Understanding Schematics

A schematic is a YAML document that describes the customizations you want in your image. Here is a basic example:

```yaml
# schematic.yaml - defines custom image contents
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/intel-ucode
      - siderolabs/i915-ucode
      - siderolabs/iscsi-tools
```

This schematic tells Image Factory to include Intel microcode updates, i915 firmware for Intel graphics, and iSCSI tools in the generated image. The schematic gets hashed into a unique ID that you can reference when pulling images.

## Creating Your First Custom Image

Let's walk through the process step by step.

### Step 1: Define Your Schematic

Start by creating a schematic file that lists the extensions you need:

```yaml
# my-schematic.yaml
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/util-linux-tools
      - siderolabs/qemu-guest-agent
  extraKernelArgs:
    - net.ifnames=0
```

This schematic includes iSCSI tools for storage, util-linux tools for disk management, the QEMU guest agent for virtualization platforms, and a kernel argument to use traditional network interface naming.

### Step 2: Submit the Schematic

You can submit your schematic to Image Factory using curl:

```bash
# Submit the schematic and get back an ID
curl -X POST --data-binary @my-schematic.yaml \
  https://factory.talos.dev/schematics

# Response will look like:
# {"id":"376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba"}
```

The returned ID is a content hash of your schematic. This means the same schematic will always produce the same ID, and you can safely share these IDs across your team.

### Step 3: Generate an Image URL

With your schematic ID, you can construct URLs for any image type:

```bash
# Download an ISO for AMD64
SCHEMATIC_ID="376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba"
TALOS_VERSION="v1.7.0"

# ISO download URL
wget https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/metal-amd64.iso

# Installer image (for use in machine configs)
# This is a container image reference
echo "factory.talos.dev/installer/${SCHEMATIC_ID}:${TALOS_VERSION}"
```

### Step 4: Use the Custom Installer in Machine Configs

When generating your Talos machine configuration, reference the custom installer image:

```bash
# Generate machine configs with the custom installer
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --install-image factory.talos.dev/installer/${SCHEMATIC_ID}:${TALOS_VERSION}
```

This ensures that when nodes are installed or upgraded, they use your custom image with all extensions included.

## Using the Web Interface

If you prefer a graphical approach, the Image Factory web UI at `https://factory.talos.dev` provides an interactive way to select extensions and generate images. You can browse available extensions, toggle the ones you need, and download images directly from the browser.

The web UI also shows you the equivalent schematic YAML, so you can save it for automation later.

## Upgrading Nodes with Custom Images

When it is time to upgrade your cluster to a new Talos version, you simply change the version in the image URL while keeping the same schematic ID:

```bash
# Upgrade a node to a new version with the same extensions
talosctl upgrade --nodes 10.0.0.2 \
  --image factory.talos.dev/installer/${SCHEMATIC_ID}:v1.8.0
```

Because the schematic ID is stable, your extensions carry forward to the new version automatically.

## Listing Available Extensions

You can query Image Factory to see what extensions are available:

```bash
# List official extensions for a specific Talos version
curl -s https://factory.talos.dev/version/v1.7.0/extensions/official | jq .
```

This returns a JSON array of all supported extensions, including their names and descriptions.

## Best Practices

Here are a few things to keep in mind when working with Image Factory:

- **Version pin your schematics**: Store your schematic YAML files in version control alongside your cluster configuration. This makes it easy to track what changed and when.
- **Test new images before rolling them out**: Build and test custom images in a staging environment before upgrading production nodes.
- **Keep extensions minimal**: Only include the extensions you actually need. Each additional extension increases the image size and the potential attack surface.
- **Use the installer image, not raw ISOs, for upgrades**: The installer image is designed for in-place upgrades and handles partition management correctly.

## Troubleshooting Common Issues

If your custom image does not boot or behaves unexpectedly, check these common issues:

- **Wrong architecture**: Make sure you are downloading the correct architecture (amd64 vs arm64) for your hardware.
- **Extension conflicts**: Some extensions may conflict with each other. Check the extension documentation for known incompatibilities.
- **Schematic syntax errors**: Validate your YAML before submitting it. A missing dash or incorrect indentation can cause the build to fail silently.

## Wrapping Up

Talos Image Factory simplifies the process of building custom Talos Linux images. By defining your requirements as a schematic, you get reproducible, version-controlled images that include exactly what your infrastructure needs. Whether you are running on bare metal with specialized hardware or deploying to cloud platforms with specific agent requirements, Image Factory gives you a clean, declarative way to manage your OS images. The combination of schematics, stable IDs, and the ability to generate images for any supported version makes it a core part of any serious Talos Linux deployment.
