# How to Add a Data Disk to an Azure Linux Virtual Machine and Mount It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Linux, Virtual Machine, Data Disk, Storage, Disk Management, Azure CLI

Description: A complete guide to adding a data disk to an Azure Linux VM, partitioning it, creating a filesystem, and mounting it persistently.

---

The OS disk on an Azure Linux VM is typically 30 GB, which fills up fast when you start logging, caching, or storing application data. Adding a separate data disk is the clean way to handle additional storage. It keeps your data isolated from the OS, makes backups simpler, and lets you resize storage independently of the VM.

This guide walks through the entire process from creating the disk in Azure to having it mounted and usable inside your Linux VM.

## Planning Your Disk

Before creating a disk, decide on three things:

**Disk type**: This determines performance and cost.
- Standard HDD (Standard_LRS): Cheapest, for backups and infrequent access. Up to 500 IOPS.
- Standard SSD (StandardSSD_LRS): Good middle ground. Up to 6,000 IOPS.
- Premium SSD (Premium_LRS): Production workloads. Up to 20,000 IOPS depending on size.
- Ultra Disk (UltraSSD_LRS): Maximum performance. Configurable IOPS up to 160,000.

**Disk size**: Larger disks have higher IOPS and throughput limits. For Premium SSD:
- 64 GB (P6): 240 IOPS, 50 MB/s
- 128 GB (P10): 500 IOPS, 100 MB/s
- 256 GB (P15): 1,100 IOPS, 125 MB/s
- 512 GB (P20): 2,300 IOPS, 150 MB/s
- 1 TB (P30): 5,000 IOPS, 200 MB/s

**Filesystem**: ext4 is the default choice for most Linux workloads. Use XFS for very large files or high-throughput scenarios.

## Step 1: Create and Attach the Disk

You can create and attach the disk in a single command:

```bash
# Create a 256 GB Premium SSD and attach it to the VM
az vm disk attach \
  --resource-group myResourceGroup \
  --vm-name myLinuxVM \
  --name myDataDisk \
  --size-gb 256 \
  --sku Premium_LRS \
  --new
```

The `--new` flag tells Azure to create the disk if it does not exist. This is a hot-plug operation - no VM restart is required.

Alternatively, create the disk separately first:

```bash
# Create the disk independently
az disk create \
  --resource-group myResourceGroup \
  --name myDataDisk \
  --size-gb 256 \
  --sku Premium_LRS \
  --location eastus

# Then attach it
az vm disk attach \
  --resource-group myResourceGroup \
  --vm-name myLinuxVM \
  --name myDataDisk
```

## Step 2: Find the New Disk Inside the VM

SSH into your VM and identify the newly attached disk:

```bash
# List all block devices to identify the new disk
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT
```

Output will look something like:

```
NAME    SIZE TYPE MOUNTPOINT
sda      30G disk
|-sda1 29.9G part /
|-sda14    4M part
|-sda15  106M part /boot/efi
sdb      16G disk
|-sdb1   16G part /mnt
sdc     256G disk
```

In this output:
- `sda` is the OS disk (30 GB)
- `sdb` is the temporary disk (mounted at /mnt - do not use this for persistent data)
- `sdc` is the new data disk (256 GB, no partitions yet)

The device name (`sdc`, `sdd`, etc.) depends on how many disks are already attached. Always verify by checking the size.

You can also use `dmesg` to see the new disk:

```bash
# Check kernel messages for the newly attached SCSI device
sudo dmesg | tail -20
```

Look for messages about a new SCSI disk being detected.

## Step 3: Partition the Disk

Create a GPT partition table and a single partition:

```bash
# Create a GPT partition table with one partition spanning the entire disk
sudo parted /dev/sdc --script \
  mklabel gpt \
  mkpart primary ext4 0% 100%
```

Verify the partition was created:

```bash
# Confirm the partition exists
lsblk /dev/sdc
```

You should see `/dev/sdc1` listed as a partition.

For disks larger than 2 TB, GPT is required (MBR does not support disks over 2 TB). Since we are using GPT here, disk size is not a concern.

## Step 4: Create the Filesystem

Format the partition with ext4:

```bash
# Create an ext4 filesystem on the new partition
# -L sets a label for easier identification
sudo mkfs.ext4 -L datastore /dev/sdc1
```

If you prefer XFS:

```bash
# Create an XFS filesystem (better for large files and high throughput)
sudo mkfs.xfs -L datastore /dev/sdc1
```

The formatting takes a few seconds for most disk sizes.

## Step 5: Create a Mount Point and Mount the Disk

```bash
# Create the directory where the disk will be mounted
sudo mkdir -p /data

# Mount the new partition
sudo mount /dev/sdc1 /data

# Verify it is mounted
df -h /data
```

The output should show the disk mounted at `/data` with the expected size.

## Step 6: Configure Persistent Mounting

If you just use `mount`, the disk will not be remounted after a reboot. You need to add an entry to `/etc/fstab`.

Never use the device name (`/dev/sdc1`) in fstab because device names can change between reboots. Use the UUID instead:

```bash
# Get the UUID of the partition
sudo blkid /dev/sdc1
```

This outputs something like:

```
/dev/sdc1: LABEL="datastore" UUID="a1b2c3d4-e5f6-7890-abcd-ef1234567890" TYPE="ext4"
```

Add the fstab entry:

```bash
# Add the mount entry to fstab using the UUID
# nofail prevents boot failure if the disk is missing
echo "UUID=a1b2c3d4-e5f6-7890-abcd-ef1234567890 /data ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
```

The fields in the fstab entry:
- `UUID=...`: The disk identifier (stable across reboots)
- `/data`: The mount point
- `ext4`: The filesystem type
- `defaults,nofail`: Mount options. `defaults` uses standard options. `nofail` prevents boot failure if the disk is missing.
- `0`: Dump frequency (0 = no dump)
- `2`: Filesystem check order (2 = check after root filesystem)

Verify the fstab entry is correct by unmounting and remounting:

```bash
# Unmount the disk
sudo umount /data

# Mount all filesystems in fstab (tests your entry)
sudo mount -a

# Verify it is mounted again
df -h /data
```

If `mount -a` succeeds, your fstab entry is correct. If it fails, fix the entry before rebooting, or you may have trouble booting the VM.

## Step 7: Set Ownership and Permissions

By default, the mounted filesystem is owned by root. Change ownership if your application runs as a different user:

```bash
# Change ownership to the application user
sudo chown -R azureuser:azureuser /data

# Or set specific permissions
sudo chmod 755 /data
```

## Configuring Disk Caching

Azure managed disks support three caching modes. You can set this when attaching:

```bash
# Attach a disk with read-only caching
az vm disk attach \
  --resource-group myResourceGroup \
  --vm-name myLinuxVM \
  --name myDataDisk \
  --caching ReadOnly
```

Caching recommendations:
- **None**: Best for write-heavy workloads (databases with their own caching, log files).
- **ReadOnly**: Best for read-heavy workloads (application data, static files).
- **ReadWrite**: Only use for the OS disk. Risky for data disks because cached writes can be lost.

## Using LVM for Flexible Storage

If you want to combine multiple disks into a single logical volume, use LVM:

```bash
# Install LVM tools
sudo apt install -y lvm2

# Create physical volumes on each disk
sudo pvcreate /dev/sdc /dev/sdd

# Create a volume group spanning both disks
sudo vgcreate datavg /dev/sdc /dev/sdd

# Create a logical volume using all available space
sudo lvcreate -l 100%FREE -n datalv datavg

# Format and mount the logical volume
sudo mkfs.ext4 /dev/datavg/datalv
sudo mkdir -p /data
sudo mount /dev/datavg/datalv /data
```

LVM makes it easy to add more disks later and expand the volume without downtime:

```bash
# Add a new disk to the volume group
sudo pvcreate /dev/sde
sudo vgextend datavg /dev/sde

# Extend the logical volume and resize the filesystem
sudo lvextend -l +100%FREE /dev/datavg/datalv
sudo resize2fs /dev/datavg/datalv
```

## Monitoring Disk Usage

Set up a simple alert for disk space:

```bash
# Check disk usage from the command line
df -h /data

# Set up a cron job to alert on low disk space
# Add this to crontab with: crontab -e
# Runs every hour, sends email if usage exceeds 80%
0 * * * * df /data | awk 'NR==2 {gsub(/%/,"",$5); if($5>80) print "Disk usage at "$5"%"}' | mail -s "Disk Alert" admin@example.com
```

From Azure, you can monitor disk metrics:

```bash
# Get disk read/write operations per second
az monitor metrics list \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/disks/myDataDisk" \
  --metric "Composite Disk Read Operations/sec" "Composite Disk Write Operations/sec" \
  --output table
```

## Wrapping Up

Adding a data disk to an Azure Linux VM is a routine task that every cloud engineer should be comfortable with. The Azure side is just one command. The Linux side - partitioning, formatting, and mounting - is the part that trips people up, especially the fstab configuration. Always use UUIDs in fstab, always include the `nofail` option, and always test with `mount -a` before rebooting. Once the disk is in place, you have a clean separation between your OS and your data, which makes backup, recovery, and storage management much simpler.
