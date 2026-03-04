# How to Attach and Manage Virtual Disks for KVM Guests on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Virtual Disks, Storage, qcow2, Virtualization, Linux

Description: Learn how to create, attach, detach, and resize virtual disks for KVM guests on RHEL, including different disk formats and bus types.

---

KVM virtual machines need virtual disks for storage. RHEL supports multiple disk formats (qcow2, raw) and bus types (virtio, SATA, IDE). You can add and remove disks from VMs while they are running.

## Creating Virtual Disk Images

```bash
# Create a qcow2 disk image (thin provisioned, recommended)
sudo qemu-img create -f qcow2 /var/lib/libvirt/images/data-disk.qcow2 50G

# Create a raw disk image (fixed size, slightly better performance)
sudo qemu-img create -f raw /var/lib/libvirt/images/data-disk.raw 50G

# Create a qcow2 disk with preallocation (best performance for qcow2)
sudo qemu-img create -f qcow2 -o preallocation=metadata \
  /var/lib/libvirt/images/data-disk-prealloc.qcow2 50G

# Check disk image info
sudo qemu-img info /var/lib/libvirt/images/data-disk.qcow2
```

## Attaching a Disk to a Running VM

```bash
# Attach a new disk to a running VM using virtio bus
sudo virsh attach-disk rhel9-vm \
  /var/lib/libvirt/images/data-disk.qcow2 \
  vdb \
  --driver qemu \
  --subdriver qcow2 \
  --targetbus virtio \
  --live --config

# The --live flag applies immediately
# The --config flag makes it persistent across reboots
```

## Attaching a Disk Using XML

For more control, use an XML definition:

```bash
cat << 'EOF' > /tmp/disk.xml
<disk type='file' device='disk'>
  <driver name='qemu' type='qcow2' cache='writeback' io='native'/>
  <source file='/var/lib/libvirt/images/data-disk.qcow2'/>
  <target dev='vdb' bus='virtio'/>
</disk>
EOF

sudo virsh attach-device rhel9-vm /tmp/disk.xml --live --config
```

## Listing VM Disks

```bash
# List all block devices attached to a VM
sudo virsh domblklist rhel9-vm

# Show detailed info about a specific disk
sudo virsh domblkinfo rhel9-vm vda
```

## Detaching a Disk

```bash
# Detach a disk from a running VM
sudo virsh detach-disk rhel9-vm vdb --live --config
```

## Resizing a Virtual Disk

```bash
# Resize the disk image (increase only)
sudo qemu-img resize /var/lib/libvirt/images/data-disk.qcow2 +20G

# Alternatively, resize through virsh (works on running VMs)
sudo virsh blockresize rhel9-vm \
  /var/lib/libvirt/images/data-disk.qcow2 70G

# Inside the guest, extend the partition and filesystem
# (run inside the VM)
# growpart /dev/vdb 1
# xfs_growfs /mount/point
```

## Converting Between Disk Formats

```bash
# Convert raw to qcow2
sudo qemu-img convert -f raw -O qcow2 \
  /var/lib/libvirt/images/disk.raw \
  /var/lib/libvirt/images/disk.qcow2

# Convert qcow2 to raw
sudo qemu-img convert -f qcow2 -O raw \
  /var/lib/libvirt/images/disk.qcow2 \
  /var/lib/libvirt/images/disk.raw
```

Use qcow2 format for most workloads since it supports thin provisioning, snapshots, and compression. Use raw format only when you need maximum I/O performance and do not need snapshot features.
