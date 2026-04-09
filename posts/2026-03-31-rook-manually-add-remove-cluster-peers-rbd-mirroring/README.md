# How to Manually Add and Remove Cluster Peers for RBD Mirroring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Kubernetes, Storage

Description: Learn how to manually add and remove cluster peers for RBD mirroring in Ceph, enabling cross-cluster block storage replication for disaster recovery.

---

## Overview

RBD mirroring in Ceph allows block device images to be asynchronously replicated between clusters. Peer cluster management is the foundation of this setup - you must register clusters as peers before any image-level mirroring can occur.

## Prerequisites

Before adding peers, ensure both clusters have the `rbd-mirror` daemon running and the mirroring mode is enabled on your pool.

```bash
# Enable mirroring on a pool
rbd mirror pool enable replicapool pool

# Verify mirror mode
rbd mirror pool info replicapool
```

## Generating Bootstrap Token

On the primary cluster, generate a bootstrap token that the secondary cluster will use to authenticate:

```bash
# Create a bootstrap token for the peer cluster
rbd mirror pool peer bootstrap create \
  --site-name primary-cluster \
  replicapool
```

This outputs a base64-encoded token. Save it securely - it contains credentials for cross-cluster communication.

## Adding a Cluster Peer

On the secondary cluster, import the bootstrap token to register the primary as a peer:

```bash
# Store the bootstrap token in a variable
BOOTSTRAP_TOKEN="<base64-token-from-primary>"

# Import the peer using the token
rbd mirror pool peer bootstrap import \
  --site-name secondary-cluster \
  --direction rx-tx \
  replicapool \
  - <<< "$BOOTSTRAP_TOKEN"
```

Verify the peer was added successfully:

```bash
rbd mirror pool info replicapool
```

## Adding a Peer Manually Without Bootstrap

If you prefer manual configuration, you can add a peer by specifying the monitor endpoints directly:

```bash
rbd mirror pool peer add replicapool \
  client.rbd-mirror@primary-cluster \
  --remote-mon-host "10.0.0.1:6789,10.0.0.2:6789"
```

## Removing a Cluster Peer

To remove a peer, first get the peer UUID:

```bash
rbd mirror pool info replicapool
# Output includes:
#   Peers:
#     UUID: abc123
#     Name: primary-cluster
#     Client: client.rbd-mirror
```

Then remove using the UUID:

```bash
rbd mirror pool peer remove replicapool abc123
```

## Rook CRD Approach

When using Rook, peer management is handled through the `CephBlockPool` resource:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  mirroring:
    enabled: true
    mode: image
    peers:
      secretNames:
        - rbd-primary-site-secret
```

Create the peer secret from the bootstrap token:

```bash
kubectl create secret generic rbd-primary-site-secret \
  --from-literal=token="$BOOTSTRAP_TOKEN" \
  -n rook-ceph
```

## Summary

Adding and removing RBD mirroring peers involves generating bootstrap tokens on the primary cluster and importing them on the secondary. Rook simplifies this process through CRD-based peer secret management. Always verify peer connectivity with `rbd mirror pool info` after making changes.
