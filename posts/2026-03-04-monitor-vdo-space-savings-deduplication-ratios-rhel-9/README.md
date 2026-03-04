# How to Monitor VDO Space Savings and Deduplication Ratios on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, Monitoring, Deduplication, Storage, Linux

Description: Learn how to monitor VDO space savings, deduplication ratios, and compression effectiveness on RHEL 9 using vdostats, LVM tools, and custom monitoring scripts.

---

Monitoring VDO performance metrics is essential for understanding how effectively your storage is being utilized and for capacity planning. VDO provides detailed statistics about deduplication, compression, and space usage that help you optimize your storage configuration. This guide covers all the monitoring tools and techniques available on RHEL 9.

## Prerequisites

- A RHEL 9 system with root or sudo access
- Existing LVM-VDO volumes
- The `lvm2` and `kmod-kvdo` packages installed

## Step 1: Basic Space Savings Overview

### Using LVM Tools

```bash
sudo lvs -o name,size,data_percent,vdo_saving_percent vg_vdo
```

Key columns:
- **size**: Virtual size of the VDO volume
- **data_percent**: Percentage of physical space used
- **vdo_saving_percent**: Overall space savings from deduplication and compression

### Using vdostats

```bash
sudo vdostats --human-readable
```

Sample output:

```
Device                    Size      Used Available Use% Space saving%
/dev/mapper/vg_vdo-vpool  200.0G    45.2G   154.8G  22%           68%
```

## Step 2: Detailed VDO Statistics

Get comprehensive statistics:

```bash
sudo vdostats --all /dev/mapper/vg_vdo-vpool
```

This outputs a large number of metrics. The most important ones are grouped below.

### Data Block Statistics

```bash
sudo vdostats --verbose /dev/mapper/vg_vdo-vpool
```

Key metrics:

- **data blocks used**: Physical blocks storing actual data
- **overhead blocks used**: Blocks used for VDO metadata
- **logical blocks used**: Total logical blocks referenced by the filesystem
- **logical blocks**: Total logical capacity in blocks

### Deduplication Statistics

From the verbose output:

- **dedupe advice valid**: Number of successful deduplication lookups
- **dedupe advice stale**: Lookups that found stale index entries
- **dedupe advice timeouts**: Lookups that timed out
- **concurrent data matches**: Blocks matched against currently writing data
- **concurrent hash collisions**: False matches due to hash collisions (should be zero)

### Compression Statistics

- **compressed fragments written**: Number of blocks that were compressed
- **compressed blocks in use**: Current number of compressed blocks stored
- **compressed fragments in packer**: Blocks waiting to be packed together

## Step 3: Calculate Effective Ratios

### Deduplication Ratio

```bash
# Get the statistics
LOGICAL=$(sudo vdostats --verbose /dev/mapper/vg_vdo-vpool | grep "logical blocks used" | awk '{print $NF}')
DATA=$(sudo vdostats --verbose /dev/mapper/vg_vdo-vpool | grep "data blocks used" | awk '{print $NF}')

echo "Deduplication ratio: $(echo "scale=2; $LOGICAL / $DATA" | bc):1"
```

### Space Saving Percentage

```bash
sudo vdostats /dev/mapper/vg_vdo-vpool | awk 'NR==2 {print $NF}'
```

### Physical Usage

```bash
sudo lvs -o name,data_percent vg_vdo/lv_vdo
```

## Step 4: Monitor Over Time

### Create a Logging Script

```bash
sudo tee /usr/local/bin/vdo-monitor.sh << 'SCRIPT'
#!/bin/bash
LOG_FILE="/var/log/vdo-stats.csv"
DEVICE="/dev/mapper/vg_vdo-vpool"

if [ ! -f "$LOG_FILE" ]; then
    echo "timestamp,device,physical_size,physical_used,logical_used,saving_percent" > "$LOG_FILE"
fi

STATS=$(vdostats "$DEVICE" | tail -1)
PHYS_SIZE=$(echo "$STATS" | awk '{print $2}')
PHYS_USED=$(echo "$STATS" | awk '{print $3}')
PHYS_AVAIL=$(echo "$STATS" | awk '{print $4}')
USE_PCT=$(echo "$STATS" | awk '{print $5}')
SAVING=$(echo "$STATS" | awk '{print $6}')

echo "$(date -Iseconds),$DEVICE,$PHYS_SIZE,$PHYS_USED,$PHYS_AVAIL,$SAVING" >> "$LOG_FILE"
SCRIPT
sudo chmod +x /usr/local/bin/vdo-monitor.sh
```

Schedule to run every hour:

```bash
echo '0 * * * * root /usr/local/bin/vdo-monitor.sh' | sudo tee /etc/cron.d/vdo-monitor
```

### Create an Alert Script

```bash
sudo tee /usr/local/bin/vdo-alert.sh << 'SCRIPT'
#!/bin/bash
WARN_THRESHOLD=75
CRIT_THRESHOLD=90

for device in $(vdostats --all 2>/dev/null | grep "^/" | awk '{print $1}'); do
    USE_PCT=$(vdostats "$device" | tail -1 | awk '{gsub(/%/,""); print $5}')

    if [ "$USE_PCT" -ge "$CRIT_THRESHOLD" ]; then
        echo "CRITICAL: VDO device $device is ${USE_PCT}% full" | \
          logger -t vdo-alert -p user.crit
    elif [ "$USE_PCT" -ge "$WARN_THRESHOLD" ]; then
        echo "WARNING: VDO device $device is ${USE_PCT}% full" | \
          logger -t vdo-alert -p user.warning
    fi
done
SCRIPT
sudo chmod +x /usr/local/bin/vdo-alert.sh
echo '*/15 * * * * root /usr/local/bin/vdo-alert.sh' | sudo tee /etc/cron.d/vdo-alert
```

## Step 5: Interpret Space Savings

### High Savings (60-90%)

Indicates excellent deduplication. Common with:
- Virtual machine images from the same base
- Backup storage with many incremental copies
- Container image registries

### Moderate Savings (30-60%)

Indicates good deduplication and compression. Common with:
- Mixed file storage
- Development environments
- Document repositories

### Low Savings (0-30%)

Indicates limited deduplication potential. Common with:
- Already compressed data (videos, ZIP files)
- Encrypted data
- Unique binary data

### Negative or Zero Savings

If savings are very low, VDO overhead may not be justified. Consider:
- Disabling deduplication and using compression only
- Using a standard LVM volume instead
- Reviewing whether the data profile has changed

## Step 6: Monitor UDS Index Health

The UDS (Universal Deduplication Service) index is critical for deduplication performance:

```bash
sudo lvs -o name,vdo_index_state vg_vdo
```

Index states:
- **online**: Normal operation
- **opening**: Index is being loaded
- **closing**: Index is being saved
- **offline**: Index is not available (deduplication disabled)
- **error**: Index has encountered an error

If the index is in an error state:

```bash
sudo lvchange --rebuild-full vg_vdo/lv_vdo
```

## Step 7: Performance Metrics

### I/O Latency

```bash
sudo iostat -x 1 /dev/sdb
```

### Throughput

```bash
# Observe the physical device throughput vs. logical writes
sudo vdostats --verbose /dev/mapper/vg_vdo-vpool | grep -i "bios"
```

### Journal Statistics

```bash
sudo vdostats --verbose /dev/mapper/vg_vdo-vpool | grep -i "journal"
```

## Best Practices

- **Monitor daily**: Check space savings and physical usage as part of routine operations.
- **Track trends**: Log statistics over time to predict when you need to add capacity.
- **Set alerts**: Configure warnings before physical space runs out.
- **Review after data changes**: Recalculate expected ratios when the type of data stored changes.
- **Test with representative data**: Use realistic data for capacity planning rather than synthetic benchmarks.

## Conclusion

Monitoring VDO space savings and deduplication ratios on RHEL 9 is crucial for effective capacity management. The `vdostats` command provides comprehensive metrics about deduplication effectiveness, compression ratios, and physical space usage. By tracking these metrics over time and setting appropriate alerts, you can ensure your VDO volumes continue to deliver optimal storage efficiency and avoid unexpected capacity issues.
