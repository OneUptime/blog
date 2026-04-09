# Validation Summary: How to Check MDS Status and Active/Inactive Tracking in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (MDS / CephFS)
- Rook (Kubernetes Ceph operator)
- Kubernetes (kubectl)
- CephFilesystem CRD (ceph.rook.io/v1)

## Sources Consulted
- Ceph official documentation: MDS States (https://docs.ceph.com/en/latest/cephfs/mds-states/)
- Ceph official documentation: CephFS Administration (https://docs.ceph.com/en/latest/cephfs/administration/)
- Ceph official documentation: Monitoring a Cluster (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Ceph official documentation: CephFS Standby (https://docs.ceph.com/en/latest/cephfs/standby/)
- Ceph source code: `src/common/ceph_strings.cc` - `ceph_mds_state_name()` function for MDS state string representations
- Ceph source code: `src/mds/MDSDaemon.cc` - admin socket commands (`cache status`, `dump_ops_in_flight`)
- Rook documentation: CephFilesystem CRD (https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/)
- Rook GitHub: filesystem design doc and related issues (#2768, #12576)

## Issues Found
No technical issues found.

All commands, configuration snippets, MDS states, and technical explanations were verified as accurate:

- `ceph mds stat` and `ceph fs status <fsname>` are valid commands with correct sample output formats.
- All six MDS states listed (`up:active`, `up:standby`, `up:standby-replay`, `up:creating`, `up:rejoin`, `up:stopping`) are valid. The `up:standby-replay` form (hyphen) matches the Ceph source code output string.
- The Rook CephFilesystem CRD YAML is correct, including `activeStandby: true` enabling standby-replay mode (Rook sets `allow_standby_replay` on the filesystem).
- `ceph tell mds.<name> cache status` and `ceph tell mds.<name> dump_ops_in_flight` are valid admin socket commands confirmed in Ceph source.
- `ceph log last 100` is a valid command in modern Ceph.
- Pod label `app=rook-ceph-mds` is the correct selector for Rook MDS pods.
- The claim that `activeCount: 2` with `activeStandby: true` requires 4 MDS pods is correct (Rook deploys `activeCount x 2` pods).

## Review Notes
- The Ceph official documentation page for MDS states uses `up:standby_replay` (underscore), while the actual Ceph source code and CLI output use `up:standby-replay` (hyphen). The blog post correctly uses the hyphenated form that matches CLI output.
- The description of `up:creating` as "Initializing new filesystem" is a slight simplification. More precisely, this state is entered when an MDS rank creates its initial per-rank metadata objects (journal, etc.), which happens for both new filesystems and new ranks added to existing filesystems.
- There is a known Rook bug (issue #12576) where changing `activeStandby` from `true` to `false` on an existing CephFilesystem has no effect. This could be worth mentioning in a future update but is not an error in the current post.
- The post does not list all MDS states (omitting `up:boot`, `up:starting`, `up:replay`, `up:resolve`, `up:reconnect`, `up:clientreplay`, `down:failed`, `down:damaged`, `down:stopped`), but the selected states are the most relevant for operational monitoring, which is appropriate for the post's scope.
