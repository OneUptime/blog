# How to Store journald Logs on a Separate Disk on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, Journald, System Administration, Storage

Description: Learn how to move journald log storage to a dedicated disk on Ubuntu to prevent root filesystem exhaustion and improve log management.

---

System logs can grow fast. On busy servers running web apps, databases, or container workloads, journald can consume gigabytes of space within days. If that space comes from the root filesystem, you risk crashing the entire system when it fills up. Moving journald logs to a separate disk is a straightforward way to isolate that risk and keep your system healthy.

## Why Store Logs on a Separate Disk

When journald writes to `/var/log/journal`, it shares space with everything else on that partition. A log storm triggered by a misbehaving service can fill the disk and cause all manner of problems: failed SSH logins, write errors in databases, service crashes. By pointing journald at a dedicated mount, the log volume can fill without touching any other part of the system.

There are also performance benefits. Log writes are sequential and high-frequency. Putting them on a separate physical disk or volume reduces I/O contention with application data.

## Prepare the Disk

Assume a second disk appears as `/dev/sdb`. First, create a partition and filesystem.

```bash
# Check that the disk is visible
lsblk

# Create a partition table and partition
sudo parted /dev/sdb --script mklabel gpt mkpart primary ext4 0% 100%

# Format the partition
sudo mkfs.ext4 /dev/sdb1

# Label it for easy identification
sudo e2label /dev/sdb1 journald-logs
```

## Create the Mount Point

journald expects persistent logs to live under `/var/log/journal`. You can either mount the new disk directly at that path or create a subdirectory and symlink it. Mounting directly is simpler.

```bash
# Create the journal directory if it does not exist
sudo mkdir -p /var/log/journal

# Mount temporarily to test
sudo mount /dev/sdb1 /var/log/journal

# Verify the mount
df -h /var/log/journal
```

## Make the Mount Permanent

Get the UUID of the new partition so the mount survives reboots.

```bash
# Get the UUID
sudo blkid /dev/sdb1
```

The output will look something like this:

```text
/dev/sdb1: LABEL="journald-logs" UUID="a1b2c3d4-e5f6-7890-abcd-ef1234567890" TYPE="ext4"
```

Add an entry to `/etc/fstab`:

```bash
sudo nano /etc/fstab
```

```text
# journald log disk
UUID=a1b2c3d4-e5f6-7890-abcd-ef1234567890  /var/log/journal  ext4  defaults,noatime  0  2
```

The `noatime` option skips updating access timestamps on every read, which reduces unnecessary write I/O. The final `2` tells fsck to check this disk after the root filesystem.

Test that the fstab entry is valid before rebooting:

```bash
sudo mount -a
```

## Configure journald to Use the Mount

journald enables persistent logging automatically when `/var/log/journal` exists. However, it is worth confirming the configuration in `/etc/systemd/journald.conf`.

```bash
sudo nano /etc/systemd/journald.conf
```

Key settings to review:

```ini
[Journal]
# Persist logs to disk rather than keeping them in RAM only
Storage=persistent

# Maximum size the journal may use on disk
SystemMaxUse=20G

# Keep at least this much free on the filesystem
SystemKeepFree=1G

# Maximum size per individual journal file
SystemMaxFileSize=500M
```

`SystemMaxUse` caps total journal disk usage. Set this based on your disk size and retention requirements. `SystemKeepFree` tells journald to stop writing before the disk is completely full, which is a useful safety net.

After saving, restart journald:

```bash
sudo systemctl restart systemd-journald
```

## Set Correct Permissions

journald needs the right ownership on `/var/log/journal` to write files there.

```bash
# Set ownership to root with the systemd-journal group
sudo chown root:systemd-journal /var/log/journal

# Set permissions
sudo chmod 2755 /var/log/journal
```

The `2` in `2755` sets the setgid bit, which causes files created inside the directory to inherit the `systemd-journal` group. This allows members of that group to read logs without using sudo.

Verify that journald started writing to the new location:

```bash
# Check the mount
df -h /var/log/journal

# List journal files on the new disk
ls -lh /var/log/journal/
```

You should see a directory named after your machine ID containing `.journal` files.

## Check Journal Status

```bash
# Show storage statistics
sudo journalctl --disk-usage

# Verify active log files are on the new disk
sudo journalctl -n 20
```

If you see recent log entries, journald is writing to the new disk successfully.

## Migrate Existing Logs

If you had logs on the root filesystem before this change, they may still exist at `/run/log/journal` (volatile, lost on reboot) or a temporary location. You can export and re-import them, but for most setups it is simpler to let the old volatile logs expire naturally.

```bash
# Remove old volatile journal data if present
sudo rm -rf /run/log/journal/*

# Force journald to rotate and start fresh
sudo systemctl kill --kill-who=main --signal=SIGUSR2 systemd-journald
```

## Automate Disk Usage Monitoring

Monitoring the journal disk is important since journald respects `SystemMaxUse` but it is still good to have an alert if the disk gets unexpectedly full.

```bash
# Simple check script at /usr/local/bin/check-journal-disk.sh
cat << 'EOF' | sudo tee /usr/local/bin/check-journal-disk.sh
#!/bin/bash
THRESHOLD=80
USAGE=$(df /var/log/journal | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$USAGE" -gt "$THRESHOLD" ]; then
  echo "Journal disk usage is at ${USAGE}% on $(hostname)" | mail -s "Journal disk alert" admin@example.com
fi
EOF

sudo chmod +x /usr/local/bin/check-journal-disk.sh

# Run it hourly via cron
echo "0 * * * * root /usr/local/bin/check-journal-disk.sh" | sudo tee /etc/cron.d/check-journal-disk
```

## Verify Everything Works After Reboot

```bash
# Reboot to confirm the mount comes up automatically
sudo reboot

# After reboot, confirm the disk is mounted
mount | grep journal

# Check journald status
sudo systemctl status systemd-journald

# View recent logs
sudo journalctl -n 50
```

If the mount is missing after reboot, double-check the UUID in `/etc/fstab` against the output of `blkid`. A typo in the UUID is the most common cause of fstab mount failures.

Keeping journald on its own disk is a straightforward hardening step that pays off the first time a service goes into a log storm. The setup takes less than 15 minutes and prevents a class of failures that are painful to debug mid-incident.
