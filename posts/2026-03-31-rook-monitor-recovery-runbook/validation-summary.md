# Validation Summary: How to Create a Ceph Monitor Recovery Runbook

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Ceph Monitors (cluster map consensus daemons)
- Kubernetes (container orchestration)
- kubectl CLI
- ceph-mon CLI
- monmaptool CLI

## Sources Consulted
- [Ceph ceph-mon man page](https://docs.ceph.com/en/latest/man/8/ceph-mon/) — verified required `-i` and `--mon-data` flags
- [Ceph Adding/Removing Monitors](https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/) — confirmed monitor must be stopped before monmap injection
- [Ceph ceph_mon.cc source code](https://github.com/ceph/ceph/blob/main/src/ceph_mon.cc) — verified unconditional guards at lines 353-361 requiring `-i` and `--mon-data`
- [Rook Disaster Recovery Documentation](https://www.rook.io/docs/rook/latest-release/Troubleshooting/disaster-recovery/) — verified monmap recovery procedure and operator restart approach
- [Rook Monitor Health Documentation](https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-mon-health/) — confirmed operator auto-failover behavior
- [kubectl-rook-ceph mons restore-quorum](https://github.com/rook/kubectl-rook-ceph/blob/master/docs/mons.md) — modern automated alternative for quorum recovery

## Issues Found

### Issue 1: `ceph-mon` commands missing required `-i <mon-id>` flag (Step 4)
**What was wrong:** The `ceph-mon --extract-monmap` and `ceph-mon --inject-monmap` commands were missing the mandatory `-i <mon-id>` and `--mon-data` flags. The Ceph source code has unconditional guards that require both the monitor ID and data path — without them, the commands exit with "must specify id" errors.

**What was changed:** Added `-i a --mon-data /var/lib/ceph/mon/ceph-a` to both `ceph-mon` commands. Also changed the exec target from `rook-ceph-mon-a-<pod>` to `deploy/rook-ceph-mon-a` for consistency with the rest of the post.

### Issue 2: Missing requirement to stop monitor daemon before monmap injection (Step 4)
**What was wrong:** The post did not mention that the monitor daemon must be stopped before extracting or injecting a monmap. Running these commands while the daemon is active causes data corruption because they directly open the monitor's RocksDB store. The official Ceph documentation explicitly states: "Never inject into a monitor while the monitor daemon is running."

**What was changed:** Added pre-requisite steps to scale down the Rook operator and patch the surviving monitor deployment to run `sleep infinity` instead of the ceph-mon daemon, following the standard Rook disaster recovery procedure.

### Issue 3: Incorrect reconciliation trigger in Step 5
**What was wrong:** The command `kubectl annotate cephcluster rook-ceph rook.io/do-not-reconcile- --overwrite` removes an annotation that may never have been set, making it a no-op. Additionally, `rook.io/do-not-reconcile` is not the correct annotation name — the documented annotation for pausing reconciliation is `rook.io/pause-reconciliation`. The standard Rook procedure for resuming after manual mon recovery is to scale the operator back up.

**What was changed:** Replaced the annotation removal command with the documented approach: restoring the patched monitor deployment via `rollout undo` and scaling the operator back to 1 replica with `kubectl scale deployment rook-ceph-operator --replicas=1`.

## Review Notes
- The modern recommended approach for quorum loss recovery is the `kubectl rook-ceph mons restore-quorum <mon-name>` command from the kubectl-rook-ceph plugin, which automates all manual steps. The post could mention this as a preferred alternative in a future update.
- The quorum math (3 needs 2, 5 needs 3) is correct — Ceph uses majority quorum (n/2 + 1).
- The `ceph mon remove` command syntax in Step 3 is correct.
- The `--connect-timeout` flag in Step 2 is a valid ceph CLI option.
- All `kubectl` commands use correct syntax and the standard `rook-ceph` namespace.
