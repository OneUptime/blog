# How to Create an Ubuntu Live USB with Persistent Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Live USB, Persistent Storage, Installation, Portable

Description: Learn how to create an Ubuntu Live USB drive with persistent storage so your files, settings, and installed packages survive reboots across different machines.

---

A standard Ubuntu Live USB boots into a clean, temporary session every time - changes are lost when you shut down. A persistent Live USB changes this by storing your files, settings, and installed packages across reboots. This makes it genuinely useful as a portable Linux environment you can carry and use on any machine, or as a recovery and diagnostic tool that remembers your configuration.

## How Persistence Works

Ubuntu Live environments use a union filesystem (overlayfs or casper-rw). When persistence is configured:

- The ISO's squashfs filesystem provides the base read-only layer
- A writable `casper-rw` file or partition provides the overlay layer
- Reads come from both layers (overlay wins), writes go to the overlay

The overlay has a size limit set when you create it. Once it fills up, you cannot save more changes without expanding it.

## Method 1: Using mkusb (Recommended, GUI)

`mkusb` is the official Canonical-recommended tool for creating persistent Live USB drives. It handles the partition layout and persistence setup automatically.

### Install mkusb

```bash
# Add the mkusb PPA
sudo add-apt-repository universe
sudo add-apt-repository ppa:mkusb/ppa
sudo apt update
sudo apt install mkusb

# Install the GUI version (dus = do USB stuff)
sudo apt install mkusb-nox    # Command line version
```

### Create a Persistent Drive

1. Run `mkusb` (or `sudo mkusb`)
2. Select option `i` (Install or clone system)
3. Select your Ubuntu ISO file
4. Select your USB drive (be careful - wrong drive = data loss)
5. Choose persistent option (option `p` in the menu)
6. Set persistence size - how much writable space to allocate
7. Confirm and let it run

mkusb creates a proper partition layout:
```text
/dev/sdX1  ISO9660   Ubuntu Live ISO (read-only)
/dev/sdX2  ext2      casper-rw (persistence partition, writable)
/dev/sdX3  vfat      usbdata (additional FAT32 storage, optional)
```

## Method 2: Using Ventoy (Multi-Boot with Persistence)

Ventoy is excellent for keeping multiple ISOs on one USB drive. It also supports persistence.

### Install Ventoy on USB

```bash
# Download Ventoy
wget https://github.com/ventoy/Ventoy/releases/download/v1.0.97/ventoy-1.0.97-linux.tar.gz
tar xzf ventoy-*.tar.gz
cd ventoy-*/

# Install Ventoy to USB drive (replace /dev/sdX)
# WARNING: This erases the USB drive
sudo ./Ventoy2Disk.sh -I /dev/sdX
```

### Copy ISO and Configure Persistence

```bash
# Mount the USB drive's main partition
sudo mount /dev/sdX1 /mnt

# Copy the Ubuntu ISO
cp ubuntu-24.04-desktop-amd64.iso /mnt/

# Create a persistence folder for the ISO
mkdir -p /mnt/ventoy
```

Create the persistence configuration file:

```json
// /mnt/ventoy/ventoy.json
{
    "persistence": [
        {
            "image": "/ubuntu-24.04-desktop-amd64.iso",
            "backend": "/persistence/ubuntu-persistence.dat"
        }
    ]
}
```

Create the persistence backend file:

```bash
# Create a 4 GB persistence file
sudo mkdir -p /mnt/persistence

# Create a blank file (4 GB)
sudo dd if=/dev/zero of=/mnt/persistence/ubuntu-persistence.dat bs=1M count=4096 status=progress

# Format it as ext4 with the required label
sudo mkfs.ext4 -L casper-rw /mnt/persistence/ubuntu-persistence.dat

sudo umount /mnt
```

## Method 3: Manual Setup with dd and fdisk

For full control over the partition layout:

### Step 1: Write the ISO to USB

```bash
# Write Ubuntu ISO to USB (this creates a single partition)
sudo dd if=ubuntu-24.04-desktop-amd64.iso of=/dev/sdX bs=4M status=progress oflag=sync
```

### Step 2: Add a Persistence Partition

After writing the ISO, the remaining space on the USB is unallocated. Create a partition there:

```bash
# Open the USB in fdisk
sudo fdisk /dev/sdX

# In fdisk:
# n  - new partition
# p  - primary
# <default start - should be after the ISO partition>
# <default end - use remaining space or specify size>
# w  - write and exit
```

```bash
# Format the new partition with the label 'casper-rw'
# The label is critical - casper looks for this exact label
sudo mkfs.ext4 -L casper-rw /dev/sdX3
```

### Step 3: Boot with Persistence

When booting from the USB, the persistence parameter must be passed to the kernel. At the GRUB menu, press `e` to edit the boot entry and find the line starting with `linux`. Add `persistent` at the end:

```text
linux   /casper/vmlinuz  boot=casper quiet splash persistent ---
```

Press F10 to boot with this modified configuration. For subsequent boots, this needs to be set each time unless you modify the GRUB configuration on the USB.

## Modifying GRUB on the USB for Default Persistence

To make persistence the default (so you do not need to press `e` every time):

```bash
# Mount the USB's boot partition
sudo mount /dev/sdX /mnt

# Find the GRUB configuration
ls /mnt/boot/grub/grub.cfg

# Backup the original
sudo cp /mnt/boot/grub/grub.cfg /mnt/boot/grub/grub.cfg.bak

# Edit to add 'persistent' to the default boot entry
sudo nano /mnt/boot/grub/grub.cfg
```

Find the `linux` line in the default boot stanza and add `persistent`:

```text
# Find a line like this:
linux   /casper/vmlinuz  file=/cdrom/preseed/ubuntu.seed boot=casper quiet splash ---

# Change it to:
linux   /casper/vmlinuz  file=/cdrom/preseed/ubuntu.seed boot=casper quiet splash persistent ---
```

## Using the Persistent Live Environment

Once booted with persistence:

```bash
# Install packages - they persist across reboots
sudo apt update
sudo apt install vim htop tmux -y

# Create files in home directory - they persist
echo "alias ll='ls -alh'" >> ~/.bashrc

# Configure SSH keys
mkdir -p ~/.ssh
# Copy your SSH keys here

# Verify persistence is active
# On boot, you should see a message about persistent storage being found
mount | grep casper-rw
```

## Checking Persistence Storage Usage

```bash
# Check how much persistence storage is used
df -h | grep casper-rw
# /dev/sdX3   4.0G   1.2G  2.8G  31% /cow  (example)

# Or check the overlay mount
mount | grep -E "casper|overlay"
```

## Expanding Persistence Storage

Ext4 partitions can be expanded if there is unallocated space after the persistence partition:

```bash
# If the USB has unallocated space after the casper-rw partition:
# First, expand the partition using fdisk or parted
sudo fdisk /dev/sdX

# Then resize the filesystem
sudo e2fsck -f /dev/sdX3
sudo resize2fs /dev/sdX3
```

For a persistence file (used with Ventoy), you need to create a new larger file:

```bash
# Create a new larger persistence file
sudo dd if=/dev/zero of=/mnt/persistence/ubuntu-persistence-new.dat bs=1M count=8192 status=progress
sudo mkfs.ext4 -L casper-rw /mnt/persistence/ubuntu-persistence-new.dat

# Mount both and copy contents
sudo mkdir /tmp/old-persist /tmp/new-persist
sudo mount /mnt/persistence/ubuntu-persistence.dat /tmp/old-persist
sudo mount /mnt/persistence/ubuntu-persistence-new.dat /tmp/new-persist
sudo rsync -av /tmp/old-persist/ /tmp/new-persist/
sudo umount /tmp/old-persist /tmp/new-persist

# Replace the old file
sudo mv /mnt/persistence/ubuntu-persistence.dat /mnt/persistence/ubuntu-persistence.dat.bak
sudo mv /mnt/persistence/ubuntu-persistence-new.dat /mnt/persistence/ubuntu-persistence.dat
```

## Limitations of Persistent Live USB

Persistent storage has limits compared to a full installation:

1. **Size limit**: The casper-rw partition/file has a fixed size; once full, writes fail
2. **Kernel updates**: Kernel packages install to the overlay, but GRUB on the read-only portion may not update to boot the new kernel
3. **Performance**: Union filesystem overhead vs native ext4
4. **Not all paths are writable**: The squashfs base is still read-only; some paths depend on how the overlay handles them
5. **No LVM**: Cannot use LVM features like snapshots or resizing on the overlay

For situations where you genuinely need a full portable Linux installation (not just a persistent live session), consider a proper installation directly to a USB SSD or NVMe drive instead. You get better performance, full apt integration including kernel updates, and no size limits from the squashfs base layer.

A persistent Live USB remains the fastest way to get a working Ubuntu environment onto a new machine without touching its existing storage - valuable for IT support work, sysadmin tasks on unfamiliar hardware, and rescue operations.
