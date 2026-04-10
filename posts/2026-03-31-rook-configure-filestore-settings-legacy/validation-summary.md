# Validation Summary: How to Configure FileStore Settings in Ceph (Legacy)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (FileStore OSD backend)
- Rook (Ceph operator for Kubernetes)
- BlueStore (modern Ceph OSD backend, referenced for migration)
- XFS (filesystem used by FileStore)
- Kubernetes / kubectl

## Sources Consulted
- Ceph official documentation on FileStore configuration options (https://docs.ceph.com/en/latest/rados/configuration/filestore-config-ref/)
- Ceph official documentation on OSD backends and BlueStore migration (https://docs.ceph.com/en/latest/rados/operations/bluestore-migration/)
- Ceph release notes for Luminous, Reef regarding FileStore deprecation and removal
- Rook documentation on OSD management (https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/)

## Issues Found

1. **Non-standard abbreviation "WAJ"**: The post used "write-ahead journal (WAJ)" but "WAJ" is not a standard abbreviation in Ceph documentation or storage literature. The standard term is "WAL" (Write-Ahead Log) and Ceph docs simply refer to "the journal" or "write-ahead journal" without abbreviation. Removed the "(WAJ)" parenthetical to avoid confusion.

2. **Incorrect `filestore_queue_max_bytes` value**: The value was `100485760`, which is ~95.8 MiB due to transposed digits. The correct value for 100 MiB is `104857600` (100 * 1024 * 1024). Fixed to `104857600`.

3. **Inaccurate FileStore deprecation timeline**: The post stated "FileStore is deprecated as of Ceph Reef and removed in later releases." This is incorrect — BlueStore became the default OSD backend in Ceph Luminous (2017), and FileStore was deprecated at that point. FileStore was actually removed in Ceph Reef (2023), not deprecated in Reef. Corrected to: "FileStore has been deprecated since Ceph Luminous (where BlueStore became the default) and is removed in Ceph Reef and later releases."

## Review Notes
- The `filestore_journal_writeahead` configuration option is valid in older Ceph versions but may not be recognized in releases where FileStore has been removed. Since this post is explicitly about legacy clusters, this is acceptable.
- The migration approach described (mark out, delete deployment, let Rook reprovision) is a simplified workflow. In production, operators should also verify PG states are active+clean before proceeding to the next OSD and may need to purge the OSD from the CRUSH map. The post covers the basics adequately for a guide.
- The `ceph osd metadata` jq query is correct and will produce the expected output showing OSD backend types.
- All kubectl commands use the correct Rook namespace (`rook-ceph`) and toolbox deployment pattern.
