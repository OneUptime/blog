# How to Manage MDS Roles and Failover in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Failover

Description: Learn how to manage MDS roles and configure automatic failover in CephFS to ensure high availability of metadata services in Rook-Ceph.

---

## Overview

The Metadata Server (MDS) is the brain of CephFS, managing the namespace and file metadata. In a production CephFS deployment, running multiple MDS daemons in active-standby or active-active configuration ensures high availability. Understanding MDS roles and how failover works is essential for operating a reliable distributed filesystem.

## MDS Role Types

CephFS MDS daemons operate in one of several roles:

- **active** - Handles client requests for one or more metadata subtrees (ranks)
- **standby** - Idle but ready to take over an active rank on failure
- **standby-replay** - Follows an active MDS journal to enable faster failover

## Check Current MDS State

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status cephfs
```

The output shows each MDS daemon, its current role, and which rank it serves.

## Configure Active and Standby Counts in Rook

In your `CephFilesystem` CRD, set `activeCount` for active MDS ranks and enable standby with `activeStandby`:

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
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        memory: "4Gi"
```

With `activeStandby: true`, Rook deploys a standby-replay MDS that tails the active MDS journal, enabling faster failover.

## Enable Standby-Replay Mode via CLI

To explicitly enable standby-replay mode for a filesystem:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs set cephfs allow_standby_replay true
```

## Trigger Manual Failover

To force a failover from the current active MDS to the standby:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mds fail cephfs:0
```

The standby MDS (especially if in standby-replay mode) will take over rank 0 within seconds.

## Verify Failover

Monitor the MDS state transition:

```bash
watch kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status cephfs
```

The previous standby will transition to `active` and the failed daemon will restart as `standby`.

## Adjust MDS Failover Behavior

Control how long Ceph waits before triggering automatic failover:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_beacon_grace 15

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mon mds_failure_timeout 30
```

Lower values mean faster failover detection but more sensitivity to transient hiccups.

## Summary

Managing MDS roles in Rook-Ceph involves configuring `activeCount` and `activeStandby` in the CephFilesystem CRD, understanding the active, standby, and standby-replay role types, and knowing how to manually trigger or monitor failover. Standby-replay mode significantly reduces metadata service interruption time during failures, making it the recommended configuration for production CephFS deployments.
