# How to Use the MDS Autoscaler Module in Ceph Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, MDS, CephFS, Autoscaling

Description: Learn how to use the Ceph Manager MDS Autoscaler module to automatically adjust the number of active MDS daemons based on file system workload.

---

The MDS Autoscaler module in Ceph Manager automatically adjusts the number of MDS daemon processes deployed by the orchestrator (e.g., cephadm) to match the `max_mds` and `standby_count_wanted` settings for CephFS file systems. This eliminates the need to manually adjust MDS service placement when you change file system configuration.

## Enabling the MDS Autoscaler

Enable the module:

```bash
ceph mgr module enable mds_autoscaler
```

Verify it is running:

```bash
ceph mgr module ls | grep mds_autoscaler
```

## How It Works

The autoscaler monitors the CephFS file system map (FSMap) for changes to:

- `max_mds` - the configured number of active MDS ranks
- `standby_count_wanted` - the configured number of desired standby daemons

When these settings change, the module calculates the total number of MDS daemons needed (`max_mds + standby_count_wanted`) and updates the orchestrator's MDS service placement specification so the correct number of daemon processes are deployed. The module does not make autonomous scaling decisions based on workload metrics - it automates MDS daemon deployment in response to administrator-configured settings.

## Checking Current MDS Configuration

Before enabling autoscaling, review the current MDS setup:

```bash
ceph fs status
```

```text
cephfs - 3 clients
========
RANK  STATE      MDS         ACTIVITY     DNS    INOS   DIRS   CAPS
 0    active     mds.a(104)  Reqs:  50/s  5.00k  6.00k  3.00k  6.00k

STANDBY-REPLAY
STANDBY
mds.b(103)  sf: 0 (laggy: no)
```

## Configuring MDS Counts

Configure the number of active MDS ranks and desired standbys on the file system:

```bash
ceph fs set cephfs max_mds 4
ceph fs set cephfs standby_count_wanted 2
```

The autoscaler reads these values and ensures the orchestrator deploys the correct total number of MDS daemons (active ranks plus standbys).

## Viewing Autoscaler Activity

Check the manager daemon logs for autoscaler activity:

```bash
ceph tell mgr. log recent | grep mds_autoscaler
```

Or watch the MDS rank count and daemon deployment over time:

```bash
watch -n 5 "ceph fs status cephfs"
```

## Changing Active MDS Ranks

To change the number of active MDS ranks, update `max_mds`:

```bash
ceph fs set cephfs max_mds 2
```

The autoscaler will detect this change and adjust the orchestrator's MDS service placement to match the new total daemon count.

## Rook Integration

In a Rook-managed cluster, set MDS scaling parameters in the `CephFilesystem` custom resource:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: cephfs
  namespace: rook-ceph
spec:
  metadataServer:
    activeCount: 1
    activeStandby: true
```

The `activeCount` field controls the number of active MDS daemons. Note that in Rook-managed clusters, the Rook operator enforces `activeCount` as the `max_mds` value during its reconciliation loop, so changes to `max_mds` made outside of Rook will be overridden.

## Summary

The Ceph Manager MDS Autoscaler module removes the burden of manually adjusting MDS daemon deployment when you change `max_mds` or `standby_count_wanted`. The module monitors these file system settings and automatically updates the orchestrator's placement specification to ensure the correct number of MDS daemons are running. Configure your desired active ranks and standby counts using `ceph fs set`, and the autoscaler handles the deployment logistics.
