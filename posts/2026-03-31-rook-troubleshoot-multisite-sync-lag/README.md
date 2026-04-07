# How to Troubleshoot Multisite Sync Lag in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Multisite, Troubleshooting, Sync

Description: Learn how to diagnose and fix Ceph RGW multisite sync lag - covering shard analysis, sync thread tuning, network bottlenecks, and recovering from stopped sync.

---

## Diagnosing Sync Lag

Start by quantifying the lag:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin sync status
```

Look for:
- `behind shards`: number of shards with pending objects
- Full sync vs incremental sync timestamps
- Any error messages

```bash
# Get detailed shard status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin data sync status \
  --source-zone=us-east 2>&1 | head -50
```

## Root Cause 1: Network Bandwidth Saturation

Check if the sync network is saturated:

```bash
# On the RGW pod, check network I/O
kubectl -n rook-ceph exec -it rook-ceph-rgw-us-east-<pod> -- \
  cat /proc/net/dev | grep eth

# Test raw bandwidth between zones
kubectl -n rook-ceph exec -it rook-ceph-tools -- \
  iperf3 -c <remote-rgw-ip> -t 30
```

If network is limited, reduce sync thread count to avoid packet loss:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_data_sync_spawn_window 4
```

## Root Cause 2: Insufficient Sync Threads

Increase sync parallelism if the network has capacity:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get client.rgw rgw_data_sync_spawn_window

# Increase for faster catch-up
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_data_sync_spawn_window 16

# Restart RGW to apply
kubectl -n rook-ceph rollout restart deployment/rook-ceph-rgw-us-east-a
```

## Root Cause 3: Sync Errors Blocking Progress

Persistent errors in specific shards block overall sync progress:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin sync error list | python3 -m json.tool | head -50

# Force retry of failed objects
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin sync error trim \
  --start-time=2026-03-01T00:00:00 \
  --end-time=2026-03-31T23:59:59

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin data sync run \
  --source-zone=us-east
```

## Root Cause 4: Clock Skew Between Zones

Significant clock differences cause sync issues:

```bash
# Check time on both zone hosts
kubectl -n rook-ceph exec -it rook-ceph-rgw-us-east-<pod> -- date
kubectl -n rook-ceph exec -it rook-ceph-rgw-us-west-<pod> -- date
```

Ensure NTP or chrony is running on all nodes. Ceph monitors default to a clock drift threshold of 0.05 seconds, and RGW multisite sync relies on accurate timestamps for conflict resolution. Keep clocks synchronized within sub-second accuracy.

## Root Cause 5: RGW Instance Restart Required

Sometimes the sync process hangs and requires an RGW restart:

```bash
kubectl -n rook-ceph rollout restart deployment/rook-ceph-rgw-us-west-a

# After restart, check if sync resumes
watch kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin sync status
```

## Verifying Recovery

After applying fixes, watch the `behind shards` count decrease:

```bash
for i in $(seq 1 10); do
  echo "Check $i: $(date)"
  kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
    radosgw-admin sync status 2>&1 | grep "behind shards"
  sleep 60
done
```

## Summary

RGW multisite sync lag has five common root causes: network saturation, insufficient sync threads, persistent error objects blocking shards, clock skew between zones, and hung sync processes. Systematic diagnosis - checking network, tuning sync threads, clearing errors, verifying time sync, and restarting RGW - resolves most lag incidents within minutes.
