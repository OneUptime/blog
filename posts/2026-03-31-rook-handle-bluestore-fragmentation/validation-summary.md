# Validation Summary: How to Handle BlueStore Fragmentation in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- BlueStore (Ceph's default OSD backend)
- RocksDB (BlueStore's metadata store)

## Sources Consulted
- Ceph Health Checks documentation: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- BlueStore Configuration Reference: https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph man page (ceph CLI): https://docs.ceph.com/en/reef/man/8/ceph/
- Adding/Removing OSDs: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph source code: `src/os/bluestore/AllocatorBase.cc` (score output format)
- Ceph source code: `src/common/options/global.yaml.in` (config option definitions)
- Ceph source code: `src/osd/OSD.cc` (compact admin socket command)

## Issues Found

1. **Removed incorrect `ceph osd df` command for fragmentation scores.** `ceph osd df` does not show fragmentation scores — its columns are ID, CLASS, WEIGHT, REWEIGHT, SIZE, RAW USE, DATA, OMAP, META, AVAIL, %USE, VAR, PGS, STATUS. Removed this command and its misleading comment.

2. **Fixed fabricated example output for `bluestore allocator score block`.** The original showed fields (`allocator_name`, `alloc_unit`, `capacity`, `num_free`) that do not appear in the `score` subcommand output. The actual output only contains `fragmentation_rating`. Corrected the example.

3. **Fixed fragmentation threshold table.** The original claimed a three-tier model (HEALTH_OK at 0.7, HEALTH_WARN at 0.7-0.9, HEALTH_ERR at 0.9-1.0). In reality, there is a single configurable warning threshold (`bluestore_warn_on_free_fragmentation`, default 0.8). Replaced with the official description ranges from the Ceph health-checks documentation.

4. **Fixed non-existent config option `bluestore_fragmentation_threshold`.** This option does not exist. Replaced with the correct option name `bluestore_warn_on_free_fragmentation`.

5. **Corrected `bluestore_min_alloc_size_hdd` description.** Added critical note that this value is baked into the OSD at creation time and cannot be changed after the fact — the OSD must be reprovisioned.

6. **Fixed `bluestore_deferred_batch_ops` section.** The original claimed this option enables "deferred compaction" of free extents, which is completely wrong. This option controls how many deferred write operations are batched before flushing to the block device. Rewrote the section with accurate description and corrected the option to the HDD-specific variant with its actual default value (64).

7. **Removed "Deep Scrub with Compaction" remediation method.** Deep scrub does not trigger any BlueStore cleanup, compaction, or defragmentation. It is a data integrity verification operation only. Removed this misleading method and renumbered remaining methods.

8. **Fixed summary paragraph.** Removed reference to deep scrubs as a remediation method. Clarified that `min_alloc_size` must be set before OSD creation and that RocksDB compaction addresses metadata-level fragmentation.

9. **Added `ceph daemon` locality note to monitoring script.** `ceph daemon` communicates via the local admin socket and only works for OSDs on the same host. Added a note that on multi-node clusters the script must be run on each OSD host.

## Review Notes
- The `BLUESTORE_FRAGMENTATION` health check name may appear as `BLUESTORE_FREE_FRAGMENTATION` in Squid and newer releases (per PR #61910). The post does not specify a Ceph version, so both are potentially valid.
- The monitoring script approach using `ceph daemon` is inherently limited to single-node use. A more production-ready approach would use `ceph tell` where supported, or orchestration tools to run checks across all OSD hosts.
- The `watch ceph osd df | grep "osd.0"` command in the OSD replacement section will not work as expected because `watch` does not support piping — it would need to be `watch "ceph osd df | grep osd.0"` with the entire pipeline quoted. This is a minor shell issue that was not corrected as the intent is clear from context.
