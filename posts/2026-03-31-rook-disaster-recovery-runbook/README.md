# How to Create a Ceph Disaster Recovery Runbook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Disaster Recovery, Runbook, Backup, Kubernetes

Description: A structured Ceph disaster recovery runbook covering full cluster loss scenarios, data restoration from backups, and rebuilding a Rook-Ceph cluster from scratch.

---

## Disaster Scenarios Covered

This runbook addresses three failure tiers:
1. Partial failure - some nodes lost, cluster degraded but accessible
2. Quorum loss - monitors lost, cluster inaccessible
3. Total loss - all data lost, full rebuild required

## Scenario 1: Partial Cluster Failure

If some nodes are lost but quorum is maintained:

```bash
# Check which nodes are missing
kubectl get nodes
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree | grep down

# Mark lost OSDs out and allow recovery
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd out osd.3 osd.4

# Monitor recovery
watch kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

## Scenario 2: Monitor Quorum Loss

If majority of monitors are lost:

```bash
# On the surviving monitor node, extract the monmap
kubectl -n rook-ceph exec -it rook-ceph-mon-a-<pod> -- \
  ceph-mon --extract-monmap /tmp/monmap --mon-data /var/lib/ceph/mon/ceph-a

# Remove dead monitors from the map
kubectl -n rook-ceph exec -it rook-ceph-mon-a-<pod> -- \
  monmaptool --rm b /tmp/monmap
kubectl -n rook-ceph exec -it rook-ceph-mon-a-<pod> -- \
  monmaptool --rm c /tmp/monmap

# Inject and restart
kubectl -n rook-ceph exec -it rook-ceph-mon-a-<pod> -- \
  ceph-mon --inject-monmap /tmp/monmap --mon-data /var/lib/ceph/mon/ceph-a
kubectl -n rook-ceph delete pod rook-ceph-mon-a-<pod>
```

## Scenario 3: Full Cluster Rebuild

If the cluster is completely lost, restore from Velero or external backup:

```bash
# Restore namespace and PVCs from Velero
velero restore create ceph-restore \
  --from-backup ceph-daily-backup \
  --include-namespaces rook-ceph \
  --wait

# Verify PVCs are bound
kubectl -n rook-ceph get pvc
```

For object store data stored in RGW, use the S3 sync approach:

```bash
aws s3 sync s3://backup-bucket s3://new-bucket \
  --region us-west-2 \
  --endpoint-url http://new-rgw-endpoint
```

## RBD Image Recovery

If specific RBD images are corrupt:

```bash
# List images
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rbd ls replicapool

# Check for inconsistencies
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados list-inconsistent-pg replicapool

# Attempt repair
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg repair <pgid>
```

## Post-Recovery Verification

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
```

## Summary

A Ceph disaster recovery runbook must cover graduated failure scenarios: partial node loss handled by CRUSH replication, quorum loss addressed through monmap injection, and full cluster rebuild relying on external backups. Regular recovery drills validate the runbook before a real disaster occurs.
