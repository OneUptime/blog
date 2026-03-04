# How to Troubleshoot KVM Virtual Machine Performance Issues on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Performance, Troubleshooting, Virtualization, Linux

Description: Learn how to diagnose and resolve common KVM virtual machine performance problems on RHEL, including CPU, memory, disk, and network bottlenecks.

---

When a KVM virtual machine on RHEL performs poorly, the issue could be in the VM configuration, host resource contention, or the guest operating system itself. A systematic approach to troubleshooting helps you identify the bottleneck quickly and apply the right fix.

## Step 1: Identify the Symptom

Common performance symptoms:

- **High CPU usage** - VM is slow despite having allocated vCPUs
- **Memory pressure** - VM is swapping or OOM-killing processes
- **Slow disk I/O** - Application writes/reads are slow
- **Network latency** - High latency or low throughput

## Step 2: Check Host Resources

### Host CPU

```bash
# Overall host CPU usage
top

# Per-VM CPU usage
sudo virt-top

# VM-specific stats
sudo virsh domstats --vcpu vmname
```

If the host CPUs are fully utilized, VMs compete for CPU time. Solutions:

- Reduce the number of VMs or vCPUs
- Enable CPU pinning for critical VMs
- Use CPU shares to prioritize important VMs

### Host Memory

```bash
free -h
cat /proc/meminfo
```

If the host is swapping, VMs will be severely impacted. Solutions:

- Reduce VM memory allocations
- Add physical RAM
- Enable memory ballooning to reclaim unused guest memory
- Use huge pages for critical VMs

### Host Disk I/O

```bash
iostat -x 1
```

If host disks show high utilization or await times:

- Move VMs to faster storage (SSD, NVMe)
- Spread VMs across multiple disks
- Use virtio-blk or virtio-scsi drivers
- Check disk cache mode settings

## Step 3: Check VM Configuration

### Verify virtio Drivers

```bash
sudo virsh dumpxml vmname | grep -E "model type|bus="
```

Ensure you see:

- `bus='virtio'` for disks
- `model type='virtio'` for network

Non-virtio drivers (ide, e1000) are significantly slower.

### Check CPU Configuration

```bash
sudo virsh dumpxml vmname | grep -A5 '<cpu'
```

Use `host-passthrough` or `host-model` for best performance:

```xml
<cpu mode='host-passthrough'/>
```

### Check Disk Cache Mode

```bash
sudo virsh dumpxml vmname | grep cache
```

For databases and write-heavy workloads, use `cache='none'`:

```xml
<driver name='qemu' type='qcow2' cache='none' io='native'/>
```

### Check NUMA Alignment

On NUMA hosts, ensure VM memory and CPU are on the same NUMA node:

```bash
sudo virsh numatune vmname
numactl --hardware
```

## Step 4: Diagnose Inside the Guest

### CPU Issues

```bash
top
mpstat -P ALL 1
```

Look for:

- `steal` time - CPU cycles taken by the hypervisor
- High `wait` - Waiting for I/O

High steal time indicates host CPU contention.

### Memory Issues

```bash
free -h
vmstat 1
```

If the guest is swapping, increase VM memory or optimize the guest workload.

### Disk I/O Issues

```bash
iostat -x 1
iotop -oP
```

Inside the guest, performance depends on both the guest I/O stack and the host I/O path.

### Network Issues

```bash
ethtool -S eth0
iperf3 -c target-host
```

Check for dropped packets or errors.

## Common Fixes

### Enable Multi-Queue virtio-net

```xml
<interface type='network'>
  <driver name='vhost' queues='4'/>
  <model type='virtio'/>
</interface>
```

### Use io_uring or Native AIO

```xml
<driver name='qemu' type='qcow2' cache='none' io='native'/>
```

### Enable Huge Pages

```xml
<memoryBacking>
  <hugepages/>
</memoryBacking>
```

### Pin vCPUs to Physical CPUs

```bash
sudo virsh vcpupin vmname 0 2
sudo virsh vcpupin vmname 1 3
```

### Apply the virtual-guest Tuned Profile (Inside Guest)

```bash
sudo tuned-adm profile virtual-guest
```

### Convert qcow2 to raw for Better Disk Performance

```bash
qemu-img convert -f qcow2 -O raw vm.qcow2 vm.raw
```

### Preallocate Disk for Consistent Performance

```bash
qemu-img create -f qcow2 -o preallocation=full vm.qcow2 50G
```

## Performance Monitoring Checklist

| Metric | Host Tool | Guest Tool | Red Flag |
|--------|----------|------------|----------|
| CPU utilization | virt-top | top | steal > 10% |
| Memory | free -h | free -h | Swapping |
| Disk I/O | iostat -x | iostat -x | await > 20ms |
| Network | virsh domifstat | ethtool -S | Dropped packets |
| Disk queue | iostat -x | iostat -x | aqu-sz > 32 |

## Summary

Troubleshooting KVM VM performance on RHEL requires checking both the host and guest levels. Start with host resource utilization, verify VM configuration (virtio drivers, CPU mode, cache settings), then diagnose inside the guest. Common fixes include enabling virtio, CPU pinning, huge pages, and proper disk cache modes. Monitor regularly with virt-top and iostat to catch issues before they impact applications.
