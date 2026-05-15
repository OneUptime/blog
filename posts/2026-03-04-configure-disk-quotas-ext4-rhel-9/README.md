# How to Configure Disk Quotas on ext4 File Systems on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ext4, Quota, Storage, Linux

Description: Learn how to configure and manage user and group disk quotas on ext4 file systems in RHEL to control storage consumption and prevent disk space abuse.

---

Disk quotas on ext4 filesystems allow administrators to limit the amount of storage space and number of files that individual users and groups can consume. This guide covers the complete setup and management of ext4 quotas on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- An ext4 filesystem where you want to enable quotas
- The `quota` package installed

```bash
sudo dnf install quota -y
```

## Step 1: Enable Quota Support

For a new ext4 filesystem, enable quota support when you create it:

```bash
sudo mkfs.ext4 -O quota /dev/vg_data/lv_data
```

For an existing ext4 filesystem, unmount it and enable the quota feature with `tune2fs`:

```bash
sudo umount /data
sudo tune2fs -O quota /dev/vg_data/lv_data
sudo tune2fs -Q usrquota,grpquota /dev/vg_data/lv_data
```

Edit `/etc/fstab` to add quota mount options if you want enforcement enabled when the filesystem is mounted:

```bash
/dev/vg_data/lv_data /data ext4 defaults,usrquota,grpquota 0 2
```

Options:
- `usrquota`: Enable user quotas
- `grpquota`: Enable group quotas

Mount the filesystem:

```bash
sudo mount /data
```

Or remount without unmounting:

```bash
sudo mount -o remount /data
```

## Step 2: Verify Quota Support

Confirm that the ext4 quota feature is enabled:

```bash
sudo tune2fs -l /dev/vg_data/lv_data | grep -i quota
```

On RHEL 9, ext4 quotas use hidden quota inodes when the quota feature is enabled, so there are no visible `aquota.user` or `aquota.group` files to create with `quotacheck`.

## Step 3: Enable Quota Enforcement

Turn on quota checking:

```bash
sudo quotaon -ug /data
```

Verify:

```bash
sudo quotaon -p /data
```

## Step 4: Set User Quotas

Edit quotas for a user:

```bash
sudo edquota -u user1
```

This opens an editor showing:

```bash
Disk quotas for user user1 (uid 1001):
  Filesystem    blocks    soft      hard    inodes    soft    hard
  /dev/mapper/vg_data-lv_data    0    5242880    6291456    0    10000    12000
```

Set the values:
- **blocks soft**: Soft block limit in KB (5242880 KB = 5 GB)
- **blocks hard**: Hard block limit in KB (6291456 KB = 6 GB)
- **inodes soft**: Soft file count limit
- **inodes hard**: Hard file count limit

### Set Quotas Non-Interactively

```bash
sudo setquota -u user1 5242880 6291456 10000 12000 /data
```

Arguments: `softblock hardblock softinode hardinode filesystem`

### Copy Quotas Between Users

Apply the same quota settings from one user to another:

```bash
sudo edquota -p user1 user2 user3
```

## Step 5: Set Group Quotas

```bash
sudo edquota -g developers
```

Or non-interactively:

```bash
sudo setquota -g developers 20971520 26214400 50000 60000 /data
```

## Step 6: Configure the Grace Period

Set the grace period for exceeding soft limits:

```bash
sudo edquota -t
```

This opens an editor:

```bash
Grace period before enforcing soft limits for users:
Time units may be: days, hours, minutes, or seconds
  Filesystem    Block grace period    Inode grace period
  /dev/mapper/vg_data-lv_data    7days    7days
```

## Step 7: Monitor Quota Usage

### User Quota Report

```bash
sudo repquota -u /data
```

Sample output:

```bash
                        Block limits                File limits
User            used    soft    hard  grace    used  soft  hard  grace
----------------------------------------------------------------------
root      --      20       0       0              2     0     0
user1     --  2097152 5242880 6291456           4500 10000 12000
user2     +- 5500000 5242880 6291456  6days    8000 10000 12000
```

The `+-` indicates user2 has exceeded the soft block limit and is in the grace period.

### Group Quota Report

```bash
sudo repquota -g /data
```

### All Quotas

```bash
sudo repquota -aug
```

### Individual User Check

Users can check their own quotas:

```bash
quota -u user1
```

## Step 8: Refresh Quota Enforcement

If you need to temporarily stop and restart quota enforcement:

```bash
sudo quotaoff -ug /data
sudo quotaon -ug /data
```

With the ext4 quota feature enabled, quota usage is stored in hidden system inodes and kept consistent by the filesystem, so `quotacheck` is not normally needed.

## Step 9: Disable Quotas

Turn off quota enforcement:

```bash
sudo quotaoff -ug /data
```

Remove quota mount options from `/etc/fstab` if you want to disable permanently.

## Step 10: Warn Users Approaching Limits

Create a script to notify users:

```bash
sudo tee /usr/local/bin/quota-warn.sh << 'SCRIPT'
#!/bin/bash
FILESYSTEM="/data"
THRESHOLD=80

repquota -u "$FILESYSTEM" | tail -n +5 | while read line; do
    user=$(echo "$line" | awk '{print $1}')
    used=$(echo "$line" | awk '{print $3}')
    hard=$(echo "$line" | awk '{print $5}')

    if [ "$hard" -gt 0 ] && [ "$used" -gt 0 ]; then
        percent=$((used * 100 / hard))
        if [ "$percent" -ge "$THRESHOLD" ]; then
            echo "User $user is at ${percent}% of quota on $FILESYSTEM" | \
              logger -t quota-warn
        fi
    fi
done
SCRIPT
sudo chmod +x /usr/local/bin/quota-warn.sh
```

Schedule with cron:

```bash
echo '0 9 * * * root /usr/local/bin/quota-warn.sh' | sudo tee /etc/cron.d/quota-warn
```

## Quota Commands Reference

| Command | Purpose |
|---------|---------|
| `quotaon` | Enable quota enforcement |
| `quotaoff` | Disable quota enforcement |
| `edquota` | Edit quota limits interactively |
| `setquota` | Set quota limits from command line |
| `repquota` | Generate quota reports |
| `quota` | Show quota for current user |
| `quotacheck` | Scan filesystem and update visible quota files on filesystems that use them |
| `warnquota` | Send warning emails to over-quota users |

## Best Practices

- **Test quotas with a non-critical user first** before applying to all users.
- **Set soft limits below hard limits** to give users a warning period.
- **Use the ext4 quota feature on RHEL 9** instead of maintaining visible quota files manually.
- **Monitor grace period expirations** to catch users who consistently exceed soft limits.
- **Communicate quota policies** to users before enabling enforcement.

## Conclusion

ext4 disk quotas on RHEL provide effective storage consumption control through user and group limits. With support for soft and hard limits, grace periods, and comprehensive reporting through `repquota`, administrators can prevent individual users from monopolizing shared storage while giving users reasonable flexibility through soft limit grace periods.
