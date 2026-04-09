# Validation Summary: How to Fix OSD_ORPHAN Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (OSD map, CRUSH map, health checks)
- Rook-Ceph (Kubernetes operator for Ceph)
- Kubernetes (kubectl commands for managing Rook resources)

## Sources Consulted
- Ceph official documentation on health checks: https://docs.ceph.com/en/latest/rados/operations/health-checks/#osd-orphan
- Ceph OSD management documentation: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph CRUSH map documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Rook documentation on OSD management: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/osd-purge/
- Rook osd-purge.yaml example: https://github.com/rook/rook/blob/master/deploy/examples/osd-purge.yaml

## Issues Found
1. **Incorrect orphan detection command**: The alternative command for identifying orphaned OSDs was:
   ```bash
   ceph osd tree | grep "osd\." | grep -v "up\|down"
   ```
   This is incorrect because orphaned OSDs still have `up` or `down` status (status comes from the OSD map, not CRUSH placement). This filter would exclude all OSDs, including orphaned ones. In `ceph osd tree` output, orphaned OSDs appear under a `stray` section. Fixed to:
   ```bash
   ceph osd tree | grep stray
   ```

## Review Notes
- The `ceph osd crush add osd.12 1.0 host=<hostname>` command uses `1.0` as the weight (representing ~1 TiB). In practice, users should set the weight to match their actual disk size. The post uses it as an example value, which is acceptable.
- The Rook osd-purge.yaml URL points to the `master` branch. Users should edit this YAML to specify the target OSD ID before applying it — the post doesn't mention this step, though it's documented in the Rook docs linked from the YAML itself.
- The configmap name `rook-ceph-osd-info` may not match all Rook versions. Rook's internal configmap naming has evolved across releases. The command is still useful as a general diagnostic step.
- All core Ceph commands (`ceph osd purge`, `ceph osd crush add`, `ceph osd find`, `ceph osd dump`, `ceph health detail`) are syntactically correct and use valid flags.
