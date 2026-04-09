# How to Rapidly Shut Down CephFS with ceph fs fail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Troubleshooting

Description: Learn how to rapidly shut down a CephFS filesystem using the ceph fs fail command for emergency situations or stuck MDS recovery.

---

## Overview

When a CephFS filesystem needs to be brought down immediately - such as when MDS daemons are stuck, the journal is corrupted, or clients are causing runaway load - the `ceph fs fail` command provides a rapid shutdown path. Unlike the graceful `down` flag approach, `ceph fs fail` forcibly stops the filesystem without waiting for journal flushing.

## Difference Between down and fail

The `ceph fs set <fs_name> down true` command initiates an orderly shutdown with journal flushing. The `ceph fs fail` command is an emergency mechanism that immediately marks the filesystem as failed, stopping all MDS daemons without waiting for in-progress operations to complete.

Use `ceph fs fail` when:
- MDS daemons are stuck in a loop and unresponsive
- The journal replay is taking too long and blocking recovery
- You need to immediately stop all client access

## Step 1 - Identify the Problem

Before using `fail`, understand the state of the filesystem:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status cephfs
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

Look for MDS daemons in `up:reconnect`, `up:rejoin`, or `down:damaged` states.

## Step 2 - Execute ceph fs fail

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs fail cephfs
```

This immediately transitions all MDS ranks to the failed state.

## Step 3 - Confirm the Filesystem is Failed

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status cephfs
```

The filesystem should show all ranks as stopped or failed with zero active MDS.

## Step 4 - Investigate and Repair

Once the filesystem is stopped, investigate the root cause. Check MDS logs:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-mds,rook_file_system=cephfs --tail=200
```

If journal repair is needed, run the MDS journal tool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-journal-tool --rank=cephfs:0 journal inspect
```

## Step 5 - Reset the Filesystem to Active

After resolving the issue, bring the filesystem back online:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs set cephfs joinable true
```

Then verify MDS daemons recover:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status cephfs
kubectl -n rook-ceph get pods -l app=rook-ceph-mds
```

## Caution

Since `ceph fs fail` does not flush the journal, there is a risk of metadata inconsistency. After using this command, always run a journal inspection before reconnecting clients:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-journal-tool --rank=cephfs:0 journal recover-dentries
```

## Summary

The `ceph fs fail` command provides an emergency shutdown path for CephFS when the graceful approach is not viable. It immediately stops all MDS daemons without journal flushing, making it suitable for stuck or corrupted MDS recovery scenarios in Rook-Ceph clusters. Always inspect and potentially repair the journal before bringing the filesystem back online.
