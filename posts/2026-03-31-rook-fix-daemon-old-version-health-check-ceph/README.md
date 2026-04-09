# How to Fix DAEMON_OLD_VERSION Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Health Check, Upgrade, Daemon

Description: Learn how to diagnose and resolve the DAEMON_OLD_VERSION health warning in Ceph by identifying outdated daemons and upgrading them to the current cluster version.

---

## Understanding DAEMON_OLD_VERSION

Ceph reports `DAEMON_OLD_VERSION` when one or more daemons in the cluster are running a different (typically older) version than the rest. This commonly occurs after a partial upgrade where some nodes did not complete the upgrade process, or when a daemon was replaced with an older image.

Check cluster health to confirm the warning:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN 2 daemons running an older version of ceph or earlier
[WRN] DAEMON_OLD_VERSION: 2 daemons running an older version of ceph or earlier
    mon.ceph-mon-b is running ceph version 17.2.5 (older than 17.2.7)
    osd.3 is running ceph version 17.2.5 (older than 17.2.7)
```

## Identifying Affected Daemons

List all daemon versions in detail:

```bash
ceph versions
```

Output shows a breakdown by daemon type:

```text
{
    "mon": {
        "ceph version 17.2.7": 2,
        "ceph version 17.2.5": 1
    },
    "osd": {
        "ceph version 17.2.7": 11,
        "ceph version 17.2.5": 1
    }
}
```

Identify the specific node or pod running the old version:

```bash
ceph tell 'mon.*' version
ceph tell 'osd.*' version
```

## Fixing in Rook-Ceph (Kubernetes)

In a Rook-managed cluster, daemons run as Kubernetes pods. Fixing old versions means updating the Ceph image in the CephCluster resource:

```bash
kubectl -n rook-ceph get cephcluster rook-ceph -o yaml | grep image
```

Edit the CephCluster to update the image:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph --type=merge \
  -p '{"spec":{"cephVersion":{"image":"quay.io/ceph/ceph:v17.2.7"}}}'
```

Rook will automatically rolling-restart daemons to apply the new image. Monitor progress:

```bash
kubectl -n rook-ceph get pods -w
```

## Fixing in Bare Metal Ceph

On a bare metal deployment, update the Ceph packages on the affected host:

```bash
# On the host running the old daemon
apt update && apt install -y ceph-mon ceph-osd ceph-mgr
systemctl restart ceph-mon@$(hostname)
systemctl restart ceph-osd@3
```

After restarting, verify the version has updated:

```bash
ceph tell osd.3 version
```

## Verifying the Fix

Once all daemons are updated, recheck cluster health:

```bash
ceph health detail
```

Expected output after resolution:

```text
HEALTH_OK
```

If the warning persists, verify no daemons are stuck in a restart loop:

```bash
kubectl -n rook-ceph get pods | grep -v Running
```

Also check pod events for image pull errors:

```bash
kubectl -n rook-ceph describe pod <pod-name> | grep -A 10 Events
```

## Preventing Future Occurrences

Set up monitoring to alert on version drift using Prometheus:

```yaml
- alert: CephDaemonOldVersion
  expr: ceph_health_detail{name="DAEMON_OLD_VERSION"} > 0
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Ceph daemons are running mixed versions"
```

Always complete upgrades fully before declaring them done. Partial upgrades are the most common cause of `DAEMON_OLD_VERSION` warnings.

## Summary

The `DAEMON_OLD_VERSION` health check indicates daemons running mixed versions in the cluster. In Rook-managed clusters, update the `cephVersion.image` in the CephCluster resource to trigger a rolling restart. On bare metal, upgrade packages and restart affected services. Monitor version consistency with Prometheus alerts to catch partial upgrades early.
