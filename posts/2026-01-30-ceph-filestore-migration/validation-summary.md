# Validation Summary: How to Build Ceph FileStore Migration

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Ceph OSDs
- FileStore
- BlueStore
- ceph-volume
- cephadm orchestrator
- Bash scripting
- LVM-backed storage devices

## Sources Consulted
- Ceph BlueStore Migration documentation: https://docs.ceph.com/en/reef/rados/operations/bluestore-migration/
- Ceph Adding/Removing OSDs documentation: https://docs.ceph.com/en/reef/rados/operations/add-or-rm-osds/
- Ceph ceph-volume lvm zap documentation: https://docs.ceph.com/en/reef/ceph-volume/lvm/zap/
- Ceph BlueStore Configuration Reference: https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph ceph CLI manual: https://docs.ceph.com/en/reef/man/8/ceph/
- Ceph cephadm OSD service documentation: https://docs.ceph.com/en/reef/cephadm/services/osd/
- Ceph Luminous release notes: https://docs.ceph.com/en/latest/releases/luminous/
- Ceph Nautilus release notes: https://docs.ceph.com/en/latest/releases/nautilus/
- Ceph Glossary: https://docs.ceph.com/en/latest/glossary/

## Issues Found
- The post said BlueStore requires Ceph Luminous or later. Updated this to clarify that BlueStore became the default in Luminous and that FileStore is not supported in Reef and later.
- The FileStore vs BlueStore table and conclusion claimed fixed 2x write performance and 1x write amplification. Reworded those claims to workload-dependent language that better matches Ceph's official guidance.
- The free-space guidance used an oversimplified 1/N rule. Replaced it with guidance to ensure enough capacity to backfill the selected OSD without hitting nearfull or backfillfull thresholds.
- The pre-migration flags recommended `nobackfill` and `norecover`, which would prevent the migration/backfill workflow from progressing. Replaced them with `noscrub` and `nodeep-scrub`, and added unset commands.
- The wait logic checked for generic degraded/recovering text instead of using Ceph's `ceph osd safe-to-destroy` command. Updated the manual and automated workflows to wait until the target OSD is safe to destroy.
- The removal workflow used deprecated `ceph osd rm` plus manual CRUSH/auth removal. Updated it to use `ceph osd destroy --yes-i-really-mean-it` so the OSD ID and CRUSH entry can be reused for replacement, matching the official migration flow.
- The disk wipe snippets used manual `wipefs`, `dd`, and `sgdisk` steps. Replaced these with `ceph-volume lvm zap <device> --destroy`, which is the documented Ceph tool for this purpose.
- The BlueStore deployment commands created a new OSD without preserving the original OSD ID. Updated them to use `ceph-volume lvm create --bluestore --data <device> --osd-id <id>`.
- The automated script waited for `HEALTH_OK`, which can fail while expected maintenance flags are set. Replaced this with PG-clean and safe-to-destroy checks.
- The checksum example used a global `ceph config set osd bluestore_csum_type` command. Updated it to show the documented per-pool `csum_type` setting and clarified that checksums are enabled by default.
- The rollback section implied FileStore rollback was generally available and used deprecated OSD removal. Clarified that rollback is only for legacy pre-Reef clusters and updated the OSD destroy and zap commands.

## Review Notes
The guide is technically relevant and salvageable, but FileStore migration is version-sensitive. Future updates should consider splitting cephadm-managed and non-cephadm-managed workflows, because orchestrated clusters use `ceph orch osd rm --replace` and drive-group behavior that differs from direct `ceph-volume` administration.
