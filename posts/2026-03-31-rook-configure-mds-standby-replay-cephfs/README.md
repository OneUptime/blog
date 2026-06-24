# How to Configure MDS Standby-Replay in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MDS, CephFS, High Availability, Kubernetes, Failover

Description: Learn how to configure MDS standby-replay mode in CephFS to minimize metadata server failover time from minutes to seconds for high availability deployments.

---

## Understanding MDS Standby Modes

CephFS supports two standby modes for MDS high availability:

- **Standby (cold)**: The standby MDS is idle and only takes over after the active MDS fails. Failover takes 1-5 minutes as the new MDS must replay the journal.
- **Standby-replay (warm)**: The standby MDS continuously tails the active MDS journal, staying nearly synchronized. Failover takes only seconds.

For production environments where metadata availability is critical, standby-replay is strongly recommended.

## Enabling Standby-Replay in Rook

Configure the CephFilesystem to enable standby-replay:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
  - replicated:
      size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
    resources:
      requests:
        memory: "6Gi"
        cpu: "1"
      limits:
        memory: "12Gi"
        cpu: "2"
```

The key field is `activeStandby: true`. This tells Rook to configure the standby MDS in replay mode.

## Verifying Standby-Replay is Active

Check the MDS status to confirm standby-replay is configured:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs status myfs
```

You should see output similar to:

```text
myfs - 0 clients
====
RANK  STATE             MDS       ACTIVITY     DNS    INOS   DIRS   CAPS
 0    active            myfs-a    Reqs:    0   10      13     12      1
 0-s  standby-replay    myfs-b    Evts:    0    0       0      0      0
      POOL              TYPE     USED  AVAIL
      myfs-metadata     metadata  96.0k  27.9G
      myfs-replicated   data       0    27.9G
```

The key indicator is the `standby-replay` state in the RANK column (`0-s`).

## Memory Requirements for Standby-Replay

The standby-replay daemon caches the same metadata as the active MDS (since it's replaying the journal). Therefore, it requires similar memory resources:

```yaml
metadataServer:
  activeCount: 1
  activeStandby: true
  resources:
    requests:
      memory: "8Gi"
    limits:
      memory: "16Gi"
```

Both the active and standby daemons will use similar amounts of memory.

## Testing Failover

Simulate an active MDS failure to verify failover speed:

```bash
# Get the active MDS pod name
kubectl -n rook-ceph get pods -l app=rook-ceph-mds

# Delete the active MDS pod
kubectl -n rook-ceph delete pod rook-ceph-mds-myfs-a-xxxxx

# Watch the failover happen
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch ceph fs status myfs
```

With standby-replay, the standby should become active within 5-15 seconds.

## Scaling for Multiple Active MDS

For deployments with multiple active MDS, each active MDS should have its own standby-replay daemon:

```yaml
metadataServer:
  activeCount: 2
  activeStandby: true
```

This creates 2 active + 2 standby-replay daemons (4 MDS pods total).

## Monitoring Replay Lag

Check how far behind the standby-replay daemon is:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.myfs-b status | grep replay
```

Note: Use `ceph tell` rather than `ceph daemon` from the tools pod, since `ceph daemon` requires the local admin socket which is only available inside the MDS pod itself.

A lag of more than a few seconds indicates the standby is having difficulty keeping up.

## Summary

MDS standby-replay dramatically reduces CephFS failover time from minutes to seconds by keeping a warm standby that continuously replays the active MDS journal. Enable it by setting `activeStandby: true` in the CephFilesystem spec, ensure the standby daemon has adequate memory resources comparable to the active MDS, and test failover behavior in staging before relying on it in production.
