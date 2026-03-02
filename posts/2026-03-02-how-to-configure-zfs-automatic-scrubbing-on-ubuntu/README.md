# How to Configure ZFS Automatic Scrubbing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ZFS, Storage, Data Integrity, Linux

Description: Configure and schedule ZFS scrubs on Ubuntu to detect and repair data corruption automatically, ensuring long-term storage integrity on your pools.

---

A ZFS scrub reads every block in a pool, verifies it against the stored checksum, and repairs any corruption it finds using redundant copies (if available). Scrubbing is how ZFS catches silent data corruption - bit rot, firmware bugs, cosmic ray bit flips, and other forms of corruption that don't cause immediate errors but silently corrupt data.

Running scrubs regularly is not optional if you care about data integrity. Most ZFS best practice guides recommend monthly scrubs for general use, or weekly for systems with data that changes frequently.

## Understanding ZFS Data Integrity

ZFS writes a cryptographic checksum with every block of data. When ZFS reads data, it verifies the checksum. If the data doesn't match its checksum:

1. ZFS detects the error
2. If redundancy is available (mirror, RAIDZ), ZFS reads the good copy from another disk
3. ZFS writes the corrected data back to the corrupted location (self-healing)
4. The error is logged in pool statistics

Without scrubbing, corruption is only detected when data is read. A file you haven't accessed in months could be corrupted without your knowledge. Scrubbing proactively reads everything.

## Running a Manual Scrub

```bash
# Start a scrub on the 'tank' pool
sudo zpool scrub tank
```

The scrub runs in the background. Check progress:

```bash
sudo zpool status tank
```

During a scrub, the status shows:

```
  pool: tank
 state: ONLINE
  scan: scrub in progress since Mon Mar  2 02:00:02 2026
        5.72T scanned at 1.92G/s, 2.18T issued at 733M/s, 22.4T total
        0 repaired, 32.51% done, 00:21:13 to go
config:

        NAME        STATE     READ WRITE CKSUM
        tank        ONLINE       0     0     0
          mirror-0  ONLINE       0     0     0
            sdb     ONLINE       0     0     0
            sdc     ONLINE       0     0     0
```

After completion:

```
  scan: scrub repaired 0 in 00:45:23 with 0 errors on Mon Mar  2 02:45:23 2026
```

### Stop a running scrub

```bash
sudo zpool scrub -s tank
```

## Checking Scrub Results

After a scrub completes, check for errors:

```bash
sudo zpool status -v tank
```

If errors were found and repaired:

```
  scan: scrub repaired 128K in 01:23:45 with 0 errors on Mon Mar  2 03:23:45 2026
```

If unrepaired errors exist (only possible when there's no redundancy to repair from):

```
  scan: scrub repaired 0 in 01:23:45 with 3 errors on Mon Mar  2 03:23:45 2026
```

Look at the per-device error counts:

```
        NAME        STATE     READ WRITE CKSUM
        tank        ONLINE       0     0     3
          sdb       ONLINE       0     0     3
```

The `CKSUM` column shows checksum errors - data read from the disk that doesn't match its checksum.

## Configuring Automatic Scrubs on Ubuntu

Ubuntu with the `zfsutils-linux` package includes systemd timers for automatic scrubbing.

### Check existing ZFS timers

```bash
sudo systemctl list-timers | grep zfs
```

```
Mon 2026-03-16 00:00:00 UTC  13d 22h left  Mon 2026-03-02 01:00:00 UTC  -   zfs-scrub-monthly@tank.timer
```

By default, Ubuntu configures monthly scrubs via systemd timers when you create a pool.

### Check timer status

```bash
sudo systemctl status zfs-scrub-monthly@tank.timer
```

```
zfs-scrub-monthly@tank.timer - Monthly zpool scrub for tank
     Loaded: loaded (/lib/systemd/system/zfs-scrub-monthly@.timer; enabled; vendor preset: enabled)
     Active: active (waiting) since Mon 2026-03-02 00:00:00 UTC; 1 month 2 days ago
    Trigger: Tue 2026-04-01 00:27:17 UTC; 13 days left
   Triggers: zfs-scrub-monthly@tank.service
```

If the timer is not enabled:

```bash
# Enable and start the monthly scrub timer for your pool
sudo systemctl enable --now zfs-scrub-monthly@tank.timer
```

### View what the timer runs

```bash
cat /lib/systemd/system/zfs-scrub-monthly@.timer
```

```ini
[Unit]
Description=Monthly zpool scrub for %i

[Timer]
OnCalendar=monthly
AccuracySec=1h
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
cat /lib/systemd/system/zfs-scrub-monthly@.service
```

```ini
[Unit]
Description=Monthly zpool scrub for %i
ConditionACPower=true

[Service]
Type=oneshot
Nice=19
IOSchedulingClass=idle
ExecStart=/sbin/zpool scrub %i
ExecStop=/sbin/zpool scrub -s %i
```

Note the `Nice=19` and `IOSchedulingClass=idle` - scrubs run at the lowest priority to minimize impact on the system.

## Custom Scrub Schedule with Cron

If you want more control over timing (e.g., weekly scrubs):

```bash
sudo nano /etc/cron.d/zfs-scrub
```

```bash
# Weekly ZFS scrub - every Sunday at 1 AM
0 1 * * 0 root /sbin/zpool scrub tank

# Monthly for a larger second pool
0 2 1 * * root /sbin/zpool scrub backup_pool
```

### Multiple pools

```bash
# Stagger scrubs to avoid simultaneous I/O load
0 1 * * 0 root /sbin/zpool scrub pool1
0 1 * * 3 root /sbin/zpool scrub pool2  # Different day
```

## Creating a Scrub Monitor Script

A simple script to check scrub results and alert on errors:

```bash
sudo nano /usr/local/bin/check-zfs-scrub.sh
```

```bash
#!/bin/bash
# Check ZFS scrub results and report errors

ALERT_EMAIL="admin@example.com"
POOLS=$(zpool list -H -o name)
ERROR_FOUND=0

for pool in $POOLS; do
    STATUS=$(zpool status "$pool")

    # Extract error counts
    READ_ERR=$(echo "$STATUS" | awk '/errors:/{print $0}' | grep -v "No known data errors" | wc -l)
    CKSUM_ERR=$(echo "$STATUS" | awk 'NR>7{sum+=$5} END{print sum+0}')

    if [ "$CKSUM_ERR" -gt 0 ] || [ "$READ_ERR" -gt 0 ]; then
        ERROR_FOUND=1
        echo "ZFS pool $pool has errors:"
        echo "$STATUS"
        echo "---"
    fi

    # Check if last scrub found errors
    SCRUB_ERRORS=$(echo "$STATUS" | grep "scrub repaired" | grep -v "with 0 errors")
    if [ -n "$SCRUB_ERRORS" ]; then
        echo "Scrub errors in pool $pool: $SCRUB_ERRORS"
        ERROR_FOUND=1
    fi
done

if [ "$ERROR_FOUND" -eq 1 ]; then
    # Send alert (adjust to your alerting method)
    echo "ZFS errors detected on $(hostname) at $(date)" | \
        mail -s "ZFS Health Alert: $(hostname)" "$ALERT_EMAIL"
    exit 1
fi

echo "All ZFS pools healthy."
exit 0
```

```bash
sudo chmod +x /usr/local/bin/check-zfs-scrub.sh

# Run after each weekly scrub
sudo nano /etc/cron.d/zfs-scrub
```

```bash
# Weekly scrub Sunday 1 AM
0 1 * * 0 root /sbin/zpool scrub tank

# Check results Sunday 3 AM (allow 2 hours for scrub)
0 3 * * 0 root /usr/local/bin/check-zfs-scrub.sh
```

## Interpreting Scrub Output

### Healthy pool after scrub

```
scan: scrub repaired 0 in 02:13:47 with 0 errors on Sun Mar  1 03:13:47 2026
```

Nothing was repaired, no errors remain.

### Data was repaired

```
scan: scrub repaired 4.50K in 02:13:47 with 0 errors on Sun Mar  1 03:13:47 2026
```

Some data was corrupted and repaired from a redundant copy. The pool is healthy but investigate which disk has errors (`zpool status -v`). A disk showing consistent checksum errors may be failing.

### Unrecoverable errors

```
scan: scrub repaired 0 in 02:13:47 with 5 errors on Sun Mar  1 03:13:47 2026
```

Corruption was found but could not be repaired (no redundant copy available, or multiple copies were corrupted). This requires investigation and data restoration from backup.

### Clear error counters after investigation

```bash
# After addressing the underlying issue, clear error counters
sudo zpool clear tank
```

## Scrub Performance Impact

Scrubs have low priority but do consume disk I/O. For large pools, monitor during the first scrub:

```bash
# Watch I/O while scrubbing
iostat -x 2

# See scrub speed
sudo zpool status tank | grep "scanned at"
```

Typical scrub speeds:
- Spinning disks: 100-200 MB/s
- SSD: 500MB/s to 1GB/s+

For a 10TB pool on spinning disks, expect 12-24 hours for a full scrub.

If scrubs are impacting production too much, delay them rather than disable them entirely. Monthly scrubs on non-critical data and weekly scrubs on frequently-changed datasets is a reasonable minimum.
