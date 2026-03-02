# How to Configure Automatic Unlock of LUKS Drives at Boot on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LUKS, Encryption, Boot, Security

Description: Configure Ubuntu to automatically unlock LUKS encrypted drives at boot using keyfiles and crypttab, eliminating manual passphrase entry for secondary drives.

---

Manually unlocking LUKS encrypted drives every time a server reboots is fine for external or removable media, but it's impractical for secondary data disks on servers. If you have encrypted `/var`, `/data`, or any non-root volume, you need a way to unlock them automatically at boot so services that depend on those mount points can start properly.

This guide covers configuring automatic LUKS unlock using keyfiles, the `/etc/crypttab` file, and `/etc/fstab` on Ubuntu.

## The Approach: Keyfile-Based Auto-Unlock

The most practical method for server environments is a keyfile stored on the root filesystem. When the server boots:

1. The root partition mounts (it may have its own passphrase or be unencrypted)
2. The initramfs reads `/etc/crypttab` and unlocks any listed LUKS volumes using their keyfiles
3. Those volumes mount per `/etc/fstab`
4. Services start normally

The security assumption here is that if an attacker has physical access and can read your root filesystem, they already have access. The keyfile protects against the drive being removed and read elsewhere.

## Step 1: Create a Keyfile

Generate a random keyfile with strong entropy:

```bash
# Create a directory to store keyfiles (root-only access)
sudo mkdir -p /etc/luks-keys
sudo chmod 700 /etc/luks-keys

# Generate a 4096-byte random keyfile
sudo dd if=/dev/urandom of=/etc/luks-keys/data_drive.key bs=512 count=8

# Restrict permissions - root read only
sudo chmod 400 /etc/luks-keys/data_drive.key
```

Using `/dev/urandom` is appropriate here. The key is 4096 bytes (512 bytes x 8 blocks), which is far stronger than any passphrase.

## Step 2: Add the Keyfile to the LUKS Volume

Before the keyfile can unlock the volume, it must be registered as a valid key in one of the LUKS key slots. You'll need to authenticate with an existing passphrase first:

```bash
# Replace /dev/sdb with your actual device
sudo cryptsetup luksAddKey /dev/sdb /etc/luks-keys/data_drive.key
```

Enter your existing passphrase when prompted. After this, either the passphrase or the keyfile can unlock the volume.

Verify it worked:

```bash
# Test that the keyfile unlocks the device
sudo cryptsetup open --test-passphrase /dev/sdb --key-file /etc/luks-keys/data_drive.key && echo "Keyfile works"
```

## Step 3: Get the LUKS Volume UUID

You should reference volumes by UUID rather than device name (`/dev/sdb`), because device names can change between boots depending on the order drives are detected.

```bash
sudo cryptsetup luksDump /dev/sdb | grep UUID
# or
sudo blkid /dev/sdb
```

Note the UUID - it looks like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`.

## Step 4: Configure /etc/crypttab

`/etc/crypttab` tells the system which encrypted devices to unlock at boot and how to unlock them.

```bash
sudo nano /etc/crypttab
```

The format is: `<mapper-name> <device> <keyfile> <options>`

```
# /etc/crypttab - encrypted device configuration
# <name>       <device>                                    <keyfile>                          <options>
data_drive     UUID=a1b2c3d4-e5f6-7890-abcd-ef1234567890  /etc/luks-keys/data_drive.key      luks,discard
```

Options explained:
- `luks` - specifies LUKS format (required)
- `discard` - allows TRIM/discard commands to pass through (for SSDs; omit for HDDs or if you want to hide which sectors are used)
- `nofail` - if the device isn't present, don't fail boot (useful for removable drives)
- `noauto` - don't unlock automatically at boot (for drives you want to unlock manually)

### For a drive that may not always be present (external/removable)

```
backup_drive   UUID=b2c3d4e5-f6a7-8901-bcde-f12345678901  /etc/luks-keys/backup_drive.key   luks,nofail,noauto
```

## Step 5: Configure /etc/fstab

Once the LUKS mapping is set up in crypttab, add the filesystem mount to `/etc/fstab`. The device to mount is `/dev/mapper/<name>` where `<name>` matches what you put in crypttab.

First get the filesystem UUID of the unlocked volume (unlock it manually first if needed):

```bash
sudo cryptsetup open /dev/sdb data_drive --key-file /etc/luks-keys/data_drive.key
sudo blkid /dev/mapper/data_drive
```

Note the UUID of the mapper device (this is different from the LUKS device UUID).

Add to `/etc/fstab`:

```bash
sudo nano /etc/fstab
```

```
# /etc/fstab
# <filesystem>                             <mountpoint>  <type>  <options>           <dump>  <pass>
UUID=c3d4e5f6-a7b8-9012-cdef-123456789012  /data         ext4    defaults,nofail     0       2
```

The `nofail` option prevents a boot failure if the volume isn't available. Set `<pass>` to 2 (not 0 or 1) for non-root filesystems so `fsck` checks them after the root partition.

## Step 6: Test Without Rebooting

Before rebooting, test your configuration:

```bash
# Close the mapping if it's open
sudo umount /data 2>/dev/null
sudo cryptsetup close data_drive 2>/dev/null

# Test crypttab processing
sudo cryptdisks_start data_drive

# Test mounting
sudo mount /data

# Verify
df -h /data
```

If this works cleanly, the automatic unlock should work at boot.

## Step 7: Update initramfs

On Ubuntu, you need to update initramfs so the unlock configuration is embedded in the early boot process:

```bash
sudo update-initramfs -u -k all
```

This rebuilds the initramfs for all installed kernels, incorporating the crypttab configuration.

## Reboot and Verify

```bash
sudo reboot
```

After reboot, check that the volume was unlocked and mounted:

```bash
# Check mount
df -h /data
mount | grep data

# Check LUKS status
cryptsetup status data_drive

# Check system logs for any errors during unlock
journalctl -b | grep -i "crypt\|luks"
```

## Securing the Setup

### Verify keyfile permissions are correct

```bash
ls -la /etc/luks-keys/
# Should show: -r-------- root root data_drive.key
```

### Consider keeping the passphrase as a backup

Even with auto-unlock configured via keyfile, keep the original passphrase stored securely offline. If you ever need to recover from a system where the keyfile is inaccessible, you'll need it.

### Limit access to crypttab and the keyfile directory

```bash
# crypttab is readable by root only by default, verify this
ls -la /etc/crypttab
# Should be: -rw-r--r-- root root (world-readable is fine as it only contains config, not keys)

# The luks-keys directory must be root-only
chmod 700 /etc/luks-keys
chmod 400 /etc/luks-keys/*.key
```

## Troubleshooting Boot Failures

### Boot drops to emergency shell

If the system fails to mount an encrypted volume during boot, it may drop to a recovery shell. From there:

```bash
# Manually unlock the device
cryptsetup open /dev/sdb data_drive --key-file /etc/luks-keys/data_drive.key

# Mount the filesystem
mount /data

# Exit recovery
exit
```

Then investigate the logs once the system is up. Common issues: wrong UUID in crypttab, keyfile path error, or incorrect keyfile content.

### Check crypttab syntax

```bash
# Validate that cryptdisks can parse crypttab
sudo cryptdisks_start --all
```

### systemd unit for the crypto device

```bash
# Check status of the auto-generated systemd unit
systemctl status systemd-cryptsetup@data_drive.service
journalctl -u systemd-cryptsetup@data_drive.service
```

This setup is standard practice for encrypted data volumes on Ubuntu servers. The keyfile approach strikes a reasonable balance between security and operational convenience - drives are protected if removed from the server, while normal operations don't require manual intervention after each reboot.
