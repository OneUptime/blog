# How to Handle Ceph Component Failures Gracefully

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, High Availability, Failure Handling, OSD, Monitor

Description: Learn strategies for handling OSD, Monitor, and MDS failures in a Rook-managed Ceph cluster to minimize data unavailability and recovery time.

---

Ceph is designed to tolerate component failures, but understanding how to handle them gracefully ensures faster recovery and avoids cascading issues. This guide covers OSD failures, Monitor outages, and MDS problems in a Rook-managed cluster.

## Handling OSD Failures

When an OSD fails, Ceph marks it as `down` and eventually `out`, triggering rebalancing. Check OSD status immediately:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
```

View which OSDs are down:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree | grep down
```

If a pod crashes but the underlying disk is healthy, restart the OSD deployment:

```bash
kubectl -n rook-ceph rollout restart deploy/rook-ceph-osd-0
```

To prevent premature rebalancing during short outages, increase `mon_osd_down_out_interval` beyond its default of 600 seconds (in seconds):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mon mon_osd_down_out_interval 1800
```

## Handling Monitor Failures

Ceph requires a majority of monitors to form quorum. With three monitors, one can fail:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon stat
```

If a monitor is stuck, delete its pod and let Rook recreate it:

```bash
kubectl -n rook-ceph delete pod rook-ceph-mon-b-<hash>
```

Rook automatically recreates monitor pods. Verify quorum is restored:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph quorum_status --format json-pretty
```

## Handling MDS Failures

CephFS uses an active-standby MDS configuration. If the active MDS fails, a standby takes over automatically. Check current MDS state:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status
```

Configure standby count in the `CephFilesystem` resource:

```yaml
spec:
  metadataServer:
    activeCount: 1
    activeStandby: true
```

## Set Up Failure Notifications

Use Ceph health alerts to detect failures early:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global mon_cluster_log_to_syslog true
```

Pair with a Prometheus alert rule:

```yaml
- alert: CephOSDDown
  expr: ceph_osd_up == 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Ceph OSD {{ $labels.ceph_daemon }} is down"
```

## Summary

Ceph handles component failures through built-in redundancy, but operators can reduce recovery time by configuring appropriate `mon_osd_down_out_interval` values, maintaining monitor quorum, and setting up active-standby MDS pairs. Rook automates pod restarts, but alerting via Prometheus ensures teams respond before failures cascade.
