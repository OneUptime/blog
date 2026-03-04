# How to Configure Huge Pages for KVM Virtual Machine Performance on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Huge Pages, Performance, Memory, Virtualization, Linux

Description: Learn how to configure huge pages on RHEL 9 to improve KVM virtual machine memory performance by reducing TLB misses and page table overhead.

---

Huge pages allocate memory in larger chunks (2 MB or 1 GB instead of the default 4 KB pages), significantly reducing the overhead of memory management for KVM virtual machines. This is especially beneficial for memory-intensive workloads like databases and large-memory VMs.

## Why Huge Pages Improve VM Performance

- **Fewer TLB misses** - The Translation Lookaside Buffer can map more memory with fewer entries
- **Smaller page tables** - 512x fewer entries for 2 MB pages, 262144x fewer for 1 GB pages
- **Reduced memory overhead** - Less memory consumed by page table structures
- **Memory pinning** - Huge pages are not swappable, ensuring consistent performance

## Types of Huge Pages

- **2 MB huge pages** - Supported on all x86_64 CPUs
- **1 GB huge pages** - Requires CPU support (check with `grep pdpe1gb /proc/cpuinfo`)

## Configuring Static Huge Pages

### Allocating 2 MB Huge Pages

Calculate the number of pages needed:

```text
VM memory: 8 GB = 8192 MB
Pages needed: 8192 / 2 = 4096 pages
```

Allocate at boot time (most reliable):

```bash
sudo grubby --update-kernel=ALL --args="hugepagesz=2M hugepages=4096"
sudo reboot
```

Or allocate at runtime:

```bash
echo 4096 | sudo tee /proc/sys/vm/nr_hugepages
```

Make runtime allocation persistent:

```bash
echo "vm.nr_hugepages = 4096" | sudo tee /etc/sysctl.d/hugepages.conf
sudo sysctl --system
```

Verify:

```bash
cat /proc/meminfo | grep Huge
```

### Allocating 1 GB Huge Pages

1 GB huge pages must be allocated at boot:

```bash
sudo grubby --update-kernel=ALL --args="hugepagesz=1G hugepages=16 default_hugepagesz=1G"
sudo reboot
```

## Configuring a VM to Use Huge Pages

### Method 1: VM XML Configuration

```bash
sudo virsh edit vmname
```

Add:

```xml
<memoryBacking>
  <hugepages>
    <page size='2048' unit='KiB'/>
  </hugepages>
</memoryBacking>
```

For 1 GB pages:

```xml
<memoryBacking>
  <hugepages>
    <page size='1048576' unit='KiB'/>
  </hugepages>
</memoryBacking>
```

### Method 2: Using virt-install

```bash
sudo virt-install \
    --name hugepage-vm \
    --memory 8192 \
    --vcpus 4 \
    --disk size=20 \
    --os-variant rhel9.3 \
    --memorybacking hugepages=yes \
    --import
```

## Combining Huge Pages with NUMA

For NUMA-aware huge page allocation:

```bash
# Allocate huge pages on NUMA node 0
echo 2048 | sudo tee /sys/devices/system/node/node0/hugepages/hugepages-2048kB/nr_hugepages

# Allocate huge pages on NUMA node 1
echo 2048 | sudo tee /sys/devices/system/node/node1/hugepages/hugepages-2048kB/nr_hugepages
```

Configure the VM for NUMA-aware huge pages:

```xml
<memoryBacking>
  <hugepages>
    <page size='2048' unit='KiB' nodeset='0'/>
  </hugepages>
</memoryBacking>
<numatune>
  <memory mode='strict' nodeset='0'/>
</numatune>
```

## Monitoring Huge Page Usage

```bash
cat /proc/meminfo | grep -i huge
```

Output:

```text
HugePages_Total:    4096
HugePages_Free:     2048
HugePages_Rsvd:        0
HugePages_Surp:        0
Hugepagesize:       2048 kB
```

## Calculating Huge Page Requirements

For multiple VMs:

```text
VM1: 4 GB = 2048 pages (2 MB)
VM2: 8 GB = 4096 pages (2 MB)
VM3: 2 GB = 1024 pages (2 MB)
Total: 7168 pages + 10% buffer = 7885 pages
```

Always allocate extra pages for overhead.

## Important Considerations

- Huge pages are pinned in memory (not swappable)
- Unused huge pages waste physical RAM
- Allocate only what VMs need plus a small buffer
- Monitor with `/proc/meminfo` to avoid over-allocation
- 1 GB pages must be reserved at boot time

## Summary

Huge pages on RHEL 9 provide significant performance improvements for KVM virtual machines by reducing TLB misses and page table overhead. Use 2 MB pages for general workloads and 1 GB pages for very large VMs. Configure allocation through kernel parameters for reliability, and combine with NUMA awareness for optimal memory performance on multi-socket systems.
