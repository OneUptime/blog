# How to Run Ceph in a Single-Node Test Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Single-Node, Testing, Development, Configuration

Description: Configure and run a single-node Ceph cluster for testing and development using Rook with allowMultiplePerNode settings and reduced replica counts.

---

A single-node Ceph configuration is ideal for local testing, CI pipelines, and learning. While not suitable for production, it runs all Ceph components on one machine and exercises the same APIs as a multi-node cluster.

## Single-Node Configuration Requirements

Single-node deployments require relaxing several production-safety settings:
- `allowMultiplePerNode: true` for monitors
- Pool size set to 1 (no replication)
- `requireSafeReplicaSize: false`
- Node affinity rules removed

## Rook CephCluster for Single Node

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
    allowUnsupported: true
  dataDirHostPath: /var/lib/rook
  mon:
    count: 1
    allowMultiplePerNode: true
  mgr:
    count: 1
    allowMultiplePerNode: true
  dashboard:
    enabled: true
    ssl: false
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sd[b-z]|^vd[b-z]|^loop[0-9]"
  # Remove PodDisruptionBudgets for single-node
  disruptionManagement:
    managePodBudgets: false
```

## Single-Replica Pool Configuration

```yaml
# Create pools with size=1 for single-node testing
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: test-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 1
    requireSafeReplicaSize: false
```

For CephFS on a single node:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 1
      requireSafeReplicaSize: false
  dataPools:
    - name: data0
      replicated:
        size: 1
        requireSafeReplicaSize: false
  metadataServer:
    activeCount: 1
    activeStandby: false
```

## Quick Start with a Shell Script

```bash
#!/bin/bash
# setup-single-node-ceph.sh

set -euo pipefail

echo "Setting up single-node Ceph cluster..."

# Install operator
helm repo add rook-release https://charts.rook.io/release --force-update
helm upgrade --install rook-ceph rook-release/rook-ceph \
  -n rook-ceph --create-namespace

# Wait for operator
kubectl -n rook-ceph rollout status deploy/rook-ceph-operator --timeout=120s

# Create loop device for OSD
dd if=/dev/zero of=/tmp/ceph-osd.img bs=1M count=5120
LOOP_DEV=$(losetup --find --show /tmp/ceph-osd.img)
echo "Loop device: $LOOP_DEV"

# Apply single-node cluster config
kubectl apply -f - << EOF
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
    allowUnsupported: true
  dataDirHostPath: /var/lib/rook
  mon:
    count: 1
    allowMultiplePerNode: true
  mgr:
    count: 1
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^loop"
  disruptionManagement:
    managePodBudgets: false
EOF

echo "Waiting for cluster to be ready..."
kubectl -n rook-ceph wait CephCluster/rook-ceph \
  --for=jsonpath='{.status.phase}'=Ready \
  --timeout=300s

echo "Deploying toolbox for Ceph CLI access..."
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/toolbox.yaml
kubectl -n rook-ceph rollout status deploy/rook-ceph-tools --timeout=60s

echo "Single-node Ceph cluster ready!"
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status
```

## Checking Health on Single Node

Single-node clusters will always show some warnings - this is expected:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# These warnings are expected on single-node
ceph health detail
# HEALTH_WARN: too few PGs per OSD; mon-election leader changes...

# Suppress expected single-node warning about pool redundancy
ceph config set global mon_warn_on_pool_no_redundancy false
```

## Summary

Running Ceph in a single-node configuration requires relaxing production safety settings like replica counts and PodDisruptionBudgets, but provides a fully functional cluster for testing. Using loop devices for OSDs avoids the need for dedicated disks, making it practical for laptops, CI environments, and learning scenarios.
