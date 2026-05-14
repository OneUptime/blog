# How to Troubleshoot VDO Volume Recovery on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, Recovery, Troubleshooting, Storage, Linux

Description: Learn how to diagnose and recover VDO volumes on RHEL when they enter read-only mode, fail to start, or experience data corruption after unexpected shutdowns.

---

VDO volumes can require recovery after power failures, kernel panics, or storage hardware issues. RHEL normally performs VDO recovery automatically when the volume starts, but failed recovery or fatal errors can leave a volume in read-only mode. Understanding the recovery process helps minimize downtime.

## Common VDO Failure Symptoms

- Volume enters read-only mode
- VDO service fails to start
- I/O errors on the VDO device
- Volume not visible after reboot

## Checking VDO Volume Status

```bash
# Check if VDO volumes are running

sudo vdo list

# Get detailed status
sudo vdo status --name=vdo0

# Check for errors in the journal
sudo journalctl -u vdo --since "1 hour ago" | grep -iE "error|fail|warn"

# Check kernel messages for VDO/kvdo errors
sudo dmesg | grep -i vdo
```

## Recovering a VDO Volume in Read-Only Mode

When VDO cannot recover successfully or encounters a fatal internal error, it can switch to read-only mode to protect the volume from further writes:

```bash
# Check if the volume is in read-only mode
sudo vdo status --name=vdo0 | grep "Operating mode"
# Output: Operating mode: read-only

# Force an offline metadata rebuild only if the read-only state persists
sudo vdo stop --name=vdo0
sudo vdo start --name=vdo0 --forceRebuild

# The forceRebuild option rebuilds VDO metadata and can cause data loss
# This may take time depending on volume size
```

## Recovering After a Failed Start

```bash
# If vdo start fails, check the underlying device
sudo vdo status --name=vdo0 2>&1

# Verify the underlying block device is accessible
sudo dd if=/dev/sdb of=/dev/null bs=4k count=1

# If recovery fails and the volume remains read-only, try an offline rebuild
sudo vdo start --name=vdo0 --forceRebuild

# If that fails, check if the VDO config is intact
sudo cat /etc/vdoconf.yml
```

## Forcing an Offline Metadata Rebuild

If the volume remains in read-only mode and the risk of data loss is acceptable, force an offline metadata rebuild:

```bash
# Stop the VDO volume
sudo vdo stop --name=vdo0

# Start with a forced metadata rebuild
sudo vdo start --name=vdo0 --forceRebuild

# Monitor rebuild progress
sudo journalctl -u vdo -f
```

## Checking Filesystem After Recovery

```bash
# After VDO recovery, check the filesystem
sudo xfs_repair -n /dev/mapper/vdo0

# If errors are found, unmount and repair
sudo umount /mnt/vdo-mount
sudo xfs_repair /dev/mapper/vdo0
sudo mount /dev/mapper/vdo0 /mnt/vdo-mount
```

## Preventing Future Issues

```bash
# Ensure VDO service starts properly at boot
sudo systemctl enable vdo

# Set up monitoring to catch issues early
sudo vdostats --human-readable
```

Always maintain backups of data on VDO volumes. While the forceRebuild option can bring a read-only VDO volume back online, Red Hat warns that it might cause data loss and that the integrity of rebuilt data cannot be guaranteed.
