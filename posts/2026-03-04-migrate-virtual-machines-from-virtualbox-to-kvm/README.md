# How to Migrate Virtual Machines from VirtualBox to KVM on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VirtualBox, Virtualization, Migration, KVM, Linux

Description: Learn how to migrate Virtual Machines from VirtualBox to KVM on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Migrate Virtual Machines from VirtualBox to KVM on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- Hardware virtualization enabled in the system firmware
- The VirtualBox VM shut down cleanly before converting its disk

## Overview

Migrating Virtual Machines from VirtualBox to KVM requires careful planning and execution. This guide walks through the complete process from installing KVM packages to importing the converted disk into libvirt.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y qemu-kvm qemu-img libvirt virt-install virt-viewer virt-manager
```

## Step 2: Install Required Packages

```bash
sudo systemctl enable --now libvirtd
```

Verify the installation:

```bash
rpm -q qemu-kvm qemu-img libvirt virt-install
sudo virsh list --all
```

## Step 3: Configure the Service

Shut down the VirtualBox VM and convert its virtual disk to QCOW2:

```bash
sudo qemu-img convert -p -f vdi -O qcow2 ~/VirtualBox\ VMs/example-vm/example-vm.vdi /var/lib/libvirt/images/example-vm.qcow2
sudo restorecon -v /var/lib/libvirt/images/example-vm.qcow2
```

If the source disk is VMDK, replace `-f vdi` with `-f vmdk`. Apply the recommended settings for your environment. Start with CPU, memory, disk bus, network defaults, and an OS variant that match the guest operating system and adjust based on your workload and hardware.

## Step 4: Start and Enable the Service

```bash
sudo virt-install \
  --name example-vm \
  --memory 4096 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/example-vm.qcow2,format=qcow2,bus=virtio \
  --os-variant rhel9.0 \
  --network network=default,model=virtio \
  --graphics spice \
  --import
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo qemu-img info /var/lib/libvirt/images/example-vm.qcow2
sudo virsh dominfo example-vm
```

Check the logs for any errors:

```bash
sudo journalctl -u libvirtd -f
```

## Step 6: Configure Firewall Rules

If you manage libvirt remotely or expose services from the guest, open only the required services on the host:

```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
sudo virsh domstats example-vm
sudo virsh vcpuinfo example-vm
```

## Security Considerations

- Use libvirt storage paths with correct SELinux labels, such as `/var/lib/libvirt/images`
- Use SSH or TLS for remote libvirt administration
- Restrict host and guest access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **VM fails to start**: Check `sudo journalctl -u libvirtd -xe` and `sudo virsh dominfo example-vm` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Guest does not boot**: Verify the firmware type, disk bus, and guest drivers. Some guests need IDE or SATA for the first boot before switching to virtio.

## Conclusion

You have successfully migrated a virtual machine from VirtualBox to KVM on RHEL. Monitor the VM regularly and keep the host updated to maintain security and performance.
