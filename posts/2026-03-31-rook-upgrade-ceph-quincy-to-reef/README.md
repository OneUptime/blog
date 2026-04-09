# How to Upgrade from Ceph Quincy to Reef

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Upgrade, Quincy, Reef, Operation

Description: Step-by-step guide to safely upgrading a Rook-managed Ceph cluster from Quincy (v17) to Reef (v18) with pre-upgrade checks and rollback procedures.

---

Upgrading from Ceph Quincy (v17) to Reef (v18) is a supported upgrade path. With Rook managing the cluster, the upgrade process is largely automated but requires careful preparation and monitoring to ensure a smooth transition.

## Pre-Upgrade Checklist

Before starting the upgrade:

```bash
# 1. Verify current Ceph version
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph version
# Should show: ceph version 17.x.x ... quincy

# 2. Verify cluster health
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
# Must be HEALTH_OK before proceeding

# 3. Check all OSDs are up
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
# All OSDs should be up and in

# 4. Verify no ongoing recovery
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
# Should show: 0 degraded, 0 misplaced, 0 recovering

# 5. Check Rook version supports Reef
kubectl -n rook-ceph get deploy rook-ceph-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
# Rook v1.12+ required for Ceph v18 (Reef)
```

## Upgrade Rook Operator First

Always upgrade Rook before upgrading Ceph:

```bash
# Check current Rook version
kubectl -n rook-ceph get deploy rook-ceph-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Upgrade Rook operator to v1.13 (supports Reef)
helm repo update
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --version v1.13.0

# Wait for operator to be ready
kubectl -n rook-ceph rollout status deploy/rook-ceph-operator --timeout=120s
```

## Upgrade the Ceph Cluster

Update the CephCluster spec to point to the Reef image:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0  # Change from v17.x.x
    allowUnsupported: false
```

```bash
# Apply the change
kubectl apply -f ceph-cluster.yaml

# OR use kubectl patch
kubectl -n rook-ceph patch CephCluster rook-ceph \
  --type merge \
  -p '{"spec":{"cephVersion":{"image":"quay.io/ceph/ceph:v18.2.0"}}}'
```

## Monitoring the Upgrade

```bash
#!/bin/bash
# monitor-upgrade.sh

NAMESPACE="${CEPH_NAMESPACE:-rook-ceph}"

echo "Monitoring Ceph upgrade..."
while true; do
  echo "=== $(date) ==="

  # Check version distribution
  kubectl -n "$NAMESPACE" exec deploy/rook-ceph-tools -- \
    ceph versions 2>/dev/null

  # Check cluster health
  HEALTH=$(kubectl -n "$NAMESPACE" exec deploy/rook-ceph-tools -- \
    ceph health 2>/dev/null)
  echo "Health: $HEALTH"

  # Check if all daemons are upgraded
  ALL_V18=$(kubectl -n "$NAMESPACE" exec deploy/rook-ceph-tools -- \
    ceph versions --format json 2>/dev/null | \
    python3 -c "
import sys, json
d = json.load(sys.stdin)
all_counts = sum(d.get('overall',{}).values())
v18_keys = [k for k in d.get('overall',{}) if 'reef' in k or '18.' in k]
v18_count = sum(d['overall'][k] for k in v18_keys)
print(f'{v18_count}/{all_counts} daemons on Reef')
" 2>/dev/null)
  echo "Upgrade progress: $ALL_V18"

  sleep 30
done
```

## Post-Upgrade Validation

```bash
# Verify all daemons are on Reef
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph versions
# All entries should show reef/v18

# Run full health check
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail

# Verify OSD functionality
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
# Write and read test objects
rados -p .mgr put upgrade-test /etc/hostname
rados -p .mgr get upgrade-test /tmp/upgrade-verify
diff /etc/hostname /tmp/upgrade-verify && echo 'Data integrity: OK'
rados -p .mgr rm upgrade-test
"

# Verify CSI drivers are updated
kubectl -n rook-ceph get pods -l app=csi-rbdplugin -o wide
```

## Rollback Procedure

If issues arise, rollback by reverting the image:

```bash
# Note: rolling back Ceph is generally not safe if OSDs have written data
# Only roll back if upgrade stalls before any OSD is upgraded

# Check if rollback is safe
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph versions --format json | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Daemon versions:', json.dumps(d, indent=2))
"

# Rollback if safe (only monitors/mgr upgraded, no OSDs)
kubectl -n rook-ceph patch CephCluster rook-ceph \
  --type merge \
  -p '{"spec":{"cephVersion":{"image":"quay.io/ceph/ceph:v17.2.7"}}}'
```

## Summary

Upgrading from Ceph Quincy to Reef with Rook involves upgrading the Rook operator first, then updating the CephCluster spec with the new image tag. Rook handles the rolling upgrade of all daemons in the correct order. Pre-upgrade health verification and continuous monitoring during the upgrade are the keys to a successful transition, and rollback is possible if issues arise before OSDs are upgraded.
