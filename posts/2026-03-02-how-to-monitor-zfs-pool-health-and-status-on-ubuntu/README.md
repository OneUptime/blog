# How to Monitor ZFS Pool Health and Status on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ZFS, Monitoring, Storage, Linux

Description: Monitor ZFS pool health, capacity, I/O performance, and error states on Ubuntu using zpool commands, automated alerts, and integration with monitoring systems.

---

ZFS is generally self-managing, but it needs monitoring to catch issues before they become problems. A pool approaching full capacity, a disk accumulating checksum errors, or a resilver that's been running for days all need human attention. This guide covers the monitoring commands and strategies for keeping ZFS pools healthy on Ubuntu systems.

## Quick Health Check

The fastest way to assess all pools at once:

```bash
sudo zpool status
```

For a healthy system, every pool shows `ONLINE`:

```
  pool: tank
 state: ONLINE
  scan: scrub repaired 0 in 02:14:22 with 0 errors on Sun Mar  1 03:00:00 2026
config:

        NAME        STATE     READ WRITE CKSUM
        tank        ONLINE       0     0     0
          mirror-0  ONLINE       0     0     0
            sdb     ONLINE       0     0     0
            sdc     ONLINE       0     0     0

errors: No known data errors
```

### Interpreting pool states

| State | Meaning |
|-------|---------|
| ONLINE | Fully healthy and operational |
| DEGRADED | Operational but redundancy reduced (disk failed/removed) |
| FAULTED | Pool is not accessible - too many failures |
| OFFLINE | Pool was manually taken offline |
| UNAVAIL | Device not accessible |
| REMOVED | Device was physically removed |

Any state other than ONLINE requires immediate attention.

## Capacity Monitoring

```bash
# Quick capacity view
sudo zpool list
```

```
NAME    SIZE  ALLOC   FREE  FRAG    CAP  DEDUP  HEALTH
tank    3.62T  1.82T  1.80T  12%    50%  1.00x  ONLINE
backup  7.27T  5.14T  2.13T  28%    70%  1.00x  ONLINE
```

Key columns:
- **ALLOC**: Space currently used
- **FREE**: Available space
- **FRAG**: Fragmentation percentage (below 30% is healthy; above 50% can affect performance)
- **CAP**: Capacity percentage used

### Per-dataset space usage

```bash
sudo zfs list -r tank
```

```
NAME                   USED  AVAIL     REFER  MOUNTPOINT
tank                  1.82T  1.80T       96K  /tank
tank/web               450G  1.80T      450G  /var/www
tank/databases         890G  1.80T      890G  /var/lib
tank/backups           480G  1.80T      480G  /backup
```

### Check snapshot space usage

```bash
sudo zfs list -t all -o name,used,refer -r tank
```

Snapshots consuming large amounts of space show up in the USED column of their parent dataset.

## Error Monitoring

```bash
# Verbose status showing per-device error counts
sudo zpool status -v tank
```

Focus on the READ, WRITE, and CKSUM columns:

```
        NAME        STATE     READ WRITE CKSUM
        tank        ONLINE       0     0     0
          mirror-0  ONLINE       0     0     0
            sdb     ONLINE       0     0     0
            sdc     ONLINE       0     5    12
```

A disk showing CKSUM errors (checksum errors) while data was being repaired from the mirror is concerning. If errors keep accumulating, the disk is likely failing.

### Error interpretation

- **READ**: Errors while reading from the device
- **WRITE**: Errors while writing to the device
- **CKSUM**: Checksum mismatches - data read didn't match its stored checksum

Even a few CKSUM errors without corresponding disk errors can be transient. Repeated or growing CKSUM errors indicate a failing disk, bad SATA/SAS cable, or controller issue.

### Clear error counters

```bash
# Clear after replacing hardware or investigating
sudo zpool clear tank

# Clear counters for a specific device
sudo zpool clear tank /dev/sdc
```

## I/O Performance Monitoring

```bash
# Real-time I/O statistics for all pools
sudo zpool iostat 2
```

```
              capacity     operations     bandwidth
pool        alloc   free   read  write   read  write
----------  -----  -----  -----  -----  -----  -----
tank        1.82T  1.80T     42    128  3.21M  9.84M
backup      5.14T  2.13T      5     32   412K  2.12M
```

```bash
# Per-vdev breakdown
sudo zpool iostat -v 2
```

```
              capacity     operations     bandwidth
pool        alloc   free   read  write   read  write
----------  -----  -----  -----  -----  -----  -----
tank        1.82T  1.80T     42    128  3.21M  9.84M
  mirror    1.82T  1.80T     21     64  1.61M  4.92M
    sdb         -      -     21     64  1.61M  4.92M
    sdc         -      -     21      0  1.61M      0
```

### Latency statistics

```bash
# Show latency percentiles
sudo zpool iostat -ql 5
```

This shows operation latency which helps identify slow disks.

## Automated Health Monitoring Script

A comprehensive monitoring script that checks all common issues:

```bash
sudo nano /usr/local/bin/zfs-health-check.sh
```

```bash
#!/bin/bash
# Comprehensive ZFS health check
# Returns 0 if healthy, 1 if issues found

ALERT_FILE="/var/run/zfs-alert"
ISSUES=()

# Check each pool
while IFS= read -r pool; do
    STATE=$(zpool list -H -o health "$pool")
    CAP=$(zpool list -H -o cap "$pool" | tr -d '%')
    FRAG=$(zpool list -H -o frag "$pool" | tr -d '%')

    # Check pool health
    if [ "$STATE" != "ONLINE" ]; then
        ISSUES+=("CRITICAL: Pool $pool is in state $STATE")
    fi

    # Check capacity
    if [ "$CAP" -gt 85 ]; then
        ISSUES+=("WARNING: Pool $pool is ${CAP}% full (above 85% threshold)")
    fi

    # Check fragmentation
    if [ "$FRAG" -gt 50 ]; then
        ISSUES+=("WARNING: Pool $pool fragmentation is ${FRAG}% (above 50%)")
    fi

    # Check for data errors
    ERROR_SUMMARY=$(zpool status "$pool" | grep "errors:" | grep -v "No known data errors")
    if [ -n "$ERROR_SUMMARY" ]; then
        ISSUES+=("WARNING: Pool $pool has errors: $ERROR_SUMMARY")
    fi

    # Check for devices with high error counts
    while IFS= read -r line; do
        CKSUM=$(echo "$line" | awk '{print $5}')
        DEV=$(echo "$line" | awk '{print $1}')
        if [ -n "$CKSUM" ] && [ "$CKSUM" -gt 0 ] 2>/dev/null; then
            ISSUES+=("WARNING: Device $DEV in pool $pool has $CKSUM checksum errors")
        fi
    done < <(zpool status "$pool" | awk 'NR>7 && /\S/ {print}')

done < <(zpool list -H -o name)

# Report results
if [ ${#ISSUES[@]} -eq 0 ]; then
    echo "OK: All ZFS pools healthy"
    rm -f "$ALERT_FILE"
    exit 0
else
    echo "ZFS ALERTS:"
    for issue in "${ISSUES[@]}"; do
        echo "  - $issue"
    done

    # Write alert file for external monitoring
    printf '%s\n' "${ISSUES[@]}" > "$ALERT_FILE"
    exit 1
fi
```

```bash
sudo chmod +x /usr/local/bin/zfs-health-check.sh

# Test it
sudo /usr/local/bin/zfs-health-check.sh
```

Add to cron for regular checks:

```bash
echo "*/15 * * * * root /usr/local/bin/zfs-health-check.sh | logger -t zfs-health" \
  | sudo tee /etc/cron.d/zfs-health
```

## Monitoring with zed (ZFS Event Daemon)

ZFS includes `zed`, the ZFS Event Daemon, which monitors ZFS events and can send email alerts:

```bash
sudo apt install zfs-zed
sudo systemctl enable --now zfs-zed.service
```

Configure alerts:

```bash
sudo nano /etc/zfs/zed.d/zed.rc
```

```bash
# Email alerts for ZFS events
ZED_EMAIL_ADDR="admin@example.com"
ZED_EMAIL_PROG="mail"
ZED_EMAIL_OPTS="-s '@subject@' @address@"

# Alert on these event classes
ZED_NOTIFY_INTERVAL_SECS=3600
ZED_NOTIFY_VERBOSE=0

# Log level
ZED_LOG_EVERYTHING=0
```

```bash
sudo systemctl restart zfs-zed.service
```

zed sends emails on pool state changes, scrub completion, resilver completion, and device errors.

## Prometheus/Grafana Integration

For infrastructure monitoring, the `prometheus-zfs-exporter` exports ZFS metrics:

```bash
# Install the exporter
sudo apt install prometheus-zfs-exporter

# Start and enable
sudo systemctl enable --now prometheus-zfs-exporter

# Verify metrics are available
curl http://localhost:9134/metrics | grep zfs_pool
```

Sample metrics:
```
zfs_pool_health{pool="tank"} 1
zfs_pool_allocated_bytes{pool="tank"} 1.96e+12
zfs_pool_free_bytes{pool="tank"} 1.94e+12
zfs_pool_fragmentation_percent{pool="tank"} 12
```

Add scrape config to Prometheus:

```yaml
# /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'zfs'
    static_configs:
      - targets: ['localhost:9134']
```

## ARC (Cache) Monitoring

The Adaptive Replacement Cache uses RAM for reads. Monitor its effectiveness:

```bash
# View ARC statistics
cat /proc/spl/kstat/zfs/arcstats | grep -E "^(hits|misses|size|c_max)"
```

```
hits                            4       82371029
misses                          4       15892134
size                            4    8589934592   # 8GB ARC
c_max                           4    8589934592   # 8GB max
```

A high hit ratio (hits / (hits + misses)) indicates the ARC is working effectively. Below 80% may indicate the working set exceeds available RAM.

```bash
# Calculate hit ratio
awk '/^hits/{h=$3} /^misses/{m=$3} END{printf "ARC hit rate: %.1f%%\n", h/(h+m)*100}' \
  /proc/spl/kstat/zfs/arcstats
```

## Key Metrics to Track

1. **Pool health** - should always be ONLINE
2. **Capacity** - alert above 80%, critical above 90%
3. **Fragmentation** - monitor above 30%, address above 50%
4. **CKSUM errors** - any non-zero value warrants investigation
5. **Scrub results** - any "errors" in the scrub output
6. **Resilver duration** - excessively long resilvers indicate slow/stressed disks
7. **ARC hit ratio** - below 80% may indicate RAM constraints

Regular monitoring, combined with automated scrubs and ZED email alerts, gives a solid foundation for ZFS pool health management on Ubuntu.
