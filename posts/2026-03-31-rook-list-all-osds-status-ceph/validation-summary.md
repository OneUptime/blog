# Validation Summary: How to List All OSDs and Their Status in Ceph

## Status
validated

## Post Type
Reference / CLI Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph OSD (Object Storage Daemon)
- CRUSH map (Controlled Replication Under Scalable Hashing)
- Rook (Ceph operator for Kubernetes, mentioned in tags)
- Ceph CLI (`ceph osd` subcommands)

## Sources Consulted
- Ceph official documentation — Monitoring OSDs and PGs: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph official documentation — Control Commands: https://docs.ceph.com/en/latest/rados/operations/control/
- Ceph official documentation — Troubleshooting OSDs: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Ceph official documentation — OSD Configuration Reference: https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- Ceph official documentation — Adding/Removing OSDs: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph man page: https://docs.ceph.com/en/latest/man/8/ceph/
- Red Hat Ceph Storage Administration Guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/4/html/administration_guide/monitoring-a-ceph-storage-cluster

## Issues Found
1. **Incorrect description of down+in OSD recovery behavior**: The post stated "An OSD that is `down` but `in` will trigger recovery until it is marked `out`." This is inaccurate — recovery does not begin while the OSD is still marked `in`. The actual behavior is that placement groups become degraded while the OSD is down+in, and Ceph waits for the OSD to return. After the `mon_osd_down_out_interval` timeout (default 600 seconds), the monitor automatically marks the OSD `out`, and only then does data recovery (remapping PGs to other OSDs) begin. The original phrasing implied recovery starts immediately and stops at `out`, when in fact it starts *at* `out`. **Fixed** to accurately describe the degraded state and automatic timeout behavior.

## Review Notes
- All CLI commands (`ceph osd stat`, `ceph osd tree`, `ceph osd dump`, `ceph osd metadata`, `ceph osd find`, `ceph osd df tree`, `ceph versions`, `ceph tell osd.* version`, `ceph osd out/down/in`) are verified as correct and current.
- The sample output for `ceph osd stat` is realistic and representative.
- The post tags mention Rook but the content is purely about Ceph CLI commands run from within the toolbox pod. This is fine since Rook users interact with Ceph through these same commands.
- The `grep -A 10` approach for finding OSDs on a host is a pragmatic workaround; `ceph osd find` with jq could be more precise, but the approach shown is reasonable for a quick reference.
