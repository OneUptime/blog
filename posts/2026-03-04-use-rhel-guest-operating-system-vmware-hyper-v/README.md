# How to Use RHEL as a Guest Operating System in VMware and Hyper-V

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VMware, Hyper-V, Guest OS, Virtualization, Linux

Description: Learn how to install and optimize RHEL as a guest operating system running on VMware vSphere and Microsoft Hyper-V hypervisors.

---

RHEL is a fully supported guest operating system on VMware vSphere and Microsoft Hyper-V. Running RHEL as a guest requires installing the appropriate drivers and tools to get optimal performance and management integration.

## RHEL on VMware vSphere

### Installing RHEL on VMware

```bash
# When creating the VM in vSphere:
# - Guest OS Family: Linux
# - Guest OS Version: Red Hat Enterprise Linux 9 (64-bit)
# - VMware will automatically configure compatible virtual hardware

# Use PVSCSI for disk controller (paravirtual, better performance)
# Use VMXNET3 for network adapter (paravirtual, better performance)
```

### Installing VMware Tools (open-vm-tools)

```bash
# RHEL includes open-vm-tools in the default repositories
# Do NOT install VMware's proprietary tools package
sudo dnf install -y open-vm-tools

# Enable and start the service
sudo systemctl enable --now vmtoolsd

# Verify it is running
sudo systemctl status vmtoolsd

# For desktop environments, also install:
sudo dnf install -y open-vm-tools-desktop
```

### Verifying VMware Integration

```bash
# Check VMware tools version
vmware-toolbox-cmd -v

# Check time synchronization
vmware-toolbox-cmd timesync status

# View VM information from within the guest
vmware-toolbox-cmd stat hosttime
vmware-toolbox-cmd stat speed
```

## RHEL on Microsoft Hyper-V

### Installing RHEL on Hyper-V

```bash
# When creating the VM in Hyper-V Manager:
# - Use Generation 2 VM (UEFI, recommended for RHEL 8+)
# - Disable Secure Boot or use the Microsoft UEFI CA
# - Use SCSI controller for disks

# Hyper-V integration services are included in the RHEL kernel
# No additional driver installation is needed
```

### Verifying Hyper-V Integration

```bash
# Check that Hyper-V modules are loaded
lsmod | grep hv_

# Expected modules:
# hv_vmbus      - VMBus transport
# hv_storvsc    - Storage driver
# hv_netvsc     - Network driver
# hv_utils      - Integration services (time sync, heartbeat, etc.)
# hv_balloon    - Dynamic memory

# Check the hypervisor detected
dmesg | grep -i hypervisor
```

### Installing Hyper-V Daemons

```bash
# Install the Hyper-V tools package
sudo dnf install -y hyperv-daemons

# Enable the daemons
sudo systemctl enable --now hypervkvpd
sudo systemctl enable --now hypervvssd
sudo systemctl enable --now hypervfcopyd

# hypervkvpd  - Key-Value Pair exchange (IP address reporting)
# hypervvssd  - Volume Shadow Copy (live backup support)
# hypervfcopyd - File copy service
```

## Performance Optimization for Both Platforms

```bash
# Use the virtual-guest tuned profile
sudo dnf install -y tuned
sudo tuned-adm profile virtual-guest

# Verify the profile is active
sudo tuned-adm active

# This profile optimizes:
# - Disk I/O scheduler (none/noop for virtual disks)
# - Memory management
# - Network settings
```

## Common Configuration for Both

```bash
# Ensure time synchronization is configured
sudo systemctl enable --now chronyd
chronyc tracking

# Disable unnecessary hardware services
sudo systemctl disable bluetooth
sudo systemctl disable cups
```

Use the `virtual-guest` tuned profile on any RHEL guest regardless of the hypervisor. It optimizes kernel parameters for virtualized environments, improving both I/O and memory performance.
