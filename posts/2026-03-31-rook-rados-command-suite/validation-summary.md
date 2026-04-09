# Validation Summary: How to Use the rados Command Suite

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Ceph RADOS (Reliable Autonomic Distributed Object Store)
- Rook (Kubernetes-native Ceph operator)
- `rados` CLI tool
- Ceph object pools and xattrs
- RADOS omap (per-object key-value store)
- Kubernetes (toolbox pod deployment)

## Sources Consulted
- https://docs.ceph.com/en/latest/man/8/rados/ — Official Ceph rados man page
- https://manpages.ubuntu.com/manpages/focal/en/man8/rados.8.html — Ubuntu rados manpage
- https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/ — Rook toolbox documentation
- https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/administration_guide/ceph-performance-benchmarking — Red Hat Ceph benchmarking guide

## Issues Found

**Issue 1: Incorrect `copy` subcommand and `--dest-pool` flag**
- Wrong: `rados -p sourcepool copy myobject --dest-pool destpool`
- The subcommand is `cp`, not `copy`. The flag for specifying the destination pool is `--target-pool`, not `--dest-pool`. The destination object name must also be provided.
- Fixed to: `rados -p sourcepool --target-pool destpool cp myobject myobject`

**Issue 2: `cppool` misused as a single-object move command**
- Wrong: `rados -p sourcepool cppool myobject destpool` described as "Move (copy and delete) an object"
- `cppool` is a pool-level operation that copies all objects from one entire pool to another. It does not operate on individual objects, and it does not delete the source. The `-p` flag and positional object name are also inapplicable.
- Fixed to: `rados cppool sourcepool destpool` with the comment "Copy all objects from one pool to another"

**Issue 3: Undocumented `ls --long` flag**
- `rados -p replicapool ls --long` is not documented in official Ceph man pages or source documentation. The `rados ls` command supports `--all` (list objects across all namespaces) and `--default`, but not `--long`.
- Fixed to: `rados -p replicapool ls --all` with the comment "List objects in all namespaces"

## Review Notes
- The `rados bench` default object size of 4 MB is correct; the `--no-cleanup` flag and `bench 30 seq/rand` subcommands are accurate.
- The `rados bench ... cleanup` command is valid for removing benchmark objects after a run.
- The `watch`, `stat`, `setxattr`, `getxattr`, `listxattrs`, `rmxattr`, `setomapval`, `getomapval`, and `listomapvals` commands are all syntactically correct.
- The Rook toolbox URL points to the `master` branch. In production it is preferable to pin to a specific release tag (e.g., `v1.16.x`) to avoid unexpected changes, but this is a stylistic concern rather than a technical error.
- `cppool` has a documented limitation: it only works with replicated target pools (not erasure-coded), and it does not preserve the `user_version` field or all snapshot metadata.
