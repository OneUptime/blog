# Validation Summary: How to Fix LARGE_OMAP_OBJECTS Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- RADOS / BlueStore / RocksDB (Ceph internals)
- RGW (RADOS Gateway / S3-compatible object storage)
- CephFS (Ceph filesystem)
- radosgw-admin CLI

## Sources Consulted
- Ceph official documentation on OMAP and deep scrub configuration options
- Ceph MonCommands.h source for `ceph log last`, `ceph osd deep-scrub`, and `ceph osd pool deep-scrub` command definitions
- Ceph source code (qa/workunits/cephtool/test.sh) for `ceph osd deep-scrub` valid argument forms
- Ceph MDS documentation for `dirfrag` command syntax and arguments
- Red Hat Ceph Storage documentation for `rgw_override_bucket_index_max_shards` configuration
- Ceph documentation on `radosgw-admin bucket reshard` syntax

## Issues Found

### 1. Invalid command: `ceph pg dump_stuck | grep omap`
- **What was wrong:** `ceph pg dump_stuck` only outputs stuck placement groups (unclean, stale, inactive states) and contains no OMAP information. Grepping for "omap" would never match anything.
- **What was changed:** Replaced with `rados -p <pool-name> ls` to list objects in the affected pool, which is the correct first step before checking individual object OMAP key counts. Also changed section heading from "across pools" to "in a pool" to match the corrected command.
- **Why:** The original command would produce no output and mislead users trying to diagnose LARGE_OMAP_OBJECTS warnings.

### 2. Invalid command: `ceph osd deep-scrub all`
- **What was wrong:** `ceph osd deep-scrub` takes a specific OSD identifier (e.g., `0` or `osd.0`), not the keyword `all`. This command would fail with an error.
- **What was changed:** Replaced with `ceph osd pool deep-scrub <pool-name>`, which correctly triggers deep scrub for all PGs in a specific pool.
- **Why:** The corrected command is the standard approach for triggering deep scrub on a pool where LARGE_OMAP_OBJECTS has been detected.

### 3. Incorrect command and description: `ceph tell mds.* dirfrag split <directory-inode> 1`
- **What was wrong:** Multiple issues: (a) described as "Check large directories" but `dirfrag split` performs a split, not a check; (b) the command takes a filesystem path, not an inode number; (c) it requires three arguments (path, frag, bits), not two; (d) broadcasting via `mds.*` is inappropriate since only the authoritative MDS should handle a split.
- **What was changed:** Replaced with `ceph tell mds.0 dirfrag ls /path/to/large/directory` as a diagnostic command to list directory fragments, and updated the description to "List directory fragments to identify large directories."
- **Why:** The original command had incorrect syntax and wrong semantics. The replacement is a proper diagnostic command that matches the described intent.

### 4. Misleading OMAP threshold example
- **What was wrong:** The text said "Increase the OMAP warning threshold if needed" and set the value to 200000, which is already the default value in modern Ceph (Nautilus+). Setting it to the default doesn't increase anything.
- **What was changed:** Updated text to "Increase the OMAP warning threshold if the default (200000) is too sensitive" and changed the example value to 500000 to actually demonstrate an increase.
- **Why:** Users following the original command would be setting the threshold to its default, having no effect.

### 5. Wrong code fence language tag
- **What was wrong:** A ceph.conf configuration snippet in INI format was labeled as `yaml`.
- **What was changed:** Changed the code fence language from `yaml` to `ini`.
- **Why:** The content uses INI section syntax (`[client.rgw]`), not YAML. Correct syntax highlighting helps readers.

## Review Notes
- The `radosgw-admin bucket reshard`, `ceph tell osd.* compact`, `ceph config set client.rgw rgw_override_bucket_index_max_shards`, and `ceph log last` commands are all correct.
- The explanation of BlueStore storing OMAP data in RocksDB is accurate.
- The `mds_bal_split_size` and `mds_bal_merge_size` configuration options and values are correct.
- The post title mentions "Rook" but the content is entirely about Ceph CLI commands with no Rook-specific content. This is fine since Rook users interact with these same Ceph commands via the Rook toolbox pod.
