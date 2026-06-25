# Validation Summary: How to Deploy Longhorn with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Longhorn
- Argo CD
- Kubernetes
- Helm
- Prometheus Operator ServiceMonitor
- PromQL
- S3-compatible backup targets

## Sources Consulted
- Longhorn installation requirements and environment check script: https://longhorn.io/docs/1.6.0/deploy/install/ and https://raw.githubusercontent.com/longhorn/longhorn/v1.6.0/scripts/environment_check.sh
- Longhorn Helm chart v1.6.0 values and templates: https://github.com/longhorn/charts/tree/longhorn-1.6.0/charts/longhorn
- Longhorn backup target documentation: https://longhorn.io/docs/1.6.0/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn recurring jobs documentation: https://longhorn.io/docs/1.6.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn StorageClass parameters: https://longhorn.io/docs/1.6.0/references/storage-class-parameters/
- Longhorn restore from backup documentation: https://longhorn.io/docs/1.6.0/snapshots-and-backups/backup-and-restore/restore-from-a-backup/
- Longhorn Prometheus monitoring and metrics documentation: https://longhorn.io/docs/1.6.0/monitoring/prometheus-and-grafana-setup/ and https://longhorn.io/docs/1.6.0/monitoring/metrics/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Argo CD sync options and automated sync documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/ and https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD custom health check documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/

## Issues Found
- The prerequisite check Job tested tools inside the `longhorn-manager` container rather than on Kubernetes nodes. Replaced it with Longhorn v1.6.0's official `environment_check.sh`, which deploys privileged node checks and validates host prerequisites such as iSCSI, NFS, packages, and mount propagation.
- The Argo CD Helm values included duplicate `longhornManager` keys, so the first block would be overwritten by YAML parsing. Consolidated the Longhorn manager configuration.
- The Longhorn v1.6.0 chart does not expose `longhornManager.resources` or `longhornDriver.resources` values. Removed those unsupported values and kept supported node selector and toleration settings.
- The Longhorn chart recommends disabling the pre-upgrade checker Job when using Argo CD or other GitOps tooling. Added `preUpgradeChecker.jobEnabled: false`.
- The PromQL examples used incorrect labels and did not filter current-state series. Updated `longhorn_volume_state` and `longhorn_volume_robustness` queries to compare against `1`, changed robustness filtering to use the `state` label, and changed backup error detection to `longhorn_backup_state == 4`.
- The disaster recovery snippet used a Kubernetes `dataSource` with a non-existent `LonghornBackup` object reference. Replaced it with Longhorn's documented restore flow: create a Longhorn `Volume` from `fromBackup`, then bind a Kubernetes PV and PVC to the restored volume.

## Review Notes
- All YAML snippets parse successfully after the corrections.
- Helm rendering was not run because `helm` is not installed in the workspace.
- The post pins Longhorn chart `1.6.0`, which is valid for the article's examples but older than current Longhorn releases as of 2026-05-20. Future updates should revisit version-specific values before upgrading the chart.

## Re-review 2026-06-25 (issue #138)

Issue #138 reported that the steps were hard to follow, with no clear indication of how each manifest is applied or how to confirm success. This re-review clarified the workflow without changing any technical claims.

### What was clarified or added
- Added an upfront "How the pieces fit together" section that explicitly distinguishes node-level prerequisites (installed on every node's OS, e.g. `open-iscsi`/`iscsid` and the NFSv4 client) from cluster-level resources (the ArgoCD `Application`, `StorageClass`, `Secret`, `RecurringJob`) that are submitted once to the Kubernetes API server. It also explains the two application methods used in the guide: committed to Git for ArgoCD to sync vs applied directly with `kubectl apply -f`.
- Rewrote each step heading and intro to state HOW the resource is applied (node vs cluster, Git/ArgoCD vs `kubectl apply`). Step 1 is now clearly node-level (with an example `apt-get install open-iscsi nfs-common` plus the environment check), and Steps 2-5 are clearly cluster-level.
- Clarified that the environment check script deploys a short-lived privileged DaemonSet (one pod per node) that inspects each host, rather than running on the control machine.
- Added realistic expected-output blocks in fenced ```text blocks so readers can confirm success: the environment check per-node report, `kubectl get application longhorn -n argocd` showing `Synced`/`Healthy`, `kubectl get pods -n longhorn-system`, and `kubectl get storageclass` (default plus the additional classes). Also added the `secret/... created` output for the backup secret.
- Explained ArgoCD's two independent statuses (Sync: Synced/OutOfSync; Health: Healthy/Progressing/Degraded) and what `selfHeal` does, so the success criteria are unambiguous.
- Added cross-links (intro and summary) to the companion Helm article at `https://oneuptime.com/blog/post/2026-01-17-helm-longhorn-distributed-storage/view` (directory confirmed present under `posts/`).

### Facts verified for this re-review (sources)
- open-iscsi installed and `iscsid` running on all nodes; NFSv4 client required on every node for RWX volumes; backup feature requires NFSv4 - https://longhorn.io/docs/1.12.0/deploy/install/
- The Longhorn `environment_check.sh` deploys a privileged DaemonSet (hostPID, nsenter into the host) that checks iSCSI/iscsid, multipathd, NFS client, mount propagation, required packages, and kernel config on each node - https://raw.githubusercontent.com/longhorn/longhorn/v1.6.0/scripts/environment_check.sh
- ArgoCD reports a Sync status (Synced/OutOfSync) and a Health status (Healthy/Progressing/Degraded); automated sync with `selfHeal` re-syncs the cluster back to Git state after drift - https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/

### Format checks
- Title (line 1), `Tags:`, and `Description:` lines unchanged.
- One H1; remaining headings are H2/H3 with no skipped levels; no empty sections.
- Every code fence declares a language; all fences are paired. No em dashes, en dashes, or smart quotes.
- Sample outputs are illustrative; pod names, ages, and replica counts vary by cluster.
