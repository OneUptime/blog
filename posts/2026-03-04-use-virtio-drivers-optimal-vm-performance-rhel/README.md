# How to Use virtio Drivers for Optimal VM Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Virtio, Performance, Virtualization, Linux

Description: Learn how to configure virtio paravirtualized drivers for KVM virtual machines on RHEL to achieve optimal disk, network, and memory performance.

---

virtio is a paravirtualization framework that provides high-performance device drivers for KVM guests. Unlike emulated hardware (IDE, e1000), virtio drivers are aware they are running in a virtual environment and communicate directly with the hypervisor, significantly reducing overhead.

## virtio Device Types

- **virtio-blk / virtio-scsi**: Block device drivers for disks
- **virtio-net**: Network interface driver
- **virtio-balloon**: Dynamic memory management
- **virtio-rng**: Random number generator
- **virtio-serial**: Serial port communication

## Creating a VM with virtio Devices

```bash
# Create a VM with virtio disk and network from the start
sudo virt-install \
  --name rhel9-virtio \
  --memory 4096 \
  --vcpus 2 \
  --disk size=20,bus=virtio,format=qcow2 \
  --network network=default,model=virtio \
  --cdrom /var/lib/libvirt/images/rhel-9.4-x86_64-dvd.iso \
  --os-variant rhel9.4 \
  --graphics vnc
```

## Checking Current Device Types

```bash
# View disk bus type
sudo virsh dumpxml rhel9-vm | grep -A5 '<disk'
# Look for bus='virtio' vs bus='ide' or bus='sata'

# View network model
sudo virsh dumpxml rhel9-vm | grep -A5 '<interface'
# Look for model type='virtio' vs type='e1000' or type='rtl8139'
```

## Converting Existing VMs to virtio

If a VM is using emulated devices, switch to virtio:

```bash
# Shut down the VM
sudo virsh shutdown rhel9-vm

# Edit the VM XML
sudo virsh edit rhel9-vm

# Change disk bus from 'ide' or 'sata' to 'virtio':
# <disk type='file' device='disk'>
#   <target dev='vda' bus='virtio'/>
# </disk>

# Change network model to virtio:
# <interface type='network'>
#   <model type='virtio'/>
# </interface>

# Start the VM
sudo virsh start rhel9-vm
```

## Using virtio-scsi Instead of virtio-blk

virtio-scsi supports more features (SCSI commands, more than 28 disks):

```bash
# Add a virtio-scsi controller
sudo virsh edit rhel9-vm

# Add inside <devices>:
# <controller type='scsi' model='virtio-scsi'/>

# Attach disks with scsi bus:
sudo virsh attach-disk rhel9-vm \
  /var/lib/libvirt/images/data.qcow2 \
  sda --targetbus scsi --driver qemu --subdriver qcow2 \
  --config
```

## Enabling virtio-balloon for Memory Management

```bash
# Check if balloon driver is present
sudo virsh dumpxml rhel9-vm | grep balloon

# The balloon device is usually added by default:
# <memballoon model='virtio'/>

# Inside the guest, verify the driver is loaded
lsmod | grep virtio_balloon
```

## Performance Comparison

```bash
# Benchmark virtio disk vs emulated IDE
# On a VM with virtio disk:
sudo fio --name=test --ioengine=libaio --iodepth=32 \
  --rw=randread --bs=4k --size=1G --numjobs=4 \
  --filename=/tmp/fio-test --direct=1

# virtio-blk typically achieves 2-3x higher IOPS
# and 30-50% lower latency compared to emulated IDE
```

## Verifying virtio Drivers Inside the Guest

```bash
# List loaded virtio kernel modules inside the guest
lsmod | grep virtio

# Expected modules:
# virtio_net
# virtio_blk or virtio_scsi
# virtio_balloon
# virtio_pci
# virtio_ring
# virtio
```

Always use virtio devices for RHEL guests. The performance difference compared to emulated devices is substantial, and all modern Linux distributions include virtio drivers in the kernel by default.
