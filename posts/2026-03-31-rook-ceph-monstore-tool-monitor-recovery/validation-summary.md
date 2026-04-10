# Validation Summary: How to Use ceph-monstore-tool for Monitor Recovery

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (monitor subsystem, RocksDB store)
- ceph-monstore-tool
- monmaptool
- osdmaptool
- ceph-mon (inject-monmap)
- Rook (Kubernetes Ceph operator)
- kubectl

## Sources Consulted
- ceph-monstore-tool man page: https://docs.ceph.com/en/latest/man/8/ceph-monstore-tool/
- monmaptool man page: https://docs.ceph.com/en/latest/man/8/monmaptool/
- Ceph Troubleshooting Monitors: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/
- ceph-monstore-tool source (ceph/src/tools/ceph_monstore_tool.cc): https://github.com/ceph/ceph/blob/main/src/tools/ceph_monstore_tool.cc
- ceph-monstore-tool RST doc source: https://github.com/ceph/ceph/blob/main/doc/man/8/ceph-monstore-tool.rst

## Issues Found

1. **Incorrect `--` placement before subcommands (lines 33, 37, 47, 74, 96):** All `ceph-monstore-tool` invocations placed `--` before the subcommand name (e.g., `-- store-copy`, `-- get monmap`, `-- compact`). Per the man page, the correct syntax is `ceph-monstore-tool <path> <subcommand> [-- <options>]` — the `--` separator goes between the subcommand and its options, not before the subcommand itself. Fixed all occurrences.

2. **Misleading comment on store-copy command (line 32):** Comment said "List all keys in the monitor store" but the `store-copy` command copies the entire store to a destination path, not list keys. Changed to "Back up the monitor store".

3. **`get monmap` and `get osdmap` output method (lines 38, 48):** Changed from stdout redirect (`> /tmp/monmap.bin`) to the idiomatic `-- --out /tmp/monmap.bin` flag, which is the documented way to specify output files for the `get` subcommand.

4. **Incorrect tar extraction paths in Rebuild section (lines 59-68):** The original `tar czf - /var/lib/ceph/mon/ceph-b/store.db` preserves the full directory path in the archive. When extracted with `-C /var/lib/ceph/mon/ceph-a/`, the result would be at `ceph-a/var/lib/ceph/mon/ceph-b/store.db`, not `ceph-a/ceph-b/store.db` as the subsequent `mv` assumed. Fixed by using `-C /var/lib/ceph/mon/ceph-b store.db` in the tar creation to produce a relative path, then extracting directly into the target directory. Eliminated the incorrect `mv` step.

5. **Wrong monitor name format in monmaptool --rm (line 90):** `monmaptool --rm mon-a` used the deployment name prefix. In Rook-Ceph, monitor IDs in the monmap are short names like `a`, `b`, `c`. Changed to `monmaptool --rm a`.

6. **Non-existent `update-monmap` subcommand (line 96):** `update-monmap` is not a valid ceph-monstore-tool subcommand. The valid subcommands are: store-copy, get, get-key, remove-key, show-versions, dump-keys, dump-paxos, dump-trace, replay-trace, rewrite-crush, rebuild, compact. Replaced with the standard `ceph-mon -i b --inject-monmap /tmp/monmap` which is the correct way to inject a modified monmap into a stopped monitor's store.

## Review Notes
- The "Emergency: Remove a Failed Monitor" section uses `ceph mon getmap` which requires an existing quorum. If quorum is completely lost (e.g., majority of monitors down), this command will not work. In that scenario, the monmap would need to be extracted from a monitor's store using `ceph-monstore-tool <path> get monmap`. This is a valid edge case but not incorrect for the partial-failure scenario the section describes.
- In a Rook environment, after removing a monitor from the monmap, operators should also update the Rook ConfigMap (`rook-ceph-mon-endpoints`) and the corresponding Kubernetes Secret to reflect the new monitor topology. This is Rook-specific operational detail beyond the scope of this ceph-monstore-tool focused post.
- The `ceph-mon -i b --inject-monmap` command requires the monitor daemon to be stopped, which is consistent with the post's guidance to scale down deployments first. In Rook, this would typically be run from a debug pod or toolbox with access to the monitor's data volume.
