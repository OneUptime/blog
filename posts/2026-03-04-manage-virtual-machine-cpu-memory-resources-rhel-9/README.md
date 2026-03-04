# How to Manage Virtual Machine CPU and Memory Resources on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, CPU, Memory, Virtualization, Resource Management, Linux

Description: Learn how to allocate, adjust, and optimize CPU and memory resources for KVM virtual machines on RHEL 9.

---

Properly managing CPU and memory resources for KVM virtual machines ensures optimal performance and efficient use of your RHEL 9 host. You can adjust these resources while VMs are running (hot-add) or configure them for the next boot.

## Viewing Current Resources

```bash
sudo virsh dominfo vmname
```

Detailed CPU info:

```bash
sudo virsh vcpuinfo vmname
```

Memory info:

```bash
sudo virsh dommemstat vmname
```

## Managing vCPUs

### Setting vCPUs at Creation

```bash
sudo virt-install --vcpus 4,maxvcpus=8 ...
```

### Hot-Adding vCPUs

Set the maximum first (requires VM shutdown):

```bash
sudo virsh setvcpus vmname 8 --config --maximum
```

Then add vCPUs to a running VM:

```bash
sudo virsh setvcpus vmname 6 --live
```

### CPU Pinning

Pin vCPUs to specific physical CPUs:

```bash
sudo virsh vcpupin vmname 0 2
sudo virsh vcpupin vmname 1 3
```

This pins vCPU 0 to physical CPU 2 and vCPU 1 to physical CPU 3.

View pinning:

```bash
sudo virsh vcpupin vmname
```

### CPU Topology

Define socket/core/thread topology:

```bash
sudo virsh edit vmname
```

```xml
<vcpu placement='static' current='4'>8</vcpu>
<cpu>
  <topology sockets='1' cores='4' threads='1'/>
</cpu>
```

## Managing Memory

### Setting Memory at Creation

```bash
sudo virt-install --memory 4096,maxmemory=16384 ...
```

### Adjusting Memory on a Running VM

Set maximum memory (requires shutdown):

```bash
sudo virsh setmaxmem vmname 16G --config
```

Adjust current memory (live):

```bash
sudo virsh setmem vmname 8G --live
```

### Memory Ballooning

The virtio balloon driver allows dynamic memory adjustment. Check balloon status:

```bash
sudo virsh dommemstat vmname
```

The guest must have the virtio-balloon driver loaded.

## CPU Shares and Limits

### Setting CPU Shares

CPU shares determine relative CPU time when hosts are contended:

```bash
sudo virsh schedinfo vmname --set cpu_shares=2048
```

Default is 1024. Higher values get more CPU time.

### Setting CPU Bandwidth Limits

Limit a VM to a percentage of CPU time:

```bash
sudo virsh schedinfo vmname --set vcpu_quota=50000 --set vcpu_period=100000
```

This limits the VM to 50% of a CPU core.

## NUMA Configuration

For best performance on NUMA systems, align VM resources with NUMA topology:

```bash
sudo virsh numatune vmname --mode strict --nodeset 0
```

View NUMA placement:

```bash
sudo virsh numatune vmname
```

## Monitoring Resource Usage

### CPU Usage

```bash
sudo virt-top
```

Or:

```bash
sudo virsh domstats --vcpu vmname
```

### Memory Usage

```bash
sudo virsh domstats --balloon vmname
```

## Summary

Managing CPU and memory for KVM VMs on RHEL 9 involves setting appropriate limits, using hot-add for dynamic scaling, CPU pinning for performance-critical VMs, and NUMA awareness for multi-socket hosts. Monitor resource usage with virt-top and virsh domstats to ensure VMs have the resources they need without overcommitting the host.
