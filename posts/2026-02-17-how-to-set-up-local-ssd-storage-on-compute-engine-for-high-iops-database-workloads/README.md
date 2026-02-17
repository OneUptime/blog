# How to Set Up Local SSD Storage on Compute Engine for High-IOPS Database Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Local SSD, Storage, Database Performance

Description: A practical guide to configuring local SSD storage on Google Compute Engine VMs for database workloads that need extremely high IOPS and low latency disk access.

---

Persistent disks on Compute Engine are reliable and flexible, but when your database workload needs raw speed - hundreds of thousands of IOPS and sub-millisecond latency - local SSDs are what you reach for. These are physical NVMe drives attached directly to the host machine your VM runs on, and they are fast.

The trade-off is important to understand: local SSDs are ephemeral. If the VM stops, is preempted, or the host machine fails, the data is gone. That makes them perfect for scratch space, caches, and database workloads where data is replicated elsewhere. Let me show you how to set them up.

## What Local SSDs Offer

Each local SSD partition is 375 GB. You can attach multiple partitions to a single VM, up to a maximum that depends on the machine type. For N2 machines, you can attach up to 24 local SSDs (9 TB total). Each partition delivers roughly 170,000 read IOPS and 90,000 write IOPS individually.

Compare this to a pd-ssd persistent disk, which maxes out around 100,000 read IOPS even at maximum size. Local SSDs can deliver several times that performance when you combine multiple partitions.

## Creating a VM with Local SSDs

Here is how to create a VM with local SSD storage attached:

```bash
# Create a VM with 4 local SSD partitions (1.5 TB total)
gcloud compute instances create db-server \
  --zone=us-central1-a \
  --machine-type=n2-standard-8 \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --local-ssd=interface=NVME \
  --local-ssd=interface=NVME \
  --local-ssd=interface=NVME \
  --local-ssd=interface=NVME \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-ssd
```

Each `--local-ssd=interface=NVME` line adds one 375 GB partition. The NVME interface gives you the best performance. There is also a SCSI interface option, but there is no reason to use it unless you have specific compatibility requirements.

## Formatting and Mounting a Single Local SSD

After creating the VM, SSH in and set up the local SSDs. For a single partition:

```bash
# SSH into the VM
gcloud compute ssh db-server --zone=us-central1-a
```

Find the local SSD devices:

```bash
# List all NVMe devices to find local SSDs
sudo lsblk | grep nvme
```

You will see devices like `nvme0n1`, `nvme0n2`, etc. The boot disk is typically `nvme0n1`, and local SSDs start from `nvme0n2`.

Format and mount a single local SSD:

```bash
# Format the local SSD with ext4 (discard enables TRIM support)
sudo mkfs.ext4 -F -E discard /dev/nvme0n2

# Create a mount point
sudo mkdir -p /mnt/ssd0

# Mount with performance-optimized options
sudo mount -o discard,defaults,nobarrier /dev/nvme0n2 /mnt/ssd0

# Verify the mount
df -h /mnt/ssd0
```

The `nobarrier` mount option disables write barriers, which improves write performance. This is safe for local SSDs because they do not have a volatile write cache.

## Combining Multiple Local SSDs with RAID 0

For maximum performance, combine multiple local SSDs into a RAID 0 array. This stripes data across all drives, multiplying throughput:

```bash
# Install mdadm for software RAID management
sudo apt-get update && sudo apt-get install -y mdadm

# Create a RAID 0 array from 4 local SSDs
sudo mdadm --create /dev/md0 \
  --level=0 \
  --raid-devices=4 \
  /dev/nvme0n2 /dev/nvme0n3 /dev/nvme0n4 /dev/nvme0n5

# Format the RAID array with ext4
sudo mkfs.ext4 -F -E discard /dev/md0

# Create mount point and mount
sudo mkdir -p /mnt/ssd-array
sudo mount -o discard,defaults,nobarrier /dev/md0 /mnt/ssd-array

# Verify the total size (should be ~1.5 TB for 4 drives)
df -h /mnt/ssd-array
```

With 4 local SSDs in RAID 0, you get approximately 680,000 read IOPS and 360,000 write IOPS. That is serious throughput.

## Making the Mount Persistent

The mount configuration does not survive reboots by default. Add it to fstab:

For a single local SSD:

```bash
# Add the local SSD mount to fstab for persistence across reboots
echo '/dev/nvme0n2 /mnt/ssd0 ext4 discard,defaults,nobarrier,nofail 0 2' | sudo tee -a /etc/fstab
```

For the RAID array, you also need to save the RAID configuration:

```bash
# Save RAID configuration so it reassembles on boot
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf
sudo update-initramfs -u

# Add RAID mount to fstab
echo '/dev/md0 /mnt/ssd-array ext4 discard,defaults,nobarrier,nofail 0 2' | sudo tee -a /etc/fstab
```

The `nofail` option is important - it prevents the VM from failing to boot if the local SSD is not present for some reason.

## Configuring a Database on Local SSDs

Here is an example of setting up PostgreSQL to use local SSD storage:

```bash
# Install PostgreSQL
sudo apt-get install -y postgresql

# Stop PostgreSQL before moving data directory
sudo systemctl stop postgresql

# Move the data directory to the local SSD
sudo rsync -av /var/lib/postgresql/ /mnt/ssd-array/postgresql/
sudo chown -R postgres:postgres /mnt/ssd-array/postgresql/
```

Update the PostgreSQL configuration to use the new data directory:

```bash
# Update PostgreSQL to use the local SSD data directory
sudo sed -i "s|data_directory = '/var/lib/postgresql/.*'|data_directory = '/mnt/ssd-array/postgresql/15/main'|" \
  /etc/postgresql/15/main/postgresql.conf

# Start PostgreSQL with the new data directory
sudo systemctl start postgresql

# Verify it is running from the local SSD
sudo -u postgres psql -c "SHOW data_directory;"
```

## Performance Tuning for Database Workloads

When using local SSDs for databases, adjust these system settings:

```bash
# Set the I/O scheduler to none (best for NVMe devices)
for dev in nvme0n2 nvme0n3 nvme0n4 nvme0n5; do
  echo none | sudo tee /sys/block/${dev}/queue/scheduler
done

# Increase the readahead buffer for sequential workloads
for dev in nvme0n2 nvme0n3 nvme0n4 nvme0n5; do
  sudo blockdev --setrahead 4096 /dev/${dev}
done

# Increase the maximum number of open files
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

For PostgreSQL specifically, these settings take advantage of local SSD performance:

```bash
# PostgreSQL settings optimized for local SSD storage
# Add these to postgresql.conf
shared_buffers = 4GB              # 25% of available RAM
effective_cache_size = 12GB       # 75% of available RAM
random_page_cost = 1.1            # Low because SSD random reads are fast
effective_io_concurrency = 200    # NVMe can handle high concurrency
maintenance_work_mem = 1GB        # Speed up VACUUM and CREATE INDEX
wal_buffers = 64MB                # Larger WAL buffer for write throughput
```

## Data Protection Strategy

Since local SSDs are ephemeral, you must have a data protection strategy. Here are the common approaches:

**Stream WAL logs to Cloud Storage:**

```bash
# Configure PostgreSQL WAL archiving to Cloud Storage
archive_mode = on
archive_command = 'gsutil cp %p gs://my-wal-archive/%f'
```

**Set up streaming replication to a persistent disk instance:**

Keep a replica on a VM with persistent disks. The primary uses local SSDs for performance, and the replica on persistent disks ensures durability.

**Regular pg_dump to Cloud Storage:**

```bash
# Automated backup script
#!/bin/bash
# Dump the database and upload to Cloud Storage
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
sudo -u postgres pg_dump mydb | gzip | \
  gsutil cp - "gs://my-db-backups/mydb-${TIMESTAMP}.sql.gz"
```

## Monitoring Local SSD Performance

Keep an eye on your local SSD performance with these tools:

```bash
# Real-time I/O statistics for all devices
iostat -xm 1

# Check NVMe device health and temperature
sudo nvme smart-log /dev/nvme0n2
```

You can also use the Cloud Monitoring agent to send disk metrics to Cloud Monitoring for dashboards and alerting.

## When to Use Local SSDs

Local SSDs are the right choice when:
- Your workload needs more than 100,000 IOPS
- Sub-millisecond read latency is important
- Data is replicated or can be recreated
- You are running a cache layer like Redis or Memcached
- Your database has a separate durability mechanism

They are not the right choice when:
- You cannot afford to lose data on a single machine failure
- Your workload is already well-served by pd-ssd performance
- You need the flexibility to resize storage without recreating the VM

Local SSDs deliver remarkable performance for the right workloads. Just make sure your data protection strategy is solid before you put anything important on them.
