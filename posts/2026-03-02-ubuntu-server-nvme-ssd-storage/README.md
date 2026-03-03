# How to Install Ubuntu Server on NVMe SSD Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NVMe, Storage, Server Administration

Description: A practical guide to installing Ubuntu Server on NVMe SSD storage, including device identification, partition layout considerations, and performance tuning for NVMe drives.

---

NVMe SSDs are now common in both server and workstation hardware, and installing Ubuntu Server on them has a few differences from traditional SATA drives worth understanding. Device naming, partition alignment, and I/O scheduler settings all benefit from some attention.

## Identifying NVMe Devices

NVMe drives use a different device naming convention than SATA disks. Where SATA drives appear as `/dev/sda`, `/dev/sdb`, etc., NVMe drives appear as:

```text
/dev/nvme0n1    # First NVMe controller, first namespace
/dev/nvme1n1    # Second NVMe controller, first namespace
```

Partitions on NVMe use `p` as a separator:

```text
/dev/nvme0n1p1  # First partition on first NVMe drive
/dev/nvme0n1p2  # Second partition
```

This matters when you are configuring GRUB, fstab, or scripts that reference disk paths.

## Booting the Installer

Download the Ubuntu Server 24.04 LTS ISO and write it to a USB drive:

```bash
# Write from a Linux or Mac machine
sudo dd if=ubuntu-24.04-live-server-amd64.iso of=/dev/sdX bs=4M status=progress oflag=sync
```

Boot from the USB. Modern systems with NVMe drives are almost always UEFI-based, so you will go through the UEFI boot path.

## Storage Configuration in the Subiquity Installer

When you reach the storage configuration step, Subiquity (the Ubuntu Server installer) should detect your NVMe drive automatically. You will see something like:

```text
NVME Controller
  nvme0n1   Samsung SSD 980 Pro 1TB
```

### Partition Layout Recommendations

For a server with a single NVMe drive, a reasonable layout is:

| Partition | Size | Type | Mount |
|-----------|------|------|-------|
| nvme0n1p1 | 1GB | EFI System | /boot/efi |
| nvme0n1p2 | 2GB | ext4 | /boot |
| nvme0n1p3 | Remaining | LVM PV | (LVM) |

Using LVM for the root volume group gives flexibility to expand logical volumes later without repartitioning.

In the installer, select "Custom storage layout" to configure this manually. Add an LVM volume group on the third partition and create logical volumes for root (`/`) and swap within it.

A common mistake is not leaving unallocated space in the volume group. Keeping 10-20% of the VG unallocated gives you headroom for LVM snapshots and future volume expansion.

## Verifying the Installation Device After Boot

Once the system is up, verify which device the OS is on:

```bash
# List block devices with filesystem info
lsblk -f

# Should show something like:
# nvme0n1
# ├─nvme0n1p1   vfat    /boot/efi
# ├─nvme0n1p2   ext4    /boot
# └─nvme0n1p3   LVM2_member
#   ├─ubuntu--vg-ubuntu--lv ext4 /

# Check disk model and firmware
sudo nvme id-ctrl /dev/nvme0n1 | grep -E "mn|fr|sn"
```

## NVMe I/O Scheduler

Traditional spinning disks benefit from I/O schedulers that reorder requests to minimize seek time. NVMe drives have their own internal queue management and generally perform best with the `none` (noop) scheduler, which passes requests directly to the hardware.

Check the current scheduler:

```bash
cat /sys/block/nvme0n1/queue/scheduler
# Output example: none [mq-deadline] kyber bfq
# The value in brackets is the active scheduler
```

Set it to `none` for NVMe:

```bash
echo none | sudo tee /sys/block/nvme0n1/queue/scheduler
```

To make this persistent across reboots, create a udev rule:

```bash
sudo nano /etc/udev/rules.d/60-nvme-scheduler.rules
```

```text
# Set none scheduler for NVMe drives
ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"
```

```bash
# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Read-Ahead and Queue Depth Settings

NVMe drives support much larger command queue depths than SATA (up to 65535 vs 32). The kernel typically handles this well by default, but you can verify:

```bash
# Check queue depth
cat /sys/block/nvme0n1/queue/nr_requests
# Default is usually 1023

# Check read-ahead (in 512-byte sectors, so 256 = 128KB)
cat /sys/block/nvme0n1/queue/read_ahead_kb
```

For database workloads with random I/O patterns, reducing read-ahead can help:

```bash
# Reduce read-ahead for random I/O workloads
echo 128 | sudo tee /sys/block/nvme0n1/queue/read_ahead_kb
```

For sequential workloads (media storage, backups), increasing it may improve throughput.

## Checking NVMe Health

Use the nvme-cli package to inspect drive health:

```bash
sudo apt install nvme-cli

# Check SMART/health data
sudo nvme smart-log /dev/nvme0n1

# Key fields to watch:
# critical_warning - non-zero means trouble
# available_spare  - should be above available_spare_threshold
# percentage_used  - endurance indicator, 100 = end of rated life
# data_units_read/written - lifetime data transferred
```

Set up regular health checks with a cron job:

```bash
sudo crontab -e
```

```text
# Check NVMe health weekly and log to syslog
0 3 * * 0 nvme smart-log /dev/nvme0n1 | logger -t nvme-health
```

## Filesystem Considerations for NVMe

### ext4 on NVMe

The default ext4 filesystem works well on NVMe. A few options worth considering:

```bash
# When formatting (done by installer, but useful for additional partitions)
# -E lazy_itable_init=0 ensures inode table is initialized immediately
# stride and stripe-width should match storage array geometry if using RAID
mkfs.ext4 -E lazy_itable_init=0 /dev/nvme0n1p4
```

### XFS for High-Throughput Workloads

XFS handles many concurrent writes better than ext4 and is a good choice for database servers or high-write workloads:

```bash
sudo apt install xfsprogs
mkfs.xfs /dev/nvme0n1p4
```

### Discard and TRIM

NVMe SSDs benefit from TRIM to maintain performance over time. Ubuntu enables periodic TRIM by default via the `fstrim.timer` systemd unit:

```bash
# Check that the trim timer is active
systemctl status fstrim.timer

# Run TRIM manually
sudo fstrim -v /
```

If you want continuous TRIM instead of periodic, add the `discard` mount option to fstab:

```text
UUID=xxxx / ext4 defaults,discard 0 1
```

Continuous discard adds some overhead; the periodic trim timer approach is generally recommended for most workloads.

## Benchmarking NVMe Performance

Verify the drive is performing as expected after installation:

```bash
sudo apt install fio

# Sequential read test
sudo fio --name=seq-read --ioengine=libaio --iodepth=16 --rw=read --bs=1M --numjobs=1 --size=4G --runtime=30 --time_based --filename=/dev/nvme0n1 --direct=1

# Random 4K read test (important for databases)
sudo fio --name=rand-read --ioengine=libaio --iodepth=32 --rw=randread --bs=4k --numjobs=4 --size=4G --runtime=30 --time_based --filename=/dev/nvme0n1 --direct=1
```

Good NVMe drives should show sequential reads above 3000 MB/s and random 4K reads above 500k IOPS. If numbers are significantly lower, check that the drive is in a Gen4 slot and that the I/O scheduler is set correctly.

## Multiple NVMe Drives

If you have multiple NVMe drives, the partition naming becomes critical for scripts and configuration:

```bash
# List all NVMe devices
ls -la /dev/nvme*

# Identify each drive
sudo nvme id-ctrl /dev/nvme0n1 | grep "mn"
sudo nvme id-ctrl /dev/nvme1n1 | grep "mn"
```

Always reference partitions by UUID in fstab rather than device paths, since device names can change depending on which PCIe slot a drive occupies or the order the kernel discovers them:

```bash
# Get UUIDs for all partitions
blkid
```

NVMe devices deliver exceptional performance, but only if the rest of the stack is configured to take advantage of them. A well-tuned NVMe setup with appropriate filesystem and scheduler settings will outperform a poorly configured setup with the same hardware by a meaningful margin.
