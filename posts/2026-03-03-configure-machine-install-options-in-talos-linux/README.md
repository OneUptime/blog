# How to Configure Machine Install Options in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Machine Configuration, Installation, Kubernetes, Linux

Description: Learn how to configure machine install options in Talos Linux including disk selection, kernel arguments, and image configuration for reliable cluster deployments.

---

When you deploy Talos Linux, one of the first things you need to get right is the machine install configuration. This section of the machine config determines which disk Talos writes to, what kernel arguments get passed at boot, which container image is used for the installer, and several other options that shape how the operating system lands on your hardware. Getting these details wrong can lead to failed boots, data loss on the wrong disk, or clusters that simply refuse to come up.

In this guide, we will walk through every important install option, show you how to set each one, and share practical examples you can adapt for your own infrastructure.

## Understanding the Install Section

The install section lives under `machine.install` in your Talos machine configuration YAML. When you generate a default config with `talosctl gen config`, you get a basic install block that looks something like this:

```yaml
# Basic install configuration
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
    bootloader: true
    wipe: false
```

Each field here serves a specific purpose. The `disk` field tells Talos which block device to install onto. The `image` field points to the installer container image. The `bootloader` flag determines whether Talos sets up the bootloader, and `wipe` controls whether the target disk gets wiped before installation.

## Choosing the Right Disk

Picking the correct disk is critical. If you have multiple drives in your machine, you need to make sure Talos writes to the one you intend. You can identify disks by their device path, but on some systems device names can shift between reboots. A more reliable approach is to use the disk's serial number or a stable path.

```yaml
# Install to a specific disk by device path
machine:
  install:
    disk: /dev/nvme0n1
```

For servers with multiple NVMe drives, you might prefer to reference a disk by its path under `/dev/disk/by-id/`:

```yaml
# Install to a disk using a stable identifier
machine:
  install:
    disk: /dev/disk/by-id/nvme-Samsung_SSD_970_EVO_Plus_S4EWNX0R123456
```

This approach prevents surprises when device enumeration changes after hardware modifications or firmware updates.

## Setting Kernel Arguments

Talos allows you to pass extra kernel arguments through the install configuration. These arguments get written into the bootloader config and apply every time the machine boots. This is useful for enabling specific hardware support, debugging boot issues, or tuning kernel behavior.

```yaml
# Add custom kernel arguments
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
    kernelArgs:
      - console=ttyS0        # Send console output to serial port
      - net.ifnames=0         # Use classic network interface naming
      - panic=10              # Reboot 10 seconds after a kernel panic
      - talos.platform=metal  # Explicitly set the platform
```

Each entry in the `kernelArgs` list is a string that gets appended to the kernel command line. Be careful with these because a bad argument can prevent the system from booting. Always test changes on a non-production node first.

## Specifying the Installer Image

The `image` field determines which container image Talos uses to perform the installation. By default it points to the official Siderolabs installer for the version you generated your config with. However, there are cases where you need a custom image - for example, when you need additional system extensions baked into the installer.

```yaml
# Use a custom installer image with extensions
machine:
  install:
    disk: /dev/sda
    image: factory.talos.dev/installer/376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba:v1.6.0
```

The Talos Image Factory lets you build custom installer images that include extensions like `iscsi-tools`, `drbd`, or specific network drivers. You generate a schematic, and the factory gives you back an image URL that you plug into this field.

## Bootloader Configuration

The `bootloader` field is a boolean. When set to `true`, Talos installs and configures the bootloader (GRUB) on the target disk. You almost always want this set to `true` unless you are managing the bootloader separately, which is uncommon.

```yaml
# Enable bootloader installation
machine:
  install:
    disk: /dev/sda
    bootloader: true
```

If you set this to `false`, Talos will write the OS to disk but will not touch the bootloader. This can be useful in specialized environments like PXE-only setups where the boot process is handled externally.

## Wiping the Disk

The `wipe` option controls whether the target disk is completely erased before installation. On a fresh deployment, you typically want this set to `false` because Talos is smart enough to partition the disk correctly without wiping. However, if you are repurposing a disk that previously held another operating system or an older Talos installation with incompatible partitioning, setting `wipe` to `true` can save you headaches.

```yaml
# Wipe the disk before installing
machine:
  install:
    disk: /dev/sda
    wipe: true
```

Be very careful with this option. Wiping destroys all data on the disk. In a production environment, double-check that you are targeting the correct device before applying a config with `wipe: true`.

## Adding Extra Disks and Extensions

Beyond the basic install block, you might need to configure additional disks or include system extensions. Extensions are additional components that get installed alongside the base Talos image. They run as system services and extend the functionality of the operating system.

```yaml
# Install with system extensions
machine:
  install:
    disk: /dev/sda
    image: factory.talos.dev/installer/your-schematic-id:v1.6.0
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.4
      - image: ghcr.io/siderolabs/util-linux-tools:2.39.3
```

These extensions get pulled during the install process and become part of the system image. They persist across reboots and upgrades as long as you keep them in your configuration.

## Applying the Configuration

Once you have your install section dialed in, you apply the configuration to your node. If you are doing a fresh install, you use `talosctl apply-config` with the `--insecure` flag since the node does not yet have its certificates:

```bash
# Apply config to a new node during initial setup
talosctl apply-config --insecure \
  --nodes 192.168.1.100 \
  --file controlplane.yaml
```

For an existing node where you need to change install options (like adding kernel arguments), you apply the updated config and then trigger an upgrade or reinstall:

```bash
# Apply updated config to an existing node
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml

# Trigger an upgrade to apply install changes
talosctl upgrade \
  --nodes 192.168.1.100 \
  --image ghcr.io/siderolabs/installer:v1.6.0
```

Changes to the install section only take effect during an install or upgrade operation. Simply applying the config does not rewrite the disk.

## Validating Your Configuration

Before applying anything, validate your machine config to catch errors early:

```bash
# Validate the machine configuration file
talosctl validate --config controlplane.yaml --mode metal
```

This command checks the YAML structure and verifies that required fields are present. It catches common mistakes like referencing a non-existent disk path pattern or missing the image field.

## Practical Tips

When working with install options in production, keep a few things in mind. First, always pin your installer image to a specific version rather than using `latest`. This gives you reproducible deployments. Second, document your kernel arguments somewhere outside the config itself so that future operators understand why each argument was added. Third, test disk selection on similar hardware before rolling out to your full fleet. A disk that shows up as `/dev/sda` on one server might be `/dev/nvme0n1` on another.

The machine install section is foundational to everything else in Talos Linux. Getting it right means your nodes boot reliably, your disks are partitioned correctly, and your cluster starts on solid ground. Take the time to understand each option and tailor it to your specific hardware and deployment needs.
