# How to Monitor RBD Mirror Status (Image and Pool Level)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Monitoring, Observability

Description: Learn how to monitor RBD mirroring status at both the image and pool levels in Ceph to ensure replication health and quickly identify issues.

---

## Overview

Monitoring RBD mirroring health is essential for disaster recovery preparedness. Ceph provides commands to inspect mirror status at the pool level (aggregate view) and image level (per-image details including lag, state, and description). Regular monitoring ensures you detect replication failures before they impact recovery objectives.

## Pool-Level Mirror Status

Get a summary of all mirrored images in a pool:

```bash
# Basic pool mirror status
rbd mirror pool status replicapool

# Verbose output with all image states
rbd mirror pool status replicapool --verbose

# JSON output for scripting
rbd mirror pool status replicapool --format json | jq .
```

Example output:
```yaml
health: OK
daemon health: OK
image health: OK
images: 12 total
    12 replaying
```

## Image-Level Mirror Status

Inspect individual image replication details:

```bash
# Status for a specific image
rbd mirror image status replicapool/myimage

# JSON format for automation
rbd mirror image status replicapool/myimage --format json | jq .
```

The output includes:
- `global_id` - unique mirroring ID
- `state` - current state (up+replaying, up+syncing, up+error)
- `description` - detailed position and lag information
- `last_update` - timestamp of last status update

## Checking Mirror Lag

The `description` field in `up+replaying` state shows position lag:

```bash
rbd mirror image status replicapool/myimage --format json | \
  jq '.description'

# Example: "replaying, master_position=obj_num=123456 entry_num=789,
#  mirror_position=obj_num=123456 entry_num=789, entries_behind_master=0"
```

A non-zero `entries_behind_master` indicates lag. Large values may indicate network congestion or OSD performance issues.

## Monitoring All Images in a Pool

List status for all mirrored images:

```bash
# Show all image mirror statuses
rbd mirror pool status replicapool --verbose --format json | \
  jq '.images[] | {name: .name, state: .state}'
```

Identify any images not in `up+replaying` state:

```bash
rbd mirror pool status replicapool --verbose --format json | \
  jq '.images[] | select(.state != "up+replaying")'
```

## Prometheus Metrics

The Ceph MGR Prometheus module exposes `rbd-mirror` metrics. Configure scraping:

```yaml
# Prometheus scrape config
scrape_configs:
  - job_name: rbd-mirror
    static_configs:
      - targets: ['ceph-mgr-host:9283']
```

Key metrics to monitor:
- `ceph_rbd_mirror_snapshot_image_snapshots` - snapshot count
- `ceph_rbd_mirror_snapshot_image_sync_bytes` - bytes synced
- `ceph_rbd_mirror_snapshot_image_sync_time` - sync duration

## Rook: Monitoring via Dashboard and Toolbox

Check mirror status from the Rook toolbox:

```bash
TOOLBOX=$(kubectl -n rook-ceph get pod -l app=rook-ceph-tools \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n rook-ceph exec -it $TOOLBOX -- \
  rbd mirror pool status replicapool --verbose
```

Enable the Ceph Dashboard for a visual mirror health overview at `https://<ceph-dashboard>/#/block/mirroring`.

## Summary

RBD mirror monitoring at pool and image level provides visibility into replication health, lag, and failure states. Use `rbd mirror pool status --verbose` for aggregate health, `rbd mirror image status` for per-image details, and Prometheus metrics for continuous alerting. In Rook environments, the toolbox pod and Ceph Dashboard both provide convenient access to mirroring status.
