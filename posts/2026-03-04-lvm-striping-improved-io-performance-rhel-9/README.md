# How to Set Up LVM Striping for Improved I/O Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, LVM, Striping, Performance, Storage, Linux

Description: Learn how to configure LVM striping on RHEL to distribute data across multiple physical volumes for improved I/O throughput and reduced latency.

---

LVM striping distributes data across multiple physical volumes in parallel, similar to RAID 0. By spreading I/O operations across several disks, striping can significantly improve read and write throughput for workloads that benefit from parallel disk access. This guide explains how to set up and optimize LVM striping on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- At least two physical disks (or SAN LUNs) of similar size
- The `lvm2` package installed

## Understanding LVM Striping

When you create a striped logical volume, LVM divides data into chunks (called stripes) and writes each chunk to a different physical volume in a round-robin fashion. This means:

- Read operations can pull data from multiple disks simultaneously
- Write operations distribute data across all stripe members
- The stripe size determines the chunk size written to each disk
- All stripe members should be on separate physical devices for best performance

Important: Striping does not provide redundancy. If any single disk in the stripe set fails, you lose the entire logical volume. Combine striping with mirroring (RAID 10) if you need both performance and redundancy.

## Step 1: Prepare the Physical Volumes

Initialize your disks:

```bash
sudo pvcreate /dev/sdb /dev/sdc /dev/sdd /dev/sde
```

Create a volume group containing all the disks:

```bash
sudo vgcreate vg_stripe /dev/sdb /dev/sdc /dev/sdd /dev/sde
```

Verify:

```bash
sudo pvs
sudo vgdisplay vg_stripe
```

## Step 2: Create a Striped Logical Volume

Create a logical volume with data striped across four disks:

```bash
sudo lvcreate --type striped -i 4 -I 64K -L 40G -n lv_fast vg_stripe
```

Parameters explained:

- `--type striped`: Explicitly request a striped layout
- `-i 4`: Number of stripes (should match the number of physical volumes)
- `-I 64K`: Stripe size (the amount of data written to each disk before moving to the next)
- `-L 40G`: Total logical volume size
- `-n lv_fast`: Name of the logical volume

Verify the striping configuration:

```bash
sudo lvs -o +stripes,stripe_size vg_stripe/lv_fast
```

For detailed segment information:

```bash
sudo lvdisplay -m vg_stripe/lv_fast
```

## Step 3: Choose the Optimal Stripe Size

The stripe size significantly affects performance depending on your workload:

- **Small stripe size (4K-16K)**: Better for random I/O workloads with small block sizes, such as database transaction logs.
- **Medium stripe size (64K-128K)**: A good general-purpose setting that works well for mixed workloads.
- **Large stripe size (256K-1M)**: Better for sequential I/O workloads like video streaming or large file transfers.

The default stripe size if not specified is 64KB. Test different sizes with your specific workload to find the optimal setting.

## Step 4: Create a File System and Mount

```bash
sudo mkfs.xfs -d su=64k,sw=4 /dev/vg_stripe/lv_fast
```

The XFS formatting options align the filesystem with the stripe configuration:

- `su=64k`: Stripe unit matching the LVM stripe size
- `sw=4`: Stripe width matching the number of stripes

Mount the filesystem:

```bash
sudo mkdir -p /fast
sudo mount /dev/vg_stripe/lv_fast /fast
```

Add to `/etc/fstab`:

```bash
echo '/dev/vg_stripe/lv_fast /fast xfs defaults 0 0' | sudo tee -a /etc/fstab
```

## Step 5: Benchmark the Striped Volume

Compare performance between a striped and non-striped volume using `fio`:

```bash
sudo dnf install fio -y
```

Test sequential write performance:

```bash
sudo fio --name=seq_write --directory=/fast --rw=write --bs=1M \
  --size=1G --numjobs=1 --runtime=30 --time_based --group_reporting
```

Test random read performance:

```bash
sudo fio --name=rand_read --directory=/fast --rw=randread --bs=4K \
  --size=1G --numjobs=4 --runtime=30 --time_based --group_reporting
```

## Step 6: Create a RAID 0 Striped Volume (Alternative)

RHEL also supports creating striped volumes using the RAID 0 type:

```bash
sudo lvcreate --type raid0 -i 4 -I 64K -L 40G -n lv_raid0 vg_stripe
```

The RAID 0 type uses the MD RAID layer and provides some additional features over simple striping, though performance characteristics are similar.

## Step 7: Extend a Striped Logical Volume

When extending a striped volume, you need enough free space on all stripe members:

```bash
sudo lvextend -L +10G vg_stripe/lv_fast
```

LVM automatically maintains the stripe layout when extending. Verify:

```bash
sudo lvdisplay -m vg_stripe/lv_fast
```

Then grow the filesystem:

```bash
sudo xfs_growfs /fast
```

## Step 8: Combine Striping with Mirroring (RAID 10)

For both performance and redundancy, create a RAID 10 volume:

```bash
sudo lvcreate --type raid10 -i 2 -m 1 -L 20G -n lv_raid10 vg_stripe
```

This creates a striped mirror with two stripes and one mirror copy, requiring four physical volumes total.

## Monitoring Stripe Performance

Use `iostat` to monitor per-disk I/O and verify that striping is distributing load:

```bash
sudo dnf install sysstat -y
sudo iostat -x 1
```

Look for roughly equal I/O distribution across all disks in the stripe set. Uneven distribution may indicate that your workload does not benefit from striping or that the stripe size needs adjustment.

## Troubleshooting

### Uneven Performance

If one disk in the stripe set is slower than others, the entire stripe is limited to the speed of the slowest member. Ensure all disks are of the same type and connected through the same interface speed.

### Extension Failures

Extending a striped volume fails if any stripe member lacks free space. Check per-PV free space:

```bash
sudo pvs -o pv_name,pv_free
```

### Stripe Size Cannot Be Changed

Once a striped logical volume is created, you cannot change the stripe size without recreating the volume. Plan your stripe size carefully before creation.

## Conclusion

LVM striping on RHEL is a powerful technique for improving storage I/O performance. By distributing data across multiple physical volumes, you can achieve significantly higher throughput than a single disk can provide. Remember to choose an appropriate stripe size for your workload, align your filesystem to the stripe geometry, and consider combining striping with mirroring if you need both performance and data protection.
