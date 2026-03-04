# How to Fix 'XFS Metadata I/O Error' and Recover a Corrupted XFS Filesystem on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting, XFS

Description: Step-by-step guide on fix 'xfs metadata i/o error' and recover a corrupted xfs filesystem on rhel with practical examples and commands.

---

XFS metadata I/O errors indicate filesystem corruption or disk failure on RHEL 9. Here is how to diagnose and recover.

## Identify the Error

Check kernel messages:

```bash
sudo dmesg | grep -i "xfs\|I/O error"
sudo journalctl -k | grep -i xfs
```

## Check Disk Health

```bash
sudo smartctl -a /dev/sda
sudo smartctl -t short /dev/sda
```

## Unmount the Filesystem

```bash
sudo umount /mnt/data
```

If the filesystem will not unmount:

```bash
sudo fuser -mv /mnt/data
sudo umount -l /mnt/data
```

## Run xfs_repair

```bash
# Check only (no changes)
sudo xfs_repair -n /dev/sda1

# Repair the filesystem
sudo xfs_repair /dev/sda1
```

If xfs_repair reports a dirty log:

```bash
sudo xfs_repair -L /dev/sda1
```

Warning: The -L flag destroys the log, which may cause some data loss.

## Recover from Severe Corruption

```bash
# Force reconstruction of free space and inode trees
sudo xfs_repair -o force_geometry /dev/sda1
```

## Check for Underlying LVM Issues

```bash
sudo lvs
sudo pvck /dev/sdb
sudo vgck my_vg
```

## Prevent Future Corruption

```bash
# Monitor disk health regularly
sudo smartctl -H /dev/sda

# Set up SMART monitoring
sudo dnf install -y smartmontools
sudo systemctl enable --now smartd
```

## Restore from Backup

If repair fails, restore from backup:

```bash
sudo mkfs.xfs -f /dev/sda1
sudo mount /dev/sda1 /mnt/data
sudo xfsrestore -f /backup/data.dump /mnt/data
```

## Conclusion

XFS metadata I/O errors on RHEL 9 often indicate hardware problems. Always check disk health first, then attempt repair with xfs_repair. Maintain regular backups and monitor disk health proactively.

