# Validation Summary: How to Troubleshoot Data Scrubbing Consistency Problems in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (scrubbing, PG management, OSD configuration)
- Rook (CephBlockPool CRD)
- Kubernetes
- RADOS (consistency checking tools)
- smartctl (disk health monitoring)

## Sources Consulted
- Ceph official documentation on scrubbing: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph official documentation on `rados` CLI commands: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph PG states documentation: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Rook CephBlockPool CRD reference: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/

## Issues Found

1. **Incorrect `rados list-inconsistent-obj` and `rados list-inconsistent-snapset` syntax**: The post used `rados list-inconsistent-obj pool_name --pgid=3.4f` and `rados list-inconsistent-snapset pool_name --pgid=3.4f`. These commands take the PG ID as a positional argument, not a pool name with a `--pgid` flag. Fixed to `rados list-inconsistent-obj 3.4f` and `rados list-inconsistent-snapset 3.4f`.

2. **Non-standard `ceph pg ls +inconsistent` syntax**: The `+` prefix for PG state filtering is not valid Ceph CLI syntax. `ceph pg ls inconsistent` (already shown on the previous line) is the correct form. Removed the duplicate `+inconsistent` variant.

3. **Incorrect error type name `data_digest_mismatch_info`**: The actual Ceph scrub error type is `data_digest_mismatch`, not `data_digest_mismatch_info`. Fixed both occurrences in the JSON output example.

## Review Notes
- The "Preventing Future Inconsistencies" section header says "Enable stronger checksums at the pool level" but the YAML example sets scrub intervals rather than enabling checksums. The content is technically valid (setting scrub intervals is a valid preventive measure), but the introductory text is slightly misleading.
- The `ceph pg ls inconsistent | awk '{print $1}' | xargs` pipeline for bulk repair is a common pattern but should be used with caution in production, as repairing many PGs simultaneously can impact cluster performance. The post does not include this caveat.
- All Ceph configuration options (`osd_scrub_begin_hour`, `osd_scrub_end_hour`, `osd_scrub_sleep`, `osd_deep_scrub_stride`) are valid and correctly named.
- The `noscrub` and `nodeep-scrub` flags and their set/unset commands are correct.
