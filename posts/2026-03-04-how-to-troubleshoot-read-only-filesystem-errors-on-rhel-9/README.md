# How to Troubleshoot 'Read-Only Filesystem' Errors on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting

Description: Step-by-step guide on troubleshoot 'read-only filesystem' errors on RHEL with practical examples and commands.

---

A read-only filesystem on RHEL prevents writes and indicates disk errors or mount issues. Here is how to troubleshoot and fix it.

## Check the Mount Status

```bash
mount | grep " / "
mount | grep "ro,"
```

## Check for Disk Errors

```bash
sudo dmesg | grep -i "error\|readonly\|read-only"
sudo journalctl -k | grep -i "error\|readonly"
```

## Check SMART Status

```bash
sudo smartctl -H /dev/sda
sudo smartctl -a /dev/sda
```

## Remount as Read-Write

```bash
sudo mount -o remount,rw /
```

For other partitions:

```bash
sudo mount -o remount,rw /dev/sda2 /var
```

## Run Filesystem Check

For XFS:

```bash
sudo umount /dev/sda2
sudo xfs_repair /dev/sda2
```

For ext4:

```bash
sudo umount /dev/sda2
sudo fsck -y /dev/sda2
```

If the root filesystem is affected, boot into rescue mode:

```bash
# From rescue mode
fsck -y /dev/sda2
# or
xfs_repair /dev/sda2
```

## Check fstab for Errors

```bash
cat /etc/fstab
```

Remove the `ro` option if present and it should be `rw`.

## Check LVM Health

```bash
sudo lvs
sudo pvs
sudo vgs
sudo lvchange -ay /dev/rhel/root
```

## Check for Full Filesystem

A full filesystem may cause read-only remount:

```bash
df -h
```

Free space if needed:

```bash
sudo find /var/log -name "*.gz" -delete
sudo journalctl --vacuum-size=200M
```

## Conclusion

Read-only filesystem errors on RHEL typically indicate hardware disk failure, filesystem corruption, or a full disk. Check SMART data, run filesystem repair, and investigate the root cause before remounting as read-write.

