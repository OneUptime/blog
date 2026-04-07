# Validation Summary: How to Troubleshoot Ceph After Hardware Changes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (OSD management, MON map, CRUSH map, BlueStore)
- Rook (CephCluster custom resource)
- Linux CLI tools (watch, grep, monmaptool)

## Sources Consulted
- Ceph official documentation: OSD management commands (https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/)
- Ceph official documentation: CRUSH map management (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph official documentation: Monitor management and monmaptool (https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/)
- Ceph official documentation: BlueStore configuration (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- Rook documentation: CephCluster CRD (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)

## Issues Found
1. **Incorrect `ceph osd crush move` command**: The command `ceph osd crush move new-host host=new-host root=default` included a self-referential `host=new-host` argument. The `crush move` command takes `<name> <property=value>...` where the properties define where to place the bucket in the hierarchy. Since `new-host` is itself a host bucket, specifying `host=new-host` is incorrect. Fixed to `ceph osd crush move new-host root=default`.

2. **Missing monmap extraction step**: The comment said "update the MON map" but the command `monmaptool --print /tmp/monmap` only prints a monmap file and assumes it already exists at `/tmp/monmap`. Added the required `ceph mon getmap -o /tmp/monmap` extraction step before the print command, and updated the comment to say "extract and inspect" instead of "update".

## Review Notes
- The `ceph osd dump | grep -E "^osd\.[0-9]+"` pattern for checking OSD bind addresses works but the output format can vary across Ceph versions. `ceph osd find <id>` may be more reliable for checking a specific OSD's address.
- The `monmaptool --print` step shows the current MON map but does not cover actually updating MON IPs, which is a more involved process (extracting, modifying with `monmaptool --rm` / `--add`, and re-injecting). This is acceptable for a troubleshooting/diagnostic guide but readers should consult full MON migration docs for actual IP changes.
- The BlueStore cache config `bluestore_cache_size_ssd` is correct for SSD-backed OSDs. HDD-backed OSDs use `bluestore_cache_size_hdd`.
