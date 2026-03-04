# How to Enable and Manage XFS Quotas on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, XFS, Quotas, Storage, Linux

Description: Learn how to enable and manage user and group disk quotas on XFS file systems in RHEL to control storage usage and prevent individual users from consuming excessive disk space.

---

Disk quotas allow administrators to limit how much storage space users and groups can consume on a filesystem. XFS has built-in quota support that is efficient and does not require a separate quota database file. This guide covers enabling and managing XFS quotas on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- An XFS filesystem where you want to enable quotas
- The `xfsprogs` package installed

## Understanding XFS Quota Types

XFS supports three types of quotas:

- **User quotas (`uquota`)**: Limit storage per user
- **Group quotas (`gquota`)**: Limit storage per group
- **Project quotas (`pquota`)**: Limit storage per directory tree (covered in a separate guide)

Each quota type has two limits:

- **Soft limit**: Can be temporarily exceeded during a grace period
- **Hard limit**: Cannot be exceeded under any circumstances

## Step 1: Enable Quotas via Mount Options

XFS quotas are enabled through mount options. Edit `/etc/fstab`:

```bash
sudo vi /etc/fstab
```

Add quota mount options to the relevant filesystem entry:

```bash
/dev/vg_data/lv_data /data xfs defaults,uquota,gquota 0 0
```

Available quota mount options:

| Option | Description |
|--------|-------------|
| `uquota` or `usrquota` | Enable user quotas |
| `gquota` or `grpquota` | Enable group quotas |
| `pquota` or `prjquota` | Enable project quotas |
| `uqnoenforce` | Track user usage without enforcing limits |
| `gqnoenforce` | Track group usage without enforcing limits |

Remount the filesystem to apply:

```bash
sudo umount /data
sudo mount /data
```

Or if the filesystem cannot be unmounted, a reboot is required.

Verify quotas are enabled:

```bash
mount | grep /data
```

You should see `usrquota,grpquota` in the mount options.

## Step 2: Check Current Quota Status

View the quota state:

```bash
sudo xfs_quota -x -c 'state' /data
```

Output shows which quota types are enabled and whether enforcement is active.

## Step 3: Set User Quotas

Use `xfs_quota` to set limits for users:

```bash
sudo xfs_quota -x -c 'limit bsoft=5g bhard=6g user1' /data
```

This sets:
- Soft block limit: 5 GB
- Hard block limit: 6 GB

You can also set inode (file count) limits:

```bash
sudo xfs_quota -x -c 'limit isoft=10000 ihard=12000 user1' /data
```

Set limits for multiple users:

```bash
sudo xfs_quota -x -c 'limit bsoft=5g bhard=6g user1 user2 user3' /data
```

## Step 4: Set Group Quotas

Set limits for a group:

```bash
sudo xfs_quota -x -c 'limit -g bsoft=20g bhard=25g developers' /data
```

The `-g` flag targets group quotas.

## Step 5: Set the Grace Period

The grace period determines how long a user can exceed the soft limit before it becomes enforced like a hard limit:

```bash
sudo xfs_quota -x -c 'timer -u 7d' /data
```

This sets a 7-day grace period for user quotas. For group quotas:

```bash
sudo xfs_quota -x -c 'timer -g 7d' /data
```

## Step 6: Monitor Quota Usage

### View User Quota Report

```bash
sudo xfs_quota -x -c 'report -u -h' /data
```

Sample output:

```bash
User quota on /data (/dev/mapper/vg_data-lv_data)
                        Blocks
User ID      Used   Soft   Hard Warn/Grace
---------- ---------------------------------
root            0      0      0  00 [------]
user1        3.2G     5G     6G  00 [------]
user2        5.1G     5G     6G  00 [6 days]
```

### View Group Quota Report

```bash
sudo xfs_quota -x -c 'report -g -h' /data
```

### View Individual User Quota

```bash
sudo xfs_quota -x -c 'quota -u user1' /data
```

### View Inode Usage

```bash
sudo xfs_quota -x -c 'report -u -i -h' /data
```

## Step 7: Modify Existing Quotas

Change a user's limits:

```bash
sudo xfs_quota -x -c 'limit bsoft=10g bhard=12g user1' /data
```

Remove quotas for a user (set limits to 0):

```bash
sudo xfs_quota -x -c 'limit bsoft=0 bhard=0 user1' /data
```

## Step 8: Enable Quota Enforcement

If quotas were mounted with `uqnoenforce` for monitoring only, enable enforcement:

Update `/etc/fstab` to change `uqnoenforce` to `uquota`, then remount:

```bash
sudo umount /data
sudo mount /data
```

## Step 9: Disable Quotas

To disable quota enforcement without losing quota data:

```bash
sudo xfs_quota -x -c 'disable -u' /data
```

To completely turn off quotas, change the mount options in `/etc/fstab` and remount:

```bash
/dev/vg_data/lv_data /data xfs defaults 0 0
```

```bash
sudo umount /data
sudo mount /data
```

## Automating Quota Reports

Create a script to email quota reports:

```bash
sudo tee /usr/local/bin/quota-report.sh << 'SCRIPT'
#!/bin/bash
REPORT=$(xfs_quota -x -c 'report -u -h' /data)
echo "$REPORT" | mail -s "Daily Quota Report - $(date +%Y-%m-%d)" admin@example.com
SCRIPT
sudo chmod +x /usr/local/bin/quota-report.sh
```

Schedule with cron:

```bash
echo '0 8 * * * root /usr/local/bin/quota-report.sh' | sudo tee /etc/cron.d/quota-report
```

## Best Practices

- **Start with monitoring mode** (`uqnoenforce`) to understand current usage patterns before enforcing limits.
- **Set the hard limit 10-20% above the soft limit** to give users some buffer.
- **Use group quotas** for shared project directories in addition to user quotas.
- **Monitor quota reports regularly** to identify users approaching their limits.
- **Communicate quota policies** to users before enabling enforcement.

## Conclusion

XFS quotas on RHEL provide efficient and integrated storage limit management. With support for user, group, and project quotas, soft and hard limits, and configurable grace periods, XFS quotas give administrators fine-grained control over storage consumption. The `xfs_quota` command provides a consistent interface for configuring, monitoring, and reporting on all quota types.
