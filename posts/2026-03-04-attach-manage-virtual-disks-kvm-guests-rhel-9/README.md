# How to Attach and Manage Virtual Disks for KVM Guests on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Virtual Disks, Storage, Virtualization, Linux

Description: Learn how to create, attach, resize, and manage virtual disks for KVM guest machines on RHEL 9.

---

Virtual disks are the primary storage for KVM guests on RHEL 9. You can add, resize, and remove disks from VMs either while they are running (hot-plug) or while shut down, giving you flexibility to manage guest storage as needs change.

## Creating a Virtual Disk

```bash
qemu-img create -f qcow2 /var/lib/libvirt/images/data-disk.qcow2 50G
```

For raw format (better performance):

```bash
qemu-img create -f raw /var/lib/libvirt/images/data-disk.raw 50G
```

Using virsh:

```bash
sudo virsh vol-create-as default data-disk.qcow2 50G --format qcow2
```

## Attaching a Disk to a Running VM (Hot-Plug)

```bash
sudo virsh attach-disk vmname \
    /var/lib/libvirt/images/data-disk.qcow2 \
    vdb \
    --driver qemu \
    --subdriver qcow2 \
    --persistent
```

Parameters:

- `vdb` - Target device name in the guest
- `--persistent` - Survive VM reboot
- `--subdriver qcow2` - Disk format

## Attaching via XML

For more control, create an XML file:

```xml
<disk type='file' device='disk'>
  <driver name='qemu' type='qcow2' cache='writeback'/>
  <source file='/var/lib/libvirt/images/data-disk.qcow2'/>
  <target dev='vdb' bus='virtio'/>
</disk>
```

Attach:

```bash
sudo virsh attach-device vmname disk.xml --persistent
```

## Detaching a Disk

```bash
sudo virsh detach-disk vmname vdb --persistent
```

## Resizing a Virtual Disk

### Expand the Image File

For a stopped VM:

```bash
qemu-img resize /var/lib/libvirt/images/data-disk.qcow2 +20G
```

For a running VM:

```bash
sudo virsh blockresize vmname /var/lib/libvirt/images/data-disk.qcow2 70G
```

### Inside the Guest

After resizing the image, expand the file system in the guest:

For XFS:

```bash
sudo xfs_growfs /data
```

For ext4:

```bash
sudo resize2fs /dev/vdb1
```

## Listing VM Disks

```bash
sudo virsh domblklist vmname
```

Detailed info:

```bash
sudo virsh domblkinfo vmname vda
```

## Disk Cache Modes

Set the cache mode for different use cases:

```xml
<driver name='qemu' type='qcow2' cache='none'/>
```

| Mode | Safety | Performance | Use Case |
|------|--------|-------------|----------|
| none | High | Good | Database, production |
| writethrough | High | Lower | Default safe option |
| writeback | Lower | High | Testing, non-critical |
| directsync | Highest | Lowest | Maximum data safety |

## Monitoring Disk Performance

```bash
sudo virsh domblkstat vmname vda
```

## Converting Disk Formats

```bash
# qcow2 to raw
qemu-img convert -f qcow2 -O raw disk.qcow2 disk.raw

# raw to qcow2
qemu-img convert -f raw -O qcow2 disk.raw disk.qcow2

# Compress qcow2
qemu-img convert -c -f qcow2 -O qcow2 disk.qcow2 disk-compressed.qcow2
```

## Summary

Managing virtual disks for KVM guests on RHEL 9 involves creating disk images with qemu-img, attaching them with virsh, and resizing as needed. Use qcow2 for flexibility and thin provisioning, raw for performance. Choose the appropriate cache mode based on your data safety requirements, and use hot-plug to add storage without VM downtime.
