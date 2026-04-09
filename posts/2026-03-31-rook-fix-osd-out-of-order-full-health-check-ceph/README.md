# How to Fix OSD_OUT_OF_ORDER_FULL Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Capacity, Full

Description: Learn how to resolve the OSD_OUT_OF_ORDER_FULL health warning in Ceph when OSD full thresholds are configured in an inconsistent or inverted order.

---

## Understanding OSD_OUT_OF_ORDER_FULL

Ceph uses a sequence of space thresholds to manage OSD fullness: nearfull, backfillfull, and full. These thresholds must be in ascending order. `OSD_OUT_OF_ORDER_FULL` fires when these thresholds are misconfigured - for example, when the nearfull ratio is set higher than the backfillfull or full ratio, creating an illogical ordering.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_ERR OSD full threshold ratios out of order
[ERR] OSD_OUT_OF_ORDER_FULL: full_ratio (0.85) is not less than backfillfull_ratio (0.80)
```

## Checking Current Threshold Values

Inspect the current OSD fullness ratios:

```bash
ceph osd dump | grep -E "full_ratio|backfillfull_ratio|nearfull_ratio"
```

Example output showing bad configuration:

```text
nearfull_ratio 0.90
backfillfull_ratio 0.80
full_ratio 0.85
```

Here `full_ratio (0.85)` is greater than `backfillfull_ratio (0.80)`, which is invalid.

## Correct Threshold Ordering

The ratios must satisfy this relationship:

```text
nearfull_ratio < backfillfull_ratio < full_ratio
```

Typical production values:

```text
nearfull_ratio = 0.75
backfillfull_ratio = 0.80
full_ratio = 0.85
```

## Fixing the Threshold Order

Reset the thresholds to a valid order:

```bash
ceph osd set-nearfull-ratio 0.75
ceph osd set-backfillfull-ratio 0.80
ceph osd set-full-ratio 0.85
```

Verify after applying:

```bash
ceph osd dump | grep -E "full_ratio|backfillfull_ratio|nearfull_ratio"
```

## Configuring in Rook

In Rook, set these values in the CephCluster spec:

```yaml
spec:
  storage:
    fullRatio: 0.85
    backfillFullRatio: 0.80
    nearFullRatio: 0.75
```

Apply the change:

```bash
kubectl -n rook-ceph apply -f cephcluster.yaml
```

Verify the cluster picks up the new values:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- ceph osd dump | grep ratio
```

## Understanding the Impact of Each Threshold

- `nearfull_ratio` (default 0.85): Ceph warns that an OSD is approaching full. Write I/O continues.
- `backfillfull_ratio` (default 0.90): Ceph will not backfill data onto this OSD. Remapping stops for this OSD.
- `full_ratio` (default 0.95): Ceph stops all write I/O to prevent corruption. This is a hard stop.

## Verifying the Fix

After correcting the order:

```bash
ceph health detail
```

The `OSD_OUT_OF_ORDER_FULL` error should be gone. Also verify the OSDs are within safe utilization:

```bash
ceph osd df
```

Review the `%USE` column for each OSD. Any OSD above 75% should be flagged for capacity planning.

## Summary

`OSD_OUT_OF_ORDER_FULL` indicates the nearfull, backfillfull, and full OSD ratio thresholds are not in ascending order. Fix this by setting them correctly: nearfull < backfillfull < full. In Rook, update the CephCluster spec with the correct `nearFullRatio`, `backfillFullRatio`, and `fullRatio` values. Always verify OSD utilization alongside threshold configuration to ensure the thresholds are practically meaningful.
