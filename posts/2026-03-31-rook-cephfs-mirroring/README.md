# How to Enable CephFS Mirroring in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CephFS, Mirroring, DisasterRecovery

Description: Configure CephFS directory-level mirroring between two Rook-Ceph clusters for asynchronous disaster recovery of shared filesystem data.

---

CephFS mirroring asynchronously replicates directories (using snapshot-based sync) between two Ceph clusters. This enables disaster recovery for shared filesystem workloads where `ReadWriteMany` PVCs need cross-site protection.

## CephFS Mirroring Architecture

```mermaid
flowchart LR
    subgraph Primary Cluster
        A[CephFilesystem: myfs] --> B[/volumes/team-a]
        A --> C[/volumes/team-b]
    end
    subgraph Secondary Cluster
        D[CephFilesystem: myfs] --> E[/volumes/team-a - replica]
        D --> F[/volumes/team-b - replica]
    end
    B -->|snapshot-based async| E
    C -->|snapshot-based async| F
```

## Prerequisites

- Two Rook-Ceph clusters with CephFS deployed on both
- Rook v1.6+ for `CephFilesystemMirror` CRD support
- Network connectivity between the two clusters

## Step 1: Deploy CephFilesystemMirror Daemon

On both primary and secondary clusters:

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
      cpu: "1"
      memory: "1Gi"
  placement:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: kubernetes.io/os
                operator: In
                values:
                  - linux
```

```bash
kubectl apply -f cephfilesystemmirror.yaml
kubectl get cephfilesystemmirror -n rook-ceph
kubectl get pods -n rook-ceph -l app=rook-ceph-fs-mirror
```

## Step 2: Enable Mirroring on the Filesystem

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    failureDomain: host
    replicated:
      size: 3
  dataPools:
    - name: data0
      failureDomain: host
      replicated:
        size: 3
  mirroring:
    enabled: true
    snapshotSchedules:
      - interval: 1h
        startTime: "00:00:00"
  preserveFilesystemOnDelete: true
  metadataServer:
    activeCount: 1
    activeStandby: true
```

Apply to both clusters.

## Step 3: Exchange Bootstrap Tokens

On the **primary** cluster, generate the bootstrap token:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph fs snapshot mirror peer_bootstrap create myfs client.mirror_remote primary
```

Copy the output token and create a secret on the **secondary** cluster:

```bash
# On secondary cluster
kubectl create secret generic fs-mirror-peer-primary \
  --from-literal=token=<bootstrap-token> \
  -n rook-ceph
```

Add the peer to the filesystem on the secondary cluster:

```yaml
spec:
  mirroring:
    enabled: true
    peers:
      secretNames:
        - fs-mirror-peer-primary
    snapshotSchedules:
      - interval: 1h
```

## Step 4: Add Directories for Mirroring

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash

# Add a directory to be mirrored
ceph fs snapshot mirror add myfs /volumes/team-a

# Add another directory
ceph fs snapshot mirror add myfs /volumes/team-b

# List mirrored directories
ceph fs snapshot mirror ls myfs
```

## Configure Snapshot Schedules

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash

# Enable snapshot scheduler
ceph mgr module enable snap_schedule

# Schedule hourly snapshots
ceph fs snap-schedule add /volumes/team-a 1h --fs myfs

# Keep 24 hourly and 7 daily snapshots
ceph fs snap-schedule retention add /volumes/team-a h 24 --fs myfs
ceph fs snap-schedule retention add /volumes/team-a d 7 --fs myfs

# Verify
ceph fs snap-schedule list --fs myfs
```

## Monitor Mirroring Status

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash

# Check overall mirroring daemon status
ceph fs snapshot mirror daemon status
```

Example output:

```yaml
  /volumes/team-a:
    state: up
    peers:
      - uuid: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        remote:
          site_name: primary
          fs_name: myfs
          client_name: client.fs-mirror
        last_synced_snap:
          id: 42
          name: .snap/scheduled-2026-03-31T000000Z
        last_synced_duration: 12 seconds
        last_synced_at: 2026-03-31 01:00:12
```

## Failover Procedure

If the primary site goes down:

```bash
# On secondary cluster - check if sync is current
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph fs snapshot mirror daemon status

# Stop mirroring on secondary (become authoritative)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph fs snapshot mirror remove myfs /volumes/team-a

# Filesystem on secondary is now fully writable
```

## Summary

CephFS mirroring in Rook uses the `CephFilesystemMirror` daemon and snapshot-based replication to asynchronously sync directories between clusters. After exchanging bootstrap tokens and adding directories to mirror, the daemon automatically syncs new snapshots at the configured schedule. Failover involves stopping mirroring on the secondary and redirecting application PVCs there.
