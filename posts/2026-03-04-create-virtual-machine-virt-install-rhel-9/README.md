# How to Create a Virtual Machine Using virt-install on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Virt-install, Virtualization, Virtual Machines, Linux

Description: Learn how to create KVM virtual machines from the command line using virt-install on RHEL 9 with various configuration options.

---

The `virt-install` command is the primary command-line tool for creating KVM virtual machines on RHEL 9. It supports local ISO installations, network installations, PXE booting, and importing existing disk images. For scripted and automated VM provisioning, virt-install is the tool of choice.

## Basic VM Creation

Create a VM from a local ISO:

```bash
sudo virt-install \
    --name rhel9-vm1 \
    --memory 2048 \
    --vcpus 2 \
    --disk size=20 \
    --cdrom /var/lib/libvirt/images/rhel-9.3-x86_64-dvd.iso \
    --os-variant rhel9.3 \
    --network network=default
```

## Understanding Key Parameters

- `--name` - VM name (must be unique)
- `--memory` - RAM in megabytes
- `--vcpus` - Number of virtual CPUs
- `--disk` - Storage configuration
- `--cdrom` - Installation media
- `--os-variant` - OS type for optimal defaults
- `--network` - Network configuration

## Finding OS Variants

```bash
osinfo-query os | grep rhel
```

## Disk Configuration Options

### Specify Disk Size and Location

```bash
--disk path=/var/lib/libvirt/images/vm1.qcow2,size=40,format=qcow2
```

### Use an Existing Disk

```bash
--disk path=/var/lib/libvirt/images/existing.qcow2
```

### Use a Storage Pool

```bash
--disk pool=data_pool,size=40,format=qcow2
```

### Multiple Disks

```bash
--disk size=20,format=qcow2 \
--disk size=100,format=qcow2
```

### Raw Format for Better Performance

```bash
--disk path=/var/lib/libvirt/images/vm1.raw,size=40,format=raw
```

## Network Installation

Install from a network repository:

```bash
sudo virt-install \
    --name rhel9-vm2 \
    --memory 4096 \
    --vcpus 4 \
    --disk size=40 \
    --location http://repo.example.com/rhel9/ \
    --os-variant rhel9.3 \
    --network network=default
```

## Using Kickstart for Automated Installation

```bash
sudo virt-install \
    --name rhel9-vm3 \
    --memory 2048 \
    --vcpus 2 \
    --disk size=20 \
    --location /var/lib/libvirt/images/rhel-9.3-x86_64-dvd.iso \
    --os-variant rhel9.3 \
    --network network=default \
    --initrd-inject=/path/to/ks.cfg \
    --extra-args "inst.ks=file:/ks.cfg console=ttyS0"
```

## Headless (Console-Only) Installation

For servers without graphics:

```bash
sudo virt-install \
    --name rhel9-vm4 \
    --memory 2048 \
    --vcpus 2 \
    --disk size=20 \
    --location /var/lib/libvirt/images/rhel-9.3-x86_64-dvd.iso \
    --os-variant rhel9.3 \
    --network network=default \
    --graphics none \
    --console pty,target_type=serial \
    --extra-args "console=ttyS0"
```

## Importing an Existing Disk Image

```bash
sudo virt-install \
    --name imported-vm \
    --memory 2048 \
    --vcpus 2 \
    --disk /var/lib/libvirt/images/existing.qcow2 \
    --os-variant rhel9.3 \
    --import \
    --network network=default
```

## PXE Boot Installation

```bash
sudo virt-install \
    --name pxe-vm \
    --memory 2048 \
    --vcpus 2 \
    --disk size=20 \
    --os-variant rhel9.3 \
    --network network=default \
    --pxe
```

## Advanced CPU Configuration

Pass host CPU features to the guest:

```bash
--cpu host-passthrough
```

Pin CPU topology:

```bash
--vcpus 4,sockets=1,cores=2,threads=2
```

## Advanced Memory Configuration

Enable memory ballooning:

```bash
--memory 4096,maxmemory=8192
```

## Network Configuration

### Bridge Network

```bash
--network bridge=br0
```

### Multiple NICs

```bash
--network network=default \
--network bridge=br0
```

### Specify MAC Address

```bash
--network network=default,mac=52:54:00:00:00:01
```

## UEFI Boot

```bash
--boot uefi
```

## Creating Multiple VMs with a Script

```bash
#!/bin/bash
for i in $(seq 1 5); do
    sudo virt-install \
        --name "worker-${i}" \
        --memory 2048 \
        --vcpus 2 \
        --disk size=20,format=qcow2 \
        --os-variant rhel9.3 \
        --location /var/lib/libvirt/images/rhel-9.3-x86_64-dvd.iso \
        --initrd-inject=/path/to/ks.cfg \
        --extra-args "inst.ks=file:/ks.cfg console=ttyS0" \
        --network network=default \
        --graphics none \
        --noautoconsole &
done
wait
echo "All VMs created"
```

## Summary

The `virt-install` command on RHEL 9 provides flexible VM creation through ISO, network, PXE, and import methods. Use `--os-variant` for optimal defaults, qcow2 disk format for flexibility, and kickstart files for automated installations. For production deployments, combine with scripting for batch VM provisioning.
