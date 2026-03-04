# How to Use RHEL 9 as a Guest Operating System in VMware and Hyper-V

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, VMware, Hyper-V, Guest OS, Virtualization, Linux

Description: Learn how to install and optimize RHEL 9 as a guest operating system in VMware vSphere and Microsoft Hyper-V environments.

---

RHEL 9 is fully supported as a guest operating system in both VMware vSphere and Microsoft Hyper-V. Running RHEL 9 in these environments requires proper guest tools, optimized drivers, and configuration adjustments to achieve the best performance.

## RHEL 9 in VMware vSphere

### Supported VMware Versions

- VMware vSphere 7.0 U3 and later
- VMware vSphere 8.0 and later
- VMware Workstation Pro 17+

### Creating a VMware VM for RHEL 9

1. Create a new VM in vSphere Client
2. Select "Red Hat Enterprise Linux 9 (64-bit)" as the guest OS
3. Recommended settings:
   - VMX-17 or later hardware version
   - PVSCSI storage controller (better than LSI Logic)
   - VMXNET3 network adapter (better than E1000)
   - Thin provisioned disks

### Installing VMware Tools (open-vm-tools)

RHEL 9 includes open-vm-tools in its repositories:

```bash
sudo dnf install open-vm-tools
sudo systemctl enable --now vmtoolsd
```

For VMs with a graphical desktop:

```bash
sudo dnf install open-vm-tools-desktop
```

Verify:

```bash
vmware-toolbox-cmd --version
```

### VMware-Specific Optimizations

```bash
# Disable unnecessary services
sudo systemctl disable kdump

# Optimize for virtual environment
sudo tuned-adm profile virtual-guest
```

### PVSCSI Driver

RHEL 9 includes the PVSCSI driver. Verify it is loaded:

```bash
lsmod | grep vmw_pvscsi
```

### VMXNET3 Network Driver

Verify:

```bash
lsmod | grep vmxnet3
ethtool -i ens192
```

## RHEL 9 in Microsoft Hyper-V

### Supported Hyper-V Versions

- Windows Server 2019 Hyper-V
- Windows Server 2022 Hyper-V
- Azure (based on Hyper-V)

### Creating a Hyper-V VM for RHEL 9

1. Use Generation 2 VM (UEFI, recommended)
2. Disable Secure Boot or use the "Microsoft UEFI Certificate Authority" template
3. Attach a synthetic network adapter
4. Use VHDX format for disks

### Hyper-V Integration Services

RHEL 9 includes Hyper-V Integration Services in the kernel:

```bash
lsmod | grep hv_
```

Expected modules:

```text
hv_vmbus          - VMBus driver
hv_storvsc        - Storage driver
hv_netvsc         - Network driver
hv_utils          - Utilities (time sync, heartbeat, KVP)
hv_balloon        - Dynamic memory
```

Install the hyperv-daemons package:

```bash
sudo dnf install hyperv-daemons
sudo systemctl enable --now hypervkvpd
sudo systemctl enable --now hypervvssd
```

### Hyper-V-Specific Optimizations

```bash
# Apply virtual-guest tuned profile
sudo tuned-adm profile virtual-guest

# Enable dynamic memory support
sudo systemctl enable --now hypervballoon
```

## Common Optimizations for Both Platforms

### Apply the virtual-guest Tuned Profile

```bash
sudo tuned-adm profile virtual-guest
```

This optimizes:

- I/O scheduler
- Dirty page settings
- Swap behavior
- Power management

### Disable Unnecessary Hardware Emulation

Since virtual hardware does not need firmware updates:

```bash
sudo systemctl disable fwupd
```

### Time Synchronization

Both VMware and Hyper-V provide time synchronization. Verify chrony is using the hypervisor clock:

```bash
chronyc sources
```

### File System Mount Options

Use noatime for virtual disks:

```text
UUID=...  /  xfs  defaults,noatime  0 0
```

## Troubleshooting

### VMware: Guest Customization Fails

Ensure open-vm-tools and perl are installed:

```bash
sudo dnf install open-vm-tools perl
```

### Hyper-V: Network Not Working

Check that the synthetic network adapter is connected:

```bash
ip link show
lsmod | grep hv_netvsc
```

### Slow Disk Performance

Verify paravirtual storage drivers are in use:

VMware:

```bash
lsmod | grep vmw_pvscsi
```

Hyper-V:

```bash
lsmod | grep hv_storvsc
```

## Summary

RHEL 9 works well as a guest in both VMware vSphere and Microsoft Hyper-V. Install open-vm-tools for VMware or hyperv-daemons for Hyper-V, use paravirtual drivers (PVSCSI/VMXNET3 for VMware, synthetic devices for Hyper-V), and apply the virtual-guest tuned profile for optimal performance. Both platforms have built-in kernel support in RHEL 9, making setup straightforward.
