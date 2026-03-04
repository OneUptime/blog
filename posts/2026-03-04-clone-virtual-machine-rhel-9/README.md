# How to Clone a Virtual Machine on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Cloning, Virtualization, virt-clone, Linux

Description: Learn how to clone KVM virtual machines on RHEL 9 using virt-clone and customize cloned images with virt-sysprep.

---

Cloning a virtual machine creates an identical copy with new unique identifiers. On RHEL 9, `virt-clone` handles the cloning process while `virt-sysprep` prepares the clone for use by removing host-specific data like SSH keys and machine IDs.

## Basic Cloning

The source VM must be shut down:

```bash
sudo virsh shutdown source-vm
```

Clone it:

```bash
sudo virt-clone \
    --original source-vm \
    --name cloned-vm \
    --auto-clone
```

The `--auto-clone` option automatically generates new disk image names and MAC addresses.

## Specifying Disk Location

```bash
sudo virt-clone \
    --original source-vm \
    --name cloned-vm \
    --file /var/lib/libvirt/images/cloned-vm.qcow2
```

## Cloning to a Different Storage Pool

```bash
sudo virt-clone \
    --original source-vm \
    --name cloned-vm \
    --file /data/vm-images/cloned-vm.qcow2
```

## Preparing the Clone with virt-sysprep

After cloning, the new VM has the same hostname, SSH keys, and machine ID as the original. Use `virt-sysprep` to clean these:

```bash
sudo dnf install guestfs-tools
sudo virt-sysprep -d cloned-vm
```

This removes:

- SSH host keys (regenerated on first boot)
- Machine ID
- User accounts and passwords
- Log files
- Temporary files
- DHCP leases

### Selective Operations

Only remove specific items:

```bash
sudo virt-sysprep -d cloned-vm \
    --operations ssh-hostkeys,machine-id,net-hostname
```

### Setting the Hostname

```bash
sudo virt-sysprep -d cloned-vm --hostname new-hostname.example.com
```

### Setting a Root Password

```bash
sudo virt-sysprep -d cloned-vm --root-password password:newpassword
```

## Using Backing Files for Fast Clones

For quick clones that share a common base image:

```bash
# Create a backing file clone
qemu-img create -f qcow2 -b /var/lib/libvirt/images/base.qcow2 \
    -F qcow2 /var/lib/libvirt/images/clone1.qcow2
```

Then import the clone:

```bash
sudo virt-install --name clone1 --memory 2048 --vcpus 2 \
    --disk /var/lib/libvirt/images/clone1.qcow2 \
    --os-variant rhel9.3 --import --network network=default
```

This is much faster because only the differences from the base image are stored.

## Cloning Multiple VMs

```bash
#!/bin/bash
SOURCE="template-vm"
sudo virsh shutdown "$SOURCE" 2>/dev/null
sleep 5

for i in $(seq 1 5); do
    NAME="worker-${i}"
    sudo virt-clone --original "$SOURCE" --name "$NAME" --auto-clone
    sudo virt-sysprep -d "$NAME" --hostname "${NAME}.example.com"
    sudo virsh start "$NAME"
    echo "Created and started $NAME"
done
```

## Summary

Cloning VMs on RHEL 9 with `virt-clone` is the fastest way to create new VMs from existing templates. Always run `virt-sysprep` on clones to remove host-specific data. For even faster provisioning, use qcow2 backing files to create thin clones that share a common base image.
