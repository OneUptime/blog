# How to Add Custom Kernel Modules to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kernel Modules, System Extensions, Kubernetes, Infrastructure, Linux Kernel

Description: A detailed guide to adding custom kernel modules to Talos Linux through system extensions, including building modules, packaging them, and deploying to your cluster.

---

Talos Linux ships with a carefully curated set of kernel modules that cover the most common hardware and networking needs. But there are times when you need something extra - a specific storage driver, a hardware monitoring module, a custom network protocol, or support for specialized hardware. Since Talos does not allow you to install packages or compile modules on the running system, you need to build custom kernel modules as system extensions. This guide walks you through the entire process.

## Why Custom Kernel Modules?

The Talos kernel includes modules for standard hardware and common use cases. However, you might need custom modules for:

- **Specialized storage hardware** - RAID controllers, HBAs, or storage arrays with proprietary drivers
- **Network hardware** - NICs that need out-of-tree drivers
- **Hardware monitoring** - Sensors and management interfaces
- **Security modules** - Custom LSM modules or audit frameworks
- **Filesystem support** - Filesystems not included in the default kernel

## Understanding the Extension Build Process

Custom kernel modules for Talos must be packaged as OCI images following the Talos extension format. The process involves:

1. Setting up a build environment that matches the Talos kernel version
2. Compiling the kernel module against the Talos kernel headers
3. Packaging the compiled module as an OCI image
4. Deploying the extension to your Talos nodes

## Step 1: Identify Your Talos Kernel Version

Before building anything, you need to know the exact kernel version your Talos installation uses:

```bash
# Check the kernel version on a running Talos node
talosctl -n 192.168.1.10 version

# Get detailed kernel information
talosctl -n 192.168.1.10 read /proc/version

# List currently loaded modules
talosctl -n 192.168.1.10 read /proc/modules
```

Note the exact kernel version string - you will need it to match kernel headers during compilation.

## Step 2: Set Up the Build Environment

The Siderolabs team provides a packaging framework for building extensions. Clone the extensions repository to use it as a template:

```bash
# Clone the official extensions repository
git clone https://github.com/siderolabs/extensions.git
cd extensions

# Look at the structure of an existing extension for reference
ls storage/iscsi-tools/
# Dockerfile  README.md  manifest.yaml  vars.yaml
```

The key files are:

- **Dockerfile** - Defines the build process for the extension
- **manifest.yaml** - Describes the extension metadata
- **vars.yaml** - Build variables including versions

## Step 3: Create the Extension Structure

Create a new directory for your custom kernel module extension:

```bash
mkdir -p my-extension/my-kernel-module
cd my-extension/my-kernel-module
```

Create the manifest file:

```yaml
# manifest.yaml
version: v1alpha1
metadata:
  name: my-kernel-module
  version: 1.0.0
  author: Your Name
  description: Custom kernel module for XYZ hardware
  compatibility:
    talos:
      version: ">= v1.7.0"
```

## Step 4: Write the Build Dockerfile

The Dockerfile compiles the kernel module and packages it:

```dockerfile
# Dockerfile

# Stage 1: Build the kernel module
FROM ghcr.io/siderolabs/tools:v1.7.0 AS build

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    linux-headers-$(uname -r) \
    bc \
    kmod

# Copy module source code
COPY src/ /src/
WORKDIR /src

# Download kernel headers matching Talos
# The exact method depends on the Talos version
ARG KERNEL_VERSION
RUN make -C /lib/modules/${KERNEL_VERSION}/build M=/src modules

# Stage 2: Package the module
FROM scratch AS extension

# Copy the compiled module
COPY --from=build /src/*.ko /lib/modules/${KERNEL_VERSION}/extras/

# Copy the manifest
COPY manifest.yaml /
```

For a more realistic example, here is how you might build an out-of-tree driver:

```dockerfile
# Dockerfile for building a custom NIC driver

FROM ghcr.io/siderolabs/pkgs:v1.7.0 AS pkg-kernel

# Build stage
FROM ghcr.io/siderolabs/tools:v1.7.0 AS build

COPY --from=pkg-kernel / /

# Download the driver source
ARG DRIVER_VERSION=5.15.0
RUN curl -L https://example.com/driver-${DRIVER_VERSION}.tar.gz | \
    tar -xz -C /src

WORKDIR /src/driver-${DRIVER_VERSION}

# Build against the Talos kernel
RUN make \
    KERNEL_SRC=/lib/modules/*/build \
    modules

# Extension image
FROM scratch AS extension-layer

COPY --from=build /src/driver-*/my_driver.ko \
    /lib/modules/

COPY manifest.yaml /
```

## Step 5: Build the Extension Image

Build the OCI image:

```bash
# Build the extension
docker build -t my-registry.com/my-kernel-module:v1.0.0 .

# Push to your container registry
docker push my-registry.com/my-kernel-module:v1.0.0
```

If you are using the Talos pkgs framework, you can use their build system:

```bash
# Using the Siderolabs build framework
make REGISTRY=my-registry.com TAG=v1.0.0 my-kernel-module
```

## Step 6: Deploy the Extension to Talos

### Method 1: Include in Machine Configuration

Add the extension to your machine configuration:

```yaml
machine:
  install:
    image: ghcr.io/siderolabs/installer:v1.7.0
    extensions:
      - image: my-registry.com/my-kernel-module:v1.0.0
```

### Method 2: Use the Image Factory

If you prefer the Image Factory approach, create a schematic that includes your custom extension:

```bash
# Create a custom schematic
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/json" \
  -d '{
    "customization": {
      "systemExtensions": {
        "officialExtensions": [
          "siderolabs/iscsi-tools"
        ]
      },
      "extraKernelArgs": [],
      "meta": []
    }
  }'
```

For truly custom extensions (not in the official catalog), you need to build a custom installer image that bundles your extension.

### Method 3: Upgrade Existing Nodes

For already-running nodes, add the extension through an upgrade:

```bash
# Create a custom installer image that includes your extension
docker build -t my-registry.com/talos-installer-custom:v1.7.0 \
  --build-arg INSTALLER=ghcr.io/siderolabs/installer:v1.7.0 \
  --build-arg EXTENSION=my-registry.com/my-kernel-module:v1.0.0 \
  -f Dockerfile.installer .

# Upgrade the node with the custom installer
talosctl -n 192.168.1.10 upgrade \
  --image my-registry.com/talos-installer-custom:v1.7.0
```

## Step 7: Verify the Module is Loaded

After the node boots with the extension, verify the module is available:

```bash
# Check if the module is loaded
talosctl -n 192.168.1.10 read /proc/modules | grep my_module

# List all loaded kernel modules
talosctl -n 192.168.1.10 read /proc/modules

# Check dmesg for module loading messages
talosctl -n 192.168.1.10 dmesg | grep my_module

# Check installed extensions
talosctl -n 192.168.1.10 get extensions
```

## Loading Modules at Boot

Some modules need to be explicitly loaded. You can configure this in the machine configuration:

```yaml
machine:
  kernel:
    modules:
      - name: my_module
        parameters:
          - param1=value1
          - param2=value2
```

Apply this configuration:

```bash
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "add",
    "path": "/machine/kernel/modules/-",
    "value": {
      "name": "my_module",
      "parameters": ["param1=value1"]
    }
  }
]'
```

## Troubleshooting Custom Modules

### Module Fails to Load

```bash
# Check dmesg for error messages
talosctl -n 192.168.1.10 dmesg | grep -i "error\|fail\|my_module"

# Verify the module file exists
talosctl -n 192.168.1.10 ls /lib/modules/

# Check for version mismatch
talosctl -n 192.168.1.10 read /proc/version
```

The most common cause of failure is a version mismatch between the kernel headers used for compilation and the actual running kernel.

### Extension Does Not Appear

```bash
# Check extension loading logs
talosctl -n 192.168.1.10 get extensions -o yaml

# Check system logs for extension errors
talosctl -n 192.168.1.10 dmesg | grep -i extension
```

### Module Dependencies

If your module depends on other modules, make sure those dependencies are available:

```bash
# Check module dependencies
talosctl -n 192.168.1.10 read /lib/modules/$(uname -r)/modules.dep | grep my_module
```

## Best Practices

1. **Match kernel versions exactly** - Even a minor version mismatch can cause module loading failures. Always build against the exact kernel headers for your Talos version.

2. **Automate the build process** - Set up CI/CD to rebuild your extension whenever Talos releases a new version.

3. **Test thoroughly** - Test module loading on a single node before rolling it to the entire cluster.

4. **Keep source code versioned** - Maintain the module source and build scripts in version control.

5. **Document dependencies** - Record any firmware files, configuration, or other modules that your custom module requires.

6. **Plan for upgrades** - When upgrading Talos, you will need to rebuild your custom modules against the new kernel version. Plan this into your upgrade process.

Adding custom kernel modules to Talos Linux is more involved than running `modprobe` on a traditional system, but the extension approach ensures that your modifications are reproducible, versioned, and applied consistently across all nodes. Once you have the build pipeline set up, adding new modules or updating existing ones becomes a routine part of your cluster management workflow.
