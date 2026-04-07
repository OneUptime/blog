# How to Simulate OSD Failures for Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Testing, OSD, Failure Simulation, Resilience

Description: Simulate Ceph OSD failures in a test environment to validate cluster recovery behavior, measure recovery time, and verify data integrity after failure events.

---

Testing how your Ceph cluster responds to OSD failures before they happen in production is essential for validating recovery procedures, measuring RTO, and ensuring data integrity under failure conditions.

## Setting Up the Test Environment

Use a multi-OSD cluster with at least 3 OSDs for meaningful failure simulation:

```bash
# Verify cluster health before testing
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
ceph status
echo 'Active OSDs:'
ceph osd stat
"
```

## Method 1: Kill the OSD Process

The simplest simulation - kill the OSD daemon process:

```bash
#!/bin/bash
# simulate-osd-failure.sh
OSD_ID="${1:?OSD ID required}"
NAMESPACE="${CEPH_NAMESPACE:-rook-ceph}"

# Find the OSD pod
OSD_POD=$(kubectl -n "$NAMESPACE" get pods \
  -l "ceph-osd-id=$OSD_ID" \
  -o jsonpath='{.items[0].metadata.name}')

echo "Simulating OSD $OSD_ID failure (pod: $OSD_POD)"

# Record start time for RTO measurement
START_TIME=$(date +%s)

# Kill the OSD pod
kubectl -n "$NAMESPACE" delete pod "$OSD_POD" --grace-period=0

# Watch recovery
echo "Monitoring recovery..."
while true; do
  HEALTH=$(kubectl -n "$NAMESPACE" exec -it deploy/rook-ceph-tools -- \
    ceph health --format json 2>/dev/null | \
    python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")

  ELAPSED=$(( $(date +%s) - START_TIME ))
  echo "[${ELAPSED}s] Cluster health: $HEALTH"

  if [[ "$HEALTH" == "HEALTH_OK" ]]; then
    echo "Recovery complete in ${ELAPSED} seconds"
    break
  fi
  sleep 5
done
```

## Method 2: Mark OSD Down and Out

For a more realistic failure that prevents the OSD from restarting:

```bash
#!/bin/bash
# force-osd-failure.sh
OSD_ID="${1:?OSD ID required}"
NAMESPACE="${CEPH_NAMESPACE:-rook-ceph}"

ceph_cmd() {
  kubectl -n "$NAMESPACE" exec -it deploy/rook-ceph-tools -- ceph "$@"
}

echo "=== Forcing OSD $OSD_ID failure ==="

# Step 1: Mark down
ceph_cmd osd down "osd.$OSD_ID"

# Step 2: Mark out to trigger rebalancing
ceph_cmd osd out "osd.$OSD_ID"

echo "OSD $OSD_ID marked down and out"
echo "Watch PG recovery:"
watch -n 2 'kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat'
```

## Method 3: Inject Disk Failure with dm-error

Simulate actual disk I/O errors using device mapper:

```bash
# On the node hosting the OSD
# Find the OSD device
OSD_DEVICE=$(ls /dev/mapper/ceph-* | head -1)

# Create a dm-error device that returns I/O errors
dmsetup create osd-error --table "0 $(blockdev --getsz $OSD_DEVICE) error"

# Point the OSD at the error device (causes OSD to crash)
# This simulates a disk controller failure
```

## Measuring Recovery Metrics

```python
#!/usr/bin/env python3
"""Measure OSD failure recovery metrics."""

import subprocess
import json
import time
from datetime import datetime

NAMESPACE = "rook-ceph"

def get_pg_stats():
    result = subprocess.run([
        "kubectl", "-n", NAMESPACE, "exec", "deploy/rook-ceph-tools",
        "--", "ceph", "pg", "stat", "--format", "json"
    ], capture_output=True, text=True)
    return json.loads(result.stdout)


def measure_recovery(osd_id: int):
    print(f"Recording baseline before OSD {osd_id} failure...")
    baseline = get_pg_stats()

    # Trigger failure
    subprocess.run([
        "kubectl", "-n", NAMESPACE, "exec", "deploy/rook-ceph-tools",
        "--", "ceph", "osd", "out", f"osd.{osd_id}"
    ])

    start = time.time()
    print(f"OSD {osd_id} marked out at {datetime.now().isoformat()}")

    while True:
        stats = get_pg_stats()
        degraded = stats.get("num_pg_degraded", 0)
        elapsed = time.time() - start
        print(f"[{elapsed:.0f}s] Degraded PGs: {degraded}")

        if degraded == 0:
            print(f"\nRecovery complete in {elapsed:.1f} seconds")
            break
        time.sleep(5)


if __name__ == "__main__":
    import sys
    measure_recovery(int(sys.argv[1]))
```

## Verifying Data Integrity After Recovery

```bash
# After cluster recovers, verify object checksums
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
# Scrub all pools to verify data integrity
for pool in \$(ceph osd pool ls); do
  ceph osd pool scrub \"\$pool\"
done

# Wait for scrub to complete and check for inconsistencies
sleep 60
ceph health detail | grep -i inconsistent || echo 'No inconsistencies found'
"
```

## Summary

Simulating OSD failures through pod deletion, manual mark-down/out commands, or device-level I/O injection gives you realistic test data on cluster recovery behavior. Measuring recovery time and verifying data integrity after each simulation builds confidence in your Ceph configuration and helps you tune parameters like `osd_recovery_priority` and `osd_backfill_scan_min` for faster recovery.
