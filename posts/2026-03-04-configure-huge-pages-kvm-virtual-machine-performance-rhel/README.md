# How to Configure Huge Pages for KVM Virtual Machine Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Huge Pages, Performance, Memory, Virtualization, Linux

Description: Learn how to configure huge pages on RHEL to improve KVM virtual machine memory performance by reducing TLB misses and page table overhead.

---

Standard memory pages on x86_64 are 4KB. Huge pages (2MB or 1GB) reduce the number of Translation Lookaside Buffer (TLB) entries needed, which decreases page table walks and improves performance for memory-intensive VMs like databases and large applications.

## Checking Current Huge Page Status

```bash
# View current huge page allocation
cat /proc/meminfo | grep -i huge

# Key values:
# HugePages_Total: total huge pages allocated
# HugePages_Free: unused huge pages
# Hugepagesize: size of each huge page (usually 2048 kB)

# Check available huge page sizes
ls /sys/kernel/mm/hugepages/
```

## Allocating Static Huge Pages

```bash
# Allocate 1024 huge pages of 2MB each (2GB total)
echo 1024 | sudo tee /proc/sys/vm/nr_hugepages

# Verify the allocation
cat /proc/meminfo | grep HugePages_Total

# Make it persistent across reboots
echo "vm.nr_hugepages = 1024" | sudo tee -a /etc/sysctl.d/hugepages.conf
sudo sysctl -p /etc/sysctl.d/hugepages.conf
```

## Allocating Huge Pages at Boot (More Reliable)

For large allocations, reserving at boot avoids memory fragmentation issues:

```bash
# Add to kernel boot parameters
sudo grubby --update-kernel=ALL --args="hugepagesz=2M hugepages=1024"

# For 1GB huge pages (requires CPU support)
sudo grubby --update-kernel=ALL --args="hugepagesz=1G hugepages=4"

# Reboot to apply
sudo systemctl reboot
```

## Configuring a VM to Use Huge Pages

```bash
# Edit the VM XML
sudo virsh edit rhel9-vm

# Add the memoryBacking section inside the <domain> element:
# <memoryBacking>
#   <hugepages>
#     <page size='2048' unit='KiB'/>
#   </hugepages>
# </memoryBacking>

# For 1GB huge pages:
# <memoryBacking>
#   <hugepages>
#     <page size='1048576' unit='KiB'/>
#   </hugepages>
# </memoryBacking>
```

## Using virt-install with Huge Pages

```bash
# Create a VM configured for huge pages
sudo virt-install \
  --name hugepage-vm \
  --memory 4096 --vcpus 4 \
  --disk size=20 \
  --memorybacking hugepages=on \
  --cdrom /var/lib/libvirt/images/rhel-9.4-dvd.iso \
  --os-variant rhel9.4 \
  --network network=default \
  --graphics vnc
```

## Verifying Huge Pages Are in Use

```bash
# Start the VM
sudo virsh start rhel9-vm

# Check that huge pages are consumed
cat /proc/meminfo | grep HugePages
# HugePages_Free should decrease by the VM's memory allocation

# Check the QEMU process memory mapping
sudo grep -i huge /proc/$(pgrep -f "qemu.*rhel9-vm")/smaps | head
```

## Mounting hugetlbfs (Required for QEMU)

```bash
# QEMU needs hugetlbfs mounted to use huge pages
# It is usually mounted automatically, but verify:
mount | grep hugetlbfs

# If not mounted:
sudo mount -t hugetlbfs hugetlbfs /dev/hugepages

# Make it persistent
echo "hugetlbfs /dev/hugepages hugetlbfs defaults 0 0" | sudo tee -a /etc/fstab
```

Allocate enough huge pages to cover all VMs that need them, plus a small buffer. Huge pages are reserved and not available to the host for regular use, so do not over-allocate. Monitor with `cat /proc/meminfo | grep HugePages` to track utilization.
