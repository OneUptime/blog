# How to Test Erasure Coding Failure Scenarios in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, ErasureCoding, Testing, Resilience

Description: Learn how to simulate and test erasure coded pool failure scenarios in Ceph, including OSD failures, shard recovery, and data integrity verification.

---

Testing erasure coding failure scenarios validates that your Ceph cluster can recover data correctly when OSDs fail. Before relying on EC pools in production, you should simulate failures and verify that the cluster recovers as expected.

## Pre-Test Setup

Create a test EC profile and pool:

```bash
ceph osd erasure-code-profile set test-ec-profile \
  plugin=jerasure \
  technique=reed_sol_van \
  k=4 \
  m=2

ceph osd pool create test-ec-pool 32 32 erasure test-ec-profile
ceph osd pool set test-ec-pool allow_ec_overwrites true
```

Write test data:

```bash
# Write 1000 test objects
for i in $(seq 1 1000); do
  echo "test-data-object-$i-$(date +%s%N)" | rados -p test-ec-pool put testobj-$i -
done

# Verify all objects written
rados -p test-ec-pool ls | wc -l
```

## Scenario 1: Single OSD Failure

Mark one OSD as out to simulate a failure:

```bash
# Find which OSD holds shards for our pool
ceph pg ls-by-pool test-ec-pool | head -5

# Take an OSD out
ceph osd out osd.2
ceph osd down osd.2
```

Verify the cluster goes into degraded state:

```bash
ceph health
# HEALTH_WARN 1 osds down, X pgs degraded
```

Verify data is still readable:

```bash
for i in $(seq 1 100); do
  rados -p test-ec-pool get testobj-$i /dev/null && echo "OK: $i" || echo "FAIL: $i"
done
```

All reads should succeed because m=2 can tolerate 1 failure.

## Scenario 2: Double OSD Failure (Maximum Tolerated)

```bash
ceph osd out osd.2
ceph osd out osd.3
ceph osd down osd.2
ceph osd down osd.3
```

Monitor cluster state:

```bash
ceph -w
```

Expected: `HEALTH_WARN 2 osds down, degraded` - reads should still succeed as k=4 chunks remain available.

## Scenario 3: Triple OSD Failure (Beyond Tolerance)

```bash
ceph osd out osd.2
ceph osd out osd.3
ceph osd out osd.4
ceph osd down osd.2
ceph osd down osd.3
ceph osd down osd.4
```

With m=2, losing 3 OSDs may leave some PGs with fewer than k=4 shards, causing `pg incomplete`:

```bash
ceph pg ls | grep incomplete
# Shows PGs that cannot serve data
```

## Verifying Recovery After Bringing OSDs Back

```bash
# Bring OSD back
ceph osd in osd.2
ceph osd in osd.3

# Monitor recovery
watch ceph status
```

Look for recovery progress:

```text
recovering 1234/5000 objects, 50 GiB/s
```

## Data Integrity Verification After Recovery

```bash
# Verify all test objects are intact after recovery
FAILED=0
for i in $(seq 1 1000); do
  VALUE=$(rados -p test-ec-pool get testobj-$i -)
  if [[ "$VALUE" != *"test-data-object-$i"* ]]; then
    echo "INTEGRITY FAIL: testobj-$i"
    FAILED=$((FAILED+1))
  fi
done
echo "Failed objects: $FAILED"
```

## Deep Scrub Verification

After recovery, run a deep scrub to verify all shard checksums:

```bash
ceph osd pool set test-ec-pool nodeep-scrub 0
for pg in $(ceph pg ls-by-pool test-ec-pool | awk '/^[0-9]/{print $1}'); do
  ceph pg deep-scrub $pg
done

# Monitor scrub progress
ceph pg dump_stuck
```

## Rook-Specific Testing

In a Rook/Kubernetes environment, simulate OSD failure by deleting an OSD pod:

```bash
kubectl delete pod rook-ceph-osd-2-xxxx -n rook-ceph
```

Rook will attempt to restart it. To simulate permanent failure, cordon the node:

```bash
kubectl cordon node-name
kubectl delete pod rook-ceph-osd-2-xxxx -n rook-ceph --force
```

## Summary

Test EC failure scenarios by writing data, marking OSDs down, verifying reads still succeed within the m tolerance, and confirming recovery restores full redundancy. Always run a deep scrub after recovery to verify checksum integrity. Testing beyond the m tolerance confirms the cluster correctly reports data unavailability rather than silently returning corrupted data.
