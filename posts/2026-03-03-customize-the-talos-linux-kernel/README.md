# How to Customize the Talos Linux Kernel

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kernel Customization, Linux Kernel, Kubernetes, Operating System

Description: A practical guide to customizing the Talos Linux kernel, covering kernel configuration, patching, building, and deploying custom kernels to your cluster.

---

The Linux kernel is the foundation of every Talos Linux node. By default, Talos ships with a kernel configuration tuned for Kubernetes workloads, stripping out unnecessary drivers and features to keep the attack surface small. But sometimes the defaults are not enough. You might need a specific driver for your hardware, a kernel module that is disabled by default, or a performance tweak for your workload. Customizing the Talos kernel lets you address all of these scenarios.

This guide covers everything from understanding the default kernel configuration to building and deploying your own custom kernel on Talos Linux nodes.

## Why Customize the Kernel

There are several legitimate reasons to customize the Talos kernel:

- Your hardware requires a driver that is not included in the default build
- You need specific kernel features enabled, such as certain filesystems or network schedulers
- You want to tune kernel parameters that are compile-time options rather than runtime sysctls
- You are doing performance optimization and need to enable or disable specific subsystems
- You need to apply security patches ahead of the next official release

The tradeoff is that you take on the responsibility of maintaining your custom kernel across Talos upgrades. Keep this in mind before going down this path.

## Understanding the Default Kernel Configuration

Talos maintains its kernel configuration in the source repository. The configuration file determines which drivers, filesystems, and features are compiled into the kernel or built as modules.

```bash
# Clone the Talos repository
git clone https://github.com/siderolabs/talos.git
cd talos

# The kernel configuration is located at:
# pkg/kernel/build/config-amd64 (for AMD64)
# pkg/kernel/build/config-arm64 (for ARM64)
ls pkg/kernel/build/
```

You can inspect the current configuration to see what is enabled.

```bash
# View the kernel configuration
less pkg/kernel/build/config-amd64

# Search for a specific option
grep CONFIG_ZFS pkg/kernel/build/config-amd64
grep CONFIG_VFIO pkg/kernel/build/config-amd64
```

## Setting Up Your Build Environment

Before you can modify and build the kernel, you need the right tools installed.

```bash
# Install required packages (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  docker.io \
  git \
  make \
  golang

# Make sure Docker is running
sudo systemctl start docker
sudo systemctl enable docker
```

The actual kernel compilation happens inside Docker containers, so most of the heavy dependencies are handled automatically.

## Modifying the Kernel Configuration

There are two approaches to modifying the kernel configuration. You can edit the config file directly or use the interactive `menuconfig` tool.

### Direct Editing

For simple changes, editing the configuration file directly is the fastest approach.

```bash
# Enable a specific module (example: enabling VFIO for GPU passthrough)
# Change from "# CONFIG_VFIO is not set" to:
echo "CONFIG_VFIO=m" >> pkg/kernel/build/config-amd64
echo "CONFIG_VFIO_IOMMU_TYPE1=m" >> pkg/kernel/build/config-amd64
echo "CONFIG_VFIO_PCI=m" >> pkg/kernel/build/config-amd64
```

### Using menuconfig

For more complex changes, the interactive configuration tool is better because it handles dependencies automatically.

```bash
# Launch menuconfig inside the build container
make kernel-menuconfig

# This opens a terminal-based UI where you can:
# - Navigate with arrow keys
# - Press Y to include, N to exclude, M for module
# - Press / to search for options
# - Press ? for help on any option
```

The menuconfig tool saves the updated configuration back to the config file when you exit.

## Applying Kernel Patches

Sometimes you need to patch the kernel source code itself, not just change configuration options. This is common when backporting fixes or adding custom functionality.

```bash
# Create a directory for your patches
mkdir -p pkg/kernel/build/patches

# Place your patch files in the directory
# Patches should be in standard unified diff format
cp /path/to/my-fix.patch pkg/kernel/build/patches/

# Patches are applied in alphabetical order
# Use numeric prefixes to control the order
mv my-fix.patch pkg/kernel/build/patches/001-my-fix.patch
```

Here is an example of what a kernel patch looks like:

```diff
--- a/drivers/net/ethernet/mydriver/mydriver.c
+++ b/drivers/net/ethernet/mydriver/mydriver.c
@@ -100,6 +100,8 @@
 static int mydriver_init(void)
 {
+    /* Add custom initialization logic */
+    pr_info("Custom driver modification loaded\n");
     return 0;
 }
```

## Building the Custom Kernel

With your configuration changes and patches in place, you can now build the kernel.

```bash
# Build only the kernel
make kernel

# The build output will be in _out/
# Look for the vmlinuz file
ls -la _out/kernel/

# Build with a custom tag for identification
make kernel TAG=custom-kernel-v1
```

The kernel build takes around 15 to 30 minutes depending on your machine. Subsequent builds are faster if you have not changed many options.

## Building a Complete Image with the Custom Kernel

A standalone kernel is not very useful on its own. You need to build it into a complete Talos image.

```bash
# Build the initramfs with the custom kernel
make initramfs

# Build the installer image with everything included
make installer TAG=custom-kernel

# Build an ISO for bare metal deployment
make iso TAG=custom-kernel
```

The installer image bundles your custom kernel with the rest of the Talos components.

## Testing the Custom Kernel

Before deploying to production, test your custom kernel thoroughly.

```bash
# Create a local test cluster with QEMU
talosctl cluster create \
  --install-image=ghcr.io/siderolabs/installer:custom-kernel \
  --nodes 2

# Verify the kernel version on a node
talosctl -n <node-ip> dmesg | head -20

# Check that your custom modules are available
talosctl -n <node-ip> read /proc/modules

# Verify specific kernel configuration
talosctl -n <node-ip> read /proc/config.gz | gunzip | grep CONFIG_VFIO
```

Run your Kubernetes workloads on the test cluster to make sure everything functions correctly.

## Deploying the Custom Kernel

Once tested, push your custom image to a registry and upgrade your cluster.

```bash
# Push to your container registry
docker tag ghcr.io/siderolabs/installer:custom-kernel \
  registry.example.com/talos-installer:custom-kernel-v1.7.0
docker push registry.example.com/talos-installer:custom-kernel-v1.7.0

# Upgrade nodes one at a time
talosctl upgrade \
  --image registry.example.com/talos-installer:custom-kernel-v1.7.0 \
  --nodes <node-ip>

# Monitor the upgrade
talosctl -n <node-ip> dmesg | tail -50
```

Always upgrade one node at a time and verify it is healthy before proceeding to the next one. This rolling approach minimizes the risk of cluster-wide issues.

## Maintaining Your Custom Kernel

Keeping a custom kernel up to date requires some ongoing effort.

When a new Talos release comes out, you need to rebase your changes onto the new kernel configuration. Here is a workflow that helps:

```bash
# Fetch the latest Talos release
git fetch origin
git checkout v1.8.0

# Create a new branch for your customizations
git checkout -b custom-kernel-v1.8.0

# Apply your configuration changes
# Re-run menuconfig or patch the config file
make kernel-menuconfig

# Apply your patches (some may need updating)
cp patches/*.patch pkg/kernel/build/patches/

# Build and test
make installer TAG=custom-kernel-v1.8.0
```

Keep your patches and configuration changes in a separate repository so they are easy to apply to each new Talos release.

## Common Kernel Customizations

Here are some of the most frequently requested kernel customizations for Talos:

### Enabling GPU Passthrough (VFIO)

```
CONFIG_VFIO=m
CONFIG_VFIO_IOMMU_TYPE1=m
CONFIG_VFIO_PCI=m
CONFIG_VFIO_VIRQFD=m
```

### Enabling Additional Filesystem Support

```
CONFIG_XFS_FS=m
CONFIG_BTRFS_FS=m
CONFIG_ZFS=m
```

### Enabling Network Performance Features

```
CONFIG_TCP_CONG_BBR=m
CONFIG_NET_SCH_FQ=m
CONFIG_NET_SCH_FQ_CODEL=m
```

### Enabling Hardware Watchdog

```
CONFIG_WATCHDOG=y
CONFIG_WATCHDOG_CORE=y
CONFIG_SOFTDOG=m
```

## Verifying Kernel Changes at Runtime

After deploying your custom kernel, verify your changes are active.

```bash
# Check kernel version and build info
talosctl -n <node-ip> read /proc/version

# List loaded modules
talosctl -n <node-ip> read /proc/modules

# Check kernel command line
talosctl -n <node-ip> read /proc/cmdline

# Verify specific kernel parameters
talosctl -n <node-ip> read /proc/sys/net/core/rmem_max
```

## Conclusion

Customizing the Talos Linux kernel is a powerful capability that lets you tailor the operating system to your exact hardware and workload requirements. The process is straightforward thanks to the containerized build system, but it does come with the ongoing cost of maintaining your changes across releases. For most users, the default kernel and system extensions cover the common needs. But when you hit a case where you truly need kernel-level customization, knowing this process gives you the control you need without having to abandon Talos for a more traditional Linux distribution.
