# How to Create System Images with Clonezilla on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Clonezilla, System Image, Backup, Disaster Recovery, Tutorial

Description: Complete guide to creating and restoring system images using Clonezilla on Ubuntu.

---

System imaging is a critical component of any robust backup and disaster recovery strategy. Clonezilla is a powerful, open-source disk cloning and imaging tool that allows you to create complete system images, clone disks, and deploy images across multiple machines. This comprehensive guide covers everything from basic image creation to advanced enterprise deployment scenarios on Ubuntu systems.

## Understanding Clonezilla Modes

Clonezilla operates in two primary editions, each designed for different use cases:

### Clonezilla Live

Clonezilla Live is a bootable Linux distribution designed for individual system backup and restoration. It supports:

- **Device-to-image**: Create an image file from a disk or partition
- **Device-to-device**: Clone directly from one disk to another
- **Image-to-device**: Restore a previously created image to a disk

### Clonezilla Server Edition (SE)

Clonezilla SE is designed for enterprise environments where you need to deploy images to multiple machines simultaneously:

- **Multicast cloning**: Deploy to dozens or hundreds of machines at once
- **Unicast cloning**: Deploy to individual machines over the network
- **Broadcast cloning**: Send images to all machines on a network segment

### Cloning Modes Explained

```bash
# Clonezilla supports several cloning modes:

# 1. savedisk - Save entire disk as an image
# Example: Create complete backup of /dev/sda including all partitions

# 2. saveparts - Save specific partitions as an image
# Example: Back up only /dev/sda1 and /dev/sda2

# 3. restoredisk - Restore entire disk from an image
# Example: Restore complete system from backup image

# 4. restoreparts - Restore specific partitions from an image
# Example: Restore only the root partition from backup

# 5. disk-to-local-disk - Clone one disk to another directly
# Example: Clone /dev/sda to /dev/sdb without creating intermediate image

# 6. part-to-local-part - Clone partition to partition
# Example: Clone /dev/sda1 to /dev/sdb1
```

## Creating Clonezilla Bootable USB

Before you can use Clonezilla, you need to create a bootable USB drive.

### Step 1: Download Clonezilla ISO

```bash
# Create a directory for Clonezilla files
mkdir -p ~/clonezilla
cd ~/clonezilla

# Download the latest stable Clonezilla Live ISO
# Visit https://clonezilla.org/downloads.php for the latest version
wget https://sourceforge.net/projects/clonezilla/files/clonezilla_live_stable/3.1.2-22-amd64/clonezilla-live-3.1.2-22-amd64.iso

# Verify the download integrity using checksums
# Download the checksum file
wget https://sourceforge.net/projects/clonezilla/files/clonezilla_live_stable/3.1.2-22-amd64/clonezilla-live-3.1.2-22-amd64.iso.sha256

# Verify the ISO integrity
sha256sum -c clonezilla-live-3.1.2-22-amd64.iso.sha256
```

### Step 2: Identify Your USB Drive

```bash
# List all block devices to identify your USB drive
# IMPORTANT: Be absolutely certain you identify the correct device
# Writing to the wrong device will destroy its data!
lsblk

# Example output:
# NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
# sda      8:0    0   500G  0 disk
# ├─sda1   8:1    0   512M  0 part /boot/efi
# ├─sda2   8:2    0   488G  0 part /
# └─sda3   8:3    0    11G  0 part [SWAP]
# sdb      8:16   1    32G  0 disk          <- This is likely the USB drive
# └─sdb1   8:17   1    32G  0 part

# Verify the device is indeed your USB drive by checking its details
sudo fdisk -l /dev/sdb

# Unmount the USB drive if it's mounted
sudo umount /dev/sdb1 2>/dev/null || true
```

### Step 3: Create Bootable USB Using dd

```bash
# Write the Clonezilla ISO directly to the USB drive
# WARNING: This will erase all data on the USB drive!
# Double-check that /dev/sdb is your USB drive!

sudo dd if=clonezilla-live-3.1.2-22-amd64.iso of=/dev/sdb bs=4M status=progress oflag=sync

# Explanation of dd options:
# if=      : Input file (the Clonezilla ISO)
# of=      : Output file (the USB device - NOT a partition like sdb1)
# bs=4M    : Block size of 4 megabytes for faster writing
# status=progress : Show progress during the operation
# oflag=sync : Synchronize writes for data integrity

# Sync to ensure all data is written
sync

echo "Bootable USB created successfully!"
```

### Alternative: Using Balena Etcher

```bash
# Install Balena Etcher for a graphical USB creator
# Download from https://www.balena.io/etcher/

# Or install via snap
sudo snap install balena-etcher

# Launch Etcher
balena-etcher

# In Etcher:
# 1. Click "Flash from file" and select the Clonezilla ISO
# 2. Click "Select target" and choose your USB drive
# 3. Click "Flash!" to create the bootable USB
```

### Alternative: Using Ventoy (Recommended for Multiple ISOs)

```bash
# Ventoy allows you to boot multiple ISOs from a single USB drive
# Download Ventoy from https://www.ventoy.net/

# Extract and install Ventoy
tar -xzf ventoy-*-linux.tar.gz
cd ventoy-*

# Install Ventoy to the USB drive (this will format it)
sudo ./Ventoy2Disk.sh -i /dev/sdb

# After installation, simply copy ISO files to the USB drive
# Mount the Ventoy partition
sudo mount /dev/sdb1 /mnt

# Copy Clonezilla and other ISOs
sudo cp ~/clonezilla/clonezilla-live-*.iso /mnt/
sudo cp ~/Downloads/ubuntu-*.iso /mnt/  # Add other ISOs as needed

# Unmount
sudo umount /mnt

# Now you can boot and select which ISO to use from a menu
```

## Booting from Clonezilla

### BIOS/UEFI Boot Configuration

```bash
# To boot from the Clonezilla USB, you need to access your system's boot menu
# Common keys to access boot menu during startup:

# F12  - Dell, Lenovo, most laptops
# F2   - ASUS, Dell BIOS setup
# F10  - HP
# F11  - MSI
# F8   - ASUS boot menu
# ESC  - Universal boot menu on many systems
# DEL  - Access BIOS/UEFI setup

# For UEFI systems with Secure Boot enabled:
# You may need to disable Secure Boot temporarily
# Enter BIOS/UEFI setup and navigate to:
# Security > Secure Boot > Disabled

# After booting from USB, you'll see the Clonezilla boot menu
```

### Clonezilla Boot Options

When Clonezilla boots, you'll see several options:

```
# Boot menu options explained:

# 1. Clonezilla live (Default settings, VGA 1024x768)
#    - Standard boot with graphical display
#    - Best for most systems

# 2. Clonezilla live (VGA 800x600)
#    - For older monitors or compatibility issues

# 3. Clonezilla live (To RAM, boot media can be removed later)
#    - Loads entire Clonezilla system into RAM
#    - Useful when you need the USB drive for something else
#    - Requires at least 1GB RAM

# 4. Clonezilla live (Safe graphic settings, vga=normal)
#    - Use if you experience display issues

# 5. Clonezilla live (Failsafe mode)
#    - Maximum compatibility, minimal drivers
#    - Use when other modes fail to boot

# 6. Other modes of Clonezilla live
#    - Additional boot options including speech synthesis
#    - KMS (Kernel Mode Setting) disabled options
```

### Initial Setup After Boot

```bash
# After booting, Clonezilla will prompt you through initial setup:

# 1. Choose language
#    - Select your preferred language (e.g., en_US.UTF-8)

# 2. Configure keyboard
#    - Select "Don't touch keymap" for US layout
#    - Or choose your specific keyboard layout

# 3. Start Clonezilla
#    - Select "Start_Clonezilla" to begin
#    - Or choose "Enter_shell" for command line access
```

## Creating Disk/Partition Images

### Creating a Full Disk Image

```bash
# After starting Clonezilla, follow these steps for disk imaging:

# Step 1: Select mode
# Choose: device-image (Work with disks or partitions using images)

# Step 2: Select image repository location
# Options include:
# - local_dev    : Save to local disk (USB, internal drive)
# - ssh_server   : Save to SSH/SFTP server
# - samba_server : Save to Windows share (SMB/CIFS)
# - nfs_server   : Save to NFS server
# - webdav_server: Save to WebDAV server
# - s3_server    : Save to Amazon S3 or compatible storage
# - swift_server : Save to OpenStack Swift storage

# For this example, we'll use local_dev
# Select: local_dev

# Step 3: Mount the destination drive
# Clonezilla will scan for available drives
# Select the drive where you want to save the image
# Choose the directory on that drive

# Step 4: Select beginner or expert mode
# Beginner mode: Simplified options, good defaults
# Expert mode: Full control over all options

# Step 5: Select savedisk
# Choose: savedisk (Save local disk as an image)

# Step 6: Name your image
# Enter a descriptive name, e.g.: ubuntu-24-04-workstation-2026-01-15

# Step 7: Select source disk
# Choose the disk to image (e.g., sda)

# Step 8: Select compression
# Options: -z1p (parallel gzip), -z2p (parallel bzip2),
#          -z3 (lz4), -z4 (lz4hc), -z5p (parallel xz),
#          -z6p (parallel lzop), -z7 (zstd), -z9p (parallel zstd)
# Recommended: -z5p for best compression, -z3 for speed

# Step 9: Choose post-action
# Options: reboot, poweroff, choose (ask later), or continue
```

### Expert Mode Options for Disk Imaging

```bash
# In Expert mode, you have access to advanced options:

# Compression options explained:
# -z1p : Parallel gzip - good balance of speed and compression
# -z2p : Parallel bzip2 - better compression, slower
# -z3  : lz4 - very fast, moderate compression
# -z4  : lz4hc - slower than lz4, better compression
# -z5p : Parallel xz - excellent compression, CPU intensive
# -z7  : zstd - modern algorithm, good speed and compression
# -z9p : Parallel zstd - best overall (speed + compression)

# Additional expert options:

# -q2  : Use partclone for supported filesystems (recommended)
#        Falls back to dd for unsupported filesystems

# -c   : Confirm before cloning (safety check)

# -j2  : Clone hidden data between MBR and first partition

# -nogui : Use text interface instead of dialog

# -a    : Do NOT force to turn on HD DMA

# -rm-win-swap-hib : Remove Windows swap and hibernation files
#                    Reduces image size significantly

# -ntfs-ok : Skip NTFS filesystem check (use if NTFS check hangs)

# -rescue : Continue even if bad sectors are found

# -fsck-src-part : Check and repair source filesystem first

# -gm   : Generate MD5 checksums for image files

# -gs   : Generate SHA1 checksums for image files

# Example: Full command for expert mode disk imaging
# ocs-sr -q2 -c -j2 -z9p -i 4096 -gm -gs -p reboot savedisk \
#   ubuntu-server-backup-2026-01-15 sda
```

### Creating Partition Images

```bash
# To image specific partitions instead of entire disk:

# Step 1: Select device-image mode

# Step 2: Choose your image repository

# Step 3: Select Expert mode for more control

# Step 4: Select saveparts (Save local partitions as an image)

# Step 5: Name your image
# Example: ubuntu-root-partition-backup-2026-01-15

# Step 6: Select partitions to include
# Use space bar to select/deselect partitions
# Example: Select sda1 (EFI), sda2 (root), skip sda3 (swap)

# Step 7: Configure compression and options

# Example command for partition imaging:
# This saves only the root partition with zstd compression
# ocs-sr -q2 -c -z9p -i 4096 -gm -p choose saveparts \
#   root-partition-backup sda2

# Multiple partitions can be specified:
# ocs-sr -q2 -c -z9p -i 4096 -gm -p choose saveparts \
#   system-partitions-backup sda1 sda2
```

### Image File Structure

```bash
# Understanding Clonezilla image structure:
# After creating an image, you'll find these files:

# image-directory/
# ├── blkdev.list           # List of block devices
# ├── blkid.list            # Block device IDs and UUIDs
# ├── clonezilla-img        # Image format version
# ├── dev-fs.list           # Device filesystem list
# ├── disk                   # Disk device name
# ├── Info-dmi.txt          # System DMI information
# ├── Info-img-id.txt       # Image identification
# ├── Info-lshw.txt         # Hardware information
# ├── Info-lspci.txt        # PCI device list
# ├── Info-packages.txt     # Installed packages (if available)
# ├── Info-saved-by-cmd.txt # Command used to create image
# ├── parts                  # Partition layout info
# ├── sda-chs.sf            # Disk geometry
# ├── sda-hidden-data-after-mbr # Hidden sectors backup
# ├── sda-mbr               # Master Boot Record backup
# ├── sda-pt.parted         # Partition table (parted format)
# ├── sda-pt.sf             # Partition table (sfdisk format)
# ├── sda1.ext4-ptcl-img.zst.aa # First partition image part
# ├── sda1.ext4-ptcl-img.zst.ab # Additional image parts
# ├── sda2.ext4-ptcl-img.zst.aa # Second partition image
# └── Clonezilla-checksum.*.txt # Checksum files

# View image information:
cat /path/to/image/Info-saved-by-cmd.txt
cat /path/to/image/parts
```

## Saving Images to Network Storage

### Saving to NFS Server

```bash
# First, set up an NFS server on your network (on the server machine):

# Install NFS server
sudo apt update
sudo apt install nfs-kernel-server -y

# Create export directory
sudo mkdir -p /srv/clonezilla-images
sudo chown nobody:nogroup /srv/clonezilla-images
sudo chmod 777 /srv/clonezilla-images

# Configure NFS exports
sudo tee -a /etc/exports << 'EOF'
# Allow any machine on the 192.168.1.0/24 network to access images
/srv/clonezilla-images 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)
EOF

# Apply the export configuration
sudo exportfs -ra

# Verify exports
sudo exportfs -v

# Restart NFS server
sudo systemctl restart nfs-kernel-server
sudo systemctl enable nfs-kernel-server

# Open firewall ports if needed
sudo ufw allow from 192.168.1.0/24 to any port nfs
sudo ufw allow from 192.168.1.0/24 to any port 111
```

In Clonezilla:

```bash
# When prompted for image repository:
# 1. Select: nfs_server

# 2. Configure network:
#    - Select DHCP or configure static IP

# 3. Enter NFS server details:
#    - NFS server IP: 192.168.1.100
#    - NFS share path: /srv/clonezilla-images

# 4. Clonezilla will mount the NFS share automatically

# 5. Continue with normal imaging process
```

### Saving to Samba/SMB Share

```bash
# Set up Samba server (on the server machine):

# Install Samba
sudo apt update
sudo apt install samba -y

# Create share directory
sudo mkdir -p /srv/clonezilla-images
sudo chmod 777 /srv/clonezilla-images

# Create Samba user
sudo adduser --system --no-create-home clonezilla
sudo smbpasswd -a clonezilla
# Enter password when prompted

# Configure Samba share
sudo tee -a /etc/samba/smb.conf << 'EOF'

[clonezilla]
   comment = Clonezilla Image Repository
   path = /srv/clonezilla-images
   browsable = yes
   writable = yes
   guest ok = no
   valid users = clonezilla
   create mask = 0644
   directory mask = 0755
EOF

# Restart Samba
sudo systemctl restart smbd nmbd
sudo systemctl enable smbd nmbd

# Test the share
smbclient -L localhost -U clonezilla
```

In Clonezilla:

```bash
# When prompted for image repository:
# 1. Select: samba_server

# 2. Configure network (DHCP or static)

# 3. Enter Samba server details:
#    - Server IP or hostname: 192.168.1.100
#    - Domain/Workgroup: WORKGROUP (or your domain)
#    - Username: clonezilla
#    - Password: (enter password)
#    - Share name: clonezilla

# 4. Select directory within the share

# 5. Continue with imaging
```

### Saving to SSH/SFTP Server

```bash
# On the SSH server, ensure SSH is configured:

# Install OpenSSH server if not present
sudo apt install openssh-server -y

# Create dedicated user for Clonezilla
sudo useradd -m -s /bin/bash clonezilla-backup
sudo passwd clonezilla-backup

# Create image storage directory
sudo mkdir -p /srv/clonezilla-images
sudo chown clonezilla-backup:clonezilla-backup /srv/clonezilla-images

# Configure SSH for optimal transfer (optional)
sudo tee -a /etc/ssh/sshd_config << 'EOF'
# Clonezilla optimizations
Match User clonezilla-backup
    ChrootDirectory /srv
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
EOF

sudo systemctl restart sshd
```

In Clonezilla:

```bash
# When prompted for image repository:
# 1. Select: ssh_server

# 2. Configure network

# 3. Enter SSH server details:
#    - Server IP: 192.168.1.100
#    - Port: 22 (default)
#    - Username: clonezilla-backup
#    - Directory: /clonezilla-images

# 4. Choose authentication:
#    - Password authentication, or
#    - SSH key authentication (more secure)

# 5. Continue with imaging
```

### Saving to Amazon S3

```bash
# For S3 storage, you'll need AWS credentials:

# In Clonezilla:
# 1. Select: s3_server

# 2. Enter AWS S3 details:
#    - S3 Access Key ID: AKIAIOSFODNN7EXAMPLE
#    - S3 Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
#    - S3 Bucket name: my-clonezilla-backups
#    - S3 Region: us-east-1 (or your region)
#    - Optional: S3 endpoint for compatible storage (MinIO, etc.)

# For S3-compatible storage (MinIO, Wasabi, etc.):
# Use the custom endpoint option
# Example MinIO endpoint: http://minio.local:9000

# Note: S3 transfers can be slow for large images
# Consider using NFS or SSH for local network backups
```

## Restoring from Images

### Full Disk Restore

```bash
# Boot from Clonezilla USB and follow these steps:

# Step 1: Select device-image mode

# Step 2: Mount image repository
# Select the same storage type where your image is saved
# (local_dev, nfs_server, samba_server, ssh_server, etc.)

# Step 3: Navigate to image location

# Step 4: Select restoredisk
# Choose: restoredisk (Restore an image to local disk)

# Step 5: Select the image to restore
# Browse and select your saved image

# Step 6: Select target disk
# WARNING: All data on the target disk will be destroyed!
# Choose the disk to restore to (e.g., sda)

# Step 7: Confirm the operation
# Review the summary carefully before proceeding

# Step 8: Wait for restoration to complete

# Step 9: Select post-action (reboot, poweroff, etc.)

# Expert mode command equivalent:
# ocs-sr -g auto -e1 auto -e2 -r -j2 -c -p reboot restoredisk \
#   ubuntu-server-backup-2026-01-15 sda
```

### Partition Restore

```bash
# For restoring specific partitions:

# Step 1: Select device-image mode

# Step 2: Mount image repository

# Step 3: Select restoreparts
# Choose: restoreparts (Restore an image to local partitions)

# Step 4: Select the partition image

# Step 5: Select target partitions
# Map source partitions to destination partitions
# Can restore to different partition numbers if needed

# Step 6: Confirm and proceed

# Expert mode command:
# ocs-sr -g auto -e1 auto -e2 -r -j2 -c -p reboot restoreparts \
#   root-partition-backup sda2
```

### Restoring to Different Hardware

```bash
# When restoring to different hardware, consider these options:

# Option 1: Reinstall bootloader after restore
# Boot from Ubuntu live USB after restore and run:
sudo mount /dev/sda2 /mnt
sudo mount /dev/sda1 /mnt/boot/efi
sudo mount --bind /dev /mnt/dev
sudo mount --bind /proc /mnt/proc
sudo mount --bind /sys /mnt/sys
sudo chroot /mnt

# For UEFI systems:
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu
update-grub

# For BIOS/Legacy systems:
grub-install /dev/sda
update-grub

exit
sudo umount -R /mnt

# Option 2: Use Clonezilla's -g auto option
# This automatically reinstalls GRUB after restoration
# In expert mode, select: -g auto (Reinstall grub in client disk MBR)

# Option 3: Regenerate initramfs for new hardware
# After restore, boot with Ubuntu live USB:
sudo mount /dev/sda2 /mnt
sudo mount --bind /dev /mnt/dev
sudo mount --bind /proc /mnt/proc
sudo mount --bind /sys /mnt/sys
sudo chroot /mnt
update-initramfs -u -k all
exit
sudo umount -R /mnt
```

### Restoring to Smaller Disk

```bash
# Clonezilla can restore to a smaller disk if the data fits
# Use these options in expert mode:

# -k1 : Create partition table proportionally
#       Scales partitions to fit the new disk size

# -r   : Resize filesystem to fit partition
#       Automatically shrinks filesystems

# -icds : Skip checking destination disk size
#         Use with caution!

# Example command for restoring to smaller disk:
# ocs-sr -g auto -e1 auto -e2 -r -j2 -k1 -p reboot restoredisk \
#   ubuntu-backup sda

# Important: Ensure total used space on source is less than
# the destination disk capacity
```

## Unattended Cloning

### Creating Custom Clonezilla Configuration

```bash
# Clonezilla supports unattended operation via boot parameters
# Create a custom ISO or modify boot configuration

# Method 1: Boot parameters for unattended savedisk

# Add these parameters to the kernel boot line:
# ocs_prerun1="mount -t nfs 192.168.1.100:/srv/images /home/partimag"
# ocs_live_run="ocs-sr -q2 -c -j2 -z9p -p poweroff savedisk auto-backup sda"

# Full boot parameter example:
# vmlinuz initrd=initrd.img boot=live union=overlay username=user
# hostname=czilla config quiet noswap edd=on nomodeset
# ocs_prerun1="mount -t nfs 192.168.1.100:/srv/images /home/partimag"
# ocs_live_run="ocs-sr -q2 -c -j2 -z9p -p poweroff savedisk myimage sda"
# ocs_live_extra_param=""
# keyboard-layouts=us locales=en_US.UTF-8
# ocs_live_batch="yes"
# vga=788 nosplash noprompt
```

### Creating Unattended Restore USB

```bash
#!/bin/bash
# Script to create unattended restore USB
# Run this on your Ubuntu system

# Variables - customize these
CLONEZILLA_ISO="clonezilla-live-3.1.2-22-amd64.iso"
USB_DEVICE="/dev/sdb"  # VERIFY THIS IS CORRECT!
IMAGE_NAME="ubuntu-workstation-golden"
NFS_SERVER="192.168.1.100"
NFS_PATH="/srv/clonezilla-images"

# Create working directory
WORK_DIR=$(mktemp -d)
cd "$WORK_DIR"

# Mount the original ISO
mkdir -p iso_mount
sudo mount -o loop "$HOME/clonezilla/$CLONEZILLA_ISO" iso_mount

# Copy ISO contents
mkdir -p iso_new
cp -a iso_mount/* iso_new/

# Unmount original ISO
sudo umount iso_mount

# Modify boot configuration for unattended restore
cat > iso_new/syslinux/syslinux.cfg << 'SYSCONFIG'
DEFAULT auto-restore
TIMEOUT 50
PROMPT 0

LABEL auto-restore
    MENU LABEL Automatic System Restore
    KERNEL /live/vmlinuz
    APPEND initrd=/live/initrd.img boot=live union=overlay username=user hostname=czilla config quiet noswap edd=on nomodeset ocs_prerun1="mount -t nfs ${NFS_SERVER}:${NFS_PATH} /home/partimag" ocs_live_run="ocs-sr -g auto -e1 auto -e2 -r -j2 -p reboot restoredisk ${IMAGE_NAME} sda" ocs_live_batch="yes" keyboard-layouts=us locales=en_US.UTF-8 vga=788 nosplash noprompt
SYSCONFIG

# Update GRUB configuration for UEFI boot
cat > iso_new/boot/grub/grub.cfg << 'GRUBCONFIG'
set timeout=5
set default=0

menuentry "Automatic System Restore" {
    linux /live/vmlinuz boot=live union=overlay username=user hostname=czilla config quiet noswap edd=on nomodeset ocs_prerun1="mount -t nfs ${NFS_SERVER}:${NFS_PATH} /home/partimag" ocs_live_run="ocs-sr -g auto -e1 auto -e2 -r -j2 -p reboot restoredisk ${IMAGE_NAME} sda" ocs_live_batch="yes" keyboard-layouts=us locales=en_US.UTF-8 vga=788 nosplash noprompt
    initrd /live/initrd.img
}
GRUBCONFIG

# Create new ISO
sudo apt install genisoimage syslinux-utils -y

xorriso -as mkisofs \
    -isohybrid-mbr /usr/lib/ISOLINUX/isohdpfx.bin \
    -c isolinux/boot.cat \
    -b isolinux/isolinux.bin \
    -no-emul-boot \
    -boot-load-size 4 \
    -boot-info-table \
    -eltorito-alt-boot \
    -e boot/grub/efi.img \
    -no-emul-boot \
    -isohybrid-gpt-basdat \
    -o clonezilla-auto-restore.iso \
    iso_new

# Write to USB (WARNING: destructive!)
echo "WARNING: About to write to $USB_DEVICE"
echo "All data on this device will be destroyed!"
read -p "Continue? (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
    sudo dd if=clonezilla-auto-restore.iso of="$USB_DEVICE" bs=4M status=progress
    sync
    echo "Unattended restore USB created successfully!"
fi

# Cleanup
cd ~
rm -rf "$WORK_DIR"
```

### PXE Boot for Unattended Operations

```bash
# Configure PXE server for network-based unattended cloning
# This requires DRBL/Clonezilla Server Edition

# Install DRBL
sudo apt update
sudo apt install drbl -y

# Configure DRBL (run the configuration script)
sudo /opt/drbl/sbin/drblsrv -i
# Follow prompts to configure network settings

# Configure client systems
sudo /opt/drbl/sbin/drblpush -i
# Follow prompts to set up client ranges

# Create PXE boot entry for unattended restore
sudo tee /tftpboot/nbi_img/pxelinux.cfg/auto-restore << 'EOF'
DEFAULT auto-restore
TIMEOUT 30
PROMPT 0

LABEL auto-restore
    MENU LABEL Automatic Ubuntu Restore
    KERNEL vmlinuz-pxe
    APPEND initrd=initrd-pxe.img boot=live union=overlay ocs_server=192.168.1.1 ocs_daession="auto" ocs_live_run="ocs-sr -g auto -e1 auto -e2 -r -j2 -p reboot restoredisk golden-image sda" ocs_live_batch="yes"
EOF
```

## Multicast Deployment

Multicast deployment allows you to clone to many machines simultaneously over the network.

### Setting Up Clonezilla Server for Multicast

```bash
# Install DRBL and Clonezilla Server Edition
sudo apt update
sudo apt install drbl clonezilla -y

# Configure DRBL server
sudo /opt/drbl/sbin/drblsrv -i

# During configuration:
# - Select your network interface
# - Choose to use existing kernel or download
# - Configure DHCP range for clients
# - Set up TFTP for PXE boot

# Configure client range
sudo /opt/drbl/sbin/drblpush -i

# Options during drblpush:
# - Full DRBL mode: Each client has its own NFS root (more flexible)
# - Clonezilla box mode: Diskless boot for cloning only (recommended)
# - Configure IP range for clients
# - Set client hostnames
```

### Starting Multicast Clone Session

```bash
# On the DRBL/Clonezilla server, start multicast session:

# Method 1: Using the interactive menu
sudo /opt/drbl/sbin/dcs

# Select: clonezilla-start
# Select: startdisk (or startparts for partition cloning)
# Select: multicast (for multicast deployment)
# Select: image to deploy
# Select: target disk on clients
# Configure: Number of clients to wait for, or use time-based start

# Method 2: Command line for scripting
# Start multicast restore with specific parameters:
sudo /opt/drbl/sbin/drbl-ocs -b -g auto -e1 auto -e2 -r -j2 \
    -x -h 192.168.1.0/24 -p reboot \
    --clients-to-wait 10 \
    --max-time-to-wait 300 \
    multicast_restore_restoreparts \
    golden-image sda1 sda2

# Parameters explained:
# -b           : Run in batch mode (no confirmation)
# -g auto      : Reinstall GRUB automatically
# -e1 auto     : Auto-select EFI partition
# -e2          : Skip EFI partition cloning (use source EFI)
# -r           : Resize filesystem after restore
# -j2          : Clone hidden data between MBR and first partition
# -x           : Use -x for multicast
# -h           : Hosts/network to include
# -p reboot    : Reboot after completion
# --clients-to-wait : Number of clients before starting
# --max-time-to-wait : Maximum seconds to wait for clients
```

### Client-Side Multicast Boot

```bash
# Clients need to boot via PXE (network boot)
# Configure client BIOS/UEFI:
# 1. Enable PXE/Network boot
# 2. Set boot priority: Network first
# 3. Disable Secure Boot if needed

# After PXE boot, clients will:
# 1. Receive IP via DHCP from DRBL server
# 2. Download and boot Clonezilla via TFTP
# 3. Join the multicast session automatically
# 4. Receive the disk image
# 5. Reboot when complete

# Monitor multicast progress on server:
# Watch the DRBL server terminal for status
# Or check: /var/log/clonezilla/

# For troubleshooting client connections:
sudo /opt/drbl/sbin/drbl-client-root-passwd
sudo /opt/drbl/sbin/drbl-doit -x cat /proc/partitions
```

### Optimizing Multicast Performance

```bash
# Network configuration for optimal multicast:

# 1. Use dedicated network/VLAN for cloning
# Avoids interference with production traffic

# 2. Configure switch for multicast
# Enable IGMP snooping on managed switches
# Configure multicast rate limits if needed

# 3. Adjust Clonezilla multicast parameters
# Edit /etc/drbl/drbl.conf:
sudo tee -a /etc/drbl/drbl.conf << 'EOF'
# Multicast optimization settings
multicast_min_wait=5
multicast_max_wait=300
multicast_client_no=0  # 0 = wait based on time
multicast_port_base=2000
udp_sender_extra_opt="--min-slice-size 512 --max-slice-size 4096"
EOF

# 4. For large deployments (50+ machines):
# - Use multicast on 1Gbps or faster network
# - Consider using lz4 compression for faster processing
# - Stage deployments in batches if network is congested

# 5. Calculate bandwidth requirements:
# 100 clients × 50GB image = 5TB total transfer
# With multicast: Only ~50GB actual network transfer
# Time estimate: 50GB / 100MB/s = ~8 minutes (ideal)
```

## Clonezilla Server Edition

### Full DRBL Server Setup

```bash
#!/bin/bash
# Complete DRBL/Clonezilla Server Setup Script

# Update system
sudo apt update && sudo apt upgrade -y

# Install DRBL
sudo apt install drbl -y

# Download additional files (kernel, initrd)
sudo /opt/drbl/sbin/drblsrv-offline -i

# Or download from network:
# sudo /opt/drbl/sbin/drblsrv -i

# Configure network interfaces
# Assuming eth0 is for external network, eth1 for clients
cat << 'EOF' | sudo tee /etc/netplan/01-drbl-config.yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
    eth1:
      addresses:
        - 192.168.100.1/24
      dhcp4: false
EOF

sudo netplan apply

# Configure DRBL for the client network
sudo /opt/drbl/sbin/drblpush -i

# During configuration, specify:
# - eth1 as the client-facing interface
# - IP range: 192.168.100.2 to 192.168.100.254
# - Hostname prefix: client-
# - Operating mode: Clonezilla-box mode

# Start necessary services
sudo systemctl enable dhcpd
sudo systemctl enable tftpd-hpa
sudo systemctl enable nfs-kernel-server

sudo systemctl start dhcpd
sudo systemctl start tftpd-hpa
sudo systemctl start nfs-kernel-server

# Verify setup
sudo /opt/drbl/sbin/drbl-all-service status
```

### Managing Image Repository

```bash
# Default image location: /home/partimag/
# Configure storage for images

# Option 1: Use local storage
sudo mkdir -p /home/partimag
sudo chmod 755 /home/partimag

# Option 2: Mount external storage for images
# For NFS:
sudo mount -t nfs imageserver:/images /home/partimag

# For local disk:
# Add to /etc/fstab:
# /dev/sdb1  /home/partimag  ext4  defaults  0  2

# Option 3: Use iSCSI target
sudo apt install open-iscsi -y
sudo iscsiadm -m discovery -t sendtargets -p iscsi-server
sudo iscsiadm -m node --login
# Mount the iSCSI disk to /home/partimag

# List available images:
ls -la /home/partimag/

# Check image details:
cat /home/partimag/*/Info-saved-by-cmd.txt

# Remove old images:
sudo rm -rf /home/partimag/old-image-name

# Image naming convention recommendation:
# os-version-purpose-date
# Examples:
# ubuntu-24.04-workstation-2026-01-15
# windows-11-developer-2026-01-15
# centos-9-webserver-2026-01-15
```

### Web-Based Management with DRBL

```bash
# DRBL includes a web interface for management

# Access via browser: http://your-server-ip/drbl-winroll/
# Or: http://your-server-ip/drbl-chntpw/

# For more advanced web management, consider:
# FOG Project (integrates well with Clonezilla)
sudo apt install fog-server

# Or set up a simple status page
sudo apt install apache2 php -y

# Create status script
sudo tee /var/www/html/clonezilla-status.php << 'PHP_SCRIPT'
<?php
header('Content-Type: application/json');

$images = array();
$image_dir = '/home/partimag/';

if (is_dir($image_dir)) {
    $dirs = scandir($image_dir);
    foreach ($dirs as $dir) {
        if ($dir != '.' && $dir != '..' && is_dir($image_dir . $dir)) {
            $info_file = $image_dir . $dir . '/Info-saved-by-cmd.txt';
            $images[] = array(
                'name' => $dir,
                'created' => date('Y-m-d H:i:s', filemtime($image_dir . $dir)),
                'size' => shell_exec("du -sh " . escapeshellarg($image_dir . $dir) . " | cut -f1")
            );
        }
    }
}

echo json_encode(array(
    'status' => 'online',
    'images' => $images,
    'timestamp' => date('Y-m-d H:i:s')
));
?>
PHP_SCRIPT

sudo systemctl restart apache2
```

## Scripting and Automation

### Automated Backup Script

```bash
#!/bin/bash
#############################################
# Automated Clonezilla Backup Script
# Schedule with cron for regular backups
#############################################

# Configuration
BACKUP_HOST="backup-server.local"
BACKUP_PATH="/srv/clonezilla-images"
BACKUP_METHOD="ssh"  # Options: ssh, nfs, smb, local
SSH_USER="backup"
SSH_KEY="/root/.ssh/clonezilla_backup"

# Image naming
HOSTNAME=$(hostname)
DATE=$(date +%Y-%m-%d)
IMAGE_NAME="${HOSTNAME}-${DATE}"

# Retention policy
KEEP_DAYS=30

# Logging
LOG_FILE="/var/log/clonezilla-backup.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "========================================"
echo "Backup started: $(date)"
echo "========================================"

# Function to mount backup destination
mount_backup_dest() {
    case $BACKUP_METHOD in
        ssh)
            # For SSH, we'll use ocs-sr with ssh option directly
            echo "Using SSH to $BACKUP_HOST"
            ;;
        nfs)
            echo "Mounting NFS share..."
            mkdir -p /home/partimag
            mount -t nfs "${BACKUP_HOST}:${BACKUP_PATH}" /home/partimag
            ;;
        smb)
            echo "Mounting SMB share..."
            mkdir -p /home/partimag
            mount -t cifs "//${BACKUP_HOST}/clonezilla" /home/partimag \
                -o username=${SMB_USER},password=${SMB_PASS}
            ;;
        local)
            echo "Using local storage at $BACKUP_PATH"
            mkdir -p /home/partimag
            mount --bind "$BACKUP_PATH" /home/partimag
            ;;
    esac
}

# Function to unmount backup destination
unmount_backup_dest() {
    if mountpoint -q /home/partimag; then
        umount /home/partimag
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    echo "Cleaning up backups older than $KEEP_DAYS days..."
    find /home/partimag -maxdepth 1 -type d -name "${HOSTNAME}-*" \
        -mtime +${KEEP_DAYS} -exec rm -rf {} \;
}

# Function to send notification
send_notification() {
    local status=$1
    local message=$2

    # Email notification (requires mailutils)
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "Clonezilla Backup: $status" admin@example.com
    fi

    # Slack notification (optional)
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Clonezilla Backup $status: $message\"}" \
            "$SLACK_WEBHOOK"
    fi
}

# Main backup process
main() {
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        echo "Error: This script must be run as root"
        exit 1
    fi

    # Mount backup destination
    mount_backup_dest

    # Verify mount
    if [ "$BACKUP_METHOD" != "ssh" ]; then
        if ! mountpoint -q /home/partimag; then
            echo "Error: Failed to mount backup destination"
            send_notification "FAILED" "Could not mount backup destination"
            exit 1
        fi
    fi

    # Determine source disk
    SOURCE_DISK=$(lsblk -d -o NAME,TYPE | grep disk | head -1 | awk '{print $1}')
    echo "Source disk: $SOURCE_DISK"

    # Run Clonezilla backup
    echo "Starting Clonezilla image creation..."

    if [ "$BACKUP_METHOD" = "ssh" ]; then
        # SSH-based backup
        /usr/sbin/ocs-sr \
            -q2 \
            -j2 \
            -z9p \
            -i 4096 \
            -gm \
            -gs \
            -p true \
            -sfsck \
            -senc \
            -sc \
            -ssh-server "$BACKUP_HOST" \
            -ssh-user "$SSH_USER" \
            -ssh-key "$SSH_KEY" \
            -ocsroot "$BACKUP_PATH" \
            savedisk "$IMAGE_NAME" "$SOURCE_DISK"
    else
        # Local/mounted backup
        /usr/sbin/ocs-sr \
            -q2 \
            -j2 \
            -z9p \
            -i 4096 \
            -gm \
            -gs \
            -p true \
            -sfsck \
            -senc \
            -sc \
            savedisk "$IMAGE_NAME" "$SOURCE_DISK"
    fi

    BACKUP_STATUS=$?

    # Cleanup old backups
    if [ $BACKUP_STATUS -eq 0 ]; then
        cleanup_old_backups
    fi

    # Unmount
    unmount_backup_dest

    # Send notification
    if [ $BACKUP_STATUS -eq 0 ]; then
        IMAGE_SIZE=$(du -sh "/home/partimag/$IMAGE_NAME" 2>/dev/null | cut -f1)
        send_notification "SUCCESS" "Image: $IMAGE_NAME, Size: $IMAGE_SIZE"
        echo "Backup completed successfully!"
    else
        send_notification "FAILED" "Backup failed with exit code $BACKUP_STATUS"
        echo "Backup failed with exit code $BACKUP_STATUS"
    fi

    echo "========================================"
    echo "Backup finished: $(date)"
    echo "========================================"

    exit $BACKUP_STATUS
}

# Run main function
main
```

### Scheduled Backup with Cron

```bash
# Add to root's crontab for scheduled backups
sudo crontab -e

# Add these lines:

# Weekly full system backup on Sundays at 2 AM
0 2 * * 0 /usr/local/bin/clonezilla-backup.sh >> /var/log/clonezilla-cron.log 2>&1

# Monthly backup on the 1st at 3 AM
0 3 1 * * /usr/local/bin/clonezilla-backup.sh >> /var/log/clonezilla-cron.log 2>&1

# Make the script executable
sudo chmod +x /usr/local/bin/clonezilla-backup.sh
```

### Restore Script for Disaster Recovery

```bash
#!/bin/bash
#############################################
# Clonezilla Automated Restore Script
# For disaster recovery scenarios
#############################################

# Configuration
IMAGE_SERVER="192.168.1.100"
IMAGE_PATH="/srv/clonezilla-images"
IMAGE_METHOD="nfs"  # Options: nfs, ssh, smb

# Automatically determine latest image for this hostname
AUTO_SELECT_IMAGE=true

# Target disk (auto-detect if empty)
TARGET_DISK=""

# Post-restore actions
REINSTALL_GRUB=true
RESIZE_PARTITIONS=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Mount image repository
mount_image_repo() {
    log_info "Mounting image repository..."
    mkdir -p /home/partimag

    case $IMAGE_METHOD in
        nfs)
            mount -t nfs "${IMAGE_SERVER}:${IMAGE_PATH}" /home/partimag
            ;;
        ssh)
            sshfs "${SSH_USER}@${IMAGE_SERVER}:${IMAGE_PATH}" /home/partimag
            ;;
        smb)
            mount -t cifs "//${IMAGE_SERVER}/clonezilla" /home/partimag \
                -o username=${SMB_USER},password=${SMB_PASS}
            ;;
    esac

    if ! mountpoint -q /home/partimag; then
        log_error "Failed to mount image repository"
        exit 1
    fi

    log_info "Image repository mounted successfully"
}

# List available images
list_images() {
    log_info "Available images:"
    echo "----------------------------------------"
    ls -la /home/partimag/ | grep "^d" | awk '{print $NF}' | grep -v "^\.$"
    echo "----------------------------------------"
}

# Auto-select latest image for hostname
auto_select_latest_image() {
    local hostname=$(hostname)
    local latest_image=$(ls -t /home/partimag/ | grep "^${hostname}-" | head -1)

    if [ -n "$latest_image" ]; then
        echo "$latest_image"
    else
        log_warn "No matching image found for hostname: $hostname"
        return 1
    fi
}

# Detect target disk
detect_target_disk() {
    if [ -n "$TARGET_DISK" ]; then
        echo "$TARGET_DISK"
        return
    fi

    # Auto-detect first disk that's not the boot device
    local boot_disk=$(mount | grep "on / " | sed 's/[0-9]*//g' | awk '{print $1}' | sed 's/\/dev\///')
    local first_disk=$(lsblk -d -o NAME,TYPE | grep disk | awk '{print $1}' | head -1)

    echo "$first_disk"
}

# Perform restore
do_restore() {
    local image_name=$1
    local target_disk=$2

    log_info "Starting restore process..."
    log_info "Image: $image_name"
    log_info "Target disk: $target_disk"

    echo ""
    log_warn "WARNING: All data on /dev/$target_disk will be destroyed!"
    echo ""

    # Build ocs-sr command
    local ocs_opts="-q2 -c -j2"

    if [ "$REINSTALL_GRUB" = true ]; then
        ocs_opts="$ocs_opts -g auto"
    fi

    if [ "$RESIZE_PARTITIONS" = true ]; then
        ocs_opts="$ocs_opts -k1 -r"
    fi

    log_info "Executing: ocs-sr $ocs_opts -p true restoredisk $image_name $target_disk"

    /usr/sbin/ocs-sr $ocs_opts -p true restoredisk "$image_name" "$target_disk"

    return $?
}

# Main function
main() {
    echo "========================================"
    echo "Clonezilla Automated Restore"
    echo "========================================"

    # Check root
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root"
        exit 1
    fi

    # Mount image repository
    mount_image_repo

    # List available images
    list_images

    # Select image
    if [ "$AUTO_SELECT_IMAGE" = true ]; then
        IMAGE_NAME=$(auto_select_latest_image)
        if [ $? -ne 0 ]; then
            log_error "Could not auto-select image"
            echo "Please specify image name manually:"
            read -r IMAGE_NAME
        fi
    else
        echo "Enter image name to restore:"
        read -r IMAGE_NAME
    fi

    log_info "Selected image: $IMAGE_NAME"

    # Verify image exists
    if [ ! -d "/home/partimag/$IMAGE_NAME" ]; then
        log_error "Image not found: $IMAGE_NAME"
        exit 1
    fi

    # Detect target disk
    TARGET=$(detect_target_disk)
    log_info "Target disk: /dev/$TARGET"

    # Confirm
    echo ""
    echo "Ready to restore:"
    echo "  Image: $IMAGE_NAME"
    echo "  Target: /dev/$TARGET"
    echo ""
    read -p "Continue with restore? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi

    # Perform restore
    do_restore "$IMAGE_NAME" "$TARGET"
    RESTORE_STATUS=$?

    # Cleanup
    umount /home/partimag 2>/dev/null

    if [ $RESTORE_STATUS -eq 0 ]; then
        log_info "Restore completed successfully!"
        echo ""
        echo "System will reboot in 10 seconds..."
        sleep 10
        reboot
    else
        log_error "Restore failed with exit code: $RESTORE_STATUS"
        exit $RESTORE_STATUS
    fi
}

# Run main
main "$@"
```

### Integration with Ansible

```yaml
# ansible-playbook for Clonezilla deployment
# File: clonezilla-backup.yml

---
- name: Configure Clonezilla Backup Infrastructure
  hosts: backup_servers
  become: yes
  vars:
    clonezilla_version: "3.1.2-22"
    image_storage_path: "/srv/clonezilla-images"
    nfs_network: "192.168.1.0/24"

  tasks:
    - name: Install required packages
      apt:
        name:
          - nfs-kernel-server
          - clonezilla
          - drbl
          - partclone
        state: present
        update_cache: yes

    - name: Create image storage directory
      file:
        path: "{{ image_storage_path }}"
        state: directory
        mode: '0755'
        owner: root
        group: root

    - name: Configure NFS exports
      lineinfile:
        path: /etc/exports
        line: "{{ image_storage_path }} {{ nfs_network }}(rw,sync,no_subtree_check,no_root_squash)"
        state: present
      notify: Restart NFS

    - name: Deploy backup script
      template:
        src: templates/clonezilla-backup.sh.j2
        dest: /usr/local/bin/clonezilla-backup.sh
        mode: '0755'

    - name: Configure backup cron job
      cron:
        name: "Weekly Clonezilla backup"
        weekday: "0"
        hour: "2"
        minute: "0"
        job: "/usr/local/bin/clonezilla-backup.sh >> /var/log/clonezilla-cron.log 2>&1"

    - name: Download Clonezilla Live ISO
      get_url:
        url: "https://sourceforge.net/projects/clonezilla/files/clonezilla_live_stable/{{ clonezilla_version }}-amd64/clonezilla-live-{{ clonezilla_version }}-amd64.iso"
        dest: "{{ image_storage_path }}/clonezilla-live-{{ clonezilla_version }}-amd64.iso"
        mode: '0644'

  handlers:
    - name: Restart NFS
      service:
        name: nfs-kernel-server
        state: restarted

- name: Configure Clonezilla Clients
  hosts: workstations
  become: yes
  vars:
    backup_server: "backup.local"

  tasks:
    - name: Install clonezilla package
      apt:
        name: clonezilla
        state: present

    - name: Deploy client backup script
      template:
        src: templates/client-backup.sh.j2
        dest: /usr/local/bin/system-backup.sh
        mode: '0755'

    - name: Create backup service
      copy:
        content: |
          [Unit]
          Description=System Backup with Clonezilla

          [Service]
          Type=oneshot
          ExecStart=/usr/local/bin/system-backup.sh

          [Install]
          WantedBy=multi-user.target
        dest: /etc/systemd/system/clonezilla-backup.service

    - name: Create backup timer
      copy:
        content: |
          [Unit]
          Description=Weekly System Backup

          [Timer]
          OnCalendar=Sun *-*-* 02:00:00
          Persistent=true

          [Install]
          WantedBy=timers.target
        dest: /etc/systemd/system/clonezilla-backup.timer

    - name: Enable backup timer
      systemd:
        name: clonezilla-backup.timer
        enabled: yes
        state: started
```

## Best Practices

### Before Creating Images

```bash
# 1. Clean up the system before imaging
# Remove temporary files
sudo apt clean
sudo apt autoremove -y
rm -rf ~/.cache/*
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# 2. Clear logs (optional - for smaller images)
sudo journalctl --vacuum-time=7d
sudo find /var/log -type f -name "*.log" -exec truncate -s 0 {} \;
sudo find /var/log -type f -name "*.gz" -delete

# 3. Zero free space (improves compression)
# WARNING: This creates a large temporary file
sudo dd if=/dev/zero of=/zero.fill bs=1M status=progress || true
sudo rm /zero.fill
sync

# 4. Remove machine-specific identifiers (for golden images)
# Remove SSH host keys (regenerate on first boot)
sudo rm -f /etc/ssh/ssh_host_*

# Remove machine ID (regenerate on first boot)
sudo rm -f /etc/machine-id
sudo rm -f /var/lib/dbus/machine-id

# 5. Clear bash history
history -c
sudo rm -f /root/.bash_history
rm -f ~/.bash_history

# 6. Verify filesystem integrity
sudo fsck -n /dev/sda1  # Check without fixing (use -f to force)
```

### Image Verification

```bash
#!/bin/bash
# Script to verify Clonezilla image integrity

IMAGE_PATH="/home/partimag/ubuntu-workstation-2026-01-15"

echo "Verifying image: $IMAGE_PATH"

# Check if image directory exists
if [ ! -d "$IMAGE_PATH" ]; then
    echo "ERROR: Image directory not found"
    exit 1
fi

# Verify required files exist
required_files=(
    "parts"
    "disk"
    "clonezilla-img"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$IMAGE_PATH/$file" ]; then
        echo "ERROR: Required file missing: $file"
        exit 1
    fi
done

# Verify checksums if available
if ls "$IMAGE_PATH"/*.md5 1> /dev/null 2>&1; then
    echo "Verifying MD5 checksums..."
    cd "$IMAGE_PATH"
    md5sum -c *.md5
    if [ $? -ne 0 ]; then
        echo "ERROR: MD5 checksum verification failed"
        exit 1
    fi
fi

if ls "$IMAGE_PATH"/*.sha1 1> /dev/null 2>&1; then
    echo "Verifying SHA1 checksums..."
    cd "$IMAGE_PATH"
    sha1sum -c *.sha1
    if [ $? -ne 0 ]; then
        echo "ERROR: SHA1 checksum verification failed"
        exit 1
    fi
fi

# Check image file sizes (ensure no zero-byte files)
echo "Checking for corrupted image files..."
find "$IMAGE_PATH" -name "*.img.*" -size 0 -print
if [ $? -eq 0 ] && [ -n "$(find "$IMAGE_PATH" -name "*.img.*" -size 0)" ]; then
    echo "WARNING: Zero-byte image files found"
fi

# Display image information
echo ""
echo "=== Image Information ==="
cat "$IMAGE_PATH/Info-saved-by-cmd.txt" 2>/dev/null
echo ""
echo "=== Partitions ==="
cat "$IMAGE_PATH/parts"
echo ""
echo "=== Image Size ==="
du -sh "$IMAGE_PATH"
echo ""
echo "Image verification completed successfully!"
```

### Security Best Practices

```bash
# 1. Encrypt sensitive images
# Clonezilla supports image encryption with eCryptfs

# During image creation, select encryption option:
# In expert mode, use: -enc (encrypt the image)
# You'll be prompted for a passphrase

# 2. Secure the image repository
# Use proper permissions
sudo chmod 700 /home/partimag
sudo chown root:root /home/partimag

# 3. Use SSH keys instead of passwords
# Generate SSH key pair
ssh-keygen -t ed25519 -f ~/.ssh/clonezilla_backup -N ""

# Copy public key to backup server
ssh-copy-id -i ~/.ssh/clonezilla_backup.pub backup@backup-server

# 4. Secure network transfers
# Always use encrypted protocols (SSH, SFTP)
# Avoid unencrypted NFS or SMB when possible

# 5. Verify image integrity after transfer
# Generate checksums during creation (-gm, -gs options)
# Verify checksums before restoration

# 6. Implement access controls
# On the backup server
sudo tee /etc/sudoers.d/clonezilla << 'EOF'
# Allow backup user to run specific Clonezilla commands only
backup ALL=(root) NOPASSWD: /usr/sbin/ocs-sr
backup ALL=(root) NOPASSWD: /usr/sbin/ocs-onthefly
EOF

# 7. Audit image access
# Enable auditd for image directory
sudo apt install auditd -y
sudo auditctl -w /home/partimag -p rwxa -k clonezilla_images
```

### Disaster Recovery Planning

```bash
#!/bin/bash
# Disaster Recovery Documentation Generator

OUTPUT_FILE="/home/partimag/DR-Documentation-$(date +%Y-%m-%d).md"

cat > "$OUTPUT_FILE" << 'EOF'
# Disaster Recovery Documentation

## System Information
EOF

echo "Generated: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Hardware information
echo "## Hardware Details" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
sudo lshw -short >> "$OUTPUT_FILE" 2>/dev/null
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Disk layout
echo "## Disk Layout" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Partition details
echo "## Partition Details" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
sudo fdisk -l >> "$OUTPUT_FILE" 2>/dev/null
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Network configuration
echo "## Network Configuration" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
ip addr >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Available images
echo "## Available Backup Images" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
ls -la /home/partimag/ >> "$OUTPUT_FILE" 2>/dev/null
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Recovery steps
cat >> "$OUTPUT_FILE" << 'EOF'

## Recovery Procedure

### Quick Recovery Steps

1. Boot from Clonezilla USB drive
2. Select your language and keyboard layout
3. Start Clonezilla
4. Choose: device-image
5. Choose: local_dev (or network option)
6. Navigate to backup location
7. Select: restoredisk
8. Choose the appropriate image
9. Select target disk
10. Confirm and wait for restoration
11. Reboot when complete

### Network Recovery (NFS)

1. Boot from Clonezilla USB
2. Choose: device-image
3. Choose: nfs_server
4. Enter server IP: [YOUR_BACKUP_SERVER_IP]
5. Enter NFS path: /home/partimag
6. Continue with restoration

### Emergency Contacts

- IT Administrator: admin@example.com
- Backup Server Location: [LOCATION]
- Network Documentation: [LINK]

### Image Retention Policy

- Daily images: Kept for 7 days
- Weekly images: Kept for 4 weeks
- Monthly images: Kept for 12 months

EOF

echo "DR Documentation generated: $OUTPUT_FILE"
```

### Performance Optimization

```bash
# 1. Use fastest compression for large deployments
# -z3 (lz4) for maximum speed
# -z9p (parallel zstd) for best balance

# 2. Optimize network transfers
# Increase MTU for jumbo frames (if supported)
sudo ip link set eth0 mtu 9000

# 3. Use RAM disk for temporary storage
# Mount tmpfs for faster operations
sudo mount -t tmpfs -o size=4G tmpfs /tmp

# 4. Parallel processing
# Use -i option to specify threads
# -i 0 = use all available CPU cores
# -i 4096 = split files into 4GB chunks for parallel processing

# 5. Skip unused space
# Use partclone's space-efficient mode
# -q2 option uses partclone for supported filesystems

# 6. For SSDs, use trim before imaging
sudo fstrim -av

# 7. Benchmark different compression options
# Test compression speed and ratio:
for comp in z1p z3 z5p z7 z9p; do
    echo "Testing $comp compression..."
    time /usr/sbin/ocs-sr -q2 -$comp -p true savedisk test-$comp sda
    du -sh /home/partimag/test-$comp
done
```

## Monitoring and Notifications

To ensure your backup infrastructure is always working correctly, it is essential to implement comprehensive monitoring. [OneUptime](https://oneuptime.com) provides an excellent solution for monitoring your Clonezilla backup servers and operations.

With OneUptime, you can:

- **Monitor backup server availability**: Set up HTTP, TCP, or ping monitors to ensure your backup servers are always accessible
- **Track backup job status**: Create custom monitors that verify your Clonezilla backup scripts complete successfully
- **Set up alerting**: Receive instant notifications via email, SMS, Slack, or other channels when backups fail or servers become unreachable
- **Visualize backup metrics**: Create dashboards showing backup completion rates, image sizes over time, and storage utilization
- **Incident management**: Automatically create incidents when backup failures occur, with built-in escalation policies
- **Status pages**: Keep your team informed about backup system status with public or private status pages

Implementing proper monitoring ensures that you will be notified immediately if your backup infrastructure encounters any issues, giving you time to address problems before a disaster recovery scenario occurs. This proactive approach to backup monitoring is a critical component of any robust disaster recovery strategy.
