# Validation Summary: How to Use Config Sync to Implement GitOps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine
- Config Sync
- GKE fleets
- Google Cloud CLI
- Kubernetes manifests
- Kustomize
- Cloud Monitoring
- GitHub Actions
- nomos

## Sources Consulted
- Google Cloud Config Sync overview: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/overview
- Google Cloud Config Sync gcloud apply spec fields: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/reference/gcloud-apply-fields
- Google Cloud SDK `gcloud beta container fleet config-management apply`: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/fleet/config-management/apply
- Google Cloud Config Sync Git authentication: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/grant-access-git
- Google Cloud Config Sync RootSync and RepoSync fields: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/reference/rootsync-reposync-fields
- Google Cloud Config Sync metrics: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/monitoring-config-sync
- Google Cloud Config Sync with Kustomize: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/concepts/kustomize
- Google Cloud Config Sync `nomos` command: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/nomos-command
- Google Cloud SDK `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The Config Sync installation examples used the Kubernetes `ConfigManagement` resource shape as the file passed to `gcloud container fleet config-management apply`. The current Google Cloud CLI apply spec uses `applySpecVersion: 1` and `spec.configSync`. Updated the examples to use the current apply spec.
- The post used `gcloud container fleet config-management apply/status`, but the current documented `apply` and `status` commands are in the beta command group. Updated those commands to `gcloud beta container fleet config-management ...`.
- The setup omitted enabling the Config Management fleet feature before applying membership configuration. Added `gcloud beta container fleet config-management enable`.
- The example embedded `policyController` inside the Config Sync apply configuration. Policy Controller is managed separately from Config Sync. Removed the invalid field and added a short note pointing to the separate command group.
- The Cloud Source Repositories IAM example granted `roles/source.reader` to a Workload Identity principal string rather than to the Google service account used for `gcpserviceaccount` authentication. Updated the example to grant Source Reader to a Google service account and bind the root-sync Kubernetes service account with `roles/iam.workloadIdentityUser`.
- The monitoring section used outdated or incorrect Config Sync metric names, including `configsync.googleapis.com/reconciler/error_count`. Updated the metric examples and alert filter to use documented Config Sync Cloud Monitoring metric names under `custom.googleapis.com/opencensus/config_sync/...`.

## Review Notes
The CI example still uses `kubeval`, which is older and less actively maintained than alternatives such as `kubeconform`, but the referenced command pattern is syntactically valid. The post does not pin a Config Sync version; it reflects the current Google Cloud documentation reviewed on 2026-05-27.
