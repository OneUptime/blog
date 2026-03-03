# How to Configure Extra Kernel Arguments in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kernel, Linux, Configuration, System Administration

Description: Step-by-step guide to configuring extra kernel arguments in Talos Linux for hardware compatibility and performance tuning.

---

Kernel arguments control how the Linux kernel behaves at boot time. They can enable or disable features, configure hardware drivers, tune memory management, and set debugging options. In traditional Linux distributions, you would edit GRUB or the bootloader configuration directly. Talos Linux handles this differently - kernel arguments are specified in the machine configuration and applied automatically during boot.

This post covers how to add extra kernel arguments in Talos Linux, common use cases, and how to verify that your arguments are being applied correctly.

## Why You Might Need Extra Kernel Arguments

There are several situations where you need to pass additional arguments to the kernel:

- **Hardware compatibility** - Some hardware requires specific driver options or workarounds. For example, certain NVMe drives need `nvme_core.default_ps_max_latency_us=0` to prevent power state issues.
- **Performance tuning** - Arguments like `transparent_hugepage=never` can improve database performance by disabling transparent huge pages.
- **Security hardening** - Options like `slab_nomerge` and `init_on_alloc=1` add extra security at the cost of some performance.
- **Debugging** - When troubleshooting boot issues, arguments like `talos.debug=true` or `console=ttyS0` can help you see what is happening.
- **Virtualization** - Running Talos on certain hypervisors may require specific arguments for proper device passthrough or clock synchronization.

## Adding Kernel Arguments in Machine Configuration

The machine configuration has a dedicated field for kernel arguments under `machine.install.extraKernelArgs`. Here is the basic syntax:

```yaml
# machine-config.yaml
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
    extraKernelArgs:
      - net.ifnames=0
      - console=ttyS0,115200n8
      - transparent_hugepage=never
```

Each argument is a string in the list. These get appended to the kernel command line at boot time, in addition to the default arguments that Talos sets.

## Applying Kernel Arguments to a New Cluster

When generating a new Talos configuration, you can include the kernel arguments directly:

```bash
# Generate config with extra kernel args via patch
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch '[{"op": "add", "path": "/machine/install/extraKernelArgs", "value": ["console=ttyS0,115200n8", "transparent_hugepage=never"]}]'
```

Or use a patch file, which is cleaner for multiple arguments:

```yaml
# kernel-args-patch.yaml
machine:
  install:
    extraKernelArgs:
      - net.ifnames=0
      - console=ttyS0,115200n8
      - transparent_hugepage=never
      - nvme_core.default_ps_max_latency_us=0
```

```bash
# Apply the patch during config generation
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @kernel-args-patch.yaml
```

## Applying Kernel Arguments to an Existing Cluster

If your cluster is already running and you need to add kernel arguments, you can patch the machine configuration. Keep in mind that kernel arguments require a reboot to take effect since they are processed at boot time.

```bash
# Patch the machine config on a running node
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '[{"op": "add", "path": "/machine/install/extraKernelArgs", "value": ["transparent_hugepage=never", "slab_nomerge"]}]'
```

After patching, the node needs to be upgraded or reinstalled for the new kernel arguments to take effect:

```bash
# Upgrade the node to apply new kernel args
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.6.0
```

The upgrade process will write the new boot configuration with your extra kernel arguments and reboot the node.

## Common Kernel Arguments for Talos

Here are some kernel arguments that are commonly used with Talos Linux deployments:

```yaml
machine:
  install:
    extraKernelArgs:
      # Serial console output (useful for headless servers)
      - console=ttyS0,115200n8

      # Disable transparent huge pages (recommended for databases)
      - transparent_hugepage=never

      # Use traditional network interface names (eth0, eth1)
      - net.ifnames=0

      # Enable IOMMU for device passthrough
      - intel_iommu=on
      - iommu=pt

      # Fix NVMe power management issues
      - nvme_core.default_ps_max_latency_us=0

      # Security hardening
      - slab_nomerge
      - init_on_alloc=1
      - init_on_free=1

      # Disable kernel address randomization (for debugging only)
      # - nokaslr

      # Set the default I/O scheduler
      - elevator=none
```

## Verifying Kernel Arguments

After a node boots with your new configuration, you can verify that the kernel arguments were applied:

```bash
# Check the kernel command line on a running node
talosctl read /proc/cmdline --nodes 192.168.1.10
```

This prints the full kernel command line, including both the default Talos arguments and your extra ones. You should see your custom arguments at the end of the line.

You can also check specific sysctl values that correspond to kernel arguments:

```bash
# Check if transparent huge pages are disabled
talosctl read /sys/kernel/mm/transparent_hugepage/enabled --nodes 192.168.1.10
# Should show: always madvise [never]
```

## Arguments vs. Sysctls

It is worth understanding the difference between kernel boot arguments and sysctls. Boot arguments are processed once at kernel initialization and cannot be changed without rebooting. Sysctls can be changed at runtime.

Talos also supports setting sysctls in the machine configuration:

```yaml
machine:
  sysctls:
    # These can be changed at runtime
    net.core.somaxconn: "65535"
    vm.max_map_count: "262144"
    net.ipv4.ip_forward: "1"
```

Use kernel arguments for things that must be set before the kernel fully initializes (like IOMMU, console settings, and memory allocator options). Use sysctls for runtime-tunable parameters (like network buffer sizes and virtual memory settings).

## Troubleshooting

If your kernel arguments do not seem to take effect, check these things:

First, make sure the node was actually rebooted after the configuration change. Kernel arguments only apply at boot time.

```bash
# Check node uptime to confirm it rebooted
talosctl get systemstat --nodes 192.168.1.10
```

Second, verify that the machine configuration actually contains your arguments:

```bash
# View the current machine config
talosctl get machineconfig --nodes 192.168.1.10 -o yaml | grep -A 10 extraKernelArgs
```

Third, check for typos. A misspelled kernel argument is silently ignored - the kernel does not report errors for unknown arguments. Double-check the spelling and syntax against the kernel documentation.

Fourth, some arguments are specific to certain kernel versions. If you are using an older Talos release with an older kernel, newer kernel arguments might not be recognized.

## Node-Specific Arguments

Different nodes in your cluster might need different kernel arguments. For example, GPU worker nodes might need IOMMU enabled while regular workers do not. You can handle this by maintaining separate patch files for different node roles:

```yaml
# gpu-worker-kernel-args.yaml
machine:
  install:
    extraKernelArgs:
      - intel_iommu=on
      - iommu=pt
      - transparent_hugepage=never
```

```yaml
# standard-worker-kernel-args.yaml
machine:
  install:
    extraKernelArgs:
      - transparent_hugepage=never
```

Apply the appropriate patch file when configuring each node type.

## Conclusion

Extra kernel arguments in Talos Linux give you control over low-level kernel behavior without needing shell access to edit bootloader configs. The process is straightforward: add your arguments to the machine configuration, apply the config, and reboot the node. Keep in mind that kernel arguments take effect at boot time only, so plan for a node reboot when making changes. For runtime-tunable settings, use sysctls instead. Between these two mechanisms, you can tune Talos nodes for virtually any hardware or workload requirement.
