# How to Set Up CephFS Mirroring with CephFilesystemMirror CRD in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Mirroring, Disaster Recovery, Kubernetes

Description: Configure CephFS asynchronous mirroring using the CephFilesystemMirror CRD in Rook to replicate filesystem data between two Ceph clusters for disaster recovery.

---

## Overview

CephFS mirroring enables asynchronous replication of CephFS directory snapshots between two Ceph clusters. In Rook, the `CephFilesystemMirror` CRD deploys the `cephfs-mirror` daemon and the `CephFilesystem` mirroring configuration enables snapshot-based replication per directory.

## Architecture

CephFS mirroring works by:

1. Taking periodic snapshots of specified CephFS directories
2. Replicating those snapshots to the remote cluster
3. Maintaining a consistent point-in-time copy at the secondary site

Unlike RBD mirroring, CephFS mirroring operates at the directory level, not the image level.

## Step 1 - Deploy the CephFilesystemMirror Daemon

Create the mirror daemon on the source cluster:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystemMirror
metadata:
  name: my-fs-mirror
  namespace: rook-ceph
spec:
  resources:
    requests:
      cpu: "100m"
      memory: "512Mi"
    limits:
      memory: "1Gi"
```

Apply on the source cluster:

```bash
kubectl apply -f cephfs-mirror.yaml
```

## Step 2 - Enable Mirroring on the Filesystem

Update your `CephFilesystem` on the source cluster to enable mirroring:

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
    - name: replicated
      replicated:
        size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
  mirroring:
    enabled: true
    snapshotSchedules:
      - path: /
        interval: 24h
        startTime: "2026-03-31T00:00:00"
```

## Step 3 - Bootstrap Peer Relationship

Generate the bootstrap token on the secondary cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs snapshot mirror peer_bootstrap create myfs client.mirror remote-site
```

The output provides a JSON token. On the primary cluster, import it:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs snapshot mirror peer_bootstrap import myfs '<token-json>'
```

## Step 4 - Verify Mirroring Status

Check the mirror daemon status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs snapshot mirror daemon status
```

Expected output (JSON format):

```json
[
  {
    "daemon_id": 12345,
    "filesystems": [
      {
        "filesystem_id": 1,
        "name": "myfs",
        "directory_count": 1,
        "peers": [
          {
            "uuid": "peer-uuid",
            "remote": {
              "client_name": "client.mirror",
              "cluster_name": "remote-site",
              "fs_name": "myfs"
            }
          }
        ]
      }
    ]
  }
]
```

Check the peer configuration:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs snapshot mirror peer_list myfs
```

## Step 5 - Configure Snapshot Schedules

Verify that snapshot schedules are active for the mirrored paths:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs snap-schedule status / --fs=myfs
```

You should see the configured schedule in JSON format showing the path, schedule interval, and start time.

## Monitoring Mirror Lag

Check replication lag by comparing snapshot timestamps between primary and secondary:

```bash
# On primary
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs snapshot mirror daemon status | python3 -m json.tool
```

## Summary

CephFS mirroring with Rook requires deploying the `CephFilesystemMirror` daemon on the source cluster, enabling mirroring in the `CephFilesystem` spec, and bootstrapping a peer relationship. Snapshot schedules control how frequently data is replicated to the secondary site. This setup provides directory-level asynchronous replication suitable for disaster recovery with configurable RPO based on snapshot intervals.
