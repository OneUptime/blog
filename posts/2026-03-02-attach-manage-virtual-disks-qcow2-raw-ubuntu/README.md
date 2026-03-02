# How to Attach and Manage Virtual Disks (qcow2, raw) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, Storage, Virtualization

Description: Learn how to create, attach, resize, and manage virtual disk images in qcow2 and raw formats for KVM virtual machines on Ubuntu.

---

Virtual disk management is one of the most frequent tasks in a KVM environment. Adding storage to VMs, changing disk formats, resizing images, and converting between formats are all routine operations. This guide covers the tools and procedures you need for effective virtual disk management.

## Understanding Disk Image Formats

### qcow2 (QEMU Copy on Write)

qcow2 is the native QEMU format and the best choice for most scenarios:
- **Thin provisioning:** A 50 GB disk image only uses actual data space
- **Snapshots:** Supports internal snapshots at the image level
- **Copy-on-write overlays:** Multiple VMs can share a base image
- **Compression:** Optional transparent compression
- **Encryption:** Built-in encryption support

**Overhead:** qcow2 has slightly higher CPU overhead than raw due to the copy-on-write layer.

### raw

Raw format is a flat binary representation of the disk:
- **Performance:** Slightly faster I/O than qcow2 for heavy workloads
- **Compatibility:** Works with any tool that can read block devices
- **No features:** No snapshots, no thin provisioning, no compression

Use raw format when maximum I/O performance matters and you do not need snapshot capabilities.

## Creating Virtual Disk Images

```bash
# Create a 20GB qcow2 image (thin provisioned)
qemu-img create -f qcow2 /var/lib/libvirt/images/myvm-data.qcow2 20G

# Create a 20GB raw image (preallocated)
qemu-img create -f raw /var/lib/libvirt/images/myvm-data.raw 20G

# Create a preallocated qcow2 (better performance, uses full space immediately)
qemu-img create -f qcow2 -o preallocation=metadata /var/lib/libvirt/images/myvm-data.qcow2 20G

# Create qcow2 with a backing file (overlay/template)
qemu-img create \
  -f qcow2 \
  -b /var/lib/libvirt/images/templates/ubuntu-22.04-base.qcow2 \
  -F qcow2 \
  /var/lib/libvirt/images/new-vm.qcow2 \
  20G
```

## Inspecting Disk Images

```bash
# Show disk image information
qemu-img info /var/lib/libvirt/images/myvm.qcow2

# Example output:
# image: /var/lib/libvirt/images/myvm.qcow2
# file format: qcow2
# virtual size: 20 GiB (21474836480 bytes)
# disk size: 4.52 GiB          <- actual disk usage
# cluster_size: 65536
# Snapshot list:
#   ID     TAG              VM SIZE  DATE         VM CLOCK
#   1      before-upgrade   200 MiB  2026-03-01   00:10:23
# Format specific information:
#   compat: 1.1
#   lazy refcounts: false

# Check for issues
qemu-img check /var/lib/libvirt/images/myvm.qcow2

# Show the disk map (which clusters are used)
qemu-img map /var/lib/libvirt/images/myvm.qcow2
```

## Attaching Disks to Virtual Machines

### Attaching a New Disk at VM Creation

```bash
# VM with two disks
sudo virt-install \
  --name myvm \
  --memory 2048 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/myvm-system.qcow2,size=20,format=qcow2,bus=virtio \
  --disk path=/var/lib/libvirt/images/myvm-data.qcow2,size=100,format=qcow2,bus=virtio \
  --os-variant ubuntu22.04 \
  --network network=default \
  --import
```

### Attaching a Disk to a Running VM

```bash
# Create the new disk
qemu-img create -f qcow2 /var/lib/libvirt/images/myvm-extra.qcow2 50G

# Attach to running VM (--live makes it available immediately, --config makes it persistent)
virsh attach-disk myvm \
  --source /var/lib/libvirt/images/myvm-extra.qcow2 \
  --target vdb \
  --driver qemu \
  --subdriver qcow2 \
  --live \
  --persistent

# Verify the disk appeared in the VM
virsh domblklist myvm
```

Inside the running VM, the new disk appears as `/dev/vdb`:

```bash
# Inside the VM - partition and format the new disk
sudo fdisk /dev/vdb
# Create a partition, then:
sudo mkfs.ext4 /dev/vdb1

# Mount it
sudo mkdir -p /data
sudo mount /dev/vdb1 /data

# Add to fstab for persistent mounting
echo '/dev/vdb1 /data ext4 defaults 0 2' | sudo tee -a /etc/fstab
```

### Attaching a Disk via XML

For more control over disk settings:

```bash
cat > /tmp/new-disk.xml << 'EOF'
<disk type='file' device='disk'>
  <driver name='qemu' type='qcow2' cache='writeback' io='native'/>
  <source file='/var/lib/libvirt/images/myvm-fast.qcow2'/>
  <target dev='vdc' bus='virtio'/>
</disk>
EOF

virsh attach-device myvm /tmp/new-disk.xml --live --config
```

## Resizing Disk Images

### Increasing Disk Size

```bash
# Shut down the VM (safer for resize operations)
virsh shutdown myvm

# Resize the qcow2 image (+20G adds 20 GB to the current size)
qemu-img resize /var/lib/libvirt/images/myvm.qcow2 +20G

# Verify new size
qemu-img info /var/lib/libvirt/images/myvm.qcow2 | grep "virtual size"

# Start the VM
virsh start myvm
```

Inside the VM, extend the filesystem to use the new space:

```bash
# Check current partition layout
lsblk

# For a simple partition layout, resize the partition and filesystem
sudo growpart /dev/vda 1     # Resize partition 1
sudo resize2fs /dev/vda1     # Resize ext4 filesystem

# For LVM:
sudo pvresize /dev/vda1      # Resize physical volume
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv  # Extend logical volume
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv  # Resize filesystem
```

### Shrinking Disk Images

Shrinking is more complex and risky - you must shrink the filesystem first:

```bash
# Inside the VM - shrink filesystem first
sudo umount /data
sudo e2fsck -f /dev/vdb1
sudo resize2fs /dev/vdb1 10G    # Shrink to 10G
# Shrink the partition with fdisk/parted

# Then offline - shrink the disk image
virsh shutdown myvm
qemu-img resize --shrink /var/lib/libvirt/images/myvm-data.qcow2 15G
```

## Converting Between Formats

```bash
# Convert raw to qcow2
qemu-img convert \
  -f raw \
  -O qcow2 \
  /var/lib/libvirt/images/myvm.raw \
  /var/lib/libvirt/images/myvm.qcow2

# Convert qcow2 to raw
qemu-img convert \
  -f qcow2 \
  -O raw \
  /var/lib/libvirt/images/myvm.qcow2 \
  /var/lib/libvirt/images/myvm.raw

# Convert with compression (reduces file size, slower performance)
qemu-img convert \
  -c \
  -f qcow2 \
  -O qcow2 \
  /var/lib/libvirt/images/myvm.qcow2 \
  /var/lib/libvirt/images/myvm-compressed.qcow2

# Show size comparison
ls -lh /var/lib/libvirt/images/myvm*.qcow2
```

## Reclaiming Unused Space in qcow2

After deleting files inside a VM, the qcow2 image does not automatically shrink. Use these methods to reclaim space:

```bash
# Method 1: Inside VM - zero out free space, then compact outside
# Inside VM:
dd if=/dev/zero of=/tmp/zero bs=1M || true
sync
rm /tmp/zero

# Outside VM - compact the image
virsh shutdown myvm
qemu-img convert -O qcow2 \
  /var/lib/libvirt/images/myvm.qcow2 \
  /var/lib/libvirt/images/myvm-compact.qcow2
# Replace old image with compacted version

# Method 2: Use virt-sparsify (simpler)
sudo apt install libguestfs-tools
virt-sparsify --in-place /var/lib/libvirt/images/myvm.qcow2
```

## Performance Tuning for Disk I/O

```bash
# Edit VM XML to optimize disk settings
virsh edit myvm
```

Optimize the disk section:

```xml
<disk type='file' device='disk'>
  <driver name='qemu' type='qcow2'
          cache='writeback'      <!-- writeback: good balance of safety/performance -->
          io='native'            <!-- native: use kernel's async I/O -->
          discard='unmap'        <!-- enable TRIM/discard support -->
  />
  <source file='/var/lib/libvirt/images/myvm.qcow2'/>
  <target dev='vda' bus='virtio'/>
</disk>
```

Cache modes:
- `none` - no caching, safest (good for databases)
- `writeback` - write cache enabled, best performance, slight risk if host crashes
- `writethrough` - reads cached, writes go straight through, safe and slow
- `directsync` - bypass page cache entirely, slowest but safest

Enable TRIM inside the VM to maintain SSD-backed storage performance:

```bash
# Inside VM - enable periodic fstrim
sudo systemctl enable fstrim.timer
sudo systemctl start fstrim.timer

# Or mount with discard option in /etc/fstab
# UUID=xxx /data ext4 defaults,discard 0 2
```

## Detaching Disks

```bash
# Detach a disk (need the target device name)
virsh domblklist myvm   # Shows target names like vdb, vdc

# Detach by target
virsh detach-disk myvm vdb --persistent

# Verify removal
virsh domblklist myvm
```

Virtual disk management in KVM is straightforward once you understand the tools. qemu-img handles all creation, inspection, conversion, and resizing operations, while virsh handles attachment and detachment from running VMs. For most workloads, qcow2 with writeback caching offers the best balance of features and performance.
