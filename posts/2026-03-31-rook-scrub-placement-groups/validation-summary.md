# Validation Summary: How to Scrub Placement Groups in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (PG scrubbing, deep scrub, OSD configuration)
- Rook (Kubernetes-based Ceph operator)
- Kubernetes (kubectl exec into toolbox pod)

## Sources Consulted
- Ceph official documentation on scrubbing: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph PG commands reference: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph health checks and repair: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
No technical issues found.

## Review Notes
- The `ceph pg dump` awk command uses `$18` for the last_scrub column. Column positions in `ceph pg dump` text output can vary across Ceph versions; users may need to adjust the column number. Using `ceph pg dump --format json` would be more robust but less readable for a quick tutorial.
- The `osd_scrub_priority` is set to 5, which is the default value in many Ceph versions. The comment says "reduce scrub priority" which implies lowering from a higher value. This is not incorrect but readers should check their current value first with `ceph config get osd osd_scrub_priority`.
- All commands (`ceph pg scrub`, `ceph pg repair`, `ceph osd set noscrub/nodeep-scrub`, `ceph config set osd osd_scrub_begin_hour/osd_scrub_end_hour`, `osd_max_scrubs`) are valid and current Ceph CLI commands.
