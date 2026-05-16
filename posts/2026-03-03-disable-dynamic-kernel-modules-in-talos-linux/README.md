# How to Disable Dynamic Kernel Modules in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kernel Modules, Security, Linux Hardening, Kubernetes

Description: Learn why Talos Linux disables dynamic kernel module loading and how this design decision strengthens the security of your Kubernetes cluster.

---

Dynamic kernel module loading has long been a convenience feature in Linux, allowing drivers and functionality to be added to the running kernel without rebooting. But in a Kubernetes-focused operating system like Talos Linux, this convenience comes with serious security implications. Talos takes a different approach: it ships with a fixed set of kernel modules and prevents any additional modules from being loaded at runtime. This guide explains why this matters, how it works, and what to do when you need specific kernel functionality.

## The Problem with Dynamic Kernel Modules

On a traditional Linux distribution, any process running with root privileges can load a kernel module using the `insmod` or `modprobe` commands. This is a powerful capability that attackers frequently exploit:

- **Rootkit installation** - Kernel modules run with full kernel privileges. A loaded malicious module can hide processes, intercept system calls, and bypass all security controls.
- **Privilege escalation** - Loading a vulnerable kernel module can provide a pathway to kernel-level code execution.
- **Detection evasion** - Kernel-level rootkits are notoriously difficult to detect because they can modify the kernel's view of the system.

Even without malicious intent, dynamically loaded modules can introduce instability. An out-of-tree module built against a different kernel version can cause crashes, data corruption, or security vulnerabilities.

## How Talos Handles Kernel Modules

Talos Linux takes a fundamentally different approach. The kernel is pre-built with all necessary modules included, and the ability to load additional modules at runtime is restricted. This is possible because Talos has a well-defined scope: it runs Kubernetes, and only Kubernetes. The kernel includes everything needed for that purpose and nothing more.

You can see which modules are loaded on a Talos node:

```bash
# List all currently loaded kernel modules

talosctl read /proc/modules --nodes <node-ip>

# Count the number of loaded modules
talosctl read /proc/modules --nodes <node-ip> | wc -l
```

Compare this to a typical Ubuntu or CentOS server, where you might see 150 or more modules loaded, many of which are never used. A Talos node typically has significantly fewer modules loaded, all of which serve a specific purpose.

## Verifying Module Loading Restrictions

Talos restricts kernel module loading through several layered mechanisms: kernel module signature enforcement (`module.sig_enforce=1`), kernel lockdown in confidentiality mode, and revocation of the `CAP_SYS_MODULE` capability from all processes. You can verify these are active on a Talos node:

```bash
# Check the kernel lockdown mode (expect: confidentiality)
talosctl read /sys/kernel/security/lockdown --nodes <node-ip>

# Verify module signature enforcement is on the kernel command line
talosctl read /proc/cmdline --nodes <node-ip> | grep module.sig_enforce
```

At kernel build time, Talos generates a throwaway module signing key and discards it after signing the in-tree modules. Because `module.sig_enforce=1` is set on the kernel command line, the kernel refuses to load any module that isn't signed by that key, and no one outside the Talos build pipeline can produce a matching signature. Combined with the lockdown LSM in confidentiality mode (which blocks `kexec` and other paths that could bypass module signing), this prevents arbitrary kernel code from being loaded, even by processes that somehow obtained `CAP_SYS_MODULE`.

## What Modules Are Included

Talos includes kernel modules that are needed for common Kubernetes networking, storage, and hardware configurations. The exact list depends on the Talos version and any system extensions you have installed, but here are some categories:

**Networking modules:**
- Bridge networking (bridge)
- VXLAN overlay networking (vxlan)
- IP tables and netfilter modules
- WireGuard (built into the upstream Linux kernel since 5.6)

**Storage modules:**
- Common filesystem drivers (ext4, xfs)
- Device mapper (dm-crypt, dm-thin-pool)
- NVMe and SCSI drivers
- iSCSI target and initiator

**Container runtime modules:**
- Overlay filesystem (overlay)
- Various cgroup controllers

```bash
# Check for specific modules on a Talos node
talosctl read /proc/modules --nodes <node-ip> | grep overlay
talosctl read /proc/modules --nodes <node-ip> | grep bridge
talosctl read /proc/modules --nodes <node-ip> | grep vxlan
```

## Adding Kernel Module Support Through System Extensions

If you need a kernel module that is not included in the default Talos image, the correct approach is to use Talos system extensions. Extensions are built and signed by Sidero Labs (the company behind Talos) and are verified before being loaded.

```bash
# Check which system extensions are available
# Visit the extensions repository: https://github.com/siderolabs/extensions

# Common extensions that include additional kernel modules:
# - siderolabs/drbd                              (DRBD replication)
# - siderolabs/gasket-driver                     (Google Coral TPU driver)
# - siderolabs/nvidia-open-gpu-kernel-modules-lts (NVIDIA GPU driver)
# - siderolabs/thunderbolt                       (Thunderbolt support)
# - siderolabs/usb-modem-drivers                 (USB modem drivers)
```

To include an extension in your Talos image, use the Image Factory:

```yaml
# schematic.yaml
# Define a custom Talos image with additional kernel modules
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/nvidia-open-gpu-kernel-modules-lts
      - siderolabs/intel-ucode
```

```bash
# Create the schematic through the Image Factory
curl -X POST --data-binary @schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/x-yaml"

# Use the resulting image ID in your Talos configuration
# factory.talos.dev/installer/<schematic-id>:v1.7.0
```

## Why Not Just Allow Module Loading?

You might wonder why Talos does not simply let you load modules when you need them. The answer comes down to the security model. Talos is designed around the principle of least privilege, and the kernel is part of the trusted computing base. If you allow arbitrary module loading:

1. **Any container escape becomes a kernel compromise** - If an attacker breaks out of a container and gains root on the host, they could load a malicious kernel module.
2. **Audit trail is broken** - You cannot reliably audit what kernel code is running if modules can be loaded dynamically.
3. **Reproducibility is lost** - If different nodes can have different kernel modules loaded, debugging becomes much harder.

By fixing the set of modules at build time, Talos ensures that every node in your cluster is running the same kernel code. This is a significant advantage for security auditing and compliance.

## Handling Third-Party Driver Requirements

Some hardware requires drivers that are not included in the Talos kernel. Here is how to handle common scenarios:

### GPU Workloads

For NVIDIA GPUs, use the nvidia-open system extension:

```yaml
# gpu-schematic.yaml
# Include NVIDIA GPU drivers for machine learning workloads
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/nvidia-open-gpu-kernel-modules-lts
      - siderolabs/nvidia-container-toolkit-lts
```

### Storage Controllers

For specialized storage hardware, check the extensions repository for appropriate drivers. If your storage controller is not supported, you may need to use a different storage approach (like networked storage) or request an extension from the Talos community.

### Network Interface Cards

Most common NICs (Intel, Broadcom, Realtek, Mellanox) are supported in the base Talos kernel. For uncommon NICs, check the Talos compatibility list or test with a live Talos image before deploying.

```bash
# Check which network drivers are loaded
talosctl read /proc/modules --nodes <node-ip> | grep -iE "e1000|igb|ixgbe|mlx|bnxt"
```

## Comparing to Other Immutable Operating Systems

Talos is not the only operating system that restricts kernel module loading. Flatcar Container Linux and Bottlerocket also limit this capability to varying degrees. However, Talos takes the most restrictive approach by combining module restrictions with a read-only filesystem and no shell access. This means there is no path for an attacker to introduce arbitrary kernel code, even if they manage to gain elevated privileges on the node.

```bash
# On Talos, these attacks are not possible:
# No shell access means you cannot run insmod/modprobe
# No writable filesystem means you cannot store a malicious module
# module.sig_enforce=1 means the kernel will refuse unsigned modules,
#   and the build-time signing key is discarded after the kernel is built
# No package manager means you cannot install kernel-module packages
```

## Impact on CNI Plugins

Some Container Network Interface (CNI) plugins require specific kernel modules. When choosing a CNI for your Talos cluster, verify that the required modules are available:

- **Cilium** - Works well with Talos, uses eBPF which is built into the kernel
- **Calico** - Compatible with Talos, uses standard netfilter modules
- **Flannel** - Works with Talos using VXLAN or WireGuard backends
- **Weave** - Requires modules that are included in the base Talos kernel

## Conclusion

Disabling dynamic kernel module loading is one of the most impactful security decisions in Talos Linux. It eliminates an entire class of attacks that rely on loading malicious code into the kernel at runtime. While it requires a different mindset compared to traditional Linux administration, the system extension mechanism provides a safe and auditable way to add kernel functionality when needed. For production Kubernetes clusters, this tradeoff between flexibility and security strongly favors the Talos approach.
