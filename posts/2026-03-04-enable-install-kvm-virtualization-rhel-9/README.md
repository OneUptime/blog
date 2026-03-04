# How to Enable and Install KVM Virtualization on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Virtualization, libvirt, QEMU, Linux

Description: Learn how to enable hardware virtualization support and install the KVM hypervisor stack on RHEL for running virtual machines.

---

KVM (Kernel-based Virtual Machine) is the built-in hypervisor for RHEL, turning your server into a platform for running multiple virtual machines. KVM leverages hardware virtualization extensions in modern CPUs (Intel VT-x or AMD-V) to provide near-native performance for guest operating systems.

## Checking Hardware Virtualization Support

Before installing KVM, verify your CPU supports hardware virtualization:

```bash
grep -cE 'vmx|svm' /proc/cpuinfo
```

A non-zero result means virtualization is supported. `vmx` indicates Intel VT-x, `svm` indicates AMD-V.

If the result is 0:

- Check BIOS/UEFI settings to enable virtualization
- Some cloud instances do not support nested virtualization by default

You can also use:

```bash
lscpu | grep Virtualization
```

## Installing KVM and Required Packages

Install the virtualization host group:

```bash
sudo dnf group install "Virtualization Host"
```

Or install packages individually:

```bash
sudo dnf install qemu-kvm libvirt virt-install virt-viewer
```

Key packages:

- **qemu-kvm** - The QEMU emulator with KVM acceleration
- **libvirt** - Virtualization management library and daemon
- **virt-install** - Command-line tool for creating VMs
- **virt-viewer** - Graphical console viewer for VMs

For additional management tools:

```bash
sudo dnf install libvirt-client virt-manager cockpit-machines
```

## Starting and Enabling libvirtd

```bash
sudo systemctl enable --now libvirtd
```

Verify:

```bash
sudo systemctl status libvirtd
```

## Verifying the Installation

Check that the KVM modules are loaded:

```bash
lsmod | grep kvm
```

Expected output:

```text
kvm_intel             368640  0
kvm                  1028096  1 kvm_intel
```

Or for AMD:

```text
kvm_amd               151552  0
kvm                  1028096  1 kvm_amd
```

Verify libvirt connectivity:

```bash
sudo virsh list --all
```

Run the validation check:

```bash
sudo virt-host-validate
```

This checks all prerequisites:

```text
QEMU: Checking for hardware virtualization                   : PASS
QEMU: Checking if device /dev/kvm exists                     : PASS
QEMU: Checking if device /dev/kvm is accessible              : PASS
QEMU: Checking if device /dev/vhost-net exists               : PASS
QEMU: Checking if device /dev/net/tun exists                 : PASS
QEMU: Checking for cgroup 'cpu' controller support           : PASS
QEMU: Checking for cgroup 'cpuacct' controller support       : PASS
QEMU: Checking for cgroup 'cpuset' controller support        : PASS
QEMU: Checking for cgroup 'memory' controller support        : PASS
QEMU: Checking for cgroup 'devices' controller support       : PASS
QEMU: Checking for cgroup 'blkio' controller support         : PASS
QEMU: Checking for device assignment IOMMU support           : PASS
```

## Configuring the Default Network

libvirt creates a default NAT network. Verify:

```bash
sudo virsh net-list --all
```

If the default network is not active:

```bash
sudo virsh net-start default
sudo virsh net-autostart default
```

## Configuring Storage

The default storage pool is at `/var/lib/libvirt/images/`:

```bash
sudo virsh pool-list --all
```

Create a custom storage pool:

```bash
sudo virsh pool-define-as data_pool dir --target /data/libvirt/images
sudo virsh pool-build data_pool
sudo virsh pool-start data_pool
sudo virsh pool-autostart data_pool
```

## Enabling Cockpit for Web Management

```bash
sudo dnf install cockpit cockpit-machines
sudo systemctl enable --now cockpit.socket
sudo firewall-cmd --add-service=cockpit --permanent
sudo firewall-cmd --reload
```

Access at `https://your-server:9090` and navigate to "Virtual Machines."

## Configuring User Permissions

Add non-root users to the `libvirt` group:

```bash
sudo usermod -aG libvirt username
```

## Firewall Configuration

If VMs need external network access:

```bash
sudo firewall-cmd --zone=trusted --add-interface=virbr0 --permanent
sudo firewall-cmd --reload
```

## Summary

Installing KVM on RHEL involves verifying hardware virtualization support, installing the virtualization packages, and enabling the libvirtd service. The default installation provides NAT networking and local disk storage. Use `virt-host-validate` to confirm everything is correctly configured, and consider installing Cockpit for web-based VM management.
