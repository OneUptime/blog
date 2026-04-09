# How to Handle Stuck MDS Recovery in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MDS, CephFS, Recovery, Troubleshooting, Kubernetes

Description: Learn how to diagnose and resolve a stuck MDS recovery in CephFS when the filesystem fails to come back online after an MDS failure or restart.

---

## What is Stuck MDS Recovery?

When an active MDS fails, the standby takes over by replaying the journal. In some cases this recovery gets stuck - typically due to journal corruption, a client that won't release locks, or a deadlock in the recovery protocol. Stuck recovery means the CephFS filesystem is unavailable to all clients.

## Identifying Stuck Recovery

Check the filesystem status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs status myfs
```

Signs of stuck recovery:
- Status shows `up:replay` or `up:reconnect` for more than a few minutes
- Clients are unable to mount or getting I/O errors
- `ceph health detail` shows `FS_WITH_FAILED_MDS` or `FS_DEGRADED`

## Step 1 - Check MDS Logs

Inspect MDS pod logs for error messages:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-mds --tail=200 | \
  grep -E "ERROR|WARN|stuck|timeout|blocked"
```

Common messages indicating stuck recovery:
- `waiting for clients to reconnect` - clients not completing reconnection
- `failed to discover` - journal metadata recovery issue
- `mds damaged` - journal corruption detected

## Step 2 - Force Client Eviction

If clients are blocking recovery by not reconnecting:

```bash
# List clients stuck in reconnect state
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.myfs.a session ls

# Evict a specific stuck client
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.myfs.a client evict id=<client-id>
```

Reduce the reconnect timeout to force faster client eviction:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_reconnect_timeout 30
```

## Step 3 - Restart the MDS Daemon

If the MDS is stuck in an unrecoverable state:

```bash
# Delete the stuck MDS pod to force a restart
kubectl -n rook-ceph delete pod -l app=rook-ceph-mds --grace-period=0 --force
```

Watch for the standby to take over:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch ceph fs status myfs
```

## Step 4 - Reset the MDS with Fail Command

If the MDS is truly stuck, use the fail command to force a takeover:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mds fail myfs:0
```

## Step 5 - Handle Journal Damage

If journal corruption is preventing recovery:

```bash
# Check for journal damage
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.myfs:0 damage ls

# Stop the MDS before running journal tools - mark the filesystem as failed
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs fail myfs

# As a last resort, reset the journal (DATA LOSS RISK)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-journal-tool --rank=myfs:0 journal reset

# Bring the filesystem back online after journal reset
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs set myfs joinable true
```

Warning: journal reset may cause loss of recently written metadata.

## Preventing Stuck Recovery

```bash
# Enable standby-replay to minimize recovery time
# (set in CephFilesystem: activeStandby: true)

# Keep reconnect timeout short
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_reconnect_timeout 45
```

## Summary

Stuck MDS recovery is resolved by identifying whether clients or journal issues are the blocker. Start by checking MDS logs and client reconnection state, evict stuck clients, and restart the MDS pod if needed. Use `ceph mds fail` to force a standby takeover. Journal reset is a last resort that risks metadata loss. Prevent recurrence by enabling standby-replay and keeping reconnect timeouts reasonable.
