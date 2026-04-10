# Validation Summary: How to Benchmark Ceph After Version Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- RADOS (Reliable Autonomic Distributed Object Store) - Ceph's object store layer
- RBD (RADOS Block Device) - Ceph's block storage
- fio (Flexible I/O Tester) with the rbd ioengine
- Python 3 (for results parsing)
- BlueStore (Ceph's default OSD backend)

## Sources Consulted
- Ceph official documentation for `rados bench`: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph official documentation for pool management: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph official documentation for RBD: https://docs.ceph.com/en/latest/rbd/
- fio official documentation for the rbd ioengine: https://fio.readthedocs.io/en/latest/fio_doc.html
- fio JSON output format documentation: https://fio.readthedocs.io/en/latest/fio_doc.html#output
- Ceph CLI reference for `ceph osd perf`, `ceph pg ls`, `ceph daemon`, `ceph log`: https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found

### 1. Incorrect `rados bench` cleanup command
- **What was wrong:** The cleanup command was `rados bench -p benchmark-pool 60 write --cleanup`. This would run another 60-second write benchmark (with the default post-test cleanup behavior), not clean up objects from the previous `--no-cleanup` run.
- **What was changed:** Replaced with `rados -p benchmark-pool cleanup`, which is the correct standalone command to remove objects left by a prior `rados bench` run with `--no-cleanup`.
- **Why:** The `rados cleanup` subcommand is the intended way to remove benchmark objects. The original command would waste 60 seconds running an unnecessary write test.

### 2. Division by zero in Python comparison script
- **What was wrong:** The line `change = ((post_val - pre_val) / pre_val) * 100` would raise a `ZeroDivisionError` when `pre_val` is 0. This happens for every read metric in write-only tests (e.g., `seq-write.json` has `read_bw_mb = 0`) and every write metric in read-only tests.
- **What was changed:** Added a guard: skip metrics where both pre and post values are zero, and handle the case where only the pre value is zero.
- **Why:** Without this fix, the script would crash on the first test file it processes.

### 3. Unused `os` import in Python script
- **What was wrong:** The `os` module was imported but never used in the script.
- **What was changed:** Removed the `import os` line.
- **Why:** Unused imports are unnecessary and can confuse readers about what dependencies the script needs.

## Review Notes
- The "Pre-Upgrade Baseline Collection" section uses `benchmark-pool` before the "Creating a Dedicated Benchmark Pool" section explains how to create it. The ordering is a presentational choice and a reader would naturally create the pool first, but mentioning this for potential future improvement.
- The `ceph daemon osd.0 ops` command in the post-upgrade checklist requires being on the specific OSD host (it connects via the admin socket). An alternative that works from any monitor node is `ceph tell osd.0 ops`. Both are valid but have different access requirements.
- The `ceph osd pool create benchmark-pool 64 64` syntax specifying both pg_num and pgp_num is valid but the second argument is optional in Ceph Nautilus+ where pgp_num auto-follows pg_num. Not incorrect, just potentially redundant for newer clusters.
- The fio `--ioengine=rbd` requires the fio rbd engine to be compiled in, which depends on the fio build. The post could mention this prerequisite but it's reasonable to assume readers have a suitable fio build.
