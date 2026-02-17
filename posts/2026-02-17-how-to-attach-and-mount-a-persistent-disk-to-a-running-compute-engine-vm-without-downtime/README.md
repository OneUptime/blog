# How to Attach and Mount a Persistent Disk to a Running Compute Engine VM Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Persistent Disk, Storage, Cloud Infrastructure

Description: Learn how to attach and mount a persistent disk to a running GCP Compute Engine VM without any downtime, including formatting and auto-mount configuration.

---

There comes a time in every VM's life when it needs more disk space. Maybe your application logs are growing faster than expected, or you need to add a dedicated data volume for your database. The good news is that on GCP Compute Engine, you can attach a new persistent disk to a running VM without stopping it or causing any downtime to your application.

In this guide, I will walk through the entire process - from creating the disk to attaching it, formatting it, mounting it, and making sure it survives reboots.

## Step 1: Create a Persistent Disk

First, create a new persistent disk in the same zone as your VM. This is important - a zonal persistent disk must be in the same zone as the instance it attaches to.

```bash
# Create a 200 GB SSD persistent disk in the same zone as your VM
gcloud compute disks create my-data-disk \
    --size=200GB \
    --type=pd-ssd \
    --zone=us-central1-a
```

You have several disk type options:

- **pd-standard**: Standard HDD-backed persistent disk. Cheapest option, good for sequential read/write workloads.
- **pd-balanced**: Balanced performance SSD. Good middle ground for most workloads.
- **pd-ssd**: High-performance SSD. Best for random IOPS-heavy workloads like databases.
- **pd-extreme**: Highest performance option, available for certain machine types.

## Step 2: Attach the Disk to Your Running VM

Now attach the disk to your running instance. This does not require stopping the VM.

```bash
# Attach the disk to the running VM - no restart needed
gcloud compute instances attach-disk my-vm \
    --disk=my-data-disk \
    --zone=us-central1-a \
    --device-name=my-data-disk
```

The `--device-name` flag is optional but recommended. It gives the disk a predictable name under `/dev/disk/by-id/`, which makes it easier to reference in scripts and fstab entries.

You can verify the disk is attached by checking the instance details:

```bash
# Verify the disk is attached to the instance
gcloud compute instances describe my-vm \
    --zone=us-central1-a \
    --format="yaml(disks)"
```

## Step 3: SSH Into the VM and Find the Disk

SSH into your VM and identify the newly attached disk.

```bash
# SSH into the VM
gcloud compute ssh my-vm --zone=us-central1-a
```

Once inside, list the available block devices:

```bash
# List all block devices to find the new disk
lsblk
```

You should see output similar to this:

```
NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
sda      8:0    0    10G  0 disk
|-sda1   8:1    0   9.9G  0 part /
|-sda14  8:14   0     4M  0 part
|-sda15  8:15   0   106M  0 part /boot/efi
sdb      8:16   0   200G  0 disk
```

The new 200 GB disk shows up as `sdb` (or whatever the next available device letter is). It has no partitions or mount point yet.

## Step 4: Format the Disk

Since this is a brand new disk, you need to create a filesystem on it. I will use ext4, which is the most common choice for Linux systems.

```bash
# Format the disk with ext4 filesystem
# WARNING: This erases all data on the disk - only run on new/empty disks
sudo mkfs.ext4 -m 0 -E lazy_itable_init=0,lazy_journal_init=0,discard /dev/sdb
```

The flags here are worth explaining:

- `-m 0`: Sets the reserved block percentage to 0. By default, ext4 reserves 5% of the disk for root. For a data disk, you usually do not need this.
- `-E lazy_itable_init=0,lazy_journal_init=0`: Forces full initialization, which improves performance after the disk is first used.
- `-E discard`: Enables TRIM/discard support for SSD-backed disks.

## Step 5: Create a Mount Point and Mount the Disk

Create a directory to serve as the mount point and mount the disk there.

```bash
# Create the mount point directory
sudo mkdir -p /mnt/data

# Mount the disk to the mount point
sudo mount -o discard,defaults /dev/sdb /mnt/data

# Verify the mount was successful
df -h /mnt/data
```

The `-o discard` mount option enables continuous TRIM, which helps maintain SSD performance over time.

## Step 6: Set Permissions

By default, the mounted disk is owned by root. You will probably want your application user to be able to write to it.

```bash
# Change ownership to your application user
sudo chown -R myuser:myuser /mnt/data

# Or set broader permissions if multiple users need access
sudo chmod 755 /mnt/data
```

## Step 7: Configure Auto-Mount on Reboot

This is the step people often forget, and then wonder why their disk is not mounted after a reboot. You need to add an entry to `/etc/fstab`.

First, get the disk's UUID (using the UUID instead of the device name is more reliable since device names can change):

```bash
# Get the UUID of the disk
sudo blkid /dev/sdb
```

This outputs something like:

```
/dev/sdb: UUID="a1b2c3d4-e5f6-7890-abcd-ef1234567890" TYPE="ext4"
```

Now add an entry to fstab:

```bash
# Add the disk to fstab for auto-mounting on boot
# Replace the UUID with the one from the blkid output
echo 'UUID=a1b2c3d4-e5f6-7890-abcd-ef1234567890 /mnt/data ext4 discard,defaults,nofail 0 2' | sudo tee -a /etc/fstab
```

The `nofail` option is critical here. Without it, if the disk is ever detached or unavailable, your VM will fail to boot. With `nofail`, the system boots normally even if the disk cannot be mounted.

Test that your fstab entry is correct by unmounting and remounting:

```bash
# Test the fstab entry by unmounting and remounting
sudo umount /mnt/data
sudo mount -a

# Verify it mounted correctly
df -h /mnt/data
```

## Doing It All with Terraform

If you want to manage this through infrastructure as code, here is the Terraform approach.

```hcl
# Create the persistent disk
resource "google_compute_disk" "data" {
  name = "my-data-disk"
  type = "pd-ssd"
  size = 200
  zone = "us-central1-a"
}

# Attach the disk to an existing instance
resource "google_compute_attached_disk" "data" {
  disk     = google_compute_disk.data.id
  instance = google_compute_instance.my_vm.id
  zone     = "us-central1-a"
  device_name = "my-data-disk"
}
```

Note that Terraform handles the attach/detach but not the formatting and mounting. For that, you would use a startup script or a configuration management tool.

## Attaching a Disk in Read-Only Mode to Multiple VMs

One interesting capability is that you can attach a persistent disk in read-only mode to up to 10 VMs simultaneously. This is useful for sharing reference data across instances.

```bash
# Attach a disk in read-only mode to a VM
gcloud compute instances attach-disk my-vm-2 \
    --disk=my-shared-data-disk \
    --zone=us-central1-a \
    --mode=ro
```

The disk must already be formatted and populated with data, and it must be detached from any instance that has it in read-write mode before you can attach it read-only to multiple instances.

## Resizing the Disk Later

If you need more space later, you can resize the persistent disk without detaching it:

```bash
# Increase the disk size (you can only increase, never decrease)
gcloud compute disks resize my-data-disk \
    --size=500GB \
    --zone=us-central1-a
```

After resizing, you need to grow the filesystem from within the VM:

```bash
# Grow the ext4 filesystem to use the new space
sudo resize2fs /dev/sdb
```

## Wrapping Up

Attaching a persistent disk to a running VM is one of those operations that sounds like it should be complicated but is actually quite smooth on GCP. The entire process - from disk creation to a fully mounted, auto-mounting volume - takes about five minutes. The most important things to remember are to always use the `nofail` option in fstab, use UUIDs instead of device names, and make sure your disk is in the same zone as your VM.
