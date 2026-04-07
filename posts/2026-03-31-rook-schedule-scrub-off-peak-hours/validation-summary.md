# Validation Summary: How to Schedule Scrubbing During Off-Peak Hours

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (scrubbing subsystem, OSD configuration)
- Kubernetes (CronJob workloads)

## Sources Consulted
- Ceph official documentation on scrubbing options: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph configuration reference for `osd_scrub_begin_hour`, `osd_scrub_end_hour`, `osd_scrub_begin_week_day`, `osd_scrub_end_week_day`, `osd_scrub_min_interval`, `osd_scrub_max_interval`
- Rook documentation on the Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found

1. **Incorrect day-of-week range for weekends**: The original post set `osd_scrub_begin_week_day=0` and `osd_scrub_end_week_day=2` with a comment claiming this restricts scrubs to weekends. In Ceph, 0=Sunday and the range is begin-inclusive/end-exclusive, so this would allow Sunday (0) and Monday (1) -- not weekends. Fixed to `begin_week_day=6` (Saturday) and `end_week_day=1` (Monday, exclusive), which wraps around to cover Saturday and Sunday.

2. **CronJob missing Ceph config/keyring volume mounts**: The original CronJobs ran `ceph` CLI commands directly but did not mount the Ceph configuration or admin keyring. Without these, the `ceph` command cannot connect to the cluster. Added projected volume mounts for `rook-ceph-config` ConfigMap (ceph.conf) and `rook-ceph-mon` Secret (admin keyring).

3. **CronJob only toggled `noscrub`, not `nodeep-scrub`**: The manual pause section correctly set both `noscrub` and `nodeep-scrub` flags, but the CronJob only toggled `noscrub`. Fixed both CronJobs to set/unset both flags for consistency.

4. **Incorrect container image**: Changed from `rook/ceph:latest` (the Rook operator image) to `quay.io/ceph/ceph:v18` (the Ceph image that contains the CLI tools), with a comment to match the cluster's Ceph version.

5. **Inconsistent `serviceAccountName`**: The first CronJob had `serviceAccountName: rook-ceph-operator` but the second did not. Removed the unnecessary serviceAccountName (not needed for Ceph CLI access when config/keyring are mounted via volumes) for consistency.

## Review Notes
- The `rook-ceph-mon` secret structure and key names may vary between Rook versions. Users should verify the exact secret and key names in their cluster with `kubectl -n rook-ceph get secret rook-ceph-mon -o yaml`.
- The Ceph image tag (`v18`) should be updated to match the specific Ceph version deployed in the user's cluster.
- The `osd_scrub_min_interval` and `osd_scrub_max_interval` values (86400 and 604800) are correct and match Ceph defaults.
- The `ceph config set/get` command syntax via the Rook toolbox is correct throughout.
