# How to Rebuild the Initramfs After Kernel Module Changes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, dracut, initramfs, Kernel Modules, Boot, Linux

Description: Learn when and how to rebuild the initramfs on RHEL after installing, removing, or updating kernel modules to ensure bootability.

---

Every time you install a new kernel module that is needed during early boot, update a storage driver, or change DKMS-managed modules, you need to rebuild the initramfs. Forgetting this step is one of the most common causes of boot failures on RHEL. This guide covers when rebuilding is necessary and how to do it safely.

## When to Rebuild the Initramfs

You must rebuild the initramfs when:

- You install or update storage controller drivers (SCSI, NVMe, RAID)
- You add DKMS modules needed at boot time
- You change LVM, LUKS, or multipath configuration
- You modify dracut configuration files
- You install firmware for boot-critical hardware
- You change the root filesystem type

You do NOT need to rebuild when:

- You install modules loaded after boot (sound, USB peripherals, WiFi cards that are not boot-critical)
- You update userspace applications
- You change network configuration (unless using network boot)

## The Standard Rebuild Process

```bash
# Rebuild the initramfs for the currently running kernel
sudo dracut --force

# The --force flag is required when the initramfs file already exists
# Without it, dracut refuses to overwrite

# Rebuild for a specific kernel version
sudo dracut --force /boot/initramfs-5.14.0-362.24.1.el9_3.x86_64.img 5.14.0-362.24.1.el9_3.x86_64

# Rebuild all initramfs images for all installed kernels
for kver in $(ls /lib/modules/); do
    echo "Rebuilding initramfs for $kver..."
    sudo dracut --force /boot/initramfs-${kver}.img "$kver"
done
```

## Safe Rebuild with Backup

```bash
# Always back up the current initramfs before rebuilding
KVER=$(uname -r)
sudo cp /boot/initramfs-${KVER}.img /boot/initramfs-${KVER}.img.bak

# Rebuild
sudo dracut --force

# Verify the new image is valid
lsinitrd /boot/initramfs-${KVER}.img > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Initramfs rebuild successful"
else
    echo "Initramfs appears corrupt, restoring backup"
    sudo cp /boot/initramfs-${KVER}.img.bak /boot/initramfs-${KVER}.img
fi
```

## Rebuilding After DKMS Module Changes

```bash
# When DKMS builds a new module, it should rebuild the initramfs automatically
# if REMAKE_INITRD=yes is set in dkms.conf

# Check the DKMS module status
dkms status

# If the initramfs was not rebuilt automatically, do it manually
sudo dkms install -m module_name -v 1.0 --force
sudo dracut --force

# Verify the DKMS module is in the initramfs
lsinitrd /boot/initramfs-$(uname -r).img | grep module_name
```

## Rebuilding After Storage Configuration Changes

```bash
# After adding new LVM or multipath configuration
sudo dracut --force

# After changing LUKS encryption settings
# Make sure cryptsetup is in the initramfs
lsinitrd /boot/initramfs-$(uname -r).img | grep cryptsetup
sudo dracut --force --add crypt

# After changing from ext4 to XFS or vice versa
# The filesystem module must be in the initramfs
sudo dracut --force
lsinitrd /boot/initramfs-$(uname -r).img | grep -E "xfs|ext4"
```

## Verifying the Rebuilt Initramfs

```bash
# List all files in the initramfs
lsinitrd /boot/initramfs-$(uname -r).img

# Check for specific kernel modules
lsinitrd /boot/initramfs-$(uname -r).img | grep "\.ko"

# Compare the old and new initramfs
diff <(lsinitrd /boot/initramfs-$(uname -r).img.bak 2>/dev/null) \
     <(lsinitrd /boot/initramfs-$(uname -r).img 2>/dev/null)

# Check the file size - a dramatically smaller image might be missing modules
ls -lh /boot/initramfs-$(uname -r).img /boot/initramfs-$(uname -r).img.bak
```

## Automating Initramfs Rebuilds

```bash
# Create a script that rebuilds the initramfs and validates it
cat <<'EOF' | sudo tee /usr/local/bin/safe-dracut-rebuild.sh
#!/bin/bash
# safe-dracut-rebuild.sh - Rebuild initramfs with safety checks

KVER="${1:-$(uname -r)}"
IMG="/boot/initramfs-${KVER}.img"
BACKUP="${IMG}.bak"

echo "Rebuilding initramfs for kernel $KVER"

# Back up current image
if [ -f "$IMG" ]; then
    cp "$IMG" "$BACKUP"
    echo "Backed up to $BACKUP"
fi

# Rebuild
dracut --force "$IMG" "$KVER" 2>&1
RC=$?

if [ $RC -ne 0 ]; then
    echo "ERROR: dracut failed with exit code $RC"
    if [ -f "$BACKUP" ]; then
        cp "$BACKUP" "$IMG"
        echo "Restored backup"
    fi
    exit 1
fi

# Validate the new image
if ! lsinitrd "$IMG" > /dev/null 2>&1; then
    echo "ERROR: New initramfs appears corrupt"
    if [ -f "$BACKUP" ]; then
        cp "$BACKUP" "$IMG"
        echo "Restored backup"
    fi
    exit 1
fi

# Check that essential modules are present
ESSENTIAL_MODULES="xfs dm_mod"
for mod in $ESSENTIAL_MODULES; do
    if ! lsinitrd "$IMG" | grep -q "$mod"; then
        echo "WARNING: Essential module $mod not found in initramfs"
    fi
done

echo "Initramfs rebuild complete and validated"
EOF

sudo chmod +x /usr/local/bin/safe-dracut-rebuild.sh
```

## Conclusion

Rebuilding the initramfs is a critical maintenance task on RHEL that should never be skipped after kernel module changes that affect boot. The process itself is simple, but the consequences of getting it wrong -- a system that will not boot -- are severe. Always back up the current initramfs before rebuilding, verify the new image contains the expected modules, and keep a rescue image or rescue media available as a safety net.
