# How to Set Extra Kernel Parameters in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kernel Parameters, Boot Configuration, Kubernetes, Performance Tuning

Description: Learn how to configure extra kernel parameters in Talos Linux for hardware compatibility, performance tuning, and security hardening.

---

Kernel parameters (also known as kernel command-line arguments or boot parameters) control how the Linux kernel initializes and behaves. In Talos Linux, you cannot edit a GRUB configuration file or modify a boot script directly. Instead, you set kernel parameters through the machine configuration, and Talos applies them to the boot loader for you.

This guide covers why you might need extra kernel parameters, how to set them, and common parameters used in production Talos Linux deployments.

## Why Set Extra Kernel Parameters?

There are several situations where kernel parameters are necessary:

- **Hardware compatibility**: Some hardware requires specific parameters to work correctly (GPU passthrough, IOMMU, specific driver options)
- **Performance tuning**: Parameters like hugepages configuration, scheduler settings, and memory management options
- **Security hardening**: Enabling CPU vulnerability mitigations, disabling unused subsystems
- **Debugging**: Adding verbose output or enabling specific kernel debugging features
- **Network configuration**: Interface naming schemes, bonding modes

Talos Linux already includes sensible defaults, but your specific hardware and use case may need adjustments.

## How Kernel Parameters Work in Talos

Talos Linux reads kernel parameters from the machine configuration and bakes them into the boot loader configuration. This happens at two points:

1. During initial installation (when Talos is first written to disk)
2. During upgrades (when the boot entries are regenerated)

```bash
# View the current kernel command line on a running node
talosctl read /proc/cmdline --nodes <NODE_IP>

# Typical output:
# talos.platform=metal console=tty0 init_on_alloc=1 slab_nomerge pti=on ...
```

## Setting Extra Kernel Parameters

### In the Machine Configuration

The primary way to set kernel parameters is through the `extraKernelArgs` field in the install section:

```yaml
# controlplane.yaml or worker.yaml
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.9.0
    extraKernelArgs:
      - net.ifnames=0
      - console=ttyS0,115200
      - hugepagesz=2M
      - hugepages=1024
```

Each entry in the list becomes a separate kernel parameter on the command line.

### Applying Configuration Changes

If you are modifying kernel parameters on an existing node, apply the updated configuration:

```bash
# Apply the updated machine config
talosctl apply-config \
  --nodes <NODE_IP> \
  --file controlplane.yaml

# For kernel parameter changes, a reboot is required
# Talos may reboot automatically, or you can trigger it:
talosctl reboot --nodes <NODE_IP>
```

After the reboot, verify the parameters were applied:

```bash
# Check that the new parameters are present
talosctl read /proc/cmdline --nodes <NODE_IP>
```

### Using Config Patches

If you want to add kernel parameters without modifying the full machine config, use patches:

```bash
# Apply a patch to add kernel parameters
talosctl patch machineconfig --nodes <NODE_IP> \
  --patch '[{"op": "add", "path": "/machine/install/extraKernelArgs", "value": ["net.ifnames=0", "console=ttyS0,115200"]}]'
```

Or use a patch file:

```yaml
# kernel-params-patch.yaml
- op: add
  path: /machine/install/extraKernelArgs
  value:
    - net.ifnames=0
    - console=ttyS0,115200
    - intel_iommu=on
```

```bash
talosctl patch machineconfig --nodes <NODE_IP> \
  --patch @kernel-params-patch.yaml
```

### During Initial Boot (Before Configuration)

If you need kernel parameters during the initial boot (before configuration is applied), you can set them in the boot loader at boot time:

For GRUB, press `e` at the boot menu to edit the entry and add parameters to the `linux` line.

For PXE/iPXE, add them to the boot script:

```bash
# iPXE script with extra kernel parameters
kernel http://server/talos/vmlinuz talos.platform=metal net.ifnames=0 console=ttyS0,115200
initrd http://server/talos/initramfs.xz
boot
```

## Common Kernel Parameters for Talos Linux

### Console and Serial Output

```yaml
machine:
  install:
    extraKernelArgs:
      # Serial console for IPMI/BMC access
      - console=ttyS0,115200n8
      - console=tty0
```

Having both `ttyS0` and `tty0` means output goes to both the serial port and the local display. The last `console=` entry becomes the primary console.

### Network Interface Naming

```yaml
machine:
  install:
    extraKernelArgs:
      # Use traditional eth0, eth1 naming instead of eno1, enp0s3
      - net.ifnames=0
      - biosdevname=0
```

This simplifies network configuration, especially in automated environments.

### IOMMU for GPU Passthrough and VFIO

```yaml
machine:
  install:
    extraKernelArgs:
      # Enable Intel IOMMU
      - intel_iommu=on
      - iommu=pt
      # Or for AMD systems:
      # - amd_iommu=on
      # - iommu=pt
```

These are needed for PCI passthrough, commonly used with GPU workloads.

### Hugepages

```yaml
machine:
  install:
    extraKernelArgs:
      # Reserve 1024 2MB hugepages at boot
      - hugepagesz=2M
      - hugepages=1024
      # Or for 1GB hugepages
      # - hugepagesz=1G
      # - hugepages=4
```

Hugepages are important for databases and applications that benefit from large memory pages.

### Security Hardening

```yaml
machine:
  install:
    extraKernelArgs:
      # CPU vulnerability mitigations
      - mitigations=auto
      # Page table isolation
      - pti=on
      # Disable simultaneous multithreading (if security is critical)
      - nosmt
      # Randomize kernel memory layout
      - randomize_kstack_offset=on
```

Talos Linux already enables many security features by default, but you can add more.

### Performance Tuning

```yaml
machine:
  install:
    extraKernelArgs:
      # Disable CPU vulnerability mitigations for performance
      # WARNING: Only do this in trusted environments
      # - mitigations=off
      # Use deadline I/O scheduler
      - elevator=deadline
      # Disable transparent hugepages (for database workloads)
      - transparent_hugepage=never
```

### Hardware-Specific Parameters

```yaml
machine:
  install:
    extraKernelArgs:
      # Fix for certain ACPI issues
      - acpi_osi="Windows 2020"
      # Disable a problematic PCI device
      - pci=noaer
      # Force a specific clocksource
      - clocksource=tsc
      # Disable watchdog timers
      - nowatchdog
```

## Verifying Parameters Are Active

After applying kernel parameters and rebooting, verify they are active:

```bash
# View the full command line
talosctl read /proc/cmdline --nodes <NODE_IP>

# Check specific settings
# For hugepages:
talosctl read /proc/meminfo --nodes <NODE_IP> | grep -i huge

# For IOMMU:
talosctl dmesg --nodes <NODE_IP> | grep -i iommu

# For specific kernel configuration:
talosctl read /proc/sys/vm/nr_hugepages --nodes <NODE_IP>
```

## Parameters Set by Talos Automatically

Talos Linux sets several kernel parameters by default that you should be aware of:

```
talos.platform=metal      # Tells Talos which platform it is running on
init_on_alloc=1           # Zero memory on allocation (security)
slab_nomerge              # Prevent slab merging (security)
pti=on                    # Page Table Isolation (Meltdown mitigation)
```

You generally should not override these unless you have a specific reason and understand the implications.

## Removing Kernel Parameters

To remove a previously set kernel parameter, update the `extraKernelArgs` list to exclude it:

```yaml
# Updated config without the removed parameter
machine:
  install:
    extraKernelArgs:
      - console=ttyS0,115200
      # Removed: net.ifnames=0
```

Apply the config and reboot for the change to take effect.

## Parameters That Require Rebuilding

Some kernel parameters need to be set at image build time rather than boot time. These include parameters that affect the kernel binary itself, which cannot be changed from the command line. For these, you need a custom Talos image built with the imager tool.

## Troubleshooting

If a kernel parameter causes boot failures:

1. Boot from a Talos USB drive
2. The USB boot uses its own kernel parameters
3. Apply a corrected machine configuration

```bash
# From USB boot, fix the configuration
talosctl apply-config --insecure \
  --nodes <NODE_IP> \
  --file corrected-config.yaml
```

If you are not sure which parameter caused the issue, remove them one at a time and test.

## Conclusion

Setting extra kernel parameters in Talos Linux is straightforward through the machine configuration. The key is knowing when you need them and which parameters are appropriate for your situation. Most deployments need only a few extra parameters for serial console access and hardware compatibility. For specialized workloads like GPU computing or high-performance databases, kernel parameters become more important for tuning performance. Always test parameter changes on a non-production node first, and keep a recovery USB handy in case a parameter change prevents normal boot.
