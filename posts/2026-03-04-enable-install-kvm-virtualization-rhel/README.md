# How to Enable and Install KVM Virtualization on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Virtualization, Libvirt, QEMU, Linux

Description: Learn how to enable and install KVM virtualization on RHEL, including checking hardware support, installing packages, and verifying the hypervisor is running.

---

KVM (Kernel-based Virtual Machine) is the built-in hypervisor on RHEL. It turns your RHEL server into a virtualization host capable of running multiple isolated virtual machines. On x86_64 systems, KVM requires hardware virtualization extensions (Intel VT-x or AMD-V).

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
# On RHEL 9, install the virtualization packages
sudo dnf install -y qemu-kvm libvirt virt-install virt-viewer

# On RHEL 8, install the virtualization module first
sudo dnf module install -y virt
sudo dnf install -y virt-install virt-viewer

# Optional: install management tools
sudo dnf install -y libvirt-client virt-top libguestfs-tools
```

## Starting and Enabling libvirt

```bash
# On fresh RHEL 9 installs, start the modular libvirt sockets
for drv in qemu network nodedev nwfilter secret storage interface; do
  sudo systemctl enable --now virt${drv}d{,-ro,-admin}.socket
done

# On RHEL 8 or RHEL 9 hosts upgraded from RHEL 8, use libvirtd
sudo systemctl enable --now libvirtd

# Verify the service or socket is running
sudo systemctl status virtqemud.socket
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

# Expected: KVM/QEMU checks should show PASS.
# Review any WARN or FAIL results and follow the displayed guidance.
```

## Configuring Network for VMs

```bash
# The default NAT network is provided by the libvirt default network configuration
sudo virsh net-list --all

# Start and auto-start the default network
sudo virsh net-start default
sudo virsh net-autostart default

# Verify the virbr0 bridge interface exists
ip addr show virbr0
```

## Configuring Storage

```bash
# The default libvirt system image directory is /var/lib/libvirt/images
sudo virsh pool-list --all

# Start and auto-start the default pool
# Replace "default" with the pool name shown above if your system uses a different name
sudo virsh pool-start default
sudo virsh pool-autostart default

# Verify available space
df -h /var/lib/libvirt/images
```

## Adding Users to the libvirt Group

```bash
# Allow non-root users to manage VMs when your host uses group-based libvirt access
sudo usermod -aG libvirt $(whoami)

# Log out and back in for the group change to take effect
```

With KVM installed and configured, you can create virtual machines using `virt-install`, `virt-manager`, or the Cockpit web console. KVM provides near-native performance for guests since it runs directly in the Linux kernel.
