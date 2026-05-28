# Validation Summary: How to Implement GitOps for GKE Using Config Sync and Cloud Source Repositories

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Config Sync
- Google Cloud fleets / Config Management
- Cloud Source Repositories
- Google Cloud CLI
- Kubernetes manifests
- External Secrets Operator
- Cloud Monitoring

## Sources Consulted
- Google Cloud Config Sync overview: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/overview
- Google Cloud Config Sync default installation guide: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/install-default
- Google Cloud Config Sync custom installation guide: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/installing-config-sync
- Google Cloud Config Sync gcloud apply spec fields: https://docs.cloud.google.com/kubernetes-engine/enterprise/config-sync/docs/reference/gcloud-apply-fields
- Google Cloud Config Sync drift prevention guide: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/prevent-config-drift
- Google Cloud Config Sync Git authentication guide: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/grant-access-git
- Google Cloud Config Sync Cloud Monitoring guide: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/monitor-config-sync-cloud-monitoring
- Google Cloud Config Sync metrics reference: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/monitoring-config-sync
- Google Cloud Source Repositories cloning guide: https://docs.cloud.google.com/source-repositories/docs/cloning-repositories
- Google Cloud CLI fleet membership register reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/fleet/memberships/register
- Google Cloud CLI monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- External Secrets Operator Google Secret Manager provider docs: https://external-secrets.io/main/provider/google-secrets-manager/

## Issues Found
- Cloud Source Repositories availability was outdated. Added the official caveat that it is unavailable to organizations that had not used it before June 17, 2024.
- The Config Sync apply file incorrectly used a Kubernetes `ConfigManagement` object with `gcloud ... config-management apply`. Replaced it with the current `applySpecVersion: 1` gcloud apply-spec format.
- The `preventDrift` field was in the wrong place for a gcloud apply spec. Moved it under `spec.configSync.preventDrift`.
- The post used older `gcloud container hub` commands. Updated commands to the current `gcloud container fleet` command group.
- The setup omitted the Cloud Source Repositories API and did not create/grant the Google service account before referencing it in the apply spec. Added `source.googleapis.com`, service account creation, and `roles/source.reader` binding before applying Config Sync.
- The Workload Identity binding used `config-management-system/root-reconciler`, but current docs indicate the default KSA is usually `root-sync` for the automatically created RootSync. Updated the member string.
- The namespace example had an empty `configsync.gke.io/cluster-name-selector` annotation, which would not select a real cluster. Removed it because the tutorial syncs to the enrolled cluster by default.
- The NetworkPolicy name implied total default-deny behavior while the policy allowed ingress from namespaces labeled `env: production`. Renamed it to match the actual behavior.
- The drift prevention test did not mention waiting for the admission webhook and overstated protection for unspecified fields. Added the webhook readiness check and clarified that drift prevention rejects changes to declared fields.
- The External Secrets Operator example used an older API version and full Secret Manager resource paths in `remoteRef.key`. Updated it to `external-secrets.io/v1` with `remoteRef.key` as the secret name and `version: latest`.
- The Cloud Monitoring alert command used log-entry counting and unsupported threshold flags. Replaced it with a current `gcloud monitoring policies create` example using the Config Sync `reconciler_errors` metric and `--if='> 0'`.

## Review Notes
Cloud Source Repositories is no longer a good default for new Google Cloud organizations. A future revision should probably retitle or broaden the post around Secure Source Manager or a generic Git provider, but the Cloud Source Repositories flow remains valid for existing eligible organizations.
