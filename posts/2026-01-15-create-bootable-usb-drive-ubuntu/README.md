# How to Create a Bootable USB Drive on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Bootable USB, ISO, Installation Media, Tutorial

Description: Complete guide to creating bootable USB drives on Ubuntu for OS installation and live systems.

---

Creating a bootable USB drive is an essential skill for any Linux user. Whether you need to install a new operating system, rescue a broken system, or try out a new distribution without committing to an installation, a bootable USB drive is your go-to solution. This comprehensive guide covers multiple methods to create bootable USB drives on Ubuntu, from command-line tools to graphical applications.

## Understanding Bootable USB Drives

A bootable USB drive contains a complete operating system image that allows your computer to start (boot) from the USB device instead of the internal hard drive. This is possible because modern computers support booting from various devices through their BIOS/UEFI firmware.

### Key Concepts

**ISO Images**: Most operating systems are distributed as ISO files, which are exact copies of optical disc images. These files contain the complete filesystem structure needed to boot and run the operating system.

**Boot Sectors**: For a USB drive to be bootable, it must contain proper boot sector information that tells the computer how to load the operating system.

**Filesystem Compatibility**: Different bootable USB creation methods use different filesystems (FAT32, NTFS, ext4) depending on the target operating system and boot mode requirements.

### Common Use Cases

- Installing new operating systems
- Running live Linux distributions for testing
- System recovery and repair
- Data recovery from non-bootable systems
- Portable operating systems
- Hardware diagnostics

## Different Methods Overview

Ubuntu offers several methods to create bootable USB drives, each with its own advantages:

| Method | Difficulty | GUI | Multi-boot | Best For |
|--------|-----------|-----|------------|----------|
| dd command | Advanced | No | No | Speed and reliability |
| Startup Disk Creator | Easy | Yes | No | Ubuntu ISOs |
| Balena Etcher | Easy | Yes | No | Cross-platform simplicity |
| Ventoy | Intermediate | Yes | Yes | Multiple ISOs |
| GNOME Disks | Easy | Yes | No | Built-in solution |

## Prerequisites

Before starting, ensure you have:

```bash
# Check available USB devices
# This command lists all block devices with their sizes and mount points
lsblk

# Example output:
# NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
# sda      8:0    0 256G  0 disk
# ├─sda1   8:1    0 512M  0 part /boot/efi
# └─sda2   8:2    0 255.5G 0 part /
# sdb      8:16   1  32G  0 disk
# └─sdb1   8:17   1  32G  0 part /media/user/USB

# Verify your ISO file integrity using checksums
# Always verify downloaded ISO files to ensure they are not corrupted
sha256sum ubuntu-24.04-desktop-amd64.iso

# Compare the output with the official checksum from the download page
# If they match, your ISO is intact and safe to use
```

**Important Warning**: Creating a bootable USB drive will erase ALL data on the target USB device. Always double-check the device name and back up any important data before proceeding.

## Method 1: Using the dd Command

The `dd` command is the most powerful and flexible method for creating bootable USB drives. It performs a byte-by-byte copy of the ISO image to the USB device.

### Basic dd Usage

```bash
# Step 1: Identify your USB drive
# List all block devices to find your USB drive
lsblk -d -o NAME,SIZE,MODEL,TRAN

# Example output:
# NAME SIZE MODEL            TRAN
# sda  256G Samsung SSD 970  nvme
# sdb  32G  SanDisk Ultra    usb   <-- This is our USB drive

# Step 2: Unmount the USB drive if it's mounted
# Replace /dev/sdb1 with your actual partition
# Unmounting ensures no data is being written during the copy process
sudo umount /dev/sdb*

# Step 3: Create the bootable USB using dd
# if=input file (the ISO image)
# of=output file (the USB device - use the device, not partition!)
# bs=block size (4M provides good performance)
# status=progress shows real-time copy progress
# conv=fsync ensures all data is written before command exits
sudo dd if=/path/to/ubuntu-24.04-desktop-amd64.iso of=/dev/sdb bs=4M status=progress conv=fsync

# Step 4: Sync to ensure all data is written to the USB
# This flushes any cached data to the device
sync

# Step 5: Safely eject the USB drive
# This ensures all pending operations are complete
sudo eject /dev/sdb
```

### Understanding dd Options

```bash
# Common dd options explained:

# bs (block size): Determines how much data is read/written at once
# Larger values (4M, 8M) are faster but use more memory
# Smaller values (512, 1K) are slower but safer for unreliable media
sudo dd if=image.iso of=/dev/sdb bs=4M

# status=progress: Shows transfer progress (available in modern dd versions)
# Without this, dd runs silently until completion
sudo dd if=image.iso of=/dev/sdb bs=4M status=progress

# conv=fsync: Forces synchronized I/O for data and metadata
# This ensures data integrity by flushing buffers after each block
sudo dd if=image.iso of=/dev/sdb bs=4M conv=fsync

# oflag=sync: Alternative to conv=fsync, synchronizes after each output block
# Slightly slower but ensures each block is written before proceeding
sudo dd if=image.iso of=/dev/sdb bs=4M oflag=sync

# oflag=direct: Bypasses the kernel page cache
# Useful for writing to USB drives as it avoids memory buildup
sudo dd if=image.iso of=/dev/sdb bs=4M oflag=direct status=progress
```

### Advanced dd Script

```bash
#!/bin/bash
# create-bootable-usb.sh
# A comprehensive script for creating bootable USB drives safely

# Color codes for output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display usage information
usage() {
    echo "Usage: $0 <iso_file> <device>"
    echo "Example: $0 ubuntu-24.04.iso /dev/sdb"
    echo ""
    echo "Options:"
    echo "  iso_file  - Path to the ISO image file"
    echo "  device    - Target USB device (e.g., /dev/sdb, NOT /dev/sdb1)"
    exit 1
}

# Function to verify the ISO file exists and is valid
verify_iso() {
    local iso_file=$1

    # Check if file exists
    if [[ ! -f "$iso_file" ]]; then
        echo -e "${RED}Error: ISO file not found: $iso_file${NC}"
        exit 1
    fi

    # Check if file has .iso extension
    if [[ ! "$iso_file" =~ \.iso$ ]]; then
        echo -e "${YELLOW}Warning: File does not have .iso extension${NC}"
        read -p "Continue anyway? (y/N): " confirm
        [[ "$confirm" != "y" && "$confirm" != "Y" ]] && exit 1
    fi

    # Display ISO file information
    echo -e "${GREEN}ISO file verified:${NC}"
    ls -lh "$iso_file"
    file "$iso_file"
}

# Function to verify the target device
verify_device() {
    local device=$1

    # Check if device exists
    if [[ ! -b "$device" ]]; then
        echo -e "${RED}Error: Device not found: $device${NC}"
        exit 1
    fi

    # Warn if device looks like a partition (has number at end)
    if [[ "$device" =~ [0-9]$ ]]; then
        echo -e "${YELLOW}Warning: $device appears to be a partition, not a device${NC}"
        echo "Use the base device (e.g., /dev/sdb instead of /dev/sdb1)"
        exit 1
    fi

    # Check if device is a removable USB drive
    local removable=$(cat /sys/block/$(basename $device)/removable 2>/dev/null)
    if [[ "$removable" != "1" ]]; then
        echo -e "${YELLOW}Warning: $device does not appear to be a removable device${NC}"
        read -p "This might be your system disk! Continue? (y/N): " confirm
        [[ "$confirm" != "y" && "$confirm" != "Y" ]] && exit 1
    fi

    # Display device information
    echo -e "${GREEN}Target device information:${NC}"
    lsblk "$device"
}

# Function to unmount all partitions on the device
unmount_device() {
    local device=$1

    echo "Unmounting all partitions on $device..."

    # Find and unmount all mounted partitions
    for partition in $(lsblk -ln -o NAME "$device" | tail -n +2); do
        if mountpoint -q "/dev/$partition" 2>/dev/null || \
           grep -q "/dev/$partition" /proc/mounts; then
            echo "Unmounting /dev/$partition"
            sudo umount "/dev/$partition" 2>/dev/null
        fi
    done

    # Give the system a moment to complete unmounting
    sleep 1
}

# Function to write ISO to USB
write_iso() {
    local iso_file=$1
    local device=$2

    echo -e "${GREEN}Starting write process...${NC}"
    echo "This may take several minutes depending on ISO size and USB speed."
    echo ""

    # Use dd with progress indicator
    # pv (pipe viewer) provides a progress bar if available
    if command -v pv &> /dev/null; then
        # Using pv for better progress indication
        sudo sh -c "pv '$iso_file' | dd of='$device' bs=4M conv=fsync"
    else
        # Fallback to dd with status=progress
        sudo dd if="$iso_file" of="$device" bs=4M status=progress conv=fsync
    fi

    # Check if dd was successful
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}Write completed successfully!${NC}"
    else
        echo -e "${RED}Error: Write process failed${NC}"
        exit 1
    fi
}

# Function to verify the written data
verify_write() {
    local iso_file=$1
    local device=$2

    echo "Verifying written data..."

    # Get ISO size in bytes
    local iso_size=$(stat -c%s "$iso_file")

    # Calculate checksum of ISO
    local iso_checksum=$(sha256sum "$iso_file" | cut -d' ' -f1)

    # Calculate checksum of written data (same size as ISO)
    local usb_checksum=$(sudo head -c "$iso_size" "$device" | sha256sum | cut -d' ' -f1)

    if [[ "$iso_checksum" == "$usb_checksum" ]]; then
        echo -e "${GREEN}Verification successful! Checksums match.${NC}"
    else
        echo -e "${RED}Verification failed! Checksums do not match.${NC}"
        echo "ISO checksum: $iso_checksum"
        echo "USB checksum: $usb_checksum"
        exit 1
    fi
}

# Main script execution
main() {
    # Check for required arguments
    if [[ $# -ne 2 ]]; then
        usage
    fi

    local iso_file=$1
    local device=$2

    echo "========================================"
    echo "    Bootable USB Creation Script"
    echo "========================================"
    echo ""

    # Step 1: Verify inputs
    verify_iso "$iso_file"
    echo ""
    verify_device "$device"
    echo ""

    # Step 2: Final confirmation
    echo -e "${YELLOW}WARNING: ALL DATA ON $device WILL BE DESTROYED!${NC}"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        echo "Operation cancelled."
        exit 0
    fi

    # Step 3: Unmount the device
    unmount_device "$device"

    # Step 4: Write the ISO
    write_iso "$iso_file" "$device"

    # Step 5: Sync filesystem
    echo "Syncing filesystem..."
    sync

    # Step 6: Verify the write (optional but recommended)
    read -p "Verify written data? This takes extra time but ensures integrity (y/N): " verify
    if [[ "$verify" == "y" || "$verify" == "Y" ]]; then
        verify_write "$iso_file" "$device"
    fi

    # Step 7: Eject the device
    echo "Ejecting device..."
    sudo eject "$device"

    echo ""
    echo -e "${GREEN}========================================"
    echo "    USB creation complete!"
    echo "========================================${NC}"
    echo "You can now safely remove the USB drive and boot from it."
}

# Run main function with all arguments
main "$@"
```

## Method 2: Using Startup Disk Creator

Ubuntu's built-in Startup Disk Creator is the easiest graphical method for creating Ubuntu bootable USB drives.

### Installation and Usage

```bash
# Startup Disk Creator is usually pre-installed on Ubuntu
# If not, install it using:
sudo apt update
sudo apt install usb-creator-gtk

# For KDE/Kubuntu, use the Qt version:
sudo apt install usb-creator-kde

# Launch Startup Disk Creator from command line:
usb-creator-gtk

# Or search for "Startup Disk Creator" in the application menu
```

### Step-by-Step GUI Process

1. **Launch the Application**: Open "Startup Disk Creator" from the application menu
2. **Select Source Image**: Click "Other" to browse for your ISO file, or select from detected ISOs
3. **Select Target Disk**: Choose your USB drive from the list of available disks
4. **Configure Options**: Optionally set up persistent storage (for Ubuntu live USB)
5. **Create**: Click "Make Startup Disk" to begin the process

### Command-Line Alternative

```bash
# Startup Disk Creator can also be used via command line
# This is useful for scripting or remote systems

# Basic usage (interactive mode)
usb-creator-gtk --iso=/path/to/ubuntu.iso --target=/dev/sdb

# For a completely automated (non-interactive) process, use dd instead
# as usb-creator doesn't have a fully non-interactive mode
```

## Method 3: Using Balena Etcher

Balena Etcher is a popular cross-platform tool known for its simplicity and reliability. It features a clean interface and includes built-in verification.

### Installation Methods

```bash
# Method 1: Download AppImage from official website
# AppImages are portable and don't require installation
wget https://github.com/balena-io/etcher/releases/download/v1.18.11/balenaEtcher-1.18.11-x64.AppImage

# Make the AppImage executable
chmod +x balenaEtcher-1.18.11-x64.AppImage

# Run Etcher
./balenaEtcher-1.18.11-x64.AppImage

# Method 2: Install from official repository
# Add Balena's repository for automatic updates
curl -1sLf 'https://dl.cloudsmith.io/public/balena/etcher/setup.deb.sh' | sudo -E bash
sudo apt update
sudo apt install balena-etcher-electron

# Method 3: Install using Snap
# Snap provides sandboxed installation with automatic updates
sudo snap install balena-etcher

# Method 4: Install using Flatpak
# Flatpak also provides sandboxed installation
flatpak install flathub io.balena_etcher
```

### Using Etcher

Etcher's interface is straightforward with three steps:

1. **Flash from file**: Select your ISO image
2. **Select target**: Choose the USB drive (Etcher hides system drives for safety)
3. **Flash!**: Begin the writing process with automatic verification

### Etcher CLI (for advanced users)

```bash
# Etcher also provides a CLI tool for automation
# Install etcher-cli
npm install -g etcher-cli

# Basic usage
sudo etcher /path/to/image.iso --drive /dev/sdb --yes

# With validation disabled (faster but less safe)
sudo etcher /path/to/image.iso --drive /dev/sdb --yes --no-unmount --no-check
```

## Method 4: Using Ventoy for Multi-Boot USB

Ventoy is a revolutionary tool that allows you to boot multiple ISO files from a single USB drive without reflashing. Simply copy ISO files to the USB, and Ventoy handles the boot process.

### Installing Ventoy

```bash
# Download the latest Ventoy release
# Check https://github.com/ventoy/Ventoy/releases for the latest version
wget https://github.com/ventoy/Ventoy/releases/download/v1.0.97/ventoy-1.0.97-linux.tar.gz

# Extract the archive
tar -xzf ventoy-1.0.97-linux.tar.gz
cd ventoy-1.0.97

# Install Ventoy to USB (this will format the USB drive)
# Replace /dev/sdb with your USB device
# -i flag performs installation
sudo ./Ventoy2Disk.sh -i /dev/sdb

# For GUI installation, use VentoyGUI
# Requires GTK3
sudo ./VentoyGUI.x86_64

# Update existing Ventoy installation (preserves ISO files)
# Use -u flag for update
sudo ./Ventoy2Disk.sh -u /dev/sdb
```

### Ventoy Installation Options

```bash
# Install with GPT partition style (recommended for UEFI systems)
# GPT supports larger drives and more partitions
sudo ./Ventoy2Disk.sh -i -g /dev/sdb

# Install with Secure Boot support
# Required for systems with Secure Boot enabled
sudo ./Ventoy2Disk.sh -i -s /dev/sdb

# Install with both GPT and Secure Boot
sudo ./Ventoy2Disk.sh -i -g -s /dev/sdb

# Specify partition size for Ventoy (in MB)
# This reserves space for the boot partition
sudo ./Ventoy2Disk.sh -i -r 32 /dev/sdb

# Non-interactive installation (for scripting)
# Automatically confirms all prompts
sudo ./Ventoy2Disk.sh -i -I /dev/sdb
```

### Using Ventoy

```bash
# After Ventoy installation, the USB drive will have two partitions:
# 1. A large exFAT/NTFS partition for storing ISO files
# 2. A small partition containing the Ventoy bootloader

# Mount the data partition (usually auto-mounted)
# If not auto-mounted:
sudo mount /dev/sdb1 /mnt

# Simply copy ISO files to the mounted partition
cp ubuntu-24.04-desktop-amd64.iso /mnt/
cp fedora-40-workstation.iso /mnt/
cp windows11.iso /mnt/

# You can organize ISOs in folders
mkdir -p /mnt/Linux /mnt/Windows /mnt/Tools
cp ubuntu-24.04-desktop-amd64.iso /mnt/Linux/
cp windows11.iso /mnt/Windows/
cp clonezilla-live.iso /mnt/Tools/

# Unmount when done
sudo umount /mnt

# Boot from the USB and select any ISO from the Ventoy menu
```

### Ventoy Configuration

```bash
# Create a ventoy.json configuration file for customization
# Place this in the root of the Ventoy partition

# Create configuration directory
mkdir -p /mnt/ventoy

# Create ventoy.json with custom settings
cat > /mnt/ventoy/ventoy.json << 'EOF'
{
    "control": [
        { "VTOY_DEFAULT_MENU_MODE": "1" },
        { "VTOY_TREE_VIEW_MENU_STYLE": "1" },
        { "VTOY_FILT_DOT_UNDERSCORE_FILE": "1" },
        { "VTOY_DEFAULT_SEARCH_ROOT": "/ISO" }
    ],
    "theme": {
        "display_mode": "GUI",
        "gfxmode": "1920x1080",
        "ventoy_left": "5%",
        "ventoy_top": "10%",
        "ventoy_color": "#ffffff"
    },
    "menu_alias": [
        {
            "image": "/Linux/ubuntu-24.04-desktop-amd64.iso",
            "alias": "Ubuntu 24.04 LTS Desktop"
        },
        {
            "image": "/Windows/windows11.iso",
            "alias": "Windows 11 Installation"
        }
    ],
    "persistence": [
        {
            "image": "/Linux/ubuntu-24.04-desktop-amd64.iso",
            "backend": "/persistence/ubuntu-persistence.dat"
        }
    ]
}
EOF
```

## UEFI vs Legacy Boot Considerations

Understanding boot modes is crucial for successful USB boot creation. Modern systems support two boot modes, and your bootable USB must be compatible with your target system.

### Understanding Boot Modes

```bash
# Check your current system's boot mode
# This helps determine what your target system likely supports

# Method 1: Check for EFI directory
[ -d /sys/firmware/efi ] && echo "UEFI Mode" || echo "Legacy/BIOS Mode"

# Method 2: Check boot mode via efivar
efivar --list 2>/dev/null && echo "UEFI Mode" || echo "Legacy/BIOS Mode"

# Method 3: Detailed boot information
cat /sys/firmware/efi/fw_platform_size 2>/dev/null
# Returns 64 for 64-bit UEFI, 32 for 32-bit UEFI
# No output means Legacy BIOS
```

### Creating UEFI-Compatible USB

```bash
# Most modern Linux ISOs are hybrid and support both UEFI and Legacy boot
# However, some considerations apply:

# For UEFI systems with Secure Boot enabled:
# 1. Ubuntu and many distributions support Secure Boot
# 2. Some tools (like Ventoy) require specific installation options

# Check if an ISO supports UEFI
# Mount the ISO and look for EFI directory
sudo mount -o loop ubuntu-24.04-desktop-amd64.iso /mnt
ls -la /mnt/EFI
# If EFI directory exists with bootx64.efi, UEFI is supported
sudo umount /mnt

# Create UEFI-only bootable USB using dd
# No special options needed - dd copies the hybrid image as-is
sudo dd if=ubuntu-24.04-desktop-amd64.iso of=/dev/sdb bs=4M status=progress conv=fsync
```

### Creating Legacy BIOS-Compatible USB

```bash
# Most Linux ISOs support Legacy BIOS boot by default
# The MBR (Master Boot Record) contains the Legacy boot code

# Verify ISO has MBR boot support
file ubuntu-24.04-desktop-amd64.iso
# Output should mention "DOS/MBR boot sector" for Legacy support

# For systems that only support Legacy boot:
# 1. Ensure UEFI is disabled in BIOS settings (enable CSM/Legacy)
# 2. Use standard dd command - no special options needed
sudo dd if=ubuntu-24.04-desktop-amd64.iso of=/dev/sdb bs=4M status=progress conv=fsync
```

### Partition Table Considerations

```bash
# GPT (GUID Partition Table) - Modern standard for UEFI
# MBR (Master Boot Record) - Legacy standard, limited to 2TB drives

# Check partition table type of USB drive
sudo fdisk -l /dev/sdb | grep "Disklabel type"

# For maximum compatibility (UEFI + Legacy), some ISOs use hybrid MBR
# This allows booting from both modes

# When using Ventoy, choose partition style based on target:
# GPT for UEFI systems (use -g flag)
sudo ./Ventoy2Disk.sh -i -g /dev/sdb

# MBR for Legacy systems (default, no flag needed)
sudo ./Ventoy2Disk.sh -i /dev/sdb
```

## Creating Persistent Storage on Live USB

Persistent storage allows you to save files, settings, and installed applications on a live USB that normally resets after each reboot.

### Using Startup Disk Creator for Persistence

Ubuntu's Startup Disk Creator has a built-in option for persistent storage:

1. Select your ISO file
2. Select your USB drive
3. Use the slider to allocate space for persistent storage
4. Create the startup disk

### Manual Persistence Setup

```bash
# Create a bootable USB with a persistence partition
# This method works with Ubuntu and derivatives

# Step 1: Create bootable USB with dd
sudo dd if=ubuntu-24.04-desktop-amd64.iso of=/dev/sdb bs=4M status=progress conv=fsync
sync

# Step 2: Create an additional partition for persistence
# First, find where the ISO data ends
ISO_SIZE=$(stat -c%s ubuntu-24.04-desktop-amd64.iso)
ISO_SECTORS=$((ISO_SIZE / 512))

# Use fdisk to create a new partition
sudo fdisk /dev/sdb << EOF
n
p
3
$((ISO_SECTORS + 2048))

w
EOF

# Step 3: Format the persistence partition with ext4
# Label must be "casper-rw" for Ubuntu to recognize it
sudo mkfs.ext4 -L casper-rw /dev/sdb3

# Step 4: The USB will now have persistent storage
# Files saved in the live session will persist across reboots
```

### Creating a Persistence File for Ventoy

```bash
# Ventoy uses persistence files (disk images) instead of partitions
# This allows different persistence configs for different ISOs

# Step 1: Mount the Ventoy data partition
sudo mount /dev/sdb1 /mnt

# Step 2: Create persistence directory
mkdir -p /mnt/persistence

# Step 3: Create a persistence file using dd
# Size is in MB (this creates a 4GB persistence file)
sudo dd if=/dev/zero of=/mnt/persistence/ubuntu-persistence.dat bs=1M count=4096 status=progress

# Step 4: Format the persistence file with ext4
# Use casper-rw label for Ubuntu compatibility
sudo mkfs.ext4 -L casper-rw /mnt/persistence/ubuntu-persistence.dat

# Step 5: Configure Ventoy to use this persistence file
# Create or edit /mnt/ventoy/ventoy.json
cat > /mnt/ventoy/ventoy.json << 'EOF'
{
    "persistence": [
        {
            "image": "/ubuntu-24.04-desktop-amd64.iso",
            "backend": "/persistence/ubuntu-persistence.dat"
        }
    ]
}
EOF

# Step 6: Unmount
sudo umount /mnt

# When booting the specified ISO, Ventoy will automatically
# attach the persistence file, saving your changes
```

### Persistence with Different Distributions

```bash
# Different distributions use different persistence labels:

# Ubuntu/Linux Mint: casper-rw
sudo mkfs.ext4 -L casper-rw /dev/sdb3

# Debian: persistence (also needs persistence.conf file)
sudo mkfs.ext4 -L persistence /dev/sdb3
sudo mount /dev/sdb3 /mnt
echo "/ union" | sudo tee /mnt/persistence.conf
sudo umount /mnt

# Fedora: Uses different mechanism (overlay filesystem)
# Fedora Media Writer handles this automatically

# Kali Linux: persistence
sudo mkfs.ext4 -L persistence /dev/sdb3
sudo mount /dev/sdb3 /mnt
echo "/ union" | sudo tee /mnt/persistence.conf
sudo umount /mnt
```

## Verifying USB Creation

Always verify your bootable USB to ensure it was created correctly and will boot successfully.

### Checksum Verification

```bash
# Verify the written USB matches the original ISO
# This ensures no data corruption occurred during writing

# Method 1: Compare checksums directly
# Get the ISO size to read exactly that much from USB
ISO_SIZE=$(stat -c%s ubuntu-24.04-desktop-amd64.iso)

# Calculate ISO checksum
ISO_CHECKSUM=$(sha256sum ubuntu-24.04-desktop-amd64.iso | cut -d' ' -f1)
echo "ISO Checksum: $ISO_CHECKSUM"

# Calculate USB checksum (reading same number of bytes as ISO)
USB_CHECKSUM=$(sudo head -c $ISO_SIZE /dev/sdb | sha256sum | cut -d' ' -f1)
echo "USB Checksum: $USB_CHECKSUM"

# Compare
if [ "$ISO_CHECKSUM" == "$USB_CHECKSUM" ]; then
    echo "SUCCESS: Checksums match! USB was created correctly."
else
    echo "ERROR: Checksums do not match! USB creation may have failed."
fi
```

### Testing with QEMU

```bash
# Test bootable USB in a virtual machine without rebooting
# This is the safest way to verify before using on real hardware

# Install QEMU if not already installed
sudo apt install qemu-system-x86

# Boot from USB device directly (requires root for raw device access)
# -enable-kvm: Use hardware virtualization for better performance
# -m 2G: Allocate 2GB RAM to the VM
# -boot d: Boot from the specified device
sudo qemu-system-x86_64 \
    -enable-kvm \
    -m 2G \
    -drive file=/dev/sdb,format=raw,if=virtio \
    -boot d

# For UEFI boot testing, install OVMF firmware first
sudo apt install ovmf

# Test UEFI boot
sudo qemu-system-x86_64 \
    -enable-kvm \
    -m 2G \
    -bios /usr/share/ovmf/OVMF.fd \
    -drive file=/dev/sdb,format=raw,if=virtio \
    -boot d

# Alternative: Test the ISO file directly before writing to USB
qemu-system-x86_64 \
    -enable-kvm \
    -m 2G \
    -cdrom ubuntu-24.04-desktop-amd64.iso \
    -boot d
```

### Verify Boot Structure

```bash
# Examine the boot structure of the USB drive

# Check partition table
sudo fdisk -l /dev/sdb

# Verify bootloader presence (for MBR/Legacy boot)
# The first 446 bytes contain the bootloader code
sudo hexdump -C -n 512 /dev/sdb | head -20
# Look for boot signature 0x55 0xAA at bytes 510-511

# Check for EFI boot files (for UEFI boot)
sudo mount /dev/sdb1 /mnt
ls -la /mnt/EFI/BOOT/
# Should contain BOOTX64.EFI (for 64-bit UEFI)
# or BOOTIA32.EFI (for 32-bit UEFI)
sudo umount /mnt

# List all files on the USB to verify ISO was written correctly
sudo mount -o loop /dev/sdb /mnt 2>/dev/null || sudo mount /dev/sdb1 /mnt
ls -la /mnt/
sudo umount /mnt
```

## Troubleshooting Boot Issues

Common problems and their solutions when creating or using bootable USB drives.

### USB Not Detected in BIOS/UEFI

```bash
# Problem: USB drive doesn't appear in boot menu

# Solution 1: Check USB drive is working
lsblk
# USB should appear as a block device

# Solution 2: Try a different USB port
# USB 2.0 ports often have better compatibility than USB 3.0 for booting

# Solution 3: Recreate the USB with different block size
# Some USB drives work better with smaller block sizes
sudo dd if=ubuntu.iso of=/dev/sdb bs=1M status=progress conv=fsync

# Solution 4: Verify BIOS settings
# - Enable USB boot in BIOS
# - Disable Fast Boot (can skip USB detection)
# - For UEFI: Try disabling Secure Boot temporarily
# - For Legacy: Enable CSM (Compatibility Support Module)
```

### Secure Boot Issues

```bash
# Problem: System refuses to boot due to Secure Boot

# Solution 1: Use distributions that support Secure Boot
# Ubuntu, Fedora, and openSUSE have signed bootloaders

# Solution 2: Enroll MOK (Machine Owner Key) for unsigned bootloaders
# When prompted at boot, select "Enroll MOK" and follow instructions

# Solution 3: Temporarily disable Secure Boot in BIOS
# This is required for unsigned distributions and custom kernels

# Solution 4: For Ventoy, install with Secure Boot support
sudo ./Ventoy2Disk.sh -i -s /dev/sdb
# Follow the MOKUTIL enrollment process on first boot
```

### USB Boots to GRUB Rescue

```bash
# Problem: USB boots to "grub rescue>" prompt

# Solution 1: Recreate the USB - file may be corrupted
sudo dd if=ubuntu.iso of=/dev/sdb bs=4M status=progress conv=fsync

# Solution 2: At grub rescue, try these commands
# List available partitions
ls
# Find the partition with Linux files
ls (hd0,msdos1)/
# Set root and boot
set root=(hd0,msdos1)
set prefix=(hd0,msdos1)/boot/grub
insmod normal
normal

# Solution 3: Verify ISO integrity before rewriting
sha256sum ubuntu.iso
# Compare with official checksum from Ubuntu website
```

### Write Protection Errors

```bash
# Problem: dd reports "Read-only file system" or similar

# Solution 1: Check for physical write-protect switch on USB drive
# Some USB drives have a physical lock switch

# Solution 2: Remove read-only attribute
sudo hdparm -r0 /dev/sdb

# Solution 3: Check for filesystem issues
# Try clearing the partition table
sudo wipefs -a /dev/sdb

# Solution 4: Use a different USB drive
# Some cheap/old drives fail and become read-only
```

### Slow USB Write Speed

```bash
# Problem: USB creation takes extremely long

# Solution 1: Check USB drive speed class
# Use a USB 3.0 drive in a USB 3.0 port for best speeds

# Solution 2: Adjust block size
# Larger block sizes can improve speed
sudo dd if=ubuntu.iso of=/dev/sdb bs=8M status=progress conv=fsync

# Solution 3: Use direct I/O to bypass cache
sudo dd if=ubuntu.iso of=/dev/sdb bs=4M status=progress oflag=direct

# Solution 4: Check for USB issues
dmesg | tail -20
# Look for USB error messages indicating hardware problems

# Solution 5: Monitor actual write speed
# Install and use pv for detailed progress
sudo apt install pv
sudo sh -c "pv ubuntu.iso | dd of=/dev/sdb bs=4M conv=fsync"
```

### Boot Menu Shows Wrong Entry

```bash
# Problem: Ventoy or multi-boot shows incorrect or duplicate entries

# Solution 1: Clear Ventoy cache
# Delete the hidden .vtoyefi folder
sudo mount /dev/sdb1 /mnt
sudo rm -rf /mnt/.vtoyefi
sudo umount /mnt

# Solution 2: Update Ventoy to latest version
cd ventoy-1.0.97
sudo ./Ventoy2Disk.sh -u /dev/sdb

# Solution 3: Check for duplicate ISO files
# Remove any backup or duplicate ISOs
find /mnt -name "*.iso" -type f

# Solution 4: Reset Ventoy configuration
sudo rm /mnt/ventoy/ventoy.json
```

## Creating Windows Bootable USB from Ubuntu

Creating a Windows installation USB from Ubuntu requires special handling due to Windows' NTFS filesystem requirements and large file sizes.

### Method 1: Using WoeUSB

```bash
# WoeUSB is specifically designed for creating Windows bootable USBs

# Install WoeUSB from PPA
sudo add-apt-repository ppa:tomtung/woeusb
sudo apt update
sudo apt install woeusb

# Alternative: Install woeusb-ng (actively maintained fork)
sudo apt install git p7zip-full python3-pip python3-wxgtk4.0 grub2-common grub-pc-bin
sudo pip3 install woeusb-ng

# Create Windows bootable USB
# --target-filesystem specifies the filesystem (NTFS for Windows)
# --device writes to the entire device, reformatting it
sudo woeusb --target-filesystem NTFS --device /path/to/windows.iso /dev/sdb

# GUI version (if installed)
woeusbgui
```

### Method 2: Manual Method with NTFS

```bash
#!/bin/bash
# create-windows-usb.sh
# Manually create a Windows bootable USB

# This script handles Windows ISOs with files larger than 4GB
# (install.wim is often > 4GB, which FAT32 cannot handle)

WINDOWS_ISO=$1
USB_DEVICE=$2

echo "Creating Windows bootable USB from Ubuntu"
echo "ISO: $WINDOWS_ISO"
echo "Device: $USB_DEVICE"

# Unmount any mounted partitions
sudo umount ${USB_DEVICE}* 2>/dev/null

# Create GPT partition table for UEFI boot
# This method creates a UEFI-bootable Windows USB
sudo parted ${USB_DEVICE} --script mklabel gpt

# Create a FAT32 EFI partition (for UEFI boot files)
sudo parted ${USB_DEVICE} --script mkpart EFI fat32 1MiB 1GiB
sudo parted ${USB_DEVICE} --script set 1 esp on

# Create an NTFS partition for Windows files
sudo parted ${USB_DEVICE} --script mkpart Windows ntfs 1GiB 100%

# Format partitions
sudo mkfs.fat -F32 -n EFI ${USB_DEVICE}1
sudo mkfs.ntfs -f -L Windows ${USB_DEVICE}2

# Mount the Windows ISO
MOUNT_ISO=$(mktemp -d)
sudo mount -o loop "$WINDOWS_ISO" "$MOUNT_ISO"

# Mount USB partitions
MOUNT_EFI=$(mktemp -d)
MOUNT_NTFS=$(mktemp -d)
sudo mount ${USB_DEVICE}1 "$MOUNT_EFI"
sudo mount ${USB_DEVICE}2 "$MOUNT_NTFS"

# Copy EFI boot files to EFI partition
sudo mkdir -p "$MOUNT_EFI/EFI/BOOT"
sudo cp -r "$MOUNT_ISO/efi/boot/"* "$MOUNT_EFI/EFI/BOOT/"

# Copy all Windows files to NTFS partition
echo "Copying Windows files (this may take a while)..."
sudo cp -r "$MOUNT_ISO/"* "$MOUNT_NTFS/"

# Sync and unmount
sync
sudo umount "$MOUNT_ISO"
sudo umount "$MOUNT_EFI"
sudo umount "$MOUNT_NTFS"

# Clean up
rmdir "$MOUNT_ISO" "$MOUNT_EFI" "$MOUNT_NTFS"

echo "Windows bootable USB created successfully!"
echo "Boot in UEFI mode to install Windows."
```

### Method 3: Using Ventoy for Windows

```bash
# Ventoy can boot Windows ISOs directly
# This is the easiest method and preserves other ISOs

# Install Ventoy (if not already installed)
sudo ./Ventoy2Disk.sh -i -g /dev/sdb

# Mount Ventoy data partition
sudo mount /dev/sdb1 /mnt

# Copy Windows ISO to the USB
cp /path/to/windows.iso /mnt/

# Unmount
sudo umount /mnt

# Boot from USB and select Windows ISO from Ventoy menu
# Ventoy handles all the boot complexity automatically
```

### Handling Large install.wim Files

```bash
# Windows 10/11 ISOs often have install.wim files larger than 4GB
# FAT32 cannot handle files > 4GB, so we need to split it

# Mount the ISO and USB
sudo mount -o loop windows.iso /mnt/iso
sudo mount /dev/sdb1 /mnt/usb

# Copy all files except install.wim
rsync -avh --progress --exclude='sources/install.wim' /mnt/iso/ /mnt/usb/

# Split install.wim into smaller parts using wimlib
sudo apt install wimtools

# Split into parts smaller than 4GB (3800MB to be safe)
sudo wimlib-imagex split /mnt/iso/sources/install.wim \
    /mnt/usb/sources/install.swm 3800

# Clean up
sudo umount /mnt/iso /mnt/usb

# Windows installer will automatically find and use the split files
```

## Using GNOME Disks (Alternative GUI Method)

GNOME Disks is a built-in utility in Ubuntu that can also create bootable USB drives.

```bash
# Launch GNOME Disks
gnome-disks

# Or from command line
gnome-disks &

# Steps:
# 1. Select your USB drive from the left panel
# 2. Click the menu button (three horizontal lines)
# 3. Select "Restore Disk Image..."
# 4. Choose your ISO file
# 5. Click "Start Restoring..."
# 6. Confirm and wait for completion
```

## Best Practices and Tips

### Before Creating Bootable USB

```bash
# Always verify ISO integrity before creating bootable USB
# Download checksum file from official source
wget https://releases.ubuntu.com/24.04/SHA256SUMS
wget https://releases.ubuntu.com/24.04/SHA256SUMS.gpg

# Verify GPG signature (optional but recommended)
gpg --verify SHA256SUMS.gpg SHA256SUMS

# Verify ISO checksum
sha256sum -c SHA256SUMS 2>&1 | grep ubuntu-24.04-desktop-amd64.iso

# Check USB drive health before use
sudo apt install smartmontools
sudo smartctl -a /dev/sdb
# Look for any "FAILING" attributes
```

### After Creating Bootable USB

```bash
# Always safely eject the USB drive
sync                    # Ensure all data is written
sudo eject /dev/sdb     # Safely eject the device

# Test boot in VM before using on real hardware
qemu-system-x86_64 -enable-kvm -m 2G -drive file=/dev/sdb,format=raw -boot d

# Label your USB drives to avoid confusion
sudo e2label /dev/sdb1 "Ubuntu_24.04"  # For ext filesystems
sudo fatlabel /dev/sdb1 "UBUNTU2404"   # For FAT filesystems (11 char limit)
```

### USB Drive Recommendations

```bash
# For best results, use:
# - USB 3.0 or higher drives for faster creation and boot
# - Drives from reputable brands (SanDisk, Samsung, Kingston)
# - Minimum 8GB capacity (16GB+ recommended for persistence)

# Check USB drive specifications
sudo lsusb -v 2>/dev/null | grep -A5 "Mass Storage"

# Check USB connection speed
cat /sys/bus/usb/devices/*/speed
# 480 = USB 2.0, 5000 = USB 3.0, 10000 = USB 3.1 Gen2
```

## Quick Reference Commands

```bash
# List all USB devices
lsblk -d -o NAME,SIZE,MODEL,TRAN | grep usb

# Unmount all partitions on a device
sudo umount /dev/sdb?*

# Create bootable USB (basic)
sudo dd if=image.iso of=/dev/sdb bs=4M status=progress conv=fsync && sync

# Verify written data
sudo cmp -n $(stat -c%s image.iso) image.iso /dev/sdb

# Format USB drive (erase completely)
sudo wipefs -a /dev/sdb
sudo parted /dev/sdb mklabel gpt
sudo parted /dev/sdb mkpart primary fat32 1MiB 100%
sudo mkfs.fat -F32 /dev/sdb1

# Check USB for errors
sudo badblocks -sv /dev/sdb

# Safely eject
sudo eject /dev/sdb
```

## Conclusion

Creating bootable USB drives on Ubuntu is a fundamental skill that opens up numerous possibilities, from installing new operating systems to system recovery and testing. This guide covered multiple methods to accommodate different needs:

- **dd command**: For power users who want maximum control and reliability
- **Startup Disk Creator**: For beginners creating Ubuntu USB drives
- **Balena Etcher**: For cross-platform simplicity with built-in verification
- **Ventoy**: For users who need multiple bootable ISOs on a single drive
- **GNOME Disks**: For a built-in graphical alternative

Remember to always verify your ISO files before writing, double-check your target device to avoid data loss, and test your bootable USB before relying on it for critical tasks.

---

**Monitoring Your Infrastructure with OneUptime**

After setting up your systems using bootable USB drives, maintaining uptime and reliability becomes crucial. [OneUptime](https://oneuptime.com) provides comprehensive infrastructure monitoring to help you:

- Monitor server uptime and availability 24/7
- Track system performance metrics and resource utilization
- Receive instant alerts when issues arise via multiple channels
- Create status pages to communicate with stakeholders
- Set up on-call schedules and incident management workflows
- Monitor SSL certificates and domain expiration

Whether you're running a homelab or enterprise infrastructure, OneUptime helps ensure your systems stay online and performant. Start monitoring your infrastructure today with OneUptime's powerful, open-source monitoring platform.
