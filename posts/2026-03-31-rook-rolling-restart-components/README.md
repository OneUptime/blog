# How to Perform Rolling Restarts of Rook-Ceph Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Operation, Rolling Restart, Kubernetes, Maintenance

Description: Learn how to safely perform rolling restarts of Rook-Ceph components including monitors, OSDs, MGR, and MDS without causing cluster downtime.

---

## When Rolling Restarts Are Needed

Rolling restarts are required when:
- Applying configuration changes that require daemon restart
- Recovering from a crash loop without full cluster restart
- Updating container images without upgrading Ceph version
- Applying kernel updates on storage nodes

## Pre-Restart Health Check

Always verify the cluster is healthy before restarting any component:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
# Must be HEALTH_OK with all PGs active+clean
```

## Restarting OSD Pods (One at a Time)

Never restart all OSD pods simultaneously. Restart one at a time and wait for recovery:

```bash
# List all OSD pods
kubectl -n rook-ceph get pods -l app=rook-ceph-osd

# Restart a single OSD by deleting its pod (deployment will recreate it)
kubectl -n rook-ceph delete pod rook-ceph-osd-0-<pod-hash>

# Wait for it to be Running and Ready
kubectl -n rook-ceph wait --for=condition=Ready pod -l ceph-osd-id=0 --timeout=120s

# Verify cluster health before restarting next OSD
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

## Restarting Monitor Pods

For a 3-monitor cluster, restart monitors one at a time:

```bash
kubectl -n rook-ceph delete pod rook-ceph-mon-a-<hash>
# Wait for pod to recover and rejoin quorum
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon stat
```

## Restarting the MGR

```bash
kubectl -n rook-ceph rollout restart deployment/rook-ceph-mgr-a
kubectl -n rook-ceph rollout status deployment/rook-ceph-mgr-a
```

## Restarting MDS (CephFS Metadata Server)

MDS has active/standby pairs. The standby takes over when active is restarted:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mds
kubectl -n rook-ceph delete pod rook-ceph-mds-myfs-a-<hash>
# Standby MDS promotes automatically
# After new pod is ready, restart the standby
kubectl -n rook-ceph delete pod rook-ceph-mds-myfs-b-<hash>
```

## Restarting the RGW

```bash
kubectl -n rook-ceph rollout restart deployment/rook-ceph-rgw-my-store-a
kubectl -n rook-ceph rollout status deployment/rook-ceph-rgw-my-store-a
```

## Automating a Rolling OSD Restart

```bash
#!/bin/bash
set -euo pipefail
OSD_PODS=$(kubectl -n rook-ceph get pods -l app=rook-ceph-osd \
  -o jsonpath='{.items[*].metadata.name}')
for pod in $OSD_PODS; do
  echo "Restarting $pod..."
  kubectl -n rook-ceph delete pod "$pod"
  sleep 30
  kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph status | grep HEALTH
done
```

## Summary

Rolling restarts of Rook-Ceph components require restarting one daemon at a time with health checks between each restart. OSDs have the strictest requirement - the cluster must be `active+clean` before each restart to avoid compounding degradation with active recovery.
