# How to Configure LVM Striping Across Multiple Disks on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, LVM, Striping, Storage, Performance, Linux

Description: Learn how to configure LVM striped logical volumes on RHEL to spread I/O across multiple disks and increase storage throughput.

---

LVM striping distributes data across multiple physical volumes, similar to RAID 0. When a logical volume is striped, reads and writes are spread across multiple disks simultaneously, multiplying throughput. On RHEL, LVM makes striping straightforward to configure and manage.

## How LVM Striping Works

When you create a striped logical volume, LVM divides data into chunks (called stripes) and distributes them round-robin across the specified physical volumes. A write of 256 KB with a 64 KB stripe size across 4 disks places 64 KB on each disk. All four disks can read or write their portion simultaneously.

## Prerequisites

You need at least two physical disks or partitions. In this example, we use four disks:

```text
/dev/sdb
/dev/sdc
/dev/sdd
/dev/sde
```

## Setting Up Physical Volumes

Create physical volumes on each disk:

```bash
sudo pvcreate /dev/sdb /dev/sdc /dev/sdd /dev/sde
```

Verify:

```bash
sudo pvs
```

## Creating a Volume Group

Create a volume group spanning all disks:

```bash
sudo vgcreate data_vg /dev/sdb /dev/sdc /dev/sdd /dev/sde
```

Verify:

```bash
sudo vgs
```

## Creating a Striped Logical Volume

Create a logical volume with 4 stripes and 64 KB stripe size:

```bash
sudo lvcreate -L 100G -n striped_lv -i 4 -I 64k data_vg
```

Parameters:

- `-L 100G` - Size of the logical volume
- `-n striped_lv` - Name of the logical volume
- `-i 4` - Number of stripes (one per physical volume)
- `-I 64k` - Stripe size (chunk size)

Verify the striping configuration:

```bash
sudo lvs -o +stripes,stripe_size data_vg/striped_lv
```

For detailed layout:

```bash
sudo lvdisplay -m data_vg/striped_lv
```

## Choosing the Right Stripe Size

The optimal stripe size depends on your workload:

| Workload | Recommended Stripe Size |
|----------|------------------------|
| Database (random I/O) | 64 KB |
| File server (mixed) | 128 KB |
| Streaming/video (sequential) | 256 KB or larger |
| Virtual machine images | 64 KB |

A smaller stripe size distributes I/O more evenly but increases overhead. A larger stripe size is more efficient for sequential access.

## Creating the File System

For XFS (recommended for striped volumes):

```bash
sudo mkfs.xfs -d su=64k,sw=4 /dev/data_vg/striped_lv
```

The XFS parameters should match your LVM stripe configuration:

- `su=64k` - Stripe unit (same as LVM stripe size)
- `sw=4` - Stripe width (number of stripes)

For ext4:

```bash
sudo mkfs.ext4 -E stride=16,stripe-width=64 /dev/data_vg/striped_lv
```

Where:
- `stride` = stripe_size / block_size = 65536 / 4096 = 16
- `stripe-width` = stride * number_of_stripes = 16 * 4 = 64

## Mounting the Striped Volume

```bash
sudo mkdir -p /data
sudo mount /dev/data_vg/striped_lv /data
```

Add to fstab:

```text
/dev/data_vg/striped_lv  /data  xfs  defaults  0 0
```

## Verifying Striping Performance

Benchmark sequential throughput:

```bash
fio --name=stripe-test --filename=/data/fio_test \
    --rw=read --bs=1M --size=4G --direct=1 \
    --numjobs=1 --runtime=60 --time_based \
    --group_reporting
```

Compare this with a non-striped volume on a single disk to see the throughput improvement.

## Using All Available Space

To use all free space in the volume group:

```bash
sudo lvcreate -l 100%FREE -n striped_lv -i 4 -I 64k data_vg
```

## Extending a Striped Logical Volume

When adding more disks, you can extend the striped volume:

```bash
sudo pvcreate /dev/sdf /dev/sdg /dev/sdh /dev/sdi
sudo vgextend data_vg /dev/sdf /dev/sdg /dev/sdh /dev/sdi
sudo lvextend -i 4 -I 64k -L +100G data_vg/striped_lv
sudo xfs_growfs /data
```

The extension must use the same number of stripes as the original.

## Important Considerations

- **No redundancy** - Striping alone provides no data protection. If any disk fails, all data is lost.
- **Stripe count** - You cannot change the stripe count after creation.
- **Equal disk sizes** - Disks should be the same size for even distribution.
- **Backup strategy** - Always have backups for striped volumes.

## Combining Striping with Mirrors

For both performance and redundancy, combine striping with mirroring (RAID 10):

```bash
sudo lvcreate --type raid10 -L 50G -n safe_striped -i 2 -m 1 data_vg
```

This creates a RAID 10 volume with 2 stripes and 1 mirror per stripe.

## Summary

LVM striping on RHEL is an effective way to increase storage throughput by distributing I/O across multiple disks. Choose stripe size based on your workload, align file system parameters with LVM settings, and remember that striping without mirroring provides no redundancy. For production workloads, consider RAID 10 to get both the performance benefits of striping and the safety of mirroring.
