# How to Throttle Recovery to Minimize Impact in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Recovery, Throttle, Performance, Operation

Description: Throttle Ceph recovery operations using sleep intervals, bandwidth limits, and priority settings to minimize the impact on production client I/O during data recovery.

---

## Why Throttle Recovery?

Unthrottled recovery in Ceph can saturate disk I/O and network bandwidth, increasing client latency from single-digit milliseconds to hundreds of milliseconds. For production clusters serving live traffic, it is often better to recover more slowly over several hours than to degrade client performance for the duration.

## Primary Throttle Parameters

These are the main levers for controlling recovery impact:

```bash
# View current settings
ceph config get osd osd_recovery_sleep
ceph config get osd osd_recovery_sleep_hdd
ceph config get osd osd_recovery_sleep_ssd
ceph config get osd osd_max_backfills
ceph config get osd osd_recovery_max_active
```

## Recovery Sleep Configuration

`osd_recovery_sleep` inserts a pause between each recovery operation, acting as a rate limiter:

```bash
# Gentle throttle for production hours (100ms pause per op)
ceph config set osd osd_recovery_sleep_hdd 0.1
ceph config set osd osd_recovery_sleep_ssd 0.02

# Heavy throttle for very sensitive workloads
ceph config set osd osd_recovery_sleep_hdd 0.5
ceph config set osd osd_recovery_sleep_ssd 0.1

# No throttle for maintenance windows
ceph config set osd osd_recovery_sleep 0
ceph config set osd osd_recovery_sleep_hdd 0
ceph config set osd osd_recovery_sleep_ssd 0
```

## Concurrency Throttling

Reduce parallel operations:

```bash
# Minimal impact profile
ceph config set osd osd_max_backfills 1
ceph config set osd osd_recovery_max_active_hdd 1
ceph config set osd osd_recovery_max_active_ssd 3
```

## Using mClock I/O Scheduler

The mClock scheduler prioritizes client I/O over recovery operations:

```bash
# Enable mClock scheduler
ceph config set osd osd_op_queue mclock_scheduler

# Use the high_client_ops profile (prioritizes clients)
ceph config set osd osd_mclock_profile high_client_ops
```

mClock profiles available:

- `high_client_ops`: Maximum client performance, recovery is background
- `high_recovery_ops`: Faster recovery, moderate client impact
- `balanced`: Equal weighting for both
- `custom`: Define your own weights

## Scheduled Throttle Script

Automate throttle changes based on time of day:

```bash
#!/bin/bash
# /usr/local/bin/ceph-recovery-throttle.sh

HOUR=$(date +%H)
DAY=$(date +%u)  # 1=Mon, 7=Sun

# Business hours (weekdays 8AM-7PM)
if [ $DAY -le 5 ] && [ $HOUR -ge 8 ] && [ $HOUR -lt 19 ]; then
  echo "$(date): Applying production throttle"
  ceph config set osd osd_recovery_sleep_hdd 0.2
  ceph config set osd osd_max_backfills 1
  ceph config set osd osd_recovery_max_active_hdd 1
  ceph config set osd osd_mclock_profile high_client_ops
else
  echo "$(date): Applying off-hours recovery"
  ceph config set osd osd_recovery_sleep_hdd 0
  ceph config set osd osd_max_backfills 4
  ceph config set osd osd_recovery_max_active_hdd 6
  ceph config set osd osd_mclock_profile high_recovery_ops
fi
```

Schedule with cron:

```bash
# Check and apply throttle every hour
0 * * * * root /usr/local/bin/ceph-recovery-throttle.sh >> /var/log/ceph-throttle.log 2>&1
```

## Monitoring Impact

Track client latency alongside recovery rate:

```bash
watch -n 10 '
echo "=== Recovery Rate ==="
ceph -s | grep -E "recovery|backfill"
echo ""
echo "=== Client Latency (commit ms) ==="
ceph osd perf | awk "NR==1 || \$3>5" | head -10
echo ""
echo "=== Throttle Settings ==="
ceph config get osd osd_recovery_sleep_hdd
ceph config get osd osd_max_backfills
'
```

## Summary

Recovery throttling in Ceph involves three mechanisms: sleep intervals between operations (`osd_recovery_sleep`), concurrency limits (`osd_max_backfills` and `osd_recovery_max_active`), and the mClock I/O scheduler priority system. For production clusters, use the `high_client_ops` mClock profile combined with `osd_recovery_sleep_hdd=0.1` to keep recovery running in the background without impacting client P99 latency. Switch to unthrottled settings during scheduled maintenance windows for faster completion.
