# How to Set Up Full Disk Encryption During Ubuntu Server Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Encryption, LUKS

Description: A thorough walkthrough of configuring full disk encryption with LUKS during Ubuntu Server installation, covering LVM-on-LUKS setup and remote unlock considerations.

---

Full disk encryption ensures that data on your server cannot be read if the physical drive is removed or the machine is stolen. For servers handling sensitive data, compliance requirements often mandate it. Ubuntu Server supports encryption via LUKS (Linux Unified Key Setup) integrated with LVM, and setting it up during installation is the cleanest approach.

## What Full Disk Encryption Protects Against

LUKS encryption protects data at rest. When the system is powered off, the disk contents are encrypted and unreadable without the passphrase. It does not protect against:
- A running system that has already been unlocked
- Memory attacks while the system is running
- Network-based attacks against running services

This is still valuable for compliance (HIPAA, PCI-DSS, SOC 2), co-location scenarios where you do not fully trust the data center staff, and hardware that might be lost or stolen.

## Installation Overview

Ubuntu's Subiquity installer supports LVM-on-LUKS out of the box. The structure looks like:

```
Physical Disk
└── LUKS Container (encrypted)
    └── LVM Volume Group
        ├── Logical Volume: swap
        └── Logical Volume: root (/)
```

The /boot partition stays unencrypted because GRUB needs to read it before it can prompt for the LUKS passphrase. The EFI partition is also unencrypted.

## During the Installer: Storage Configuration

At the storage configuration step, choose "Custom storage layout."

Create partitions manually:

1. **EFI partition**: 1GB, formatted as FAT32, mounted at `/boot/efi`
2. **Boot partition**: 2GB, formatted as ext4, mounted at `/boot`
3. **Encrypted partition**: Remaining space, type "Leave unformatted" initially

For the remaining space, select it and choose "Add Partition." Set the format to `ext4` and then look for the encryption option. In Subiquity, when you select a partition and choose "Format," you should see an option to add it as an encrypted volume (LUKS).

If the GUI option is not visible, the alternative is using manual LUKS setup post-install, which is more complex.

### Enabling Encryption in Subiquity

When configuring the large partition:
1. Select the partition
2. Choose "Add as Boot Device" or "Format"
3. Look for the "Encrypt" toggle or checkbox
4. Set a strong passphrase - you will enter this every time the server boots

After enabling encryption, create an LVM volume group on the LUKS container, then create logical volumes for root and swap within the VG.

## Manual Setup: LUKS on an Existing Ubuntu System

If you need to encrypt after the fact, you cannot encrypt the running root partition in place. You need a second disk or a Live USB approach. Here is how to set up LUKS on a secondary disk from a running system (or from a live USB for the root disk):

```bash
# Install cryptsetup if not present
sudo apt install cryptsetup

# Format the partition with LUKS (will destroy all data)
sudo cryptsetup luksFormat /dev/sdb1

# You will be prompted to type YES in uppercase and enter a passphrase

# Open the LUKS container
sudo cryptsetup luksOpen /dev/sdb1 encrypted_disk

# The decrypted block device now appears at:
ls /dev/mapper/encrypted_disk

# Create a filesystem on the decrypted device
sudo mkfs.ext4 /dev/mapper/encrypted_disk
```

## Setting Up LVM Inside LUKS

```bash
# Initialize LVM physical volume on the LUKS device
sudo pvcreate /dev/mapper/cryptroot

# Create a volume group
sudo vgcreate ubuntu-vg /dev/mapper/cryptroot

# Create logical volumes
sudo lvcreate -L 8G -n swap ubuntu-vg
sudo lvcreate -l 100%FREE -n root ubuntu-vg

# Format the logical volumes
sudo mkswap /dev/ubuntu-vg/swap
sudo mkfs.ext4 /dev/ubuntu-vg/root
```

## Configuring /etc/crypttab

The crypttab file tells the initramfs which devices to decrypt at boot:

```bash
# Get the UUID of the LUKS partition
sudo cryptsetup luksUUID /dev/sda3
```

```bash
# Edit crypttab (one line per encrypted device)
sudo nano /etc/crypttab
```

```
# Format: <name> <device-uuid> <keyfile-or-none> <options>
cryptroot UUID=your-luks-uuid-here none luks,discard
```

The `none` means it will prompt for a passphrase at boot. The `discard` option enables TRIM for SSDs (be aware this has minor security implications by revealing which sectors are in use).

## Regenerating initramfs

After modifying crypttab, regenerate initramfs so the early boot environment knows about the encrypted device:

```bash
sudo update-initramfs -u -k all
```

## Remote Unlock via dropbear-initramfs

Physical servers that boot into LUKS passphrase prompts require someone to be physically present or have console access. For remote servers, `dropbear-initramfs` runs a minimal SSH server in the initramfs that lets you unlock the disk remotely:

```bash
sudo apt install dropbear-initramfs

# Add your SSH public key for remote unlock
echo "your-public-key-here" | sudo tee /etc/dropbear/initramfs/authorized_keys
sudo chmod 600 /etc/dropbear/initramfs/authorized_keys

# Configure the dropbear IP (static is more reliable than DHCP here)
sudo nano /etc/initramfs-tools/initramfs.conf
```

Add or modify:
```
# Use a static IP during early boot for remote unlock
IP=192.168.1.100::192.168.1.1:255.255.255.0::eth0:none
```

```bash
# Rebuild initramfs with dropbear included
sudo update-initramfs -u -k all
```

When the server reboots, you can SSH to it on port 22 from the initramfs environment and unlock the disk:

```bash
# SSH to the server during boot (uses dropbear, not OpenSSH)
ssh -p 22 root@192.168.1.100

# Once connected, you will see a prompt like:
# Please unlock disk cryptroot:
# Type the passphrase and press Enter
```

## Managing LUKS Keys

LUKS supports up to 8 key slots, allowing multiple passphrases or key files:

```bash
# Add a second passphrase (useful for key rotation or multiple admins)
sudo cryptsetup luksAddKey /dev/sda3

# List key slots
sudo cryptsetup luksDump /dev/sda3 | grep "Key Slot"

# Remove a key (will prompt for existing key to verify)
sudo cryptsetup luksRemoveKey /dev/sda3

# Change a passphrase
sudo cryptsetup luksChangeKey /dev/sda3
```

### Using a Key File

For automated unlocking in specific environments (like a trusted network with a key server):

```bash
# Generate a random key file
sudo dd if=/dev/urandom of=/root/luks-keyfile bs=4096 count=1
sudo chmod 400 /root/luks-keyfile

# Add it to a key slot
sudo cryptsetup luksAddKey /dev/sda3 /root/luks-keyfile

# Reference in crypttab
# cryptroot UUID=your-uuid /root/luks-keyfile luks,discard
```

## Performance Impact

Encryption adds CPU overhead. Modern processors with AES-NI hardware acceleration keep this minimal. Verify AES-NI is available:

```bash
grep aes /proc/cpuinfo

# Check which cipher LUKS is using
sudo cryptsetup status cryptroot | grep cipher
# Should show: aes-xts-plain64 (the default and recommended cipher)
```

Benchmark the encryption throughput:

```bash
sudo cryptsetup benchmark
```

On a modern server CPU with AES-NI, you should see throughput in the multi-GB/s range, which is fast enough that encryption is not the bottleneck for most workloads.

## Backup the LUKS Header

The LUKS header contains the key material. If it is corrupted, the encrypted data becomes permanently inaccessible. Back it up immediately after setup:

```bash
# Back up LUKS header to an external location
sudo cryptsetup luksHeaderBackup /dev/sda3 --header-backup-file luks-header-backup.bin

# Store this file securely, off the encrypted disk
# A corrupted header cannot be recovered - this backup is your only option
```

Full disk encryption is not difficult to set up correctly, but it requires upfront planning around key management and remote unlock procedures. The time to think through these details is during installation, not after you have deployed to production.
