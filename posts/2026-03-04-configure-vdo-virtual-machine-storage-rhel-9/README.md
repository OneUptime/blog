# How to Configure VDO for Virtual Machine Storage on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, Virtualization, KVM, Storage, Linux

Description: Learn how to configure VDO volumes on RHEL as storage backends for virtual machines, leveraging deduplication to dramatically reduce disk usage when running multiple similar VMs.

---

Virtual machine environments are ideal candidates for VDO because multiple VMs often run the same operating system and share identical data blocks. VDO's deduplication can reduce physical storage consumption by 10:1 or more in VM environments, allowing you to host significantly more VMs on the same physical storage. This guide covers configuring VDO specifically for VM storage on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- KVM/libvirt or similar hypervisor installed
- Available block storage for VDO
- The `lvm2` and `kmod-kvdo` packages installed

```bash
sudo dnf install lvm2 kmod-kvdo -y
```

## Why VDO for Virtual Machines?

Consider a scenario where you run 20 VMs, each with a 50 GB disk image based on RHEL:

- Without VDO: 20 x 50 GB = 1 TB of physical storage
- With VDO: Most of the OS installation is identical across VMs. VDO stores common blocks only once, potentially reducing storage to 100-200 GB.

The savings come from:
- Identical OS files across VMs
- Common libraries and packages
- Similar configuration files
- Zeroed/unallocated space in disk images

## Step 1: Create the VDO Volume

Size the volume appropriately for VM storage. Use a higher virtual-to-physical ratio since VMs typically deduplicate very well:

```bash
sudo pvcreate /dev/sdb
sudo vgcreate vg_vm /dev/sdb
sudo lvcreate --type vdo --name lv_vmstore --size 200G --virtualsize 2T vg_vm
```

This creates a 200 GB physical volume that presents 2 TB of virtual space (10:1 ratio), suitable for VM storage with high deduplication potential.

## Step 2: Format and Mount

```bash
sudo mkfs.xfs -K /dev/vg_vm/lv_vmstore
sudo mkdir -p /var/lib/libvirt/images
sudo mount /dev/vg_vm/lv_vmstore /var/lib/libvirt/images
```

Add to `/etc/fstab`:

```
/dev/vg_vm/lv_vmstore /var/lib/libvirt/images xfs defaults,discard 0 0
```

## Step 3: Configure libvirt Storage Pool

Define a libvirt storage pool pointing to the VDO-backed directory:

```bash
sudo virsh pool-define-as vmstore dir - - - - /var/lib/libvirt/images
sudo virsh pool-autostart vmstore
sudo virsh pool-start vmstore
```

Verify:

```bash
sudo virsh pool-list --all
```

## Step 4: Create Virtual Machine Disk Images

### Using qcow2 Format

qcow2 is recommended for VM images on VDO because it only allocates space as data is written:

```bash
sudo qemu-img create -f qcow2 /var/lib/libvirt/images/vm1.qcow2 50G
```

### Using Raw Format

Raw format can provide slightly better VDO deduplication because data layout is more predictable:

```bash
sudo qemu-img create -f raw /var/lib/libvirt/images/vm1.raw 50G
```

For VDO, raw format is generally preferred because:
- Data blocks align more predictably, improving deduplication
- No qcow2 metadata overhead
- VDO's thin provisioning replaces qcow2's thin allocation

## Step 5: Install VMs

Install virtual machines normally. Each VM's disk image is stored on the VDO volume:

```bash
sudo virt-install \
  --name vm1 \
  --ram 2048 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/vm1.qcow2,format=qcow2 \
  --os-variant rhel9.0 \
  --cdrom /path/to/rhel9.iso \
  --network bridge=virbr0
```

## Step 6: Clone VMs for Maximum Deduplication

When cloning VMs, VDO automatically deduplicates the identical blocks:

```bash
# Clone a VM
sudo virt-clone --original vm1 --name vm2 --auto-clone

# Or manually copy and register
sudo cp /var/lib/libvirt/images/vm1.qcow2 /var/lib/libvirt/images/vm2.qcow2
```

After cloning, check deduplication savings:

```bash
sudo lvs -o name,data_percent,vdo_saving_percent vg_vm
sudo vdostats --human-readable
```

## Step 7: Monitor VDO Performance for VMs

### Space Savings

```bash
sudo vdostats --human-readable
```

Key metrics:
- **Used**: Actual physical blocks consumed
- **Saving percent**: Overall deduplication and compression savings
- **Deduplication**: Percentage of writes that were deduplicated

### I/O Performance

Monitor VM I/O throughput:

```bash
sudo iostat -x 1
```

Compare physical device I/O with the volume throughput.

## Step 8: Tune VDO for VM Workloads

### Memory Allocation

VDO's deduplication index (UDS) uses memory. For VM storage:

```bash
# Check current VDO configuration
sudo lvs -o name,vdo_index_state,vdo_operating_mode vg_vm
```

The default settings work well for most VM environments. For very large deployments (many terabytes of physical storage), ensure adequate memory for the UDS index.

### Block Map Cache

The block map translates virtual addresses to physical addresses. For better VM performance:

```bash
sudo lvchange --vdosettings 'block_map_cache_size_mb=256' vg_vm/lv_vmstore
```

### Sync Mode

For production VMs, ensure synchronous mode for data safety:

```bash
sudo lvchange --vdosettings 'write_policy=sync' vg_vm/lv_vmstore
```

For development/test environments where performance matters more than durability:

```bash
sudo lvchange --vdosettings 'write_policy=async' vg_vm/lv_vmstore
```

## Step 9: Handle VM Migration

When migrating VMs to/from VDO storage:

### Moving VMs to VDO Storage

```bash
# Stop the VM
sudo virsh shutdown vm1

# Move the image to VDO storage
sudo mv /old/path/vm1.qcow2 /var/lib/libvirt/images/vm1.qcow2

# Update the VM's disk path
sudo virsh edit vm1
# Change the source file path

# Start the VM
sudo virsh start vm1
```

## Capacity Planning

### Estimating Storage Needs

For a homogeneous VM environment (all similar OS):

| Number of VMs | Disk per VM | Without VDO | With VDO (estimated) |
|--------------|-------------|-------------|---------------------|
| 10           | 50 GB       | 500 GB      | 75-100 GB           |
| 50           | 50 GB       | 2.5 TB      | 200-400 GB          |
| 100          | 50 GB       | 5 TB        | 350-700 GB          |

Actual savings depend on:
- How similar the VMs are
- How much unique data each VM generates
- The amount of zero-filled space in disk images

### Monitoring for Overcommitment

Set up alerts when physical usage approaches capacity:

```bash
# Check physical usage
DATA_PERCENT=$(lvs --noheadings -o data_percent vg_vm/lv_vmstore | tr -d ' ')
if [ $(echo "$DATA_PERCENT > 80" | bc) -eq 1 ]; then
    echo "VDO volume is ${DATA_PERCENT}% full" | logger -t vdo-monitor
fi
```

## Conclusion

VDO is exceptionally well-suited for virtual machine storage on RHEL. The inherent data redundancy across multiple VMs with the same operating system base creates ideal conditions for deduplication, often achieving 10:1 or better space savings. By combining VDO with appropriate VM disk formats and monitoring physical capacity usage, you can dramatically increase the VM density of your storage infrastructure.
