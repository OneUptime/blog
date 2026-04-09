# How to Configure Scrubbing Intervals for Pools in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Scrub, Maintenance

Description: Configure per-pool scrubbing intervals in Ceph to control when and how often light and deep scrubs run to balance data integrity with I/O overhead.

---

Ceph performs regular scrubbing to verify data integrity. The default scrub schedule may not fit all workloads. You can tune scrub intervals per pool to align with your maintenance windows and performance requirements.

## Scrub Interval Parameters

| Parameter | Description | Default |
|---|---|---|
| `scrub_min_interval` | Minimum time between light scrubs (seconds) | 86400 (1 day) |
| `scrub_max_interval` | Maximum time before a light scrub is forced (seconds) | 604800 (7 days) |
| `deep_scrub_interval` | Time between deep scrubs (seconds) | 604800 (7 days) |

These can be set at both the pool level and the global OSD config level. Pool-level settings override global settings.

## View Current Scrub Intervals for a Pool

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  ceph osd pool get replicapool scrub_min_interval
  ceph osd pool get replicapool scrub_max_interval
  ceph osd pool get replicapool deep_scrub_interval
"
```

## Set Custom Scrub Intervals

Example: scrub no more than once per 12 hours, force scrub every 3 days, deep scrub every 14 days:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  # Min interval: 12 hours
  ceph osd pool set replicapool scrub_min_interval 43200

  # Max interval: 3 days
  ceph osd pool set replicapool scrub_max_interval 259200

  # Deep scrub: every 2 weeks
  ceph osd pool set replicapool deep_scrub_interval 1209600
"
```

## Set Global Scrub Intervals

For cluster-wide defaults (applied to all pools without per-pool overrides):

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  ceph config set osd osd_scrub_min_interval 86400
  ceph config set osd osd_scrub_max_interval 604800
  ceph config set osd osd_deep_scrub_interval 604800
"
```

## Check Scrub Priority and Load Management

Ceph limits how many PGs can be scrubbing simultaneously to reduce impact on I/O:

```bash
# Maximum concurrent scrubs per OSD (default: 3)
ceph config set osd osd_max_scrubs 1

# Only scrub during low-load periods
ceph config set osd osd_scrub_load_threshold 0.5

# Only scrub during specified hours (0-23)
ceph config set osd osd_scrub_begin_hour 22
ceph config set osd osd_scrub_end_hour 6
```

## Configure Scrub Times in Rook via ConfigMap

Rook allows global Ceph config via the `rook-config-override` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [osd]
    osd_scrub_begin_hour = 22
    osd_scrub_end_hour = 6
    osd_scrub_load_threshold = 0.5
    osd_max_scrubs = 1
    osd_deep_scrub_interval = 1209600
```

Apply it:

```bash
kubectl apply -f rook-config-override.yaml
```

## Monitor Last Scrub Time Per PG

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph pg dump | grep "last_scrub" | head -20
```

Or check for overdue PGs:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail | grep -i "not scrubbed"
```

## Summary

Per-pool scrub intervals in Ceph are controlled via `scrub_min_interval`, `scrub_max_interval`, and `deep_scrub_interval`. Configure them to run scrubs during off-peak hours, and use the `rook-config-override` ConfigMap in Rook for persistent global settings. Regular scrubbing is critical for detecting silent data corruption - avoid disabling it permanently.
