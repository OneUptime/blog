# Validation Summary: How to Troubleshoot OSD Failures in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (OSD, CRUSH map, BlueStore, placement groups)
- Kubernetes (kubectl, pods, deployments, PVCs, ConfigMaps, jobs)
- Linux disk utilities (lsblk, smartctl, dmesg)

## Sources Consulted
- Ceph documentation on OSD management: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph configuration reference for `mon_osd_down_out_interval`: https://docs.ceph.com/en/latest/rados/configuration/mon-osd-interaction/
- Ceph pool settings (`min_size`): https://docs.ceph.com/en/latest/rados/operations/pools/
- Rook documentation on OSD management: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Rook troubleshooting guide: https://rook.io/docs/rook/latest/Troubleshooting/ceph-common-issues/

## Issues Found
1. **`minimum_size` should be `min_size`**: The post referred to the Ceph pool parameter as `minimum_size`, but the correct Ceph configuration parameter name is `min_size`. Fixed in the introductory paragraph.

2. **`osd_down_out_interval` should be `mon_osd_down_out_interval`**: The mermaid flowchart referenced the config option as `osd_down_out_interval`, but the full Ceph configuration option name is `mon_osd_down_out_interval`. Fixed in the mermaid diagram.

3. **`watch` command with `-it` flags**: The `watch` utility runs commands non-interactively, so passing `-it` (interactive TTY) to `kubectl exec` inside `watch` will cause TTY allocation warnings or failures. Removed `-it` from the `watch` command in Step 7.

## Review Notes
- The OSD removal procedure (Step 5) follows the manual approach. Rook's newer versions also provide a `rook-ceph-purge-osd` job as a streamlined alternative. The annotation-based approach shown in Step 6 is valid but version-dependent.
- The configmap name pattern `rook-ceph-osd-<id>-osd-prepare-status` may vary across Rook versions. Users should verify the actual configmap name in their cluster.
- All `kubectl exec` commands correctly target the `rook-ceph-tools` deployment, which is the standard Rook toolbox pattern.
- The overall troubleshooting flow (identify → diagnose → prevent rebalancing → remove/replace → verify) is sound and follows Ceph best practices.
