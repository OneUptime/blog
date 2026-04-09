# How to Plan Ceph Version Upgrade Path

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Upgrade, Planning, Storage

Description: A structured approach to planning your Ceph upgrade path in Rook, including sequencing major versions, validating prerequisites, and minimizing risk.

---

## Overview

Ceph supports upgrading from up to two major releases back (N-2 to N), but not further. If you are running Pacific (16.x) and want to reach Squid (19.x), you need at least one intermediate upgrade step since Pacific is three releases behind Squid. Planning this path prevents data unavailability and operator errors.

## Determine Your Upgrade Sequence

First, identify your current version:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph version
```

Required upgrade sequences:
- Pacific (16.x) -> Reef (18.x) -> Squid (19.x) - shortest path, two hops
- Quincy (17.x) -> Squid (19.x) - direct upgrade supported
- Reef (18.x) -> Squid (19.x) - direct upgrade supported

## Pre-Upgrade Health Checklist

For each upgrade hop, validate cluster health first:

```bash
#!/bin/bash
echo "=== Cluster Status ==="
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status

echo "=== OSD Status ==="
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd stat

echo "=== PG Status ==="
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph pg stat

echo "=== Blocked OSDs ==="
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd blocked-by
```

All checks should show `HEALTH_OK` before proceeding.

## Rook Operator Upgrade First

Always upgrade the Rook operator before the Ceph daemons:

```yaml
# Step 1: Update operator image
image:
  tag: v1.15.0  # new Rook version supporting target Ceph

# Step 2: Update CephCluster image (separate step after operator is running)
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
```

Apply operator first, wait for it to be ready:

```bash
helm upgrade rook-ceph rook-release/rook-ceph --set image.tag=v1.15.0
kubectl -n rook-ceph rollout status deploy/rook-ceph-operator
```

## Plan for Extended Upgrade Windows

For large clusters, OSD upgrades take time. Estimate upgrade duration:

```bash
# Count OSDs to estimate time (roughly 2-5 minutes per OSD)
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd stat | awk '{print $1}'
```

Set appropriate upgrade timeouts in Rook:

```yaml
spec:
  disruptionManagement:
    managePodBudgets: true
    osdMaintenanceTimeout: 30
    pgHealthCheckTimeout: 10
```

## Staging Environment Validation

Run the upgrade on a staging cluster first. Use the same Rook and Ceph versions:

```bash
# Tag your current working config
kubectl get cephcluster rook-ceph -n rook-ceph -o yaml > pre-upgrade-cluster.yaml
kubectl get cephcluster rook-ceph -n rook-ceph -o jsonpath='{.spec.cephVersion.image}'
```

## Summary

Planning a Ceph upgrade path requires identifying the correct hop sequence (upgrades supported from up to two prior major versions), ensuring cluster health before each step, upgrading Rook operator before Ceph daemons, and validating in staging first. Document each step and set appropriate maintenance windows based on cluster size.
