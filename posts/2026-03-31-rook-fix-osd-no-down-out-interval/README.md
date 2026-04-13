# How to Fix OSD_NO_DOWN_OUT_INTERVAL Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD

Description: Learn how to resolve the OSD_NO_DOWN_OUT_INTERVAL health warning in Ceph by configuring the mon_osd_down_out_interval setting correctly.

---

## What Is OSD_NO_DOWN_OUT_INTERVAL

The `OSD_NO_DOWN_OUT_INTERVAL` health warning appears when the `mon_osd_down_out_interval` configuration option is set to zero. This setting controls how long Ceph waits before marking a down OSD as "out" and redistributing its data. When set to zero, Ceph disables automatic out-marking entirely, meaning down OSDs are never automatically marked out and data is never automatically redistributed. The cluster cannot self-heal without manual intervention.

Check cluster health:

```bash
ceph health detail
```

Sample output:

```text
HEALTH_WARN mons have mon_osd_down_out_interval set to 0
[WRN] OSD_NO_DOWN_OUT_INTERVAL: mon rook-ceph-a has mon_osd_down_out_interval set to 0
    mon.rook-ceph-a has mon_osd_down_out_interval set to 0
```

## Why This Is Dangerous

With `mon_osd_down_out_interval` set to zero, Ceph will never automatically mark a down OSD as "out." This means if an OSD goes down - whether from a disk failure, node crash, or network partition - the cluster will not redistribute data to maintain the configured number of replicas. The degraded placement groups will remain degraded indefinitely until an administrator manually marks the OSD out with `ceph osd out <osd-id>`. This leaves the cluster vulnerable to further failures and potential data loss.

## Checking Current Value

Inspect the current setting:

```bash
ceph config get mon mon_osd_down_out_interval
```

A value of `0` triggers the health warning.

## Fixing the Warning

Set a reasonable interval. The default and recommended value is 600 seconds (10 minutes):

```bash
ceph config set mon mon_osd_down_out_interval 600
```

For clusters where faster rebalancing is acceptable (e.g., test environments), a value of 300 seconds is common:

```bash
ceph config set mon mon_osd_down_out_interval 300
```

## Verifying the Fix

Confirm the value was applied:

```bash
ceph config get mon mon_osd_down_out_interval
```

Expected output:

```text
600
```

Check cluster health:

```bash
ceph health
```

Expected:

```text
HEALTH_OK
```

## Rook-Specific Configuration

In a Rook-managed cluster, you can set this via the Rook `CephCluster` CR using the `cephConfig` section:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    mon:
      mon_osd_down_out_interval: "600"
```

Apply the change:

```bash
kubectl apply -f cephcluster.yaml
```

Rook will propagate the configuration to all monitor daemons automatically.

## Related Settings

While fixing this, also verify the companion setting `mon_osd_down_out_subtree_limit`, which prevents Ceph from marking too many OSDs out at once:

```bash
ceph config get mon mon_osd_down_out_subtree_limit
```

The default `rack` value means Ceph will not mark an entire rack's OSDs as out, preventing catastrophic data loss during rack-level failures.

## Summary

The `OSD_NO_DOWN_OUT_INTERVAL` warning indicates `mon_osd_down_out_interval` is zero, which disables automatic out-marking and prevents the cluster from self-healing when OSDs go down. Fix it by setting the interval to 300-600 seconds using `ceph config set` or via the Rook `CephCluster` CRD's `cephConfig` section.
