# How to Build Talos Linux System Extensions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, System Extensions, Build, Kubernetes, Custom Module

Description: Step-by-step guide to building custom system extensions for Talos Linux, from setting up the development environment to packaging and testing your extensions.

---

System extensions are the official way to add functionality to Talos Linux without modifying the core OS image. They let you include kernel modules, firmware, system services, and other components that are not part of the default Talos installation. Sidero Labs maintains a collection of official extensions, but you can also build your own for custom requirements.

This guide walks you through the entire process of building Talos Linux system extensions, from understanding the extension format to packaging and deploying your custom extension.

## What Are System Extensions

System extensions in Talos Linux are OCI-compatible container images that contain additional files to be overlaid onto the root filesystem at boot time. They can include:

- Kernel modules (drivers)
- Firmware files
- System libraries
- Configuration files
- Container runtime plugins

Extensions are applied during the installation or upgrade process and become part of the immutable root filesystem. This means they persist across reboots but are replaced during upgrades.

## Extension Structure

Every Talos extension follows a specific directory structure inside the container image.

```text
/
├── manifest.yaml          # Extension metadata
├── rootfs/               # Files to overlay onto the root filesystem
│   ├── lib/
│   │   └── modules/      # Kernel modules go here
│   │       └── <version>/
│   ├── lib/
│   │   └── firmware/     # Firmware files
│   └── usr/
│       └── local/
│           └── lib/      # Shared libraries
│               └── containers/
│                   └── ...
```

The `manifest.yaml` file is critical. It describes the extension and its compatibility constraints.

```yaml
# manifest.yaml
version: v1alpha1
metadata:
  name: my-custom-extension
  version: 1.0.0
  author: Your Name
  description: A custom extension for Talos Linux
  compatibility:
    talos:
      version: ">= v1.7.0"
```

## Setting Up the Build Environment

The official extensions repository provides a solid reference for building extensions. Start by cloning it.

```bash
# Clone the official extensions repository
git clone https://github.com/siderolabs/extensions.git
cd extensions

# Examine the structure
ls -la

# Look at existing extensions for reference
ls extensions/
```

You will need the following tools installed:

```bash
# Install required tools
# Docker for building container images
sudo apt-get install -y docker.io

# crane for working with OCI images
go install github.com/google/go-containerregistry/cmd/crane@latest

# bldr - the Sidero Labs build tool
go install github.com/siderolabs/bldr@latest
```

## Creating a Simple Extension

Let us build a simple extension that adds a kernel module. We will use the structure from the official extensions as a template.

```bash
# Create extension directory structure
mkdir -p my-extension/{pkg,hack}

# Create the Pkgfile that defines the build
cat > my-extension/pkg/my-module/pkg.yaml << 'YAML'
name: my-module
variant: scratch
install:
  - artifacts:
      - /lib/modules
finalize:
  - from: /
    to: /rootfs
YAML
```

For a kernel module extension, the build process compiles the module against the Talos kernel headers and packages the resulting `.ko` file.

## Building a Kernel Module Extension

Here is a more complete example of building a real kernel module extension. We will build an extension for a hypothetical network driver.

```bash
# Create the build directory
mkdir -p custom-driver-extension

# Create the Dockerfile for building
cat > custom-driver-extension/Dockerfile << 'DOCKERFILE'
# Stage 1: Build the kernel module
FROM ghcr.io/siderolabs/tools:v1.7.0 AS build

# Install kernel headers
WORKDIR /src

# Copy the driver source code
COPY driver-source/ /src/driver/

# Build the kernel module
RUN cd /src/driver && \
    make -C /lib/modules/$(uname -r)/build M=/src/driver modules

# Stage 2: Create the extension image
FROM scratch

# Copy the manifest
COPY manifest.yaml /manifest.yaml

# Copy the compiled module to the correct location
COPY --from=build /src/driver/*.ko /rootfs/lib/modules/
DOCKERFILE
```

Create the manifest file.

```bash
cat > custom-driver-extension/manifest.yaml << 'YAML'
version: v1alpha1
metadata:
  name: custom-driver
  version: 1.0.0
  author: Your Team
  description: Custom network driver for Talos Linux
  compatibility:
    talos:
      version: ">= v1.7.0"
YAML
```

Build the extension.

```bash
# Build the extension image
cd custom-driver-extension
docker build -t ghcr.io/myorg/custom-driver:v1.0.0 .

# Verify the image contents
docker run --rm ghcr.io/myorg/custom-driver:v1.0.0 ls -R /rootfs/
```

## Using the Official Build System

The official extensions repository uses a more sophisticated build system based on `bldr` and `Pkgfile`. Here is how to use it for your own extensions.

```bash
# Navigate to the extensions repository
cd extensions

# Create your extension package
mkdir -p extensions/my-extension/

# Create the vars file
cat > extensions/my-extension/vars.yaml << 'YAML'
name: my-extension
version: "1.0.0"
YAML

# Create the Pkgfile
cat > extensions/my-extension/Pkgfile << 'YAML'
name: my-extension
variant: scratch
dependencies:
  - stage: tools
steps:
  - script: |
      # Build steps go here
      mkdir -p /rootfs/usr/local/bin
      cp /src/my-binary /rootfs/usr/local/bin/
finalize:
  - from: /rootfs
    to: /rootfs
YAML
```

Build using the Makefile.

```bash
# Build a specific extension
make my-extension PUSH=false

# Build with a custom registry
make my-extension REGISTRY=registry.example.com PUSH=true
```

## Building a Firmware Extension

Firmware extensions are simpler because they just need to include firmware files in the right location.

```bash
# Create the firmware extension
mkdir -p firmware-extension

cat > firmware-extension/Dockerfile << 'DOCKERFILE'
FROM scratch

COPY manifest.yaml /manifest.yaml
COPY firmware/ /rootfs/lib/firmware/
DOCKERFILE

cat > firmware-extension/manifest.yaml << 'YAML'
version: v1alpha1
metadata:
  name: custom-firmware
  version: 1.0.0
  author: Your Team
  description: Custom firmware files for specific hardware
  compatibility:
    talos:
      version: ">= v1.7.0"
YAML

# Place your firmware files
mkdir -p firmware-extension/firmware/
cp /path/to/firmware.bin firmware-extension/firmware/

# Build
docker build -t ghcr.io/myorg/custom-firmware:v1.0.0 firmware-extension/
```

## Testing Your Extension

Testing is an important step before deploying any custom extension. You can test locally using a QEMU-based Talos cluster.

```bash
# Generate a machine configuration with your extension
talosctl gen config test-cluster https://10.5.0.2:6443 \
  --install-image ghcr.io/siderolabs/installer:v1.7.0

# Edit the machine config to include your extension
# Add to the install section:
```

In your machine configuration, add the extension under the install section.

```yaml
machine:
  install:
    extensions:
      - image: ghcr.io/myorg/custom-driver:v1.0.0
```

Then create the cluster and verify the extension loaded correctly.

```bash
# Apply the configuration
talosctl apply-config --insecure \
  --nodes <node-ip> \
  --file controlplane.yaml

# After the node boots, check extensions
talosctl -n <node-ip> get extensions

# Verify your module is loaded
talosctl -n <node-ip> read /proc/modules | grep my_module
```

## Versioning and Compatibility

Extensions must declare their compatibility with Talos versions. This prevents an extension built for one Talos version from being used with an incompatible version.

```yaml
# Strict version match
compatibility:
  talos:
    version: "= v1.7.0"

# Minimum version
compatibility:
  talos:
    version: ">= v1.7.0"

# Version range
compatibility:
  talos:
    version: ">= v1.7.0, < v1.8.0"
```

When you upgrade Talos, you may need to rebuild your extensions against the new kernel headers or libraries.

## Publishing Extensions

Once your extension is built and tested, publish it to a container registry.

```bash
# Tag for your registry
docker tag ghcr.io/myorg/custom-driver:v1.0.0 \
  registry.example.com/talos-extensions/custom-driver:v1.0.0

# Push to registry
docker push registry.example.com/talos-extensions/custom-driver:v1.0.0

# Verify it is accessible
crane manifest registry.example.com/talos-extensions/custom-driver:v1.0.0
```

## Automating Extension Builds

For ongoing maintenance, automate the extension build process.

```yaml
# .github/workflows/build-extension.yml
name: Build Extension
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build extension
        run: docker build -t ${{ env.REGISTRY }}/custom-driver:${{ github.ref_name }} .
      - name: Push extension
        run: docker push ${{ env.REGISTRY }}/custom-driver:${{ github.ref_name }}
```

## Conclusion

Building custom system extensions for Talos Linux gives you the flexibility to add whatever your cluster needs while keeping the core OS minimal and secure. The OCI image format makes extensions portable and easy to manage with standard container tools. Whether you need a kernel module for specialized hardware, custom firmware, or additional system services, the extension system provides a clean way to extend Talos without forking the entire project. Start with the official extensions repository as a reference, and you will have your own extensions running in no time.
