# How to Understand Ceph Quincy Release Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Quincy, Release, Feature, RADOS

Description: Explore the key features introduced in Ceph Quincy (v17) including rados osd snaps, improved scrubbing, RGW multisite improvements, and new RADOS capabilities.

---

Ceph Quincy (v17) was released in April 2022 as a major stable release. It focused on operational improvements, reliability enhancements, and better multi-cloud connectivity for the RGW component.

## Quincy Release Highlights

Ceph Quincy (v17.x) introduced:
- Improved OSD scrubbing with configurable schedules
- RGW multisite synchronization reliability improvements
- New `cephadm` orchestration features
- Messenger v2 as default
- Improved BlueStore fragmentation handling
- Removal of legacy filestore support

## Messenger v2 as Default

Quincy made `msgr2` the default transport, improving security and performance:

```bash
# Verify msgr2 is active
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
ceph config get mon ms_cluster_mode
ceph config get mon ms_service_mode
# Should return: secure or crc
"

# Check that all connections use v2
ceph mon stat
# The output should show v2 addresses (port 3300), not v1 (port 6789)

# Force secure mode (optional)
ceph config set global ms_cluster_mode secure
ceph config set global ms_service_mode secure
```

## Improved OSD Scrub Scheduling

Quincy added fine-grained control over scrub scheduling:

```bash
# Schedule scrubs during off-peak hours only
ceph config set osd osd_scrub_begin_hour 1
ceph config set osd osd_scrub_end_hour 5
ceph config set osd osd_scrub_begin_week_day 0  # Sunday
ceph config set osd osd_scrub_end_week_day 5    # Friday

# Deep scrub limits
ceph config set osd osd_deep_scrub_interval 604800  # 7 days
ceph config set osd osd_scrub_sleep 0.1  # reduce IO impact

# Force a scrub on a specific PG
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg scrub 1.0

# Force deep scrub
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg deep-scrub 1.0
```

## BlueStore Fragmentation Improvements

Quincy improved BlueStore's handling of heavily fragmented OSDs:

```bash
# Check fragmentation score per OSD (0 = no fragmentation, 1 = fully fragmented)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
for osd in \$(ceph osd ls); do
  echo -n \"OSD \$osd fragmentation score: \"
  ceph tell osd.\$osd bluestore allocator score block 2>/dev/null || echo 'N/A'
done
"

# Trigger RocksDB compaction to reduce metadata fragmentation
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.0 compact
```

## RGW Multisite Sync Reliability

Quincy improved multisite sync status reporting:

```bash
# New sync status command with better detail
radosgw-admin sync status

# Per-shard sync status
radosgw-admin sync error list

# Trim sync error log entries
radosgw-admin sync error trim

# Check multisite sync policy
radosgw-admin sync policy get
```

## New Cephadm Features in Quincy

```bash
# Deploy services with placement constraints (improved in Quincy)
ceph orch apply osd --all-available-devices

# New: export/import cephadm config
ceph orch export > ceph-spec.yaml
ceph orch apply -i ceph-spec.yaml

# New: service health checks
ceph orch ls --format json | python3 -c "
import sys, json
services = json.load(sys.stdin)
for svc in services:
    print(f\"{svc['service_type']}: {svc.get('status',{}).get('running',0)}/{svc.get('status',{}).get('size',0)}\")
"
```

## Checking Your Quincy Version

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph version
# Should show: ceph version 17.x.x (commit) quincy (stable)

# Check for available upgrades
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph versions
```

## Summary

Ceph Quincy (v17) brought scrub scheduling flexibility, default Messenger v2, improved BlueStore fragmentation handling, and more reliable RGW multisite sync. These improvements make Quincy significantly more operationally mature than its predecessors, and its features form the foundation that Reef (v18) builds upon.
