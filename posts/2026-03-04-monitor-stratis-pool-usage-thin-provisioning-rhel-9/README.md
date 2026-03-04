# How to Monitor Stratis Pool Usage and Thin Provisioning on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Stratis, Monitoring, Thin Provisioning, Storage, Linux

Description: Learn how to monitor Stratis pool usage and understand thin provisioning behavior on RHEL to prevent pool exhaustion and ensure reliable storage operations.

---

Stratis uses thin provisioning by default, meaning filesystems can report more virtual space than the pool physically has. While this provides flexibility, it also requires careful monitoring to prevent pool exhaustion. This guide covers how to effectively monitor Stratis storage on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- Existing Stratis pools and filesystems
- Stratis daemon running

## Understanding Thin Provisioning in Stratis

When you create a Stratis filesystem, it reports a virtual size of 1 TiB regardless of the actual pool capacity. This means:

- A 50 GiB pool can have multiple filesystems, each reporting 1 TiB
- Only actual data written consumes pool space
- Stratis metadata and overhead consume some pool space
- If the pool runs out of physical space, all filesystems become read-only

This model requires proactive monitoring.

## Step 1: Monitor Pool Usage

### Pool-Level Overview

```bash
sudo stratis pool list
```

Output:

```
Name       Total / Used / Free           Properties   UUID   Alerts
datapool   100 GiB / 45 GiB / 55 GiB    ~Ca,~Cr      abc...
```

Key metrics:
- **Total**: Physical capacity of all data devices
- **Used**: Actual space consumed by data and metadata
- **Free**: Remaining physical space

### Detailed Pool Information

```bash
sudo stratis pool describe datapool
```

## Step 2: Monitor Filesystem Usage

### Stratis-Level View

```bash
sudo stratis filesystem list datapool
```

This shows each filesystem's used space from Stratis's perspective.

### Operating System View

```bash
df -h /documents /projects /backups
```

The `df` output shows the virtual 1 TiB size. The "Used" column reflects actual data on each filesystem.

### Comparing Views

The key difference:
- `stratis filesystem list` shows physical pool space consumed per filesystem
- `df` shows filesystem-level usage against the virtual 1 TiB size

Both are useful but serve different purposes.

## Step 3: Monitor Block Device Status

```bash
sudo stratis blockdev list
```

This shows each physical device, its pool membership, and tier (data or cache).

## Step 4: Check for Alerts

Stratis provides alerts when pools need attention:

```bash
sudo stratis pool list
```

The Alerts column may show warnings like pool space running low.

## Step 5: Set Up Automated Monitoring

### Basic Monitoring Script

```bash
sudo tee /usr/local/bin/stratis-monitor.sh << 'SCRIPT'
#!/bin/bash
WARNING_THRESHOLD=75
CRITICAL_THRESHOLD=90

stratis pool list --no-headers 2>/dev/null | while read line; do
    pool_name=$(echo "$line" | awk '{print $1}')
    total_raw=$(echo "$line" | awk '{print $2}')
    used_raw=$(echo "$line" | awk '{print $4}')

    # Extract numeric values (assumes GiB)
    total=$(echo "$total_raw" | sed 's/[^0-9.]//g')
    used=$(echo "$used_raw" | sed 's/[^0-9.]//g')

    if [ -n "$total" ] && [ -n "$used" ]; then
        percent=$(echo "$used $total" | awk '{printf "%.0f", ($1/$2)*100}')

        if [ "$percent" -ge "$CRITICAL_THRESHOLD" ]; then
            echo "CRITICAL: Stratis pool '$pool_name' is ${percent}% full (${used_raw}/${total_raw})" | \
              logger -t stratis-monitor -p user.crit
        elif [ "$percent" -ge "$WARNING_THRESHOLD" ]; then
            echo "WARNING: Stratis pool '$pool_name' is ${percent}% full (${used_raw}/${total_raw})" | \
              logger -t stratis-monitor -p user.warning
        fi
    fi
done
SCRIPT
sudo chmod +x /usr/local/bin/stratis-monitor.sh
```

Schedule with cron:

```bash
echo '*/10 * * * * root /usr/local/bin/stratis-monitor.sh' | sudo tee /etc/cron.d/stratis-monitor
```

### Using systemd Timer

```bash
sudo tee /etc/systemd/system/stratis-monitor.service << EOF
[Unit]
Description=Stratis Pool Usage Monitor

[Service]
Type=oneshot
ExecStart=/usr/local/bin/stratis-monitor.sh
EOF

sudo tee /etc/systemd/system/stratis-monitor.timer << EOF
[Unit]
Description=Check Stratis pool usage every 10 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=10min

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now stratis-monitor.timer
```

## Step 6: Understanding Pool Space Consumption

Pool space is consumed by:

1. **Filesystem data**: The actual data stored in filesystems
2. **Filesystem metadata**: XFS metadata for each filesystem
3. **Stratis metadata**: Internal management data
4. **Snapshot divergence**: As snapshots and their source diverge, both consume additional space

### Track Space Over Time

Create a logging script:

```bash
sudo tee /usr/local/bin/stratis-log-usage.sh << 'SCRIPT'
#!/bin/bash
LOG_FILE="/var/log/stratis-usage.csv"

if [ ! -f "$LOG_FILE" ]; then
    echo "timestamp,pool,total,used,free" > "$LOG_FILE"
fi

stratis pool list --no-headers 2>/dev/null | while read line; do
    pool=$(echo "$line" | awk '{print $1}')
    total=$(echo "$line" | awk '{print $2}')
    used=$(echo "$line" | awk '{print $4}')
    free=$(echo "$line" | awk '{print $6}')
    echo "$(date -Iseconds),$pool,$total,$used,$free" >> "$LOG_FILE"
done
SCRIPT
sudo chmod +x /usr/local/bin/stratis-log-usage.sh

echo '*/30 * * * * root /usr/local/bin/stratis-log-usage.sh' | sudo tee /etc/cron.d/stratis-usage-log
```

## Step 7: Respond to Pool Exhaustion

### Before Pool Fills Up

Add more storage:

```bash
sudo stratis pool add-data datapool /dev/sdd
```

Remove unnecessary snapshots:

```bash
sudo stratis filesystem destroy datapool old-snapshot
```

Delete unused filesystems:

```bash
sudo umount /unused
sudo stratis filesystem destroy datapool unused_fs
```

### If the Pool Becomes Full

When a pool is completely full:
1. Filesystems become read-only
2. No new data can be written
3. You must add storage to recover

```bash
# Add a new device to restore write capability
sudo stratis pool add-data datapool /dev/sde
```

After adding space, filesystems should become writable again.

## Best Practices

- **Set alerts at 75% and 90%**: Give yourself time to respond before reaching capacity.
- **Monitor daily**: Check pool usage as part of your daily system health review.
- **Plan for growth**: Anticipate storage needs and keep spare devices ready.
- **Clean up snapshots**: Old snapshots consume space. Delete them when no longer needed.
- **Do not overcommit excessively**: While thin provisioning allows overcommitment, keep the total data stored well within physical capacity.
- **Document pool configurations**: Record which devices are in which pools and their intended purpose.

## Conclusion

Monitoring Stratis pool usage is critical because thin provisioning can mask the true physical capacity situation. By implementing automated monitoring scripts, setting appropriate alert thresholds, and understanding how space is consumed, you can prevent pool exhaustion and maintain reliable storage operations. Regular monitoring combined with proactive capacity planning ensures your Stratis storage runs smoothly on RHEL.
