# How to Set Up Bootstrap Peer Processes for RBD Mirroring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, RBD Mirroring, Bootstrap Peer, Disaster Recovery

Description: Configure RBD image mirroring between two Ceph clusters using the bootstrap peer process to establish secure, authenticated replication for disaster recovery.

---

## What Is the Bootstrap Peer Process

RBD mirroring enables asynchronous replication of RADOS Block Device (RBD) images between two Ceph clusters. The bootstrap peer process simplifies establishing the trust relationship between clusters by generating a self-contained token on one cluster and importing it on the other.

The token contains the connection information and credentials needed for the rbd-mirror daemon to authenticate to the remote cluster.

## Architecture

```text
Primary Cluster (Site A)         Secondary Cluster (Site B)
  +-- rbd-mirror daemon           +-- rbd-mirror daemon
  |   (active on images)          |   (passive/secondary)
  |                               |
  +-- Pool: rbd                   +-- Pool: rbd
      Images mirrored to Site B       Receives mirror updates
```

## Prerequisites

- Ceph Nautilus (14.2.x) or later on both clusters
- Both clusters must have the `rbd-mirror` daemon deployed
- Network reachability between the Ceph monitor addresses of both clusters

## Step 1 - Enable Mirroring on Both Pools

On **both clusters**, enable mirroring on the target pool:

```bash
# Primary cluster
ceph osd pool application enable rbd rbd
rbd mirror pool enable rbd image  # or 'pool' for all images

# Secondary cluster
ceph osd pool application enable rbd rbd
rbd mirror pool enable rbd image
```

Use `image` mode (per-image opt-in) or `pool` mode (all images mirrored):

```bash
# Pool mode: all images in the pool are mirrored
rbd mirror pool enable rbd pool

# Image mode: only explicitly enabled images are mirrored
rbd mirror pool enable rbd image
```

## Step 2 - Generate Bootstrap Token on the Primary

On the **primary cluster**, generate the bootstrap token:

```bash
# Generate a bootstrap token (includes credentials + cluster info)
rbd mirror pool peer bootstrap create \
  --site-name primary \
  rbd > /tmp/bootstrap-token.txt

cat /tmp/bootstrap-token.txt
# Output: base64-encoded token
```

The token encodes:
- Monitor addresses of the primary cluster
- A client key with appropriate capabilities
- The cluster FSID and site name

## Step 3 - Import the Token on the Secondary

Copy the token file to the secondary cluster, then import it:

```bash
# On the secondary cluster
rbd mirror pool peer bootstrap import \
  --site-name secondary \
  --direction rx-only \
  rbd /tmp/bootstrap-token.txt

# Or for bidirectional (active-active) mirroring
rbd mirror pool peer bootstrap import \
  --site-name secondary \
  --direction rx-tx \
  rbd /tmp/bootstrap-token.txt
```

## Step 4 - Verify the Peer is Established

On **either cluster**:

```bash
# Show pool mirroring info including peers
rbd mirror pool info rbd

# Expected output:
# Mode: image
# Site Name: secondary
#
# Peer Sites:
#   UUID: a1b2-...
#   Name: primary
#   Mirror UUID: ...
#   Direction: rx-only
#   Client: client.rbd-mirror-peer
#   Mon Host: 10.0.0.1:6789,10.0.0.2:6789
```

## Step 5 - Deploy rbd-mirror Daemons

On **both clusters**, ensure the rbd-mirror daemon is running:

```bash
# Using cephadm
ceph orch apply rbd-mirror --placement="2 label:rbd-mirror"

# Verify
ceph orch ps | grep rbd-mirror
```

## Step 6 - Enable Mirroring on Specific Images

If using image mode:

```bash
# Enable mirroring on a specific image (snapshot mode, recommended)
rbd mirror image enable rbd/myimage snapshot

# Or use journal mode
# rbd mirror image enable rbd/myimage journal

# Verify
rbd mirror image status rbd/myimage
```

## Step 7 - Monitor Replication Status

```bash
# Pool-level mirroring status
rbd mirror pool status rbd

# Per-image status
rbd mirror image status rbd/myimage

# Detailed status
rbd mirror image status rbd/myimage --format json-pretty
```

Expected output when healthy:

```text
myimage:
  global_id: a1b2c3d4-...
  state: up+replaying
  description: replaying, master_position=[...], mirror_position=[...]
  last_update: 2026-03-31 10:00:00
```

## Rook Bootstrap Peer Configuration

In Rook, the bootstrap peer process is managed via Kubernetes Secrets and CephRBDMirror resources:

```bash
# Get bootstrap token via Rook toolbox on primary cluster
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror pool peer bootstrap create --site-name primary rbd \
  > bootstrap-token.txt

# Create secret on secondary cluster
kubectl -n rook-ceph create secret generic rbd-mirror-peer \
  --from-file=token=bootstrap-token.txt
```

```yaml
# Deploy CephRBDMirror daemon on secondary cluster
apiVersion: ceph.rook.io/v1
kind: CephRBDMirror
metadata:
  name: my-rbd-mirror
  namespace: rook-ceph
spec:
  count: 1
```

```yaml
# Configure the peer on the CephBlockPool (not the CephRBDMirror)
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: rbd
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  mirroring:
    enabled: true
    mode: image
    peers:
      secretNames:
        - rbd-mirror-peer
```

## Failover to Secondary

In a disaster recovery scenario:

```bash
# On secondary cluster, promote images
rbd mirror image promote --force rbd/myimage

# Verify
rbd mirror image status rbd/myimage
# state: up+stopped (now primary)
```

## Summary

The RBD mirror bootstrap peer process simplifies establishing replication between two Ceph clusters. Generate a token with `rbd mirror pool peer bootstrap create` on the primary, copy it to the secondary, and import with `rbd mirror pool peer bootstrap import`. Deploy rbd-mirror daemons on both sites and enable mirroring on images or pools. Monitor replication health with `rbd mirror image status`. In Rook, use the CephRBDMirror resource and Kubernetes Secrets to automate the peer configuration.
