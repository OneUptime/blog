# How to Balance Recovery Speed vs Normal Operations in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Recovery, Performance, Operation, Tuning

Description: Learn strategies for balancing Ceph data recovery speed against normal client I/O performance using priority flags, throttling parameters, and operational scheduling.

---

## The Recovery vs Performance Trade-off

Ceph recovery operations compete with client I/O for the same disk and network resources. Aggressive recovery settings minimize the time data remains degraded (reducing data loss risk) but can increase client latency by 2-5x. The right balance depends on your SLA requirements and recovery urgency.

## Recovery Priority Flags

Ceph provides flags to pause or limit recovery operations:

```bash
# Check current flags
ceph osd dump | grep flags

# Pause all recovery (emergency measure)
ceph osd set norebalance
ceph osd set norecover
ceph osd set nobackfill

# Resume when ready
ceph osd unset norebalance
ceph osd unset norecover
ceph osd unset nobackfill
```

## Key Tuning Parameters

A comprehensive set of parameters controls the recovery/performance balance:

```bash
# Active recovery operations per OSD
ceph config set osd osd_recovery_max_active_hdd 3
ceph config set osd osd_recovery_max_active_ssd 10

# Backfill concurrency
ceph config set osd osd_max_backfills 1

# Sleep between recovery ops (reduces CPU/IO pressure)
ceph config set osd osd_recovery_sleep_hdd 0.1
ceph config set osd osd_recovery_sleep_ssd 0

# Object chunk size for recovery I/O
ceph config set osd osd_recovery_max_chunk 8388608   # 8 MiB
```

## Defining Profiles for Different Scenarios

Create a script with named profiles:

```bash
#!/bin/bash
# ceph-recovery-profile.sh

apply_profile() {
  local profile=$1
  case $profile in
    conservative)
      # Minimal impact on clients
      ceph config set osd osd_recovery_max_active_hdd 1
      ceph config set osd osd_max_backfills 1
      ceph config set osd osd_recovery_sleep_hdd 0.5
      echo "Conservative profile applied"
      ;;
    balanced)
      # Default balanced approach
      ceph config set osd osd_recovery_max_active_hdd 3
      ceph config set osd osd_max_backfills 2
      ceph config set osd osd_recovery_sleep_hdd 0.1
      echo "Balanced profile applied"
      ;;
    aggressive)
      # Maximum recovery speed
      ceph config set osd osd_recovery_max_active_hdd 8
      ceph config set osd osd_max_backfills 4
      ceph config set osd osd_recovery_sleep_hdd 0
      echo "Aggressive profile applied"
      ;;
  esac
}

apply_profile "$1"
```

## Using Client Priority Settings

Separate client ops from recovery ops with priority queuing:

```bash
# Use WPQ (simpler, less granular control)
ceph config set osd osd_op_queue wpq

# Or use mClock scheduler for fine-grained QoS
ceph config set osd osd_op_queue mclock_scheduler
ceph config set osd osd_mclock_profile high_client_ops
```

## Scheduling Recovery Around Business Hours

Use cron jobs to switch profiles based on time:

```bash
# /etc/cron.d/ceph-recovery
# Slow during business hours (9 AM to 6 PM weekdays)
0 9 * * 1-5 root /usr/local/bin/ceph-recovery-profile.sh conservative
0 18 * * 1-5 root /usr/local/bin/ceph-recovery-profile.sh aggressive
0 8 * * 6,7 root /usr/local/bin/ceph-recovery-profile.sh aggressive
```

## Monitoring the Balance

Track both recovery progress and client latency simultaneously:

```bash
watch -n 5 '
echo "=== Recovery Status ==="
ceph -s | grep -E "degraded|recovery|backfill"
echo ""
echo "=== Client Latency ==="
ceph osd perf | awk "NR==1 || /[0-9]/" | head -10
'
```

Alert when client latency exceeds threshold:

```bash
#!/bin/bash
THRESHOLD_MS=10
LATENCY=$(ceph osd perf | awk 'NR>1 {sum+=$2; count++} END {print sum/count}')
if (( $(echo "$LATENCY > $THRESHOLD_MS" | bc -l) )); then
  echo "ALERT: OSD commit latency ${LATENCY}ms exceeds ${THRESHOLD_MS}ms threshold"
  /usr/local/bin/ceph-recovery-profile.sh conservative
fi
```

## Summary

Balancing Ceph recovery speed against client performance requires choosing appropriate concurrency levels (`osd_max_backfills`, `osd_recovery_max_active`), adding throttle sleep between recovery ops, and scheduling aggressive recovery during off-peak hours. Using the mClock I/O scheduler provides fine-grained quality of service that automatically prioritizes client operations while allowing background recovery to proceed efficiently.
