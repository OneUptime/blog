# How to Set Machine Kernel Module Parameters in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kernel Modules, Machine Configuration, Kubernetes, Linux Kernel

Description: A practical guide to loading kernel modules and setting module parameters in Talos Linux for hardware support and networking features.

---

Kernel modules extend the Linux kernel's capabilities without requiring a full kernel rebuild. They provide support for hardware devices, filesystems, network protocols, and various subsystems. On a traditional Linux distribution, you would use `modprobe` to load modules and configure parameters in `/etc/modprobe.d/`. In Talos Linux, kernel modules are managed through the machine configuration, giving you a declarative and reproducible way to control what gets loaded at boot time.

This guide explains how to configure kernel modules and their parameters in Talos Linux, covering common use cases and troubleshooting tips.

## The Kernel Module Configuration Section

Kernel modules are configured under `machine.kernel` in the Talos machine configuration:

```yaml
# Load kernel modules with parameters
machine:
  kernel:
    modules:
      - name: br_netfilter
      - name: ip_vs
      - name: ip_vs_rr
      - name: nf_conntrack
        parameters:
          - hashsize=262144
```

Each entry in the `modules` list specifies a module name and optionally a list of parameters. Talos loads these modules during boot in the order they are listed.

## Why You Need Custom Kernel Modules

Talos comes with a set of modules loaded by default that cover standard Kubernetes networking needs. However, you might need additional modules for:

- IPVS-based kube-proxy (requires `ip_vs` family of modules)
- Advanced networking features like VXLAN, GRE, or WireGuard
- Storage backends like NFS, iSCSI, or Ceph
- Hardware support for specific network cards or storage controllers
- Filesystem support beyond what is built into the kernel

## IPVS Modules for Kube-Proxy

If you are running kube-proxy in IPVS mode (which you should consider for large clusters because it scales better than iptables), you need to load several IP Virtual Server modules:

```yaml
# Load modules required for IPVS-based kube-proxy
machine:
  kernel:
    modules:
      - name: ip_vs
      - name: ip_vs_rr        # Round-robin scheduling
      - name: ip_vs_wrr       # Weighted round-robin scheduling
      - name: ip_vs_sh        # Source hashing scheduling
      - name: nf_conntrack    # Connection tracking
      - name: br_netfilter    # Bridge netfilter
```

Without these modules, kube-proxy in IPVS mode will fail to start or fall back to iptables mode silently, which defeats the purpose of choosing IPVS.

## Network-Related Modules

Various networking features require specific kernel modules:

```yaml
# Network modules for different use cases
machine:
  kernel:
    modules:
      # VXLAN overlay networking (used by many CNIs)
      - name: vxlan

      # GRE tunneling
      - name: ip_gre

      # WireGuard VPN (if using WireGuard-based networking)
      - name: wireguard

      # Bonding for network interface aggregation
      - name: bonding
        parameters:
          - max_bonds=0  # Don't create bond0 automatically

      # 802.1q VLAN support
      - name: 8021q

      # Bridge module for bridged networking
      - name: bridge
      - name: br_netfilter
```

The `bonding` module parameter `max_bonds=0` is a useful trick. Without it, the module creates a default bond interface when loaded, which you usually do not want because you want to configure bonds explicitly through the network configuration.

## Storage Modules

If your workloads use network storage, you might need to load the relevant kernel modules:

```yaml
# Storage-related kernel modules
machine:
  kernel:
    modules:
      # NFS client support
      - name: nfs
      - name: nfsd

      # iSCSI support
      - name: iscsi_tcp
      - name: libiscsi

      # Ceph RBD support
      - name: rbd

      # Device mapper (used by some storage drivers)
      - name: dm_mod
      - name: dm_thin_pool
      - name: dm_snapshot
```

Note that some of these modules might also require system extensions. For example, full iSCSI support needs the `iscsi-tools` extension in addition to the kernel module. Check the Talos documentation for your specific storage backend.

## Setting Module Parameters

Module parameters fine-tune how a module behaves. Not all modules accept parameters, and the available parameters vary by module. Here are some common examples:

```yaml
# Kernel modules with tuning parameters
machine:
  kernel:
    modules:
      # Connection tracking with custom hash size
      - name: nf_conntrack
        parameters:
          - hashsize=262144

      # Bonding with no automatic bond creation
      - name: bonding
        parameters:
          - max_bonds=0

      # SCSI disk with specific timeout
      - name: sd_mod
        parameters:
          - max_retries=5
```

To find available parameters for a module, you can check the kernel documentation or look at `/sys/module/<module_name>/parameters/` on a running Linux system with the module loaded.

## Loading Modules in the Right Order

Module loading order can matter when modules have dependencies. Talos loads modules in the order they appear in your configuration. If module B depends on module A, list A first:

```yaml
# Correct ordering for dependent modules
machine:
  kernel:
    modules:
      # Load nf_conntrack before ip_vs (ip_vs depends on conntrack)
      - name: nf_conntrack
      - name: ip_vs
      - name: ip_vs_rr
      - name: ip_vs_wrr
      - name: ip_vs_sh
```

In most cases, the kernel's module dependency system handles this automatically, but explicit ordering prevents any edge cases.

## Applying Module Configuration

Apply the configuration to your node:

```bash
# Apply config with kernel module settings
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file worker.yaml
```

Kernel module changes typically require a reboot:

```bash
# Reboot to load new kernel modules
talosctl reboot --nodes 192.168.1.100
```

## Verifying Loaded Modules

After the node reboots, verify that your modules are loaded:

```bash
# Check if a specific module is loaded
talosctl read --nodes 192.168.1.100 /proc/modules | grep ip_vs

# Check all loaded modules
talosctl read --nodes 192.168.1.100 /proc/modules
```

You can also verify module parameters:

```bash
# Check a module parameter value
talosctl read --nodes 192.168.1.100 /sys/module/nf_conntrack/parameters/hashsize
```

## Using Config Patches for Role-Specific Modules

Different node roles might need different modules. Control plane nodes running in IPVS mode need the ip_vs modules, while worker nodes running GPU workloads might need specific driver modules:

```yaml
# modules-control-plane.yaml
machine:
  kernel:
    modules:
      - name: ip_vs
      - name: ip_vs_rr
      - name: ip_vs_wrr
      - name: ip_vs_sh
      - name: nf_conntrack
        parameters:
          - hashsize=262144
```

```yaml
# modules-gpu-workers.yaml
machine:
  kernel:
    modules:
      - name: nvidia
      - name: nvidia_uvm
      - name: nvidia_modeset
```

Apply the appropriate patch to each node group:

```bash
# Apply to control plane nodes
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml \
  --config-patch @modules-control-plane.yaml

# Apply to GPU worker nodes
talosctl apply-config \
  --nodes 192.168.1.110 \
  --file worker.yaml \
  --config-patch @modules-gpu-workers.yaml
```

## Troubleshooting Module Loading

If a module fails to load, check the kernel logs:

```bash
# Check for module loading errors
talosctl dmesg --nodes 192.168.1.100 | grep -i "module\|error\|fail"
```

Common issues include modules not being available in the Talos kernel build (in which case you need a system extension), typos in module names, and invalid parameter values. If a module requires firmware files, you might also need the appropriate firmware extension.

Remember that Talos uses a minimal kernel configuration, so not every module you find in a standard Linux distribution will be available. Check the Talos release notes for the list of included modules, and use system extensions for anything that is not built in.
