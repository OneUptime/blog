# Validation Summary: How to Configure GKE Node Auto-Provisioning for Dynamic Node Pool Sizing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Node Auto-Provisioning / node pool auto-creation
- Google Cloud CLI (`gcloud`)
- Kubernetes Pod scheduling, node selectors, taints, and tolerations
- GKE GPU and Spot VM scheduling
- Google Cloud IAM service accounts and quotas

## Sources Consulted
- Google Cloud: Configure node pool auto-creation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/node-auto-provisioning
- Google Cloud: About node pool auto-creation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/node-auto-provisioning
- Google Cloud SDK: `gcloud container clusters update`: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud SDK: `gcloud container clusters create`: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud: Spot VMs in GKE: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/spot-vms
- Google Cloud: Compute Engine quota and limits overview: https://docs.cloud.google.com/compute/quotas-limits
- Google Cloud: About service accounts in GKE: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/service-accounts
- Google Cloud: Configure GKE node service accounts: https://docs.cloud.google.com/kubernetes-engine/security/configure-node-service-accounts

## Issues Found
- Corrected current `gcloud` NAP resource-limit flags from `--autoprovisioning-max-cpu`, `--autoprovisioning-max-memory`, `--autoprovisioning-min-cpu`, `--autoprovisioning-min-memory`, and `--autoprovisioning-max-accelerator` to the documented `--max-cpu`, `--max-memory`, `--min-cpu`, `--min-memory`, and `--max-accelerator` flags.
- Added `--enable-autoprovisioning` to cluster update commands that apply an `--autoprovisioning-config-file`, matching the documented command pattern.
- Fixed NAP configuration YAML by moving default fields such as `management`, `shieldedInstanceConfig`, `diskSizeGb`, `diskType`, `serviceAccount`, and `upgradeSettings` to the top level instead of under the invalid `autoProvisioningDefaults` wrapper.
- Corrected resource-limit explanation to state that cluster-level NAP limits apply across all node pools in the cluster, including manually created pools, not only auto-provisioned pools.
- Updated machine type selection guidance. GKE now supports selecting machine series and predefined machine types with `cloud.google.com/machine-family` and `node.kubernetes.io/instance-type` labels, so the previous statement that GKE has no direct support for restricting machine families was inaccurate.
- Replaced the machine-type restriction example with a workload-level node selector example using the documented labels.
- Updated the GPU Pod example to include documented GPU node labels for accelerator type, accelerator count, and GPU driver version.
- Replaced the invalid GPU quota update command with a regional quota check and a note to request quota adjustments through Google Cloud quota workflows.
- Removed the unsupported `scaleDownConfig` NAP YAML example and corrected upgrade settings to use `maxSurgeUpgrade` and `maxUnavailableUpgrade`.
- Fixed the Kubernetes event query that attempted to combine two `reason` values in a single field selector, which would be an AND filter and not match either event set.
- Corrected custom node service account guidance. The custom node service account itself does not need `compute.instanceAdmin.v1` for NAP; cross-project custom node service accounts require `roles/iam.serviceAccountUser` for the GKE service agent and `roles/iam.serviceAccountTokenCreator` for the Compute Engine service agent.
- Updated Spot VM scheduling to use the documented `cloud.google.com/gke-spot` node selector plus the required `cloud.google.com/gke-spot=true:NoSchedule` toleration.

## Review Notes
The post is now technically aligned with current GKE Standard cluster-level node auto-provisioning guidance. GKE documentation increasingly recommends ComputeClasses for workload-level node pool auto-creation in newer eligible clusters, but cluster-level NAP remains valid and relevant for the tutorial's scope.
