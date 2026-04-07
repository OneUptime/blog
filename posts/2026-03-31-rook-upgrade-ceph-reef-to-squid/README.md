# How to Upgrade from Ceph Reef to Squid

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Upgrade, Kubernetes, Storage

Description: Step-by-step guide to upgrading a Rook-managed Ceph cluster from Reef (18.x) to Squid (19.x) with minimal downtime and rollback options.

---

## Overview

Ceph Squid (19.x) introduces significant improvements over Reef (18.x), including enhanced NVMe-oF support, improved dashboard, and better erasure coding performance. This guide walks through the upgrade process for a Rook-managed cluster.

## Prerequisites

Before starting the upgrade, verify your current cluster state is healthy:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

Ensure no `HEALTH_ERR` conditions exist and all OSDs are up:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
# Expected: x osds: x up, x in
```

## Step 1 - Update Rook Operator

Upgrade Rook to the version that supports Squid. Check the compatibility matrix first:

```bash
# Check current Rook version
kubectl -n rook-ceph get deployment rook-ceph-operator -o jsonpath='{.spec.template.spec.containers[0].image}'
```

Update the Rook operator image in your deployment or Helm values:

```yaml
image:
  repository: rook/ceph
  tag: v1.16.0  # supports Ceph Squid
```

Apply the update:

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --set image.tag=v1.16.0
```

## Step 2 - Update the CephCluster Resource

Edit the CephCluster custom resource to target Squid:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v19.2.0
    allowUnsupported: false
```

Apply the change:

```bash
kubectl apply -f cluster.yaml
```

## Step 3 - Monitor the Upgrade

Watch the Rook operator logs and pod rollout:

```bash
kubectl -n rook-ceph logs -f deploy/rook-ceph-operator
kubectl -n rook-ceph get pods -w
```

Monitor Ceph daemons upgrading in order - MON, MGR, OSD, MDS, RGW:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph versions
```

## Step 4 - Verify Upgrade Success

After all daemons show the Squid version, confirm cluster health:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph versions
# All components should show v19.x.x
```

## Summary

Upgrading from Ceph Reef to Squid via Rook involves updating the operator first, then updating the cephVersion image in the CephCluster resource. The operator orchestrates daemon upgrades sequentially and monitors cluster health throughout. Always verify cluster health before and after the upgrade process.
