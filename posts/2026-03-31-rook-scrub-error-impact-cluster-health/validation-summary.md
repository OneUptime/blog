# Validation Summary: How to Understand Scrub Error Impact on Cluster Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Ceph scrubbing and deep scrubbing
- Ceph health monitoring
- Kubernetes (kubectl for Rook toolbox access)
- Prometheus/Alertmanager (mentioned for alerting)

## Sources Consulted
- Ceph official documentation on scrubbing: https://docs.ceph.com/en/latest/rados/operations/health-checks/#osd-scrub-errors
- Ceph official documentation on placement group repair: https://docs.ceph.com/en/latest/rados/operations/placement-group-concepts/
- Ceph official documentation on OSD flags (noscrub/nodeep-scrub): https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/#no-free-drive-space
- Ceph device health monitoring documentation: https://docs.ceph.com/en/latest/mgr/devicehealth/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
1. **Incorrect claim about noscrub/nodeep-scrub flags and client I/O**: The post stated "Client I/O continues unless `noscrub` or `nodeep-scrub` flags are set." This is incorrect. The `noscrub` and `nodeep-scrub` flags disable scrubbing operations — they do not stop client I/O. Client I/O continues normally even when scrub errors are present. Fixed to: "Client I/O continues normally even when scrub errors are present."

2. **Misleading description of `ceph osd scrub` command**: The section was titled "List scrub errors on a per-OSD basis" but `ceph osd scrub <osd-id>` initiates/triggers a scrub on the specified OSD — it does not list errors. Fixed the description to: "Trigger a scrub on a specific OSD and then list inconsistent PGs."

## Review Notes
- The health state progression (HEALTH_OK → HEALTH_WARN → HEALTH_ERR) is presented as a linear progression based on scrub findings. In practice, scrub inconsistencies jump directly to HEALTH_ERR. HEALTH_WARN for scrub-related issues is typically about scheduling (e.g., PGs not scrubbed in time), not about inconsistencies. The current wording is not strictly wrong but could be more precise in a future revision.
- The `deep_scrub_interval` value of 604800 (7 days) matches the Ceph default, which is correct.
- The `ceph device monitoring on` command is correct for enabling the device health monitoring module.
- All kubectl and Rook toolbox commands are correct.
