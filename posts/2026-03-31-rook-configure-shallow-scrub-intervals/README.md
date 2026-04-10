# How to Configure Shallow Scrubbing Intervals in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Scrubbing, Data Integrity, Kubernetes, OSD

Description: Learn how to configure Ceph shallow scrubbing intervals to balance data integrity verification frequency against I/O performance impact in your cluster.

---

## Understanding Shallow Scrubbing

Shallow scrubbing (also called just "scrubbing") is Ceph's process of verifying that each placement group's (PG) metadata is consistent across all replicas - that object sizes and attributes match. Unlike deep scrubbing, it does not read the full object data from disk or verify data checksums.

Shallow scrubbing is relatively lightweight and runs frequently (daily by default). It catches metadata inconsistencies but does not verify data block integrity.

## Default Scrub Intervals

Default scrubbing configuration in Ceph:

| Parameter | Default | Description |
|---|---|---|
| `osd_scrub_min_interval` | 86400 (1 day) | Minimum time between scrubs |
| `osd_scrub_max_interval` | 604800 (7 days) | Maximum time before scrub is forced |
| `osd_scrub_begin_hour` | 0 | Hour to start allowing scrubs |
| `osd_scrub_end_hour` | 0 | Hour to stop allowing scrubs (0 = any time) |

## Checking Current Scrub Configuration

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get osd osd_scrub_min_interval

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get osd osd_scrub_max_interval
```

## Setting Custom Scrub Intervals

Adjust scrub intervals based on your workload requirements:

```bash
# Set minimum interval to 12 hours (43200 seconds)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_min_interval 43200

# Set maximum interval to 3 days
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_max_interval 259200
```

Or configure via the `rook-config-override` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [osd]
    osd_scrub_min_interval = 43200
    osd_scrub_max_interval = 259200
```

## Restricting Scrubs to Off-Peak Hours

Limit when scrubbing is allowed to run:

```bash
# Allow scrubs only between 10 PM and 6 AM
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_begin_hour 22

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_end_hour 6
```

## Controlling Scrub Load Impact

Limit how aggressively scrubbing consumes I/O resources:

```bash
# Set maximum scrub sleep time between objects (seconds)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_sleep 0.1

# Limit scrubs per OSD
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_max_scrubs 1
```

## Checking Last Scrub Time Per PG

Monitor when PGs were last scrubbed:

```bash
# Show PGs that haven't been scrubbed recently
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump | awk '{print $1, $14}' | sort -k2 | head -20

# Check for PGs exceeding max scrub interval
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail | grep "not scrubbed"
```

## Summary

Shallow scrub interval configuration balances data integrity verification frequency against operational impact. For most production clusters, the default 1-day minimum and 7-day maximum intervals are appropriate. For high-compliance environments, reduce the maximum interval; for heavily loaded clusters, increase the minimum interval and restrict scrubbing to off-peak hours. Always ensure scrubs complete within the maximum interval to avoid Ceph health warnings.
