# How to Set NOSCRUB and NODEEP_SCRUB Pool Flags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Scrub, Maintenance

Description: Use NOSCRUB and NODEEP_SCRUB flags in Ceph to pause scrubbing activity on specific pools during high-load periods or maintenance windows.

---

Ceph automatically scrubs pools to detect bit rot, corruption, and inconsistencies. While scrubbing is essential for data integrity, it can consume I/O resources. The `noscrub` and `nodeep-scrub` flags allow you to temporarily pause scrubbing on specific pools without disabling it cluster-wide.

## Scrubbing Overview

Ceph performs two types of scrubs:

| Type | Description | Frequency |
|---|---|---|
| Light scrub | Checks object metadata and checksums | Daily by default |
| Deep scrub | Reads all object data, validates checksums | Weekly by default |

Deep scrubs are more thorough but consume significantly more I/O bandwidth.

## Check Current Scrub Flags

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool get replicapool noscrub

kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool get replicapool nodeep-scrub
```

## Disable Light Scrubbing for a Pool

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool noscrub true
```

This prevents light scrubs from being scheduled on this pool. Deep scrubs are still scheduled unless `nodeep-scrub` is also set.

## Disable Deep Scrubbing for a Pool

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool nodeep-scrub true
```

## Pause Both Types of Scrubbing

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  ceph osd pool set replicapool noscrub true
  ceph osd pool set replicapool nodeep-scrub true
"
```

Verify both are set:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool get replicapool all | grep -E "noscrub|nodeep"
```

## Re-enable Scrubbing After Maintenance

Always re-enable scrubbing after your maintenance window or high-load period:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  ceph osd pool set replicapool noscrub false
  ceph osd pool set replicapool nodeep-scrub false
"
```

## Cluster-Wide Scrub Control

If you need to pause scrubbing across all pools simultaneously, use the cluster-level flags instead of setting per-pool flags:

```bash
# Pause all scrubs cluster-wide
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd set noscrub
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd set nodeep-scrub

# Resume cluster-wide scrubs
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd unset noscrub
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd unset nodeep-scrub
```

## Monitor Active Scrubs

```bash
# Check for currently scrubbing PGs
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph pg ls scrubbing

# Check for deep scrubbing PGs
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph pg ls deep-scrubbing

# Check health status for scrub warnings
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail | grep -i scrub
```

## Ceph Health Warnings When Scrubs Are Disabled

When cluster-level flags are set (`ceph osd set noscrub`), Ceph immediately generates a health warning:

```text
HEALTH_WARN
    noscrub flag(s) set
    nodeep-scrub flag(s) set
```

For per-pool flags, Ceph does not generate an immediate warning. However, if scrubs have not run within the configured thresholds, Ceph will eventually raise `PG_NOT_SCRUBBED` or `PG_NOT_DEEP_SCRUBBED` warnings.

In both cases, these warnings serve as a reminder to re-enable scrubbing after your maintenance is complete.

## Summary

The `noscrub` and `nodeep-scrub` pool flags in Ceph allow you to pause scrubbing activity on specific pools during peak load periods or maintenance windows. Always re-enable them afterwards to maintain data integrity guarantees. Use cluster-level flags (`ceph osd set noscrub`) when you need to pause scrubbing across all pools simultaneously.
