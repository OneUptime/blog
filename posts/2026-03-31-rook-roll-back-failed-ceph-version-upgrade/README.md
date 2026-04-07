# How to Roll Back a Failed Ceph Version Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Rollback, Upgrade, Recovery

Description: Steps to safely roll back a failed Ceph version upgrade in Rook, including stopping the upgrade, reverting images, and recovering cluster health.

---

## Overview

A failed Ceph upgrade can leave the cluster in a mixed-version state or degraded health. Rook supports rolling back by reverting the cephVersion image, but the window for safe rollback depends on how far the upgrade progressed.

## Detect a Failed Upgrade

Signs of a failed upgrade include stuck pods, HEALTH_ERR, or OSDs not coming back up:

```bash
kubectl -n rook-ceph get pods | grep -v Running | grep -v Completed
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph health detail
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph versions
```

Check the Rook operator logs for error details:

```bash
kubectl -n rook-ceph logs deploy/rook-ceph-operator --tail=100 | grep -i error
```

## Stop the Upgrade

Pause Rook reconciliation to prevent further daemon restarts:

```bash
kubectl -n rook-ceph annotate cephcluster rook-ceph \
  rook.io/do-not-reconcile=true --overwrite
```

## Revert the CephCluster Image

Update the cephVersion image back to the previous version:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0  # revert to previous version
    allowUnsupported: false
```

Apply and remove the pause annotation:

```bash
kubectl apply -f cluster.yaml
kubectl -n rook-ceph annotate cephcluster rook-ceph \
  rook.io/do-not-reconcile- --overwrite
```

## Handle Partially Upgraded OSDs

If some OSDs upgraded but others did not, check their versions:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph tell osd.* version
```

Identify mismatched OSDs and restart them to pick up the reverted image:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd
kubectl -n rook-ceph delete pod rook-ceph-osd-0-xxxxx
```

## Recover Degraded PGs

After rollback, PGs may be degraded. Monitor recovery:

```bash
watch kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph pg stat
```

Force immediate recovery if needed:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph config set osd osd_recovery_delay_start 0
```

## Rollback Limitation: CRUSH Map Changes

If the upgrade involved CRUSH map changes, rollback is more complex. Export the map before upgrading next time:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd getcrushmap -o /tmp/crush.bin
kubectl cp rook-ceph/rook-ceph-tools-xxx:/tmp/crush.bin ./crush-backup.bin
```

## Summary

Rolling back a failed Ceph upgrade involves pausing Rook reconciliation, reverting the cephVersion image to the previous version, and restarting any partially upgraded daemons. Recovery is straightforward if caught before CRUSH map or OSD journal format changes are committed. Always take a CRUSH map backup before any major upgrade.
