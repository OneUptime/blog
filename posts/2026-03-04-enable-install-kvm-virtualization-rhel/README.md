# How to Enable and Install KVM Virtualization on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Virtualization, Libvirt, QEMU, Linux

Description: Learn how to enable and install KVM virtualization on RHEL, including checking hardware support, installing packages, and verifying the hypervisor is running.

---

KVM (Kernel-based Virtual Machine) is the built-in hypervisor on RHEL. It turns your RHEL server into a virtualization host capable of running multiple isolated virtual machines. KVM requires hardware virtualization extensions (Intel VT-x or AMD-V).

## Checking Hardware Support

```bash
# Check if the CPU supports hardware virtualization
grep -E '(vmx|svm)' /proc/cpuinfo

# vmx = Intel VT-x, svm = AMD-V
# If there is no output, virtualization is not supported or is disabled in BIOS

# Alternative check using lscpu
lscpu | grep Virtualization
```

## Installing Virtualization Packages

```bash
# Install the virtualization host group
sudo dnf group install -y "Virtualization Host"

# Or install individual packages
sudo dnf install -y qemu-kvm libvirt virt-install virt-viewer

# Optional: install management tools
sudo dnf install -y libvirt-client virt-top libguestfs-tools
```

## Starting and Enabling libvirt

```bash
# Start the libvirt daemon
sudo systemctl start libvirtd

# Enable it to start on boot
sudo systemctl enable libvirtd

# Verify the service is running
sudo systemctl status libvirtd
```

## Verifying the Installation

```bash
# Check that KVM modules are loaded
lsmod | grep kvm

# Expected output:
# kvm_intel  (or kvm_amd for AMD processors)
# kvm

# Verify libvirt can connect to the hypervisor
sudo virsh list --all

# Check virtualization capabilities
sudo virt-host-validate

# Expected: all checks should show PASS
```

## Configuring Network for VMs

```bash
# The default NAT network is created automatically
sudo virsh net-list --all

# Start and auto-start the default network
sudo virsh net-start default
sudo virsh net-autostart default

# Verify the virbr0 bridge interface exists
ip addr show virbr0
```

## Configuring Storage

```bash
# The default storage pool uses /var/lib/libvirt/images
sudo virsh pool-list --all

# Start and auto-start the default pool
sudo virsh pool-start default
sudo virsh pool-autostart default

# Verify available space
df -h /var/lib/libvirt/images
```

## Adding Users to the libvirt Group

```bash
# Allow non-root users to manage VMs
sudo usermod -aG libvirt $(whoami)

# Log out and back in for the group change to take effect
```

With KVM installed and configured, you can create virtual machines using `virt-install`, `virt-manager`, or the Cockpit web console. KVM provides near-native performance for guests since it runs directly in the Linux kernel.
