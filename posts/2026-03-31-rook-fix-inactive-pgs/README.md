# How to Fix Inactive PGs in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, Troubleshooting, Recovery

Description: Learn how to diagnose and fix inactive Placement Groups in Ceph clusters managed by Rook, restoring data access and cluster health.

---

## What Are Inactive PGs?

An "inactive" Placement Group is one that does not currently have an active set of OSDs that can serve as primary. Inactive PGs cannot serve client reads or writes. The data they contain is inaccessible until the PG becomes active again. Inactive PGs are more severe than undersized PGs because they block I/O entirely.

## Identifying Inactive PGs

Check cluster health for inactive PG alerts:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail
```

Count inactive PGs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg stat | grep inactive
```

List the specific inactive PGs and their states:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump_stuck inactive
```

## Common Causes

1. **All OSDs in a PG's acting set are down**: No OSD can serve as primary
2. **CRUSH rule cannot be satisfied**: Not enough OSDs in the correct failure domains
3. **OSD is in a `down+out` state**: The OSD crashed and Ceph has not yet completed backfill
4. **Monitor quorum issues**: PGs cannot get map updates from monitors

## Step 1 - Check OSD Status

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tree | grep -E "down|out"

kubectl -n rook-ceph get pods -l app=rook-ceph-osd | grep -v Running
```

Identify which OSDs are down and restart their pods:

```bash
kubectl -n rook-ceph delete pod <osd-pod-name>
```

## Step 2 - Check CRUSH Rules

Verify CRUSH rules can be satisfied with current OSDs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush rule list

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush rule dump replicated_rule
```

If failure domain constraints cannot be met (e.g., requiring 3 hosts but only 2 available), adjust the rule or pool size.

## Step 3 - Force Recovery

If PGs are stuck inactive after OSDs recover, trigger a recovery:

```bash
# Get a specific inactive PG ID
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump_stuck inactive | awk '{print $1}' | head -5

# Force the PG to re-peer
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg repeer <pgid>
```

## Step 4 - Mark Down OSDs as Out

If an OSD is permanently down, mark it out to trigger recovery:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd out osd.<id>
```

This initiates backfill of the PGs to remaining OSDs, bringing them back to active state.

## Monitoring Recovery

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch -n 10 "ceph status | grep -E 'inactive|recovering|backfill'"
```

## Summary

Inactive PGs block client I/O and require immediate attention. They are caused by all replicas being unavailable or CRUSH constraints being unsatisfiable. Fix by recovering downed OSD pods, marking permanently failed OSDs as out, or adjusting CRUSH rules and pool size to match available infrastructure. Monitor recovery progress until all PGs return to `active+clean`.
