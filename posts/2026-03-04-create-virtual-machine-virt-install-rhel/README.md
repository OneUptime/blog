# How to Create a Virtual Machine Using virt-install on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, virt-install, Virtual Machines, Virtualization, Linux

Description: Learn how to create and configure virtual machines on RHEL using the virt-install command-line tool with various installation methods and options.

---

`virt-install` is the command-line tool for creating KVM virtual machines on RHEL. It supports multiple installation sources including ISO images, network installs, and PXE boot. It is the preferred method for scripting VM provisioning.

## Basic VM Creation from an ISO

```bash
# Create a VM with 2 vCPUs, 2GB RAM, and a 20GB disk
sudo virt-install \
  --name rhel9-vm \
  --memory 2048 \
  --vcpus 2 \
  --disk size=20 \
  --cdrom /var/lib/libvirt/images/rhel-9.4-x86_64-dvd.iso \
  --os-variant rhel9.4 \
  --network network=default \
  --graphics vnc,listen=0.0.0.0

# The --os-variant optimizes settings for the specified OS
# List available OS variants with:
osinfo-query os | grep rhel
```

## Network Installation (Kickstart)

```bash
# Install from a network source with a kickstart file
sudo virt-install \
  --name rhel9-auto \
  --memory 4096 \
  --vcpus 2 \
  --disk size=30,format=qcow2 \
  --location http://repo.example.com/rhel9/ \
  --os-variant rhel9.4 \
  --network network=default \
  --initrd-inject=/path/to/ks.cfg \
  --extra-args "inst.ks=file:/ks.cfg console=ttyS0" \
  --graphics none \
  --console pty,target_type=serial
```

## Creating a VM with Custom Disk Options

```bash
# Use a pre-existing disk image
sudo virt-install \
  --name vm-existing-disk \
  --memory 2048 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/vm-disk.qcow2 \
  --import \
  --os-variant rhel9.4 \
  --network network=default \
  --graphics vnc

# Create a VM with multiple disks
sudo virt-install \
  --name vm-multi-disk \
  --memory 4096 \
  --vcpus 4 \
  --disk size=30,format=qcow2,bus=virtio \
  --disk size=100,format=qcow2,bus=virtio \
  --cdrom /var/lib/libvirt/images/rhel-9.4-x86_64-dvd.iso \
  --os-variant rhel9.4 \
  --network network=default \
  --graphics vnc
```

## Headless VM with Serial Console

```bash
# Create a VM accessible only via serial console (no graphics)
sudo virt-install \
  --name headless-vm \
  --memory 2048 \
  --vcpus 2 \
  --disk size=20 \
  --location http://repo.example.com/rhel9/ \
  --os-variant rhel9.4 \
  --network network=default \
  --graphics none \
  --extra-args "console=ttyS0,115200n8"

# Connect to the serial console
sudo virsh console headless-vm
```

## Useful Post-Creation Commands

```bash
# List all VMs
sudo virsh list --all

# Start a VM
sudo virsh start rhel9-vm

# Shut down a VM gracefully
sudo virsh shutdown rhel9-vm

# Delete a VM and its storage
sudo virsh undefine rhel9-vm --remove-all-storage
```

The `virt-install` command is highly flexible. Use `virt-install --help` to see all available options, and check `osinfo-query os` to find the correct `--os-variant` for your guest operating system.
