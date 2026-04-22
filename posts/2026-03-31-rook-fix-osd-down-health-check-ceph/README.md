# How to Fix OSD_DOWN Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Health Check, Recovery

Description: Learn how to diagnose and resolve the OSD_DOWN health warning in Ceph when one or more Object Storage Daemons stop responding and data recovery begins.

---

## Understanding OSD_DOWN

`OSD_DOWN` fires when one or more Ceph Object Storage Daemons (OSDs) are marked down. An OSD goes down when it stops responding to heartbeat messages from peers. Ceph will begin recovering affected PGs by remapping them to surviving OSDs if the OSD remains down long enough (default `mon_osd_down_out_interval` = 600 seconds).

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN 2 osds down
[WRN] OSD_DOWN: 2 osds down
    osd.3 (root=default,host=node2) is down
    osd.7 (root=default,host=node3) is down
```

## Identifying Affected OSDs

Get the full OSD status:

```bash
ceph osd stat
ceph osd tree | grep down
```

For detailed information about a specific OSD:

```bash
ceph osd find 3
ceph osd metadata 3
```

## Diagnosing in Rook

Find the OSD pods:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd -o wide | grep <node-name>
```

Check the pod status and logs:

```bash
kubectl -n rook-ceph logs <osd-pod-name> --previous
kubectl -n rook-ceph describe pod <osd-pod-name>
```

Common causes:
- Node failure or network issue
- Disk hardware failure
- OSD ran out of space
- Kernel crash or hung I/O

## Restarting a Crashed OSD

If the OSD pod is crash-looping but the disk is healthy, delete the pod to trigger a restart:

```bash
kubectl -n rook-ceph delete pod <osd-pod-name>
```

Monitor recovery:

```bash
ceph -w
```

Watch for `backfilling` and `recovering` to complete.

## Marking OSD In

If the OSD recovered but is still marked out:

```bash
ceph osd in 3
```

The "up" state is managed automatically by the OSD daemon - when the daemon starts and sends heartbeats to the monitors, the OSD is marked up. If the OSD is not coming up, restart the OSD pod (see above) and check its logs for errors.

## Checking Disk Health

If the OSD fails to restart, the underlying disk may be faulty:

```bash
# Check SMART data on the OSD disk
smartctl -a /dev/sdX

# Check for I/O errors in dmesg
dmesg | grep -E "error|failed|reset" | grep sdX
```

If the disk has hardware errors, the OSD must be replaced. See the OSD replacement procedure for Rook.

## Handling Temporary Node Downtime

If a node is intentionally down for maintenance:

```bash
# Prevent data backfill during short maintenance
ceph osd set noout
ceph osd set norebalance

# Do maintenance...

# Re-enable after node returns
ceph osd unset noout
ceph osd unset norebalance
```

## Monitoring OSD Health

Set up Prometheus alerting:

```yaml
- alert: CephOSDDown
  expr: ceph_osd_up == 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Ceph OSD {{ $labels.ceph_daemon }} is down"
    description: "OSD has been down for more than 5 minutes."
```

## Summary

`OSD_DOWN` indicates one or more OSDs are not responding. In Rook, inspect OSD pod logs and describe the pod to find the root cause. Restart crash-looping pods for transient failures, or replace the disk for hardware failures. Use `ceph osd set noout` during planned maintenance to suppress recovery operations. Always monitor OSD uptime to detect failures quickly before recovery pressure builds.
