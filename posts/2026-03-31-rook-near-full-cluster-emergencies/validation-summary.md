# Validation Summary: How to Handle Near-Full Cluster Emergencies in Ceph

## Status
validated

## Post Type
Emergency Runbook / Operations Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl CLI)
- RBD (RADOS Block Device)
- jq (JSON processing)

## Sources Consulted
- Ceph official documentation on full ratio settings: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph OSD configuration reference (default full_ratio=0.95, nearfull_ratio=0.85, backfillfull_ratio=0.90): https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Kubernetes CronJob API reference (spec.suspend field): https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/cron-job-v1/
- Rook Ceph Cluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph `osd reweight` documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/#adjust-osd-weight
- Ceph `rbd` CLI reference: https://docs.ceph.com/en/latest/man/8/rbd/

## Issues Found

### Issue 1: Invalid CronJob scaling command (Step 2)
- **What was wrong:** The post used `kubectl scale cronjob backup-job --replicas=0 -n rook-ceph` to pause a CronJob. CronJobs do not have a `replicas` field and `kubectl scale` does not support CronJob resources. The preceding `kubectl delete cronjob ... --dry-run` command also served no useful purpose as a dry-run delete does not actually pause anything.
- **What was changed:** Replaced both commands with `kubectl patch cronjob backup-job -n rook-ceph -p '{"spec":{"suspend":true}}'`, which is the correct way to suspend a CronJob in Kubernetes.
- **Why:** The `spec.suspend` field is the Kubernetes-native mechanism for pausing CronJob scheduling. Setting it to `true` prevents new Jobs from being created while leaving the CronJob resource intact for easy resumption.

### Issue 2: Dangerous full_ratio value in post-emergency steps (Step 8)
- **What was wrong:** The post set `ceph osd set-full-ratio 0.85` as the "conservative" post-emergency setting. The value 0.85 (85%) is actually the default *nearfull* ratio, not the full ratio. Setting the full ratio to 0.85 would cause the cluster to block all writes at 85% capacity — making the cluster essentially unusable and worse off than during the original emergency.
- **What was changed:** Changed `ceph osd set-full-ratio 0.85` to `ceph osd set-full-ratio 0.95` and `ceph osd set-nearfull-ratio 0.75` to `ceph osd set-nearfull-ratio 0.85`, restoring the Ceph defaults (full=0.95, nearfull=0.85).
- **Why:** The default Ceph ratios are: nearfull=0.85, backfillfull=0.90, full=0.95. Restoring to defaults after an emergency is the safe and expected procedure. The full ratio must always be higher than the nearfull ratio, and the hierarchy must be maintained (nearfull < backfillfull < full).

## Review Notes
- The `ceph osd df` column numbers used in `sort` and `awk` commands (e.g., `-k9`, `$7, $9`) may vary between Ceph versions as the output format has changed over time. Users should verify column positions against their specific Ceph version.
- The `rbd du` sorting (`sort -k2 -rn`) also depends on the output format of the user's Ceph version.
- The post correctly warns that raising the full ratio is a temporary emergency measure. This is an important safety note.
- The post could benefit from mentioning `ceph osd set-backfillfull-ratio` alongside the other ratio commands, as the backfillfull ratio (default 0.90) sits between nearfull and full and controls when backfill operations are throttled. However, omitting it is not incorrect.
