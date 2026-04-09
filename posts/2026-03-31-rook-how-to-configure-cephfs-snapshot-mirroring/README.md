# How to Configure CephFS Snapshot Mirroring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, CephFS, Snapshot Mirroring, Disaster Recovery

Description: Configure CephFS snapshot mirroring to replicate filesystem snapshots to a remote Ceph cluster for disaster recovery and offsite backup purposes.

---

## What Is CephFS Snapshot Mirroring

CephFS snapshot mirroring (introduced in Ceph Pacific) enables asynchronous replication of CephFS directory snapshots from a primary cluster to a secondary cluster. Unlike block-level mirroring (RBD), it operates at the filesystem level, replicating only changed data between snapshots.

Use cases:
- Disaster recovery with offsite snapshot copies
- Cross-datacenter filesystem backup
- Dev/test environment seeding from production snapshots

## Architecture

```text
Primary Cluster (Site A)          Secondary Cluster (Site B)
  |                                  |
  +-- cephfs-mirror daemon           |
  |   (sends snapshots)              |
  |                                  |
  +-- Primary CephFS                 +-- Secondary CephFS
      /myfs/data/.snap/              |   (receives snapshots)
           snap1/                    |
           snap2/                    +-- Replicated snapshots
```

## Prerequisites

- Ceph Pacific (16.x) or later on both clusters
- Network connectivity between the clusters (cephfs-mirror uses the RADOS protocol)
- The `cephfs-mirror` daemon enabled on the primary cluster

## Step 1 - Enable the cephfs-mirror Daemon

On the primary cluster:

```bash
# Deploy the cephfs-mirror daemon using cephadm
ceph orch apply cephfs-mirror

# Verify it's running
ceph orch ls | grep cephfs-mirror
ceph fs snapshot mirror daemon status
```

## Step 2 - Enable Mirroring on the Filesystem

```bash
# Enable mirroring on the primary filesystem
ceph fs snapshot mirror enable myfs

# Verify
ceph fs snapshot mirror status myfs
```

## Step 3 - Create a Bootstrap Token on the Secondary Cluster

On the secondary cluster, generate a peer token:

```bash
# Generate a bootstrap peer token
ceph fs snapshot mirror peer_bootstrap create myfs-secondary client.admin site-secondary > /tmp/peer-token
cat /tmp/peer-token
```

## Step 4 - Import the Bootstrap Token on the Primary

On the primary cluster:

```bash
# Import the bootstrap token from the secondary
ceph fs snapshot mirror peer_bootstrap import myfs $(cat /tmp/peer-token)

# Verify the peer is added
ceph fs snapshot mirror peer list myfs
```

## Step 5 - Configure Directories to Mirror

Mirroring is configured per-directory. The directory must be at the root of the mirrored snapshot path:

```bash
# Enable mirroring for a specific directory
ceph fs snapshot mirror add myfs /data

# Verify
ceph fs snapshot mirror daemon status
```

## Step 6 - Create and Mirror Snapshots

Snapshots are created using standard CephFS snapshot commands:

```bash
# Create a snapshot (requires the directory to be mounted)
mkdir /mnt/cephfs/data/.snap/snap1

# The cephfs-mirror daemon automatically syncs it to the secondary
# Check sync status
ceph fs snapshot mirror daemon status
```

## Monitoring Replication

```bash
# Overall mirroring status
ceph fs snapshot mirror status myfs

# Peer information
ceph fs snapshot mirror peer list myfs

# Mirror daemon status (shows per-directory sync details)
ceph fs snapshot mirror daemon status
```

## Removing a Mirrored Directory

```bash
# Stop mirroring a directory
ceph fs snapshot mirror remove myfs /data

# Remove the peer
ceph fs snapshot mirror peer_remove myfs <peer-uuid>

# Disable mirroring on the filesystem
ceph fs snapshot mirror disable myfs
```

## Rook Configuration

In Rook, configure CephFS mirroring using the `CephFilesystemMirror` and `CephFilesystem` CRDs:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystemMirror
metadata:
  name: myfs-mirror
  namespace: rook-ceph
spec:
  count: 1
```

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  mirroring:
    enabled: true
    peers:
      secretNames:
        - rook-ceph-mirror-peer-secret
```

## Summary

CephFS snapshot mirroring replicates filesystem directory snapshots from a primary to secondary Ceph cluster for disaster recovery. The setup involves deploying the `cephfs-mirror` daemon, generating a bootstrap peer token on the secondary cluster, adding the peer to the primary, and enabling mirroring per directory. Snapshots are automatically detected and synchronized asynchronously. Monitor progress with `ceph fs snapshot mirror status` and `ceph fs snapshot mirror daemon status`.
