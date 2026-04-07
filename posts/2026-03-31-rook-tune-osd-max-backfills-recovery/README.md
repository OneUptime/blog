# How to Tune osd_max_backfills for Faster Recovery in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Recovery, Performance, OSD, Backfill

Description: Learn how to tune the osd_max_backfills parameter in Ceph to speed up data recovery after OSD failures while controlling the impact on client I/O performance.

---

## Understanding osd_max_backfills

When Ceph needs to restore data redundancy after an OSD failure, it uses backfill operations to copy missing object replicas. The `osd_max_backfills` parameter controls how many concurrent backfill operations each OSD can perform simultaneously - both as a source sending data and as a target receiving data.

The default value is 1, which is conservative and minimizes impact on client I/O but results in slow recovery.

## Checking Current Backfill Settings

```bash
ceph config get osd osd_max_backfills
ceph config get osd osd_recovery_max_active
ceph config get osd osd_recovery_max_active_hdd
ceph config get osd osd_recovery_max_active_ssd
```

View current recovery activity:

```bash
ceph -s | grep -E "recovery|backfill"
ceph pg ls backfilling
ceph osd perf | grep -E "commit|apply"
```

## Tuning osd_max_backfills

For faster recovery when client I/O is minimal (e.g., maintenance window):

```bash
# Increase backfill concurrency
ceph config set osd osd_max_backfills 4

# Also increase recovery ops
ceph config set osd osd_recovery_max_active 4
ceph config set osd osd_recovery_max_single_start 4
```

For balanced recovery during production operations:

```bash
# Moderate values that don't overwhelm OSDs
ceph config set osd osd_max_backfills 2
ceph config set osd osd_recovery_max_active 2
```

For HDD vs SSD distinction:

```bash
# HDDs are slower - lower values prevent saturation
ceph config set osd osd_recovery_max_active_hdd 3
# SSDs can handle more concurrent operations
ceph config set osd osd_recovery_max_active_ssd 10
```

## Temporarily Boosting Recovery Speed

Use a two-phase approach: aggressive during off-hours, conservative during business hours:

```bash
# During maintenance window - maximize recovery
ceph config set osd osd_max_backfills 8
ceph config set osd osd_recovery_max_active 8
ceph config set osd osd_backfill_scan_min 128
ceph config set osd osd_backfill_scan_max 1024

# Monitor progress
watch -n 5 'ceph -s | grep -E "recovery|backfill|degraded"'

# After maintenance - restore normal values
ceph config set osd osd_max_backfills 1
ceph config set osd osd_recovery_max_active 1
```

## Monitoring Recovery Progress

Track how fast recovery is proceeding:

```bash
# Show recovery rate and estimated time
ceph status
ceph osd perf
ceph pg dump | awk '/^[0-9]/ {sum+=$21} END {print "Degraded objects:", sum}'
```

Watch recovery metrics in real time:

```bash
watch -n 10 'ceph df; ceph -s'
```

## Impact on Client Performance

Monitor client latency while increasing backfills:

```bash
# Watch OSD commit latency
ceph osd perf | sort -k3 -n | tail -20

# Check if clients are affected
ceph daemon osd.0 perf dump | grep -E "op_latency|commit_latency"
```

If client latency increases significantly, roll back:

```bash
ceph config set osd osd_max_backfills 1
ceph config set osd osd_recovery_max_active 1
```

## Applying via Rook ConfigMap

Set recovery parameters using the `rook-config-override` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [osd]
    osd_max_backfills = 2
    osd_recovery_max_active_hdd = 3
    osd_recovery_max_active_ssd = 10
```

## Summary

`osd_max_backfills` controls concurrent backfill operations per OSD, with the default of 1 prioritizing client performance over recovery speed. Increasing this value to 2-4 during normal operations or 8+ during maintenance windows dramatically reduces recovery time. Always monitor client latency while tuning and use separate HDD/SSD values since solid-state drives can sustain much higher concurrent recovery workloads.
