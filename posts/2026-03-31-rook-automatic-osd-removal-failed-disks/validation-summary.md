# Validation Summary: How to Set Up Automatic OSD Removal for Failed Disks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (OSD management, `ceph osd` commands)
- Kubernetes (CronJob, kubectl, ConfigMap, ServiceAccount)
- Bash scripting
- Python 3 (inline JSON parsing)
- Slack Webhooks (notifications)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook health check configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#health-settings
- Ceph OSD management commands: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph `osd safe-to-destroy` command reference: https://docs.ceph.com/en/latest/man/8/ceph/#osd
- Kubernetes CronJob API (batch/v1): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found

1. **Misleading comment and dead code in the bash/Python script**: The comment on the `DOWN_OSDS` block said "Find OSDs that are down and have been out for > 10 minutes" but the script never implemented any time-based check. Additionally, `import time` and `now = time.time()` were unused dead code. Fixed the comment to "Find OSDs that are down and out" and removed the unused `time` import and `now` variable.

2. **Incorrect `ceph osd safe-to-destroy` output format**: The example output showed `OSDs 5 are safe to destroy...` but the actual Ceph output format uses `OSD(s) 5 are safe to destroy without reducing data durability.` Fixed to match the real output.

## Review Notes
- The CronJob uses `bitnami/kubectl:latest` as the container image, but the script requires `python3` for JSON parsing. The bitnami/kubectl image may not include python3 depending on the version. Users should verify python3 is available in their chosen image, or switch to `jq` for JSON parsing.
- The `serviceAccountName: rook-ceph-default` in the CronJob is not a standard Rook-created service account. Users will need to create this service account with appropriate RBAC permissions (ability to exec into pods in the rook-ceph namespace).
- Using `:latest` image tags in production CronJobs is generally discouraged; pinning to a specific version is safer.
- The `removeOSDsIfOutAndSafeToRemove` CRD field, healthCheck configuration, Ceph OSD commands (`osd dump`, `osd safe-to-destroy`, `osd purge`), and the CronJob structure are all technically correct.
