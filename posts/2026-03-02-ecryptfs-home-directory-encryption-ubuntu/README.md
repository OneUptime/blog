# How to Set Up eCryptfs for Home Directory Encryption on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Encryption, eCryptfs, Home Directory

Description: Learn how to set up eCryptfs to encrypt your home directory on Ubuntu, protecting personal data at rest on laptops and workstations against physical theft.

---

eCryptfs is a filesystem-level encryption layer built into the Linux kernel that encrypts files individually as they are written to disk. Ubuntu has used it as the basis for home directory encryption since Ubuntu 9.10 (though newer installations prefer LUKS). It's particularly useful for laptops where the risk of physical theft is real.

## Understanding eCryptfs

eCryptfs works differently from LUKS full-disk encryption:
- **LUKS**: Encrypts the entire disk partition. Must be unlocked at boot.
- **eCryptfs**: Encrypts the filesystem layer. Unlocked when you log in with your password.

eCryptfs stores encrypted files in a lower directory (`.Private` or a separate directory) and mounts the decrypted view over your home directory when you authenticate. Individual files are encrypted with their own keys, which are wrapped by your login passphrase.

## Installing eCryptfs Utilities

```bash
# Install eCryptfs userspace tools
sudo apt update
sudo apt install ecryptfs-utils -y

# Also install the migration tool if needed
sudo apt install rsync -y

# Verify the kernel module is available
modprobe ecryptfs
lsmod | grep ecryptfs
```

## Option 1: Encrypting During Ubuntu Installation

The cleanest approach is to enable home encryption during Ubuntu installation:

1. During installation, when creating your user account, check "Encrypt my home folder"
2. Ubuntu handles all the setup automatically
3. Your home directory will be encrypted on first boot

This is the recommended approach for new installations.

## Option 2: Setting Up eCryptfs on an Existing Home Directory

**Warning**: Always have a current backup before encrypting your home directory. If you lose your passphrase or the system fails during setup, data may be unrecoverable.

```bash
# First, ensure you have a backup
rsync -avz /home/username/ /backup/home-backup/

# You must run this as a different user or from a TTY console
# (not logged into the user account being encrypted)

# Log in as root or another admin user
sudo su -

# Migrate the home directory to eCryptfs
sudo ecryptfs-migrate-home -u username

# Follow the prompts:
# 1. You'll be shown a warning about backing up
# 2. Confirm you understand the risks
# 3. The tool copies your home directory to an encrypted location
```

After migration completes:

```bash
# Log out of root/admin
exit

# Log in as the encrypted user
# You should be prompted to record your mount passphrase

# CRITICAL: Record the mount passphrase
# Run this after logging in for the first time
ecryptfs-unwrap-passphrase ~/.ecryptfs/wrapped-passphrase
# Enter your login password when prompted
# Write down the displayed passphrase and store it OFFLINE
# This is the ACTUAL encryption passphrase - your login password is just a wrapper
```

## Option 3: Manual eCryptfs Setup

For more control over the setup:

```bash
# Create the encrypted data directory
mkdir -p /home/.ecryptfs/username/.Private
mkdir -p /home/.ecryptfs/username/.ecryptfs

# Create the mount point
mkdir -p /home/username

# Set up the passphrase
# Generate a random mount passphrase
PASSPHRASE=$(openssl rand -hex 16)
echo "Mount passphrase: $PASSPHRASE"
# SAVE THIS PASSPHRASE SECURELY

# Insert the passphrase into the kernel keyring
echo "$PASSPHRASE" | ecryptfs-add-passphrase --fnek

# Get the key signature (shown after adding passphrase)
KEY_SIG=$(keyctl list @u | grep -oP '(?<=\d: )[0-9a-f]+' | head -1)
echo "Key signature: $KEY_SIG"

# Mount eCryptfs manually
sudo mount -t ecryptfs \
    /home/.ecryptfs/username/.Private \
    /home/username \
    -o ecryptfs_sig=$KEY_SIG,ecryptfs_fnek_sig=$KEY_SIG,ecryptfs_cipher=aes,ecryptfs_key_bytes=16

# The directory is now mounted and encrypted files in .Private appear decrypted at /home/username
```

## Automating Mount with PAM

Ubuntu's standard eCryptfs setup uses PAM (Pluggable Authentication Modules) to automatically mount the home directory at login:

```bash
# Check if PAM eCryptfs module is configured
grep ecryptfs /etc/pam.d/common-auth
grep ecryptfs /etc/pam.d/common-session

# If not configured, add PAM integration
# For common-auth, add after the pam_unix.so line:
sudo tee -a /etc/pam.d/common-auth << 'EOF'
auth    optional        pam_ecryptfs.so unwrap
EOF

# For common-session:
sudo tee -a /etc/pam.d/common-session << 'EOF'
session optional        pam_ecryptfs.so unwrap
EOF

# For common-password (handles passphrase changes):
sudo tee -a /etc/pam.d/common-password << 'EOF'
password        optional        pam_ecryptfs.so
EOF
```

## Working with the Wrapped Passphrase

eCryptfs uses two passphrases:
1. **Mount passphrase**: The actual encryption key
2. **Login passphrase**: Your user password, used to "wrap" (encrypt) the mount passphrase

```bash
# After logging in, view your wrapped passphrase file
ls ~/.ecryptfs/

# Unwrap the mount passphrase (enter your login password when prompted)
ecryptfs-unwrap-passphrase ~/.ecryptfs/wrapped-passphrase
# OUTPUT: the raw 32-byte mount passphrase - SAVE THIS OFFLINE

# Re-wrap the passphrase with a new login password (after password change)
# This happens automatically if PAM is configured correctly
# If not, do it manually:
ecryptfs-rewrap-passphrase ~/.ecryptfs/wrapped-passphrase
```

## Recovering Data

If you need to access your encrypted data from another system (e.g., after system failure):

```bash
# Boot from Ubuntu live USB
# Mount the encrypted partition
sudo mkdir /mnt/recovery
sudo mount /dev/sda1 /mnt/recovery  # Replace with actual partition

# Access the encrypted directory
ENCRYPTED_DIR=/mnt/recovery/home/.ecryptfs/username/.Private
MOUNT_POINT=/mnt/decrypted
sudo mkdir -p "$MOUNT_POINT"

# Add the passphrase to keyring (enter the MOUNT PASSPHRASE, not login password)
ecryptfs-add-passphrase

# Mount with the key signature shown
KEY_SIG="your_key_signature_here"
sudo mount -t ecryptfs \
    "$ENCRYPTED_DIR" \
    "$MOUNT_POINT" \
    -o ecryptfs_sig=$KEY_SIG,ecryptfs_fnek_sig=$KEY_SIG,ecryptfs_cipher=aes,ecryptfs_key_bytes=16,ecryptfs_passthrough=n,ecryptfs_enable_filename_crypto=y

# Your files are now accessible in /mnt/decrypted
ls /mnt/decrypted
```

## The ecryptfs-recover-private Tool

Ubuntu provides a tool for home directory recovery:

```bash
# Recover private data (run from live USB)
sudo apt install ecryptfs-utils -y  # Install on live system

# Run the recovery tool
sudo ecryptfs-recover-private

# The tool will:
# 1. Find encrypted home directories
# 2. Ask for your login passphrase (or mount passphrase)
# 3. Mount the decrypted data to /tmp/ecryptfs.XXXXX/

# Your decrypted files will be at the shown path
```

## Checking eCryptfs Status

```bash
# Check if home is currently mounted with eCryptfs
mount | grep ecryptfs

# Check the mount options
mount | grep ecryptfs | tr ',' '\n'

# List eCryptfs configuration files
ls -la ~/.ecryptfs/

# Check the private directory (encrypted storage)
ls -la ~/.Private/

# Verify files are actually encrypted on disk
ls ~/.Private/ | head -5
# File names should look like random characters (encrypted filenames)
```

## Unmounting eCryptfs

```bash
# Unmount the encrypted home directory (normally done automatically at logout)
umount.ecryptfs_private

# Or manually
sudo umount /home/username

# After unmounting, ~/Private shows encrypted filenames
ls ~/Private/  # Shows encrypted file names
```

## Limitations and Considerations

**Performance**: eCryptfs adds CPU overhead for every file read/write. On modern systems with AES-NI hardware acceleration, this is minimal. On older hardware, you may notice slowdowns with I/O-intensive operations.

**Filename encryption**: eCryptfs encrypts filenames by default, which provides additional privacy but adds overhead. For backup tools that track filenames, this can cause issues.

**Not a replacement for LUKS**: eCryptfs protects files when the user is logged out. LUKS protects data when the machine is powered off or the disk is removed. For maximum security, use LUKS for full-disk encryption and eCryptfs adds per-user encryption on top.

**Swap encryption**: If your system uses swap, sensitive data from your eCryptfs-encrypted files may be written to unencrypted swap. Enable swap encryption or use an encrypted swap partition.

```bash
# Enable encrypted swap
sudo ecryptfs-setup-swap

# Or use cryptsetup for swap
# Add to /etc/crypttab:
# cryptswap1 /dev/sdX /dev/urandom swap,offset=1024,cipher=aes-xts-plain64
```

eCryptfs remains a practical option for home directory encryption on Ubuntu, particularly for existing installations where full-disk encryption wasn't set up during installation. For new deployments, LUKS full-disk encryption is generally preferred.
