# How to Use virtio Drivers for Optimal VM Performance on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Virtio, Performance, Virtualization, Linux

Description: Learn how to configure virtio paravirtualized drivers on RHEL 9 for maximum virtual machine disk, network, and memory performance.

---

Virtio drivers are paravirtualized device drivers that provide significantly better performance than emulated hardware in KVM virtual machines. Instead of emulating real hardware like Intel E1000 NICs or IDE disk controllers, virtio provides a direct communication channel between the guest and host, reducing overhead and increasing throughput.

## Why virtio Is Faster

Traditional emulated devices require the hypervisor to translate guest I/O operations into real hardware operations, adding multiple layers of overhead. Virtio bypasses this by using a shared memory ring buffer for direct guest-host communication:

- **virtio-blk/virtio-scsi** - Block device access up to 5x faster than IDE emulation
- **virtio-net** - Network throughput approaching native speeds
- **virtio-balloon** - Dynamic memory management
- **virtio-rng** - Hardware random number generation

## Configuring virtio for Disk I/O

### Using virtio-blk

In VM XML:

```xml
<disk type='file' device='disk'>
  <driver name='qemu' type='qcow2' cache='none' io='native'/>
  <source file='/var/lib/libvirt/images/vm1.qcow2'/>
  <target dev='vda' bus='virtio'/>
</disk>
```

With virt-install:

```bash
sudo virt-install --disk path=vm1.qcow2,bus=virtio ...
```

### Using virtio-scsi (Recommended for Many Disks)

```xml
<controller type='scsi' model='virtio-scsi'/>
<disk type='file' device='disk'>
  <driver name='qemu' type='qcow2'/>
  <source file='/var/lib/libvirt/images/vm1.qcow2'/>
  <target dev='sda' bus='scsi'/>
</disk>
```

virtio-scsi advantages over virtio-blk:

- Supports more disks (up to thousands vs 28 for virtio-blk)
- SCSI command passthrough
- Better for enterprise workloads

## Configuring virtio for Networking

```xml
<interface type='network'>
  <source network='default'/>
  <model type='virtio'/>
</interface>
```

With virt-install:

```bash
sudo virt-install --network network=default,model=virtio ...
```

### Enabling Multi-Queue for Network Performance

For VMs with multiple vCPUs:

```xml
<interface type='network'>
  <source network='default'/>
  <model type='virtio'/>
  <driver name='vhost' queues='4'/>
</interface>
```

Set queues equal to the number of vCPUs (up to the host's limit).

Inside the guest, enable multi-queue:

```bash
sudo ethtool -L eth0 combined 4
```

## Configuring virtio-balloon for Memory

```xml
<memballoon model='virtio'>
  <stats period='10'/>
</memballoon>
```

The balloon driver allows the host to reclaim unused memory from guests.

## Configuring virtio-rng

Provide entropy to the guest from the host:

```xml
<rng model='virtio'>
  <backend model='random'>/dev/urandom</backend>
</rng>
```

This prevents entropy starvation in guests.

## Verifying virtio Drivers Inside the Guest

```bash
lspci | grep -i virtio
```

Expected output:

```text
00:03.0 Ethernet controller: Red Hat, Inc. Virtio network device
00:04.0 SCSI storage controller: Red Hat, Inc. Virtio SCSI
00:05.0 Unclassified device: Red Hat, Inc. Virtio memory balloon
```

Check loaded modules:

```bash
lsmod | grep virtio
```

## Performance Comparison

| Component | Emulated | virtio | Improvement |
|-----------|---------|--------|-------------|
| Disk (sequential) | ~200 MB/s | ~1000+ MB/s | 5x |
| Disk (random IOPS) | ~5000 | ~50000+ | 10x |
| Network throughput | ~1 Gbps | ~9.5 Gbps | 9.5x |
| Network latency | ~500 us | ~100 us | 5x |

## Summary

Virtio paravirtualized drivers are essential for optimal KVM performance on RHEL 9. Use virtio-blk or virtio-scsi for disk I/O, virtio-net with multi-queue for networking, and virtio-balloon for dynamic memory management. RHEL 9 guests have virtio drivers built into the kernel, making configuration straightforward through virt-install or VM XML.
