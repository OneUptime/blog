# How to Configure HugePages for Oracle Database and KVM on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Memory, HugePages, Oracle, KVM, Linux

Description: Learn how to configure HugePages for Oracle Database and KVM on RHEL with step-by-step instructions, configuration examples, and best practices.

---

Static HugePages provide dedicated large memory pages (typically 2 MB or 1 GB) that are reserved at boot time. Unlike Transparent HugePages, static HugePages must be explicitly configured and are required by applications like Oracle Database and KVM virtual machines.

## Prerequisites

- RHEL
- Root or sudo access
- Knowledge of application memory requirements

## Step 1: Check Current HugePage Configuration

```bash
grep -i huge /proc/meminfo
```

```bash
HugePages_Total:       0
HugePages_Free:        0
HugePages_Rsvd:        0
HugePages_Surp:        0
Hugepagesize:       2048 kB
```

## Step 2: Calculate Required HugePages

For Oracle Database with a 4 GB SGA:

```bash
Required pages = SGA size / HugePage size
Required pages = 4096 MB / 2 MB = 2048 pages
```

Add 10% overhead:

```bash
Total = 2048 + 205 = 2253 pages
```

## Step 3: Configure HugePages

```bash
sudo sysctl -w vm.nr_hugepages=2253
```

Make persistent:

```bash
echo "vm.nr_hugepages=2253" | sudo tee /etc/sysctl.d/99-hugepages.conf
sudo sysctl --system
```

Verify:

```bash
grep HugePages_Total /proc/meminfo
```

## Step 4: Configure 1 GB HugePages

For KVM with very large VMs, 1 GB pages reduce TLB pressure further:

```bash
sudo grubby --update-kernel=ALL --args="hugepagesz=1G hugepages=16"
sudo reboot
```

## Step 5: Configure for Oracle Database

Create a group for hugepage users:

```bash
sudo groupadd hugemem
sudo usermod -aG hugemem oracle
```

Set the group ID:

```bash
echo "vm.hugetlb_shm_group=$(getent group hugemem | cut -d: -f3)" |   sudo tee -a /etc/sysctl.d/99-hugepages.conf
```

Set memlock limits:

```bash
sudo vi /etc/security/limits.d/99-oracle.conf
```

```bash
oracle  soft  memlock  unlimited
oracle  hard  memlock  unlimited
```

## Step 6: Configure for KVM

When creating VMs with libvirt, use hugepages in the XML:

```xml
<memoryBacking>
  <hugepages/>
</memoryBacking>
```

Or with QEMU directly:

```bash
qemu-system-x86_64 -m 4096 -mem-path /dev/hugepages ...
```

## Step 7: Mount hugetlbfs

```bash
sudo mkdir -p /dev/hugepages
sudo mount -t hugetlbfs nodev /dev/hugepages
```

For persistent mount:

```bash
echo "nodev /dev/hugepages hugetlbfs defaults 0 0" | sudo tee -a /etc/fstab
```

## Step 8: Monitor HugePage Usage

```bash
watch -n 5 'grep -i huge /proc/meminfo'
```

If `HugePages_Free` drops to 0, you need to allocate more pages.

## Conclusion

Static HugePages on RHEL provide guaranteed large-page memory for applications like Oracle Database and KVM that benefit from reduced TLB misses. Unlike Transparent HugePages, static HugePages are reserved at boot and are not subject to compaction delays.
