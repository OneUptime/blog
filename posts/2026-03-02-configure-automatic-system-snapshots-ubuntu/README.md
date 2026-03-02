# How to Configure Automatic System Snapshots on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snapshot, Backup, Timeshift, System Administration

Description: Learn how to configure automatic system snapshots on Ubuntu using Timeshift and cron to protect your system and enable quick recovery from failures.

---

System snapshots are one of the most reliable ways to protect a Linux installation from configuration mistakes, failed upgrades, and software breakage. Unlike full backups, snapshots capture the state of the filesystem at a specific point in time and can be restored in minutes. This post walks through setting up automatic snapshots on Ubuntu using Timeshift - the most practical tool for this purpose on Ubuntu-based systems.

## Understanding Snapshot Approaches

Before jumping into configuration, it helps to understand the two main approaches available on Ubuntu:

- **rsync-based snapshots**: Timeshift's default mode. Uses hard links to create space-efficient point-in-time copies. Works on any filesystem (ext4, xfs, etc.).
- **Btrfs subvolume snapshots**: Near-instantaneous, very space-efficient. Requires the system to be on a Btrfs filesystem.

Most Ubuntu installations use ext4, so this guide focuses on the rsync approach. Btrfs snapshots are covered in a separate post.

## Installing Timeshift

Timeshift is available in Ubuntu's repositories from 20.04 onward:

```bash
sudo apt update
sudo apt install timeshift
```

Verify the installation:

```bash
timeshift --version
```

## Configuring Timeshift from the Command Line

Timeshift has both a GUI and a CLI. For servers and automated setups, the CLI is more useful.

### First-Time Setup

Run the initial setup to choose snapshot location and type:

```bash
sudo timeshift --setup
```

This creates a configuration file at `/etc/timeshift/timeshift.json`. You can also edit it directly:

```bash
sudo nano /etc/timeshift/timeshift.json
```

A typical configuration looks like this:

```json
{
  "backup_device_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "parent_device_uuid": "",
  "do_first_run": "false",
  "btrfs_mode": "false",
  "include_btrfs_home_for_backup": "false",
  "stop_cron_emails": "true",
  "btrfs_use_qgroup": "true",
  "schedule_monthly": "false",
  "schedule_weekly": "true",
  "schedule_daily": "true",
  "schedule_hourly": "false",
  "schedule_boot": "false",
  "count_monthly": "2",
  "count_weekly": "3",
  "count_daily": "5",
  "count_hourly": "6",
  "count_boot": "5",
  "exclude": [
    "/root/**",
    "/home/**"
  ],
  "exclude-apps": []
}
```

### Finding Your Device UUID

You need the UUID of the partition where snapshots will be stored:

```bash
# List all block devices with UUIDs
lsblk -f

# Or use blkid
sudo blkid
```

Copy the UUID of the target partition into the `backup_device_uuid` field in the config.

## Setting Up Snapshot Schedules

Timeshift's scheduling is handled through a cron job it installs automatically when the daemon is enabled. However, you can also manage it manually for more control.

### Enabling the Timeshift Cron Job

```bash
# Check if timeshift cron is set up
sudo cat /etc/cron.d/timeshift-hourly
sudo cat /etc/cron.d/timeshift-boot
```

If these files don't exist, enable scheduling through the config file as shown above and then create the snapshot:

```bash
sudo timeshift --create --comments "Initial snapshot" --tags D
```

Tags control retention:
- `O` - One-off (not automatically deleted)
- `B` - Boot
- `H` - Hourly
- `D` - Daily
- `W` - Weekly
- `M` - Monthly

### Manual Cron Schedule

For custom control, you can disable Timeshift's built-in scheduling and create your own cron jobs:

```bash
sudo crontab -e
```

Add entries like these:

```cron
# Daily snapshot at 2 AM
0 2 * * * /usr/bin/timeshift --create --comments "Daily auto-snapshot" --tags D >> /var/log/timeshift-cron.log 2>&1

# Weekly snapshot on Sundays at 1 AM
0 1 * * 0 /usr/bin/timeshift --create --comments "Weekly auto-snapshot" --tags W >> /var/log/timeshift-cron.log 2>&1

# Delete old snapshots (keep only the last 5 daily)
30 2 * * * /usr/bin/timeshift --delete-all --scripted >> /var/log/timeshift-cron.log 2>&1
```

## Automating Snapshots Before System Updates

One of the most valuable automation points is creating a snapshot before every `apt upgrade`. You can achieve this with a custom apt hook:

```bash
sudo nano /etc/apt/apt.conf.d/99timeshift-pre-upgrade
```

Add the following:

```
DPkg::Pre-Invoke { "timeshift --create --comments 'Before apt upgrade' --tags O --scripted >> /var/log/timeshift-apt.log 2>&1 || true"; };
```

This creates an on-demand snapshot tagged as one-off (not subject to automatic deletion) every time dpkg runs - which includes `apt install`, `apt upgrade`, and `apt dist-upgrade`.

## Listing and Restoring Snapshots

### List Available Snapshots

```bash
sudo timeshift --list
```

Output shows something like:

```
Num     Name                 Tags  Comments
------------------------------------------------------------------------------
0    >  2026-03-01_02-00-01  D     Daily auto-snapshot
1       2026-02-28_02-00-01  D     Daily auto-snapshot
2       2026-02-24_01-00-01  W     Weekly auto-snapshot
```

### Restore a Snapshot

```bash
# Restore the most recent snapshot
sudo timeshift --restore

# Restore a specific snapshot by name
sudo timeshift --restore --snapshot '2026-03-01_02-00-01'
```

For a scripted (non-interactive) restore:

```bash
sudo timeshift --restore --snapshot '2026-03-01_02-00-01' --scripted
```

Note: Restoring from a running system is possible, but rebooting into a live environment is safer for full system restores.

## Excluding Directories from Snapshots

By default, Timeshift excludes `/home` and `/root` to keep snapshot sizes manageable. You can customize exclusions in the config:

```json
"exclude": [
  "/root/**",
  "/home/**",
  "/var/cache/apt/**",
  "/tmp/**",
  "/var/tmp/**",
  "/var/log/**"
]
```

Excluding large or frequently-changing directories keeps snapshots small and fast.

## Monitoring Snapshot Health

Create a simple monitoring script:

```bash
sudo nano /usr/local/bin/check-snapshots.sh
```

```bash
#!/bin/bash
# Check if recent snapshots exist and send alert if not

SNAPSHOT_COUNT=$(timeshift --list 2>/dev/null | grep -c "^[0-9]")
MIN_SNAPSHOTS=1

if [ "$SNAPSHOT_COUNT" -lt "$MIN_SNAPSHOTS" ]; then
    echo "WARNING: Only $SNAPSHOT_COUNT snapshots found. Expected at least $MIN_SNAPSHOTS."
    # Add notification logic here (mail, curl to webhook, etc.)
    exit 1
fi

echo "Snapshot check passed: $SNAPSHOT_COUNT snapshots available."
exit 0
```

```bash
sudo chmod +x /usr/local/bin/check-snapshots.sh
```

Schedule the check via cron:

```cron
# Check snapshot health daily at 3 AM
0 3 * * * /usr/local/bin/check-snapshots.sh >> /var/log/snapshot-check.log 2>&1
```

## Storage Considerations

Snapshots take disk space. A few practical rules:

- Keep the snapshot partition separate from the root filesystem if possible
- Monitor with `df -h` or `sudo timeshift --list` to check disk usage
- Adjust `count_daily`, `count_weekly`, etc. in the config to balance protection vs. storage

For a typical server installation, keeping 3 daily and 2 weekly snapshots provides good coverage without consuming excessive space.

## Summary

Automatic system snapshots are a low-effort, high-value safety net for Ubuntu systems. Timeshift makes it straightforward to schedule regular snapshots, exclude unnecessary directories, and restore quickly when something goes wrong. Combined with pre-upgrade hooks, you get automatic protection around the riskiest operation in system maintenance - the upgrade cycle.

Once configured, snapshots run quietly in the background until you need them - at which point they can save hours of recovery work.
