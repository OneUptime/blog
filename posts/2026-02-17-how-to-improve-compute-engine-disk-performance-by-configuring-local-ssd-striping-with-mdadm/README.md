# How to Improve Compute Engine Disk Performance by Configuring Local SSD Striping with mdadm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Local SSD, Disk Performance, mdadm

Description: Step-by-step guide to configuring RAID 0 striping across multiple local SSDs on Compute Engine using mdadm for maximum disk throughput and IOPS.

---

Compute Engine persistent disks are reliable and convenient, but when your workload demands raw disk speed - think database engines, caching layers, or data-intensive batch processing - local SSDs are where the real performance lives. Each local SSD on Compute Engine delivers 375GB of NVMe storage with significantly higher IOPS and throughput than persistent disks. But to get the most out of multiple local SSDs, you need to stripe them together using RAID 0. Here is how to do it with mdadm.

## Why Local SSDs and Striping

A single local SSD on Compute Engine provides about 170,000 read IOPS and 90,000 write IOPS. Impressive on its own, but many workloads need more. By attaching multiple local SSDs and striping them in RAID 0, you combine the IOPS and throughput of all the disks. Four local SSDs in RAID 0 can deliver around 680,000 read IOPS.

The trade-off is durability. Local SSDs are ephemeral - data is lost when the VM stops, is preempted, or experiences a host event. RAID 0 does not add any redundancy. This setup is ideal for scratch space, temporary processing, caches, and databases that replicate data elsewhere.

## Creating a VM with Multiple Local SSDs

Start by creating a Compute Engine instance with multiple local SSDs attached:

```bash
# Create a VM with 4 local SSDs attached
# Each local SSD is 375GB, giving us 1.5TB total
gcloud compute instances create high-perf-vm \
  --zone us-central1-a \
  --machine-type n2-standard-8 \
  --local-ssd interface=NVME \
  --local-ssd interface=NVME \
  --local-ssd interface=NVME \
  --local-ssd interface=NVME \
  --image-family debian-12 \
  --image-project debian-cloud \
  --boot-disk-size 50GB
```

Each `--local-ssd` flag attaches one 375GB NVMe SSD. You can attach up to 24 local SSDs depending on the machine type.

## Identifying the Local SSD Devices

SSH into the instance and identify the NVMe devices:

```bash
# SSH into the instance
gcloud compute ssh high-perf-vm --zone us-central1-a

# List all NVMe devices - local SSDs show up as nvme0n* devices
lsblk | grep nvme
```

You should see output like:

```
nvme0n1    259:0    0  375G  0 disk
nvme0n2    259:1    0  375G  0 disk
nvme0n3    259:2    0  375G  0 disk
nvme0n4    259:3    0  375G  0 disk
```

Verify these are the local SSDs (not the boot disk):

```bash
# Confirm the device details - look for "Google EphemeralDisk" model
sudo nvme list
```

## Installing mdadm and Creating the RAID 0 Array

Install mdadm if it is not already present, then create the RAID 0 array:

```bash
# Install mdadm for RAID management
sudo apt-get update && sudo apt-get install -y mdadm

# Create a RAID 0 array from the 4 local SSDs
# --level=0 means RAID 0 (striping, no redundancy)
# --raid-devices=4 specifies the number of devices
# --chunk=256 sets the stripe size to 256KB for good performance
sudo mdadm --create /dev/md0 \
  --level=0 \
  --raid-devices=4 \
  --chunk=256 \
  /dev/nvme0n1 /dev/nvme0n2 /dev/nvme0n3 /dev/nvme0n4
```

Confirm the array was created successfully:

```bash
# Check RAID array status - should show 4 active devices
sudo mdadm --detail /dev/md0
```

You should see the array is active with all 4 devices and a total size of about 1.5TB.

## Formatting and Mounting the Array

Now format the RAID array with a filesystem. ext4 is a solid choice, and we will use options that favor performance:

```bash
# Format with ext4 using performance-oriented options
# -b 4096: 4KB block size
# -E stride=64,stripe-width=256: match the RAID chunk size
#   stride = chunk_size / block_size = 256KB / 4KB = 64
#   stripe_width = stride * num_disks = 64 * 4 = 256
sudo mkfs.ext4 -b 4096 -E stride=64,stripe-width=256 /dev/md0

# Create mount point
sudo mkdir -p /mnt/disks/ssd-array

# Mount the array with performance options
# noatime: don't update access timestamps (saves write IOPS)
# nodiratime: same for directories
# discard: enable TRIM for SSD health
sudo mount -o defaults,noatime,nodiratime,discard /dev/md0 /mnt/disks/ssd-array

# Set permissions so your application user can write to it
sudo chmod 777 /mnt/disks/ssd-array
```

The stride and stripe_width parameters tell ext4 about the RAID geometry so it can align writes efficiently. This matters more than you might think - misaligned writes can cut performance significantly.

## Verifying Performance

Let us benchmark the array to confirm we are getting the expected performance:

```bash
# Install fio for disk benchmarking
sudo apt-get install -y fio

# Run a random read test to measure IOPS
# This test uses 4KB blocks with 64 parallel I/O operations
sudo fio --name=randread --ioengine=libaio --iodepth=64 \
  --rw=randread --bs=4k --direct=1 --size=4G \
  --numjobs=4 --runtime=30 --group_reporting \
  --directory=/mnt/disks/ssd-array
```

You should see IOPS numbers in the hundreds of thousands for random reads. Run a sequential write test too:

```bash
# Run a sequential write test to measure throughput
# This test uses 1MB blocks for maximum throughput
sudo fio --name=seqwrite --ioengine=libaio --iodepth=32 \
  --rw=write --bs=1m --direct=1 --size=4G \
  --numjobs=4 --runtime=30 --group_reporting \
  --directory=/mnt/disks/ssd-array
```

Sequential throughput should be in the multi-GB/s range with four striped local SSDs.

## Making the Configuration Survive Reboots

If your VM reboots (rather than being stopped and started, which loses local SSD data), you want the RAID array to reassemble automatically:

```bash
# Save the RAID configuration
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf

# Update initramfs so the RAID array is assembled at boot
sudo update-initramfs -u

# Add fstab entry for automatic mounting
# Use nofail so the VM still boots if the array is missing
echo '/dev/md0 /mnt/disks/ssd-array ext4 defaults,noatime,nodiratime,discard,nofail 0 2' | sudo tee -a /etc/fstab
```

## Tuning the RAID Array for Specific Workloads

Depending on your workload, you can tune additional parameters:

```bash
# For database workloads - increase the read-ahead buffer
# This helps with sequential scans
sudo blockdev --setra 4096 /dev/md0

# Check the current I/O scheduler - noop or none is best for SSDs
cat /sys/block/nvme0n1/queue/scheduler

# Set the scheduler to none (noop) for all SSDs
for disk in nvme0n1 nvme0n2 nvme0n3 nvme0n4; do
  echo none | sudo tee /sys/block/$disk/queue/scheduler
done
```

## Using the Array for Specific Applications

For a database like PostgreSQL or MySQL, point the data directory at the striped array:

```bash
# Example: Configure PostgreSQL to use the SSD array for data
# Stop PostgreSQL, move data, create symlink
sudo systemctl stop postgresql
sudo rsync -av /var/lib/postgresql/ /mnt/disks/ssd-array/postgresql/
sudo mv /var/lib/postgresql /var/lib/postgresql.bak
sudo ln -s /mnt/disks/ssd-array/postgresql /var/lib/postgresql
sudo systemctl start postgresql
```

For temporary file processing or ETL jobs, simply point your application at `/mnt/disks/ssd-array` as its working directory.

## Important Considerations

Remember that local SSD data is ephemeral. Never store data here that you cannot afford to lose. Always replicate important data to persistent disks, Cloud Storage, or another durable store.

The number of local SSDs you can attach depends on your machine type. Check the documentation for your specific machine family. N2 instances support up to 24 local SSDs, which gives you 9TB of raw NVMe storage in a single RAID 0 array.

RAID 0 has no fault tolerance. If a single disk fails, the entire array is lost. For local SSDs on Compute Engine, this is acceptable because the data is ephemeral anyway. But it reinforces the point: do not put anything here that is not backed up elsewhere.

Striping local SSDs with mdadm is one of the most effective ways to get maximum disk performance on Compute Engine. The setup takes about 10 minutes and the performance gains are dramatic for I/O-intensive workloads.
