# Validation Summary: How to Configure Auto-Recovery for Failed Ceph Components

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook OSD Management documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Ceph Monitor/OSD Interaction configuration: https://docs.ceph.com/en/reef/rados/configuration/mon-osd-interaction/
- Ceph source (mon.yaml.in) for `mon_osd_down_out_interval` definition: https://github.com/ceph/ceph/blob/main/src/common/options/mon.yaml.in
- Rook GitHub issues for `do-not-reconcile` label: https://github.com/rook/rook/issues/16597

## Issues Found

1. **Misleading reference to `continueUpgradeAfterChecksEvenIfNotHealthy`**: The text stated this flag should be set for OSD auto-recovery, but it is exclusively an upgrade-time setting that allows Rook to continue daemon upgrades when the cluster is unhealthy. It has no effect on auto-recovery. Removed the reference and replaced with accurate description of health check configuration.

2. **Incorrect resource limits YAML path**: Resources were specified at `spec.storage.config.resources.osd`, which is not a valid path in the CephCluster CRD. The correct path is `spec.resources.osd`. Fixed the YAML structure.

3. **`cleanupPolicy` misrepresented as OSD auto-removal**: The `cleanupPolicy` section is exclusively for cluster teardown/uninstall (triggered when the CephCluster CR is deleted). It has nothing to do with removing failed OSDs during normal operation. Replaced with `spec.removeOSDsIfOutAndSafeToRemove: true`, which is the correct field for automatically removing OSDs that are marked out and safe to destroy.

4. **Incorrect OSD removal procedure**: The original commands used `kubectl delete deploy` and a non-existent label `rook.io/do-not-reconcile`. Replaced with the correct procedure: scale down the OSD deployment, purge the OSD from Ceph, then delete the deployment. The actual Rook label is `ceph.rook.io/do-not-reconcile` (different prefix), but the purge approach is the recommended procedure.

5. **`mon_osd_down_out_interval` set on wrong daemon type**: The command targeted the `osd` daemon type (`ceph config set osd`), but `mon_osd_down_out_interval` is a monitor-side setting that controls how long monitors wait before marking an unresponsive OSD as `out`. Changed to `ceph config set mon`.

6. **`-it` flags in non-interactive `watch` context**: The `watch` command running `kubectl exec -it` is problematic because `watch` doesn't provide an interactive TTY. Removed `-it` flags from the `kubectl exec` inside the `watch` command.

## Review Notes
- The `removeOSDsIfOutAndSafeToRemove` field is the key enabler for automated OSD cleanup, and it's good that it's now properly documented in the post.
- For production use, the Rook kubectl plugin (`kubectl rook-ceph rook purge-osd <ID>`) or the OSD purge job are recommended over manual `ceph osd purge` commands, as they handle additional cleanup steps automatically.
- The default value for `mon_osd_down_out_interval` is 600 seconds (10 minutes); the post sets it to 300 (5 minutes), which is a reasonable choice for faster recovery but users should be aware this increases the risk of unnecessary rebalancing during transient network issues.
