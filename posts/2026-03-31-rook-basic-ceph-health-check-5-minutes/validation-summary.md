# Validation Summary: How to Perform a Basic Ceph Health Check in 5 Minutes

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Ceph (CLI commands: `ceph status`, `ceph health detail`, `ceph osd stat`, `ceph df`, `ceph pg stat`, `ceph log last`, `ceph pg dump_stuck`, `ceph osd tree`)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (`kubectl exec` into Rook toolbox)

## Sources Consulted
- Ceph official documentation — Monitoring a Cluster (Reef): https://docs.ceph.com/en/reef/rados/operations/monitoring/
- Ceph official documentation — Monitoring OSDs and PGs (Reef): https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph official documentation — Troubleshooting PGs (Reef): https://docs.ceph.com/en/reef/rados/troubleshooting/troubleshooting-pg/
- Ceph official documentation — Mon Config Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/mon-config-ref/
- Ceph man page (Reef): https://docs.ceph.com/en/reef/man/8/ceph/
- Rook Toolbox documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/
- Rook toolbox.yaml on GitHub: https://github.com/rook/rook/blob/master/deploy/examples/toolbox.yaml

## Issues Found
No technical issues found.

## Review Notes
- All Ceph CLI commands (`ceph status`, `ceph health detail`, `ceph osd stat`, `ceph df`, `ceph pg stat`, `ceph log last 10`, `ceph pg dump_stuck`, `ceph osd tree`) are valid and current in modern Ceph (Reef/Squid).
- The default OSD threshold ratios are correctly stated: nearfull at 85% (`mon_osd_nearfull_ratio = 0.85`) and full at 95% (`mon_osd_full_ratio = 0.95`).
- The `ceph pg dump_stuck` command does output "ok" when there are no stuck PGs, so the `grep -v "^ok"` filter in the script is a correct and useful pattern.
- The Rook toolbox pod label `app=rook-ceph-tools` is correct per the official Rook toolbox deployment manifest.
- The `ceph status` output format shown is a simplified illustration but accurately represents the real section structure (cluster, services, data, io). The `io` section only appears when there is active I/O, which is worth noting but not an error in the post's context.
- The `ceph status` output example omits `mgr` from the services section and `id` from the cluster section, but since the post explicitly says "The most important fields" this selective illustration is appropriate.
