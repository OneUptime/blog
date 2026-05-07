# Validation Summary: How to Upgrade Rancher with Zero Downtime

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- RKE2
- etcd

## Sources Consulted
- Rancher upgrade documentation: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/upgrades
- Rancher chart options reference: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher version and chart repository guidance: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/choose-a-rancher-version
- Rancher certificate update guide, used to verify pinning the current chart version when changing values without upgrading: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/update-rancher-certificate
- Rancher agents overview: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/about-rancher-agents
- RKE2 backup and restore documentation: https://docs.rke2.io/datastore/backup_restore
- Kubernetes rolling update documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes PodDisruptionBudget task documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Helm upgrade command reference: https://helm.sh/docs/helm/helm_upgrade/
- Helm rollback command reference: https://helm.sh/docs/helm/helm_rollback/
- Helm get values command reference: https://helm.sh/docs/helm/helm_get_values/
- Rancher published chart package, used to verify deployment strategy, labels, probes, and replica defaults: https://releases.rancher.com/server-charts/stable/rancher-2.13.1.tgz
- Rancher source for `/healthz`: https://github.com/rancher/rancher/blob/main/pkg/api/steve/health/health.go
- Rancher source for cluster-scoped `Setting` resources: https://github.com/rancher/rancher/blob/main/pkg/apis/management.cattle.io/v3/global_types.go
- Rancher generated controller showing `Setting` is non-namespaced: https://github.com/rancher/rancher/blob/main/pkg/generated/controllers/management.cattle.io/v3/setting.go

## Issues Found
- The pre-upgrade scale command used `helm upgrade` without `--version`, which could unintentionally upgrade Rancher while only trying to increase replicas. I added a `helm ls -n cattle-system` step and pinned the currently deployed chart version.
- The rolling update section claimed `maxUnavailable: 0` as the target configuration and suggested patching the Rancher deployment directly. The published Rancher chart currently uses `maxSurge: 1` and `maxUnavailable: 1` when replicas are greater than one, and a direct `kubectl patch` would be overwritten by the next `helm upgrade`. I corrected the explanation and removed the patch guidance.
- The backup prerequisite and backup step were too narrowly written as if an etcd snapshot were the general Rancher backup method. Rancher’s official upgrade docs say to back up the cluster running Rancher; I broadened the wording and kept the RKE2 embedded-etcd snapshot as the specific example.
- The upgrade command in Step 6 did not pin the intended target version even though the previous step had the reader inspect available versions. I added `--version <target-version>` so the command matches the version-selection workflow.
- The post-upgrade version check treated `settings.management.cattle.io` as namespaced. Rancher `Setting` resources are cluster-scoped, so I removed the namespace flag and made the resource explicit.
- The downstream agent section used a management-cluster command to inspect `cattle-cluster-agent`, even though that deployment runs on downstream clusters. I changed the step to verify the deployment on each downstream cluster context instead.
- Later sections still referred to `maxUnavailable: 0` after the rollout strategy correction. I updated the troubleshooting, best-practices, and conclusion text to match the current chart behavior.

## Review Notes
- The post still uses `rancher-stable` commands throughout, which is appropriate for production installs, but operators should continue using the chart repository that matches their existing Rancher installation if it differs.
- The `/healthz` availability checks are valid. Rancher’s chart reference explicitly documents `200` responses on `/healthz`, and Rancher’s server source still registers `/healthz` and `/ping`.
