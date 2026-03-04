# How to Configure Soft and Hard Quota Limits with Grace Periods on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Quotas, Grace Periods, Linux

Description: Understand and configure soft limits, hard limits, and grace periods for disk quotas on RHEL 9 to give users breathing room while keeping storage under control.

---

Quotas without grace periods are like speed cameras without warning signs - technically effective, but nobody is happy. The real power of Linux disk quotas comes from combining soft limits, hard limits, and grace periods into a system that gives users time to clean up before they get locked out.

## Understanding the Three-Part System

The quota system has three components that work together:

```mermaid
graph LR
    A[Usage Below Soft Limit] -->|User keeps writing| B[Usage Hits Soft Limit]
    B -->|Grace period starts| C[Grace Period Active]
    C -->|User cleans up| A
    C -->|Grace expires| D[Writes Blocked]
    B -->|Usage hits hard limit| E[Writes Blocked Immediately]
```

- **Soft limit** - A warning threshold. Users can exceed this, but a timer starts counting down.
- **Hard limit** - An absolute ceiling. Users can never exceed this, period.
- **Grace period** - The time window after exceeding the soft limit during which the user can still write. Once it expires, the soft limit becomes a hard limit.

## Practical Example

Say you set these values for a user:
- Soft limit: 10 GB
- Hard limit: 12 GB
- Grace period: 7 days

The user writes 10.5 GB on Monday. They have until the following Monday to get back under 10 GB. If they write 12 GB at any point, writes are blocked immediately regardless of the grace period.

## Setting Soft and Hard Limits on ext4

For ext4 filesystems using the standard quota tools:

```bash
# Set both soft and hard limits for a user
# Values are in kilobytes
# 10 GB soft = 10485760 KB, 12 GB hard = 12582912 KB
setquota -u jsmith 10485760 12582912 0 0 /home
```

The command format is:

```
setquota -u USERNAME BLOCK_SOFT BLOCK_HARD INODE_SOFT INODE_HARD FILESYSTEM
```

To also limit the number of files (inodes):

```bash
# 10 GB block limits, plus max 50000 files soft / 60000 hard
setquota -u jsmith 10485760 12582912 50000 60000 /home
```

## Setting Soft and Hard Limits on XFS

XFS uses its own `xfs_quota` tool:

```bash
# Set 10 GB soft and 12 GB hard block limits on XFS
xfs_quota -x -c 'limit bsoft=10g bhard=12g jsmith' /data
```

For inode limits:

```bash
# Set inode limits on XFS
xfs_quota -x -c 'limit isoft=50000 ihard=60000 jsmith' /data
```

## Configuring Grace Periods on ext4

Grace periods are set per filesystem, not per user. All users share the same grace period on a given filesystem.

Interactive method:

```bash
# Edit grace periods interactively
edquota -t
```

This opens an editor showing:

```
Grace period before enforcing soft limits for users:
Time units may be: days, hours, minutes, or seconds
  Filesystem     Block grace period     Inode grace period
  /dev/mapper/vg_data-lv_home     7days                  7days
```

Non-interactive method:

```bash
# Set grace period: 7 days for blocks, 7 days for inodes
# Values are in seconds: 7 days = 604800 seconds
setquota -t 604800 604800 /home
```

## Configuring Grace Periods on XFS

XFS handles grace periods through `xfs_quota`:

```bash
# Set a 7-day grace period for block usage
xfs_quota -x -c 'timer -u -b 7days' /data

# Set a 7-day grace period for inode usage
xfs_quota -x -c 'timer -u -i 7days' /data
```

For group quotas:

```bash
# Set grace period for group quotas
xfs_quota -x -c 'timer -g -b 7days' /data
```

## Choosing the Right Values

This is where experience matters. Here are some guidelines I have used over the years:

### For Developer Workstations

```bash
# Developers need room to work, so generous limits with a long grace period
setquota -u devuser 52428800 62914560 0 0 /home  # 50G soft, 60G hard
setquota -t 1209600 1209600 /home                 # 14-day grace period
```

### For Shared File Servers

```bash
# Tighter limits, shorter grace period to keep things clean
setquota -u fileuser 5242880 6291456 0 0 /shared  # 5G soft, 6G hard
setquota -t 259200 259200 /shared                  # 3-day grace period
```

### For Mail Servers

```bash
# Mail storage needs tight control
setquota -u mailuser 1048576 1153434 100000 120000 /var/mail  # 1G/1.1G, 100K/120K inodes
setquota -t 86400 86400 /var/mail                              # 1-day grace period
```

## Recommended Ratios

A good rule of thumb for the gap between soft and hard limits:

| Use Case | Soft-to-Hard Ratio | Grace Period |
|----------|-------------------|--------------|
| General use | Soft + 20% = Hard | 7 days |
| Development | Soft + 25% = Hard | 14 days |
| Production data | Soft + 10% = Hard | 3 days |
| Temporary storage | Soft + 10% = Hard | 1 day |

## Verifying Grace Period Configuration

On ext4:

```bash
# Check current grace periods
repquota -us /home | head -5
```

On XFS:

```bash
# Show timer settings
xfs_quota -x -c 'state' /data
```

## Checking Who Is in Grace Period

Find users who have exceeded their soft limit and are running on borrowed time:

```bash
# On ext4 - look for + signs in the report
repquota -us /home | grep '+'
```

```bash
# On XFS - check for users over soft limit
xfs_quota -x -c 'report -ubh' /data | awk '$2 ~ /\*/'
```

## What Happens When Grace Expires

When the grace period runs out and the user is still over the soft limit:

1. New write operations fail with `EDQUOT` (Disk quota exceeded)
2. The user cannot create new files
3. Existing files can still be read and deleted
4. The user must delete enough data to get below the soft limit
5. Once below the soft limit, normal access resumes

## Resetting Grace Periods

Sometimes you need to give a user more time. The only way to reset a grace period is to have the user drop below the soft limit momentarily:

```bash
# As root, temporarily raise the soft limit to reset the timer
# Then set it back
setquota -u jsmith 52428800 62914560 0 0 /home  # Raise soft limit
# User is now below soft limit, timer resets
setquota -u jsmith 10485760 12582912 0 0 /home  # Set back to normal
```

Or you can raise the user's limits permanently if they legitimately need more space.

## Summary

The soft limit, hard limit, and grace period combination gives you a flexible quota system. Soft limits warn users and start the clock. Hard limits are the safety net. Grace periods give people time to react. Set these values based on your environment: generous for developers, tight for shared resources. Monitor who is in grace period regularly, and adjust limits before users start filing tickets.
