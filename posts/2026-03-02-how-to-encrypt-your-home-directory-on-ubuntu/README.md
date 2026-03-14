# How to Encrypt Your Home Directory on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Encryption, Privacy, ECryptfs

Description: Encrypt your home directory on Ubuntu using eCryptfs or migrate to full disk encryption, protecting personal data from unauthorized access with practical setup and migration procedures.

---

Encrypting your home directory protects personal files, SSH keys, credentials, and browsing history from unauthorized access if your laptop is lost or stolen. Ubuntu has supported home directory encryption via eCryptfs for many years, though full disk encryption (LUKS) is now the recommended approach for new installations.

This guide covers both: enabling eCryptfs-based home encryption on an existing unencrypted system, and understanding when full disk encryption is a better choice.

## Understanding Your Options

**eCryptfs (home directory encryption)**:
- Encrypts only `/home/username`
- Other parts of the disk (temporary files in `/tmp`, swap, application caches in `/var`) remain unencrypted
- Can be added to an existing installation without reinstalling
- Transparent to applications - files decrypt automatically on login

**LUKS full disk encryption**:
- Encrypts the entire disk including `/tmp`, swap, and application data
- Much stronger protection - no data leaks to unencrypted areas
- Requires setup at installation time or a live environment migration
- Ubuntu installer offers this as an option during setup

For maximum security, use full disk encryption. If you need to add encryption to an existing installation without reinstalling, eCryptfs is practical.

## Method 1: eCryptfs Home Directory Encryption

### Installing the Required Tools

```bash
sudo apt-get install -y ecryptfs-utils cryptsetup
```

### Encrypting a New User's Home Directory

The simplest approach is encrypting during user creation:

```bash
# Create a new user with an encrypted home directory
sudo useradd -m -s /bin/bash --encrypt-home username

# Set the user's password
sudo passwd username
```

### Encrypting an Existing User's Home Directory

This requires you to be logged in as a different user (not the user being encrypted), since you can't encrypt a home directory while it's in use:

```bash
# Log out of the account being encrypted
# Log in as a different user with sudo access, or use tty (Ctrl+Alt+F2)

# Ensure the target user is not logged in
who | grep username
# Should show no sessions for that user

# Encrypt the existing home directory
# This migrates the current files to an encrypted location
sudo ecryptfs-migrate-home -u username

# The migration backs up the original home directory as /home/username.random_suffix
# This backup is unencrypted - remove it after verifying encryption works:
ls /home/username*
# /home/username
# /home/username.XXXXXXXX  ← original unencrypted backup

# After verification:
# sudo rm -rf /home/username.XXXXXXXX
```

### First Login After Encryption

```bash
# Log in as the encrypted user
# You'll see the passphrase file notification:
# "Your encrypted private directory has been set up.
#  Passphrase: ..."

# IMPORTANT: Record the mount passphrase
# This is different from your login password
# You need it for recovery if the system fails to auto-mount

ecryptfs-unwrap-passphrase
# Enter your login password to view the mount passphrase
# Store this passphrase in a password manager or physical location
```

### Verifying Encryption is Active

```bash
# Check if the home directory is mounted via eCryptfs
mount | grep ecryptfs

# Example output:
# /home/.ecryptfs/username/.Private on /home/username type ecryptfs (rw,nosuid,nodev,relatime,...)

# When you're logged out, the files appear encrypted
# When logged in, they appear as normal files in your home directory

# Check where encrypted data is stored
ls /home/.ecryptfs/username/
# .Private/  ← encrypted file store
# .ecryptfs/ ← eCryptfs configuration
```

### Auto-Mount Configuration

eCryptfs can be configured to auto-mount on login via PAM:

```bash
# Check if PAM is configured for eCryptfs
grep ecryptfs /etc/pam.d/common-auth
grep ecryptfs /etc/pam.d/common-session

# If not configured, add eCryptfs PAM modules
# WARNING: PAM misconfiguration can prevent all logins - be careful
sudo nano /etc/pam.d/common-auth
```

Add before the `pam_deny.so` line:

```text
auth    optional        pam_ecryptfs.so unwrap
```

In `/etc/pam.d/common-session`, add:

```text
session optional        pam_ecryptfs.so unwrap
```

### Manually Mounting an Encrypted Home

If auto-mount fails or for recovery:

```bash
# Mount the encrypted home directory manually
sudo mount -t ecryptfs \
    /home/.ecryptfs/username/.Private \
    /home/username \
    -o ecryptfs_sig=<sig>,ecryptfs_cipher=aes,ecryptfs_key_bytes=16,ecryptfs_passthrough=n

# The sig comes from the passphrase - use ecryptfs-mount-private
sudo -u username ecryptfs-mount-private

# Or use the setup tool
ecryptfs-setup-private
```

## Method 2: Full Disk Encryption During Installation

This is the recommended approach for new Ubuntu installations. During the Ubuntu installer:

1. Select "Erase disk and install Ubuntu"
2. Check "Encrypt the new Ubuntu installation for security"
3. Set a strong encryption passphrase (this is the LUKS passphrase)
4. The installer configures LUKS + LVM automatically

### Verifying Full Disk Encryption

```bash
# Check if your disk is encrypted with LUKS
sudo cryptsetup status ubuntu-vg-ubuntu--lv

# Show LUKS header information
sudo cryptsetup luksDump /dev/sda3

# Check which devices are LUKS containers
lsblk -o NAME,FSTYPE,MOUNTPOINT | grep crypto
```

### Adding a Recovery Key to LUKS

LUKS supports multiple key slots. Add a backup key in case you forget the main passphrase:

```bash
# Add a second passphrase (key slot)
# This keeps the original passphrase AND adds a new one
sudo cryptsetup luksAddKey /dev/sda3

# Generate a random recovery key file
sudo dd if=/dev/urandom bs=32 count=1 | base64 > /tmp/recovery-key.txt
sudo cryptsetup luksAddKey /dev/sda3 /tmp/recovery-key.txt

# Store the recovery key file securely (USB drive, password manager)
# Then delete it from the system:
# sudo rm /tmp/recovery-key.txt

# View key slots (shows which are in use)
sudo cryptsetup luksDump /dev/sda3 | grep "Key Slot"
```

## Protecting Swap Space

Home directory encryption without swap encryption leaves a security gap - the kernel may write sensitive data from memory to the unencrypted swap partition:

```bash
# Check current swap configuration
swapon --show

# Option 1: Disable swap entirely (only practical if you have enough RAM)
sudo swapoff -a
sudo sed -i '/swap/d' /etc/fstab

# Option 2: Encrypt swap
# On Ubuntu with full disk encryption, swap is usually on the encrypted LVM
# Check:
lsblk
# If swap is on /dev/ubuntu-vg/swap (LVM), it's already inside the encrypted container

# Option 3: Create an encrypted swap file
sudo swapoff /dev/sda5  # Current swap partition
# Configure encrypted swap in /etc/crypttab
echo "cryptswap1 /dev/sda5 /dev/urandom swap,cipher=aes-xts-plain64" | sudo tee -a /etc/crypttab
# Update /etc/fstab to use the encrypted swap
sudo sed -i 's|/dev/sda5 none swap|/dev/mapper/cryptswap1 none swap|' /etc/fstab
sudo systemctl daemon-reload
sudo swapon -a
```

## eCryptfs Backup and Recovery

```bash
# Backup strategy for eCryptfs-encrypted home directory:
# Option 1: Back up the encrypted data (can restore without knowing passphrase)
sudo tar -czf /backup/home-encrypted-$(date +%Y%m%d).tar.gz /home/.ecryptfs/username/

# Option 2: Back up the decrypted data (while user is logged in)
rsync -av /home/username/ /backup/home-decrypted/

# Recovery: If you need to mount a backed-up encrypted home on another system
# Install ecryptfs-utils on the recovery system
# Mount using the passphrase:
sudo mount -t ecryptfs \
    /backup/home-encrypted/.Private \
    /mnt/recovered-home \
    -o key=passphrase:passphrase_passwd=<passphrase>
```

## Performance Considerations

eCryptfs adds encryption overhead to every file read/write:

```bash
# Benchmark eCryptfs overhead
# Test without encryption
dd if=/dev/zero of=/tmp/test-unencrypted bs=4M count=100 oflag=direct 2>&1 | tail -1

# Test inside encrypted home (while logged in as encrypted user)
dd if=/dev/zero of=~/test-encrypted bs=4M count=100 oflag=direct 2>&1 | tail -1

# Typical result: 10-30% overhead for eCryptfs on modern hardware
# For AES-NI capable CPUs (all modern CPUs), overhead is minimal (2-5%)

# Verify AES-NI is available
grep aes /proc/cpuinfo | head -1
# flags: ... aes ...
```

## Summary

Home directory encryption on Ubuntu provides meaningful protection for stolen laptops and unauthorized access scenarios:

- **eCryptfs**: Practical for adding encryption to existing installations, but doesn't protect temporary files or swap
- **LUKS full disk encryption**: Superior protection, configured at installation time, encrypts everything

For new installations, always choose full disk encryption in the Ubuntu installer. For existing systems, eCryptfs plus encrypted swap provides good protection with manageable complexity.

Critical operational requirements:
- Store the eCryptfs mount passphrase or LUKS recovery key outside the encrypted system
- Test that you can decrypt and access files using the recovery process before relying on it
- Include the encrypted home or LUKS container in your backup strategy
