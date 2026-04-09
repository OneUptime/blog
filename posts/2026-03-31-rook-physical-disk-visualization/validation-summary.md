# Validation Summary: How to Enable Physical Disk Visualization in Rook Dashboard

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Rook (Ceph orchestrator for Kubernetes)
- Ceph (distributed storage system)
- Ceph Dashboard
- Ceph MGR modules (devicehealth, rook orchestrator)
- SMART disk health monitoring
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph Device Management documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/devices/
- Ceph devicehealth module source code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/devicehealth/module.py
- Ceph Orchestrator CLI documentation (Reef): https://docs.ceph.com/en/reef/mgr/orchestrator/
- Ceph Rook MGR module documentation (Quincy): https://docs.ceph.com/en/quincy/mgr/rook/
- Rook Ceph Dashboard documentation (v1.14): https://rook.io/docs/rook/v1.14/Storage-Configuration/Monitoring/ceph-dashboard/
- kubectl rollout restart documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes PR #99758 (label selector support for rollout restart): https://github.com/kubernetes/kubernetes/pull/99758

## Issues Found
1. **Incorrect `ceph device ls` sample output columns**: The blog showed six columns (`DEVICE`, `HOST:DEV`, `DAEMONS`, `WEAR`, `LIFE`, `EXPEC`) with fabricated data values (`10%`, `10y`, `2032`). The actual `ceph device ls` output has four columns: `DEVICE`, `HOST:DEV`, `DAEMONS`, `LIFE EXPECTANCY`. There is no `WEAR` column in the standard output. Wear data is available through `ceph device get-health-metrics`, not in the device listing table. Fixed the sample output to show the correct four-column format.

## Review Notes
- The post mentions that the Physical Disks page in the Ceph Dashboard requires the `rook` MGR module. It is worth noting that physical disk information is only available in Rook host clusters, and the `ROOK_ENABLE_DISCOVERY_DAEMON` environment variable must be set to `true` for device discovery to work. The post does not mention this prerequisite, but it is not strictly incorrect -- just a potential gap for readers.
- All CLI commands (`ceph mgr module enable devicehealth`, `ceph orch set backend rook`, `ceph device scrape-daemon-health-metrics`, `kubectl rollout restart` with `-l` flag) were verified as correct.
- The `mgr/devicehealth/scrape_frequency` config key and its default value of `86400` seconds were confirmed from the Ceph source code.
