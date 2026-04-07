# Validation Summary: How to Configure Stretch Pool Settings in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (stretch cluster mode, CRUSH maps, placement groups)
- Rook (CephBlockPool CRD for Kubernetes)
- Kubernetes (kubectl commands for Rook toolbox)

## Sources Consulted
- Ceph official documentation on stretch mode: https://docs.ceph.com/en/latest/rados/operations/stretch-mode/
- Rook documentation on stretch clusters: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph CLI reference for `mon enable_stretch_mode`: https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found
1. **Incorrect stretch mode command**: The post used `ceph osd enable-stretch-mode` which is wrong. The correct command is `ceph mon enable_stretch_mode` — it is a monitor subsystem command (not OSD) and uses underscores, not hyphens. Fixed to `ceph mon enable_stretch_mode`.

2. **Inconsistent CRUSH rule name**: The post used `stretched_mode_rule` as the CRUSH rule name in the enable command but this is not the conventional name. Changed to `stretch_rule` for consistency and clarity, and updated the corresponding `ceph osd crush rule dump` command to match.

3. **Inaccurate zone count claim**: The intro stated stretch pools distribute data across "two or more distinct zones." Ceph stretch mode specifically requires exactly two data sites (plus a tiebreaker). Changed to "two distinct zones."

## Review Notes
- The expected health output during a partial outage (`1/2 sites down; cluster is degraded`) is illustrative rather than exact Ceph output. Real stretch mode warnings use messages like `HEALTH_WARN stretch mode is enabled` with degraded PG details. This is acceptable for a tutorial but readers should expect different exact wording.
- The Rook CephBlockPool YAML is correct for Rook's stretch cluster configuration. The `stretchCluster` section with zone definitions and `arbiter: false` is valid.
- The minimum OSD requirement of 2 per datacenter is correct but tight — production deployments typically use more for better availability within each site.
