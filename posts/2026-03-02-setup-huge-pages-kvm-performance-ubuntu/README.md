# How to Set Up Huge Pages for KVM Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, Performance, Huge Pages

Description: Learn how to configure huge pages on Ubuntu to improve KVM virtual machine performance by reducing TLB pressure and memory access overhead for large-memory workloads.

---

Modern CPUs use a Translation Lookaside Buffer (TLB) to cache virtual-to-physical address translations. With the default 4 KB memory pages, a 4 GB VM requires over 1 million TLB entries. When the TLB fills up, the CPU must perform costly page table walks. Huge pages solve this by using 2 MB (or 1 GB) pages instead of 4 KB, reducing the number of TLB entries needed by a factor of 512 or more. For memory-intensive workloads like databases, in-memory caches, or VMs with large memory allocations, huge pages can deliver 10-30% performance improvements.

## Understanding Huge Page Sizes

Linux supports two huge page sizes on x86_64:
- **2 MB pages (hugepages):** The most common. Supported on all modern CPUs. Configured as "static" (pre-allocated) or via Transparent Huge Pages (THP).
- **1 GB pages (gigantic pages):** Maximum TLB efficiency. Requires explicit kernel support and must be allocated at boot time.

For KVM VMs, there are two approaches:
1. **Static huge pages:** Pre-allocate a pool of huge pages; VMs request memory from this pool via libvirt
2. **Transparent Huge Pages (THP):** The kernel automatically promotes 4 KB pages to 2 MB where possible

## Checking Current Huge Page Status

```bash
# Check current huge page configuration
cat /proc/meminfo | grep -i huge

# Example output:
# AnonHugePages:    1234 kB   <- THP in use
# HugePages_Total:       0    <- static huge pages allocated
# HugePages_Free:        0    <- available static huge pages
# HugePages_Rsvd:        0    <- reserved but not used
# HugePages_Surp:        0    <- surplus pages
# Hugepagesize:       2048 kB <- page size (2 MB)
# Hugetlb:               0 kB <- total memory in hugetlbfs

# Check Transparent Huge Pages status
cat /sys/kernel/mm/transparent_hugepage/enabled
# [always] madvise never  <- always is default
```

## Configuring Static Huge Pages

### At Runtime (Temporary)

```bash
# Allocate 4 GB worth of huge pages (4096 MB / 2 MB per page = 2048 pages)
echo 2048 | sudo tee /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages

# Verify allocation
cat /proc/meminfo | grep HugePages
# HugePages_Total:    2048
# HugePages_Free:     2048  <- all available, no VM using them yet
```

### At Boot Time (Permanent)

```bash
# Add to /etc/sysctl.conf for persistent configuration
sudo nano /etc/sysctl.conf
```

Add:

```ini
# Huge pages for KVM: 8 GB worth of 2 MB pages
# 8192 MB / 2 MB = 4096 pages
vm.nr_hugepages = 4096

# Optional: Keep some extra as reserve
vm.nr_overcommit_hugepages = 128
```

```bash
# Apply immediately
sudo sysctl -p

# Verify
cat /proc/meminfo | grep HugePages_Total
```

For 1 GB huge pages, allocate at boot time via GRUB (they cannot be reliably allocated after boot):

```bash
sudo nano /etc/default/grub
```

```
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash hugepagesz=1G hugepages=8"
```

```bash
sudo update-grub
sudo reboot

# Verify 1 GB pages after reboot
cat /proc/meminfo | grep Hugepagesize
ls /sys/kernel/mm/hugepages/
```

## Mounting hugetlbfs

libvirt needs hugetlbfs mounted to provide huge pages to VMs:

```bash
# Create mount point
sudo mkdir -p /dev/hugepages

# Mount hugetlbfs
sudo mount -t hugetlbfs hugetlbfs /dev/hugepages

# Add to /etc/fstab for persistence
echo "hugetlbfs /dev/hugepages hugetlbfs defaults 0 0" | sudo tee -a /etc/fstab

# Verify mount
mount | grep huge
```

## Configuring VMs to Use Huge Pages

### Method 1: Via VM XML

```bash
virsh edit myvm
```

Add `<memoryBacking>` inside `<domain>`:

```xml
<domain type='kvm'>
  ...
  <memoryBacking>
    <hugepages>
      <!-- Use default huge page size (2 MB) -->
      <page size='2' unit='MiB'/>
    </hugepages>
    <!-- Lock pages to prevent swapping -->
    <locked/>
    <!-- Allocate memory source from host huge pages -->
    <source type='memfd'/>
    <access mode='shared'/>
  </memoryBacking>
  ...
</domain>
```

For 1 GB huge pages:

```xml
<memoryBacking>
  <hugepages>
    <page size='1' unit='GiB'/>
  </hugepages>
  <locked/>
</memoryBacking>
```

### Method 2: Per-NUMA Node Configuration

For NUMA systems, configure huge pages per node:

```xml
<memoryBacking>
  <hugepages>
    <page size='2' unit='MiB' nodeset='0'/>
  </hugepages>
  <locked/>
</memoryBacking>
<numatune>
  <memory mode='strict' nodeset='0'/>
</numatune>
```

## Calculating Required Huge Pages

```bash
# Calculate how many huge pages you need for your VMs

# For each VM with x GB of RAM, you need (x * 512) 2 MB pages
# Plus some overhead (~100-200 pages extra per VM)

# Example: 3 VMs with 4 GB, 8 GB, and 16 GB RAM
VM1_PAGES=$((4 * 512))   # 2048
VM2_PAGES=$((8 * 512))   # 4096
VM3_PAGES=$((16 * 512))  # 8192
OVERHEAD=600              # Extra for overhead
TOTAL=$((VM1_PAGES + VM2_PAGES + VM3_PAGES + OVERHEAD))
echo "Required huge pages: $TOTAL"

# Check available system memory for huge page allocation
free -g
# Must leave enough for host OS (at least 2-4 GB)
```

## Transparent Huge Pages

THP automatically manages huge pages without pre-allocation. It is simpler but has downsides for VMs - the automatic compaction and promotion processes can cause latency spikes.

```bash
# Check THP status
cat /sys/kernel/mm/transparent_hugepage/enabled
# always, madvise, or never

# For KVM hosts, madvise is often the best balance
echo madvise | sudo tee /sys/kernel/mm/transparent_hugepage/enabled

# Disable THP defragmentation to prevent latency spikes
echo defer+madvise | sudo tee /sys/kernel/mm/transparent_hugepage/defrag

# Make persistent
sudo nano /etc/rc.local
```

```bash
#!/bin/bash
# Configure THP for KVM host
echo madvise > /sys/kernel/mm/transparent_hugepage/enabled
echo defer+madvise > /sys/kernel/mm/transparent_hugepage/defrag
exit 0
```

Or use sysctl (works on newer kernels):

```bash
# Note: THP settings via sysctl require kernel 5.15+
sudo tee /etc/sysctl.d/99-thp.conf << 'EOF'
kernel.mm.transparent_hugepage.enabled = madvise
kernel.mm.transparent_hugepage.defrag = defer+madvise
EOF
sudo sysctl --system
```

## Verifying Huge Page Usage

```bash
# Check huge page utilization while VMs are running
cat /proc/meminfo | grep -i huge

# HugePages_Total:    4096    <- allocated
# HugePages_Free:     1048    <- available
# HugePages_Rsvd:     3048    <- reserved by VMs

# Check per-process huge page usage
sudo cat /proc/$(pgrep -f "qemu.*myvm")/status | grep HugePages

# Check if VM is actually using huge pages
virsh qemu-monitor-command myvm --hmp "info kvm"
```

## Handling Huge Page Allocation Failures

If libvirt fails to start a VM with the error "cannot set up guest memory 'pc.ram': Cannot allocate memory":

```bash
# Check current allocation
cat /proc/meminfo | grep HugePages_Free
# If 0, need more huge pages

# Try to allocate more (may fail if memory is fragmented)
echo 4096 | sudo tee /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages

# If allocation fails due to fragmentation, try compacting memory first
echo 1 | sudo tee /proc/sys/vm/compact_memory
echo 4096 | sudo tee /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages

# Check fragmentation
grep -i hugepages /proc/buddyinfo
```

To ensure huge pages are always available, allocate them earlier in the boot process before memory becomes fragmented:

```bash
# In /etc/sysctl.d/10-hugepages.conf
# Use a low number to run early
vm.nr_hugepages = 4096
```

## Performance Testing

```bash
# Benchmark memory bandwidth inside VM
sudo apt install mbw
mbw -n 5 1000    # Test 1 GB, 5 iterations

# Compare with and without huge pages:
# Without huge pages: may show TLB miss overhead
# With huge pages: higher bandwidth and lower latency

# Check TLB miss rate on host
perf stat -e dTLB-load-misses,dTLB-store-misses -a sleep 10
```

Huge pages provide the most benefit for VMs with large memory allocations (8 GB or more) running memory-intensive workloads. For small VMs or workloads that do not stress the TLB, the benefit is minimal and the complexity of pre-allocating huge pages may not be worth it. Test with and without huge pages on your specific workload before committing to the configuration.
