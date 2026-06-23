# Validation Summary: How to Upgrade Ceph Cluster with Zero Downtime

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Ceph
- Ceph monitors, managers, OSDs, MDS, and RADOS Gateway
- CephFS
- RADOS and RBD
- Linux systemd
- Bash
- jq
- curl

## Sources Consulted
- Ceph cephadm upgrade documentation: https://docs.ceph.com/en/latest/cephadm/upgrade/
- Ceph Squid release upgrade notes: https://docs.ceph.com/en/latest/releases/squid/
- Ceph Reef release upgrade notes: https://docs.ceph.com/en/latest/releases/reef/
- CephFS MDS upgrade documentation: https://docs.ceph.com/en/latest/cephfs/upgrading/
- Ceph health checks and OSD flags documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph CLI manual for manager and MDS commands: https://docs.ceph.com/en/reef/man/8/ceph/
- CephFS administrative commands: https://docs.ceph.com/en/latest/cephfs/administration/
- Ceph glossary for component definitions: https://docs.ceph.com/en/latest/glossary/

## Issues Found
- The post presented a single upgrade order as universally recommended. I clarified that cephadm-managed clusters should use `ceph orch upgrade`, while the manual package workflow applies to non-cephadm clusters.
- The manual workflow upgraded RGW before MDS, but recent Ceph release notes document MDS before RGW for non-cephadm upgrades. I updated the diagrams and conclusion to use MON -> MGR -> OSD -> MDS -> RGW.
- The post implied `ceph features` was a version compatibility matrix. I changed the wording to explain that release-specific upgrade notes determine supported upgrade paths, while `ceph features` reports feature bits.
- The pre-upgrade disk-space script parsed `ceph osd df` column positions incorrectly. I changed it to use `ceph osd df --format json` and `jq`.
- Several scripts parsed `ceph mgr stat` as JSON. I changed those checks to use `ceph mgr dump --format json`.
- The OSD host upgrade and rollback scripts used fragile `ceph osd tree | grep -A1` parsing that could miss OSDs. I changed those commands to parse `ceph osd tree --format json`.
- The MDS upgrade guidance omitted CephFS-specific preparation required for mixed-version safety. I added the documented steps to disable standby-replay, reduce each file system to one active rank, and restore original settings afterward.
- The MDS failover command did not use the documented role form. I changed it to `ceph mds fail mds.$MDS_ID`.
- The CephFS verification script parsed human-readable `ceph fs status` output to find the active MDS. I changed it to use `ceph fs dump --format json`.
- The post-upgrade RADOS test wrote to the internal `.mgr` pool. I changed it to use a configurable `TEST_POOL` and otherwise select an existing pool.
- The emergency recovery script created a backup directory with one timestamp and assigned `BACKUP_DIR` with another. I changed it to compute the backup directory once and quote the path.

## Review Notes
The article is now technically valid as a manual non-cephadm upgrade guide. It should still be read with the release notes for the exact source and target Ceph versions, because upgrade paths, package names, systemd unit names, and feature-enablement steps vary by release and deployment method.
