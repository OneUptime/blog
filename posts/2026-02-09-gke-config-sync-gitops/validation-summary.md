# Validation Summary: How to Set Up GKE Config Sync for GitOps-Based Cluster Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Config Sync
- RootSync and RepoSync
- Google Cloud CLI (`gcloud`)
- Kubernetes manifests and RBAC
- Policy Controller / OPA Gatekeeper
- External Secrets Operator
- Google Secret Manager
- Cloud Monitoring

## Sources Consulted
- Google Cloud Config Sync overview: https://cloud.google.com/kubernetes-engine/config-sync/docs/overview
- Install Config Sync with default settings: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/install-default
- Customize your Config Sync installation: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/installing-config-sync
- Install Config Sync manually using kubectl: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/installing-kubectl
- RootSync and RepoSync fields: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/reference/rootsync-reposync-fields
- gcloud apply spec fields: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/reference/gcloud-apply-fields
- Fleet membership registration / GKE fleet registration: https://docs.cloud.google.com/kubernetes-engine/fleet-management/docs/register/gke
- Configure syncing from more than one source of truth: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/multiple-repositories
- Use a hierarchical repository: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/concepts/hierarchical-repo
- Monitor Config Sync with Cloud Monitoring: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/monitor-config-sync-cloud-monitoring
- Monitor Config Sync with Prometheus: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/monitor-config-sync-prometheus
- Config Sync metrics: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/monitoring-config-sync
- External Secrets Operator Google Secret Manager provider: https://external-secrets.io/latest/provider/google-secrets-manager/
- Gatekeeper required labels policy reference: https://artifacthub.io/packages/gatekeeper/gatekeeper-policies/k8srequiredlabels

## Issues Found
- The install section mixed the fleet-managed `gcloud` installation flow with the manual Config Sync operator flow. I updated the `gcloud` example to register the cluster with a fleet, enable Config Management, create an `apply-spec.yaml`, and apply it with `gcloud beta container fleet config-management apply`.
- The manual install command used the outdated single `config-sync-operator.yaml` download. I replaced it with the current documented `config-sync.tar.gz` bundle download and render/apply flow.
- The repository configuration used the older `ConfigManagement` custom resource and `spec.git.syncRepo`-style fields. I replaced it with the current `RootSync` API and fields: `spec.git.repo`, `branch`, `revision`, `dir`, `auth`, and `secretRef`.
- The authentication text referred to `secretType` in the RootSync-style workflow. I changed this to `auth` and clarified that public repositories use `auth: none`.
- The sync status command queried `ConfigManagement`. I updated it to query the `RootSync` object in `config-management-system`.
- The Cloud Monitoring example used an ad hoc OpenTelemetry ConfigMap. I replaced it with the documented IAM binding for Config Sync metrics export with Workload Identity Federation for GKE.
- The metrics section used a direct `reconciler-manager` service port-forward command that did not match current documentation. I replaced it with commands that inspect the Config Sync OpenTelemetry collector in the `config-management-monitoring` namespace.
- The architecture section overstated the admission webhook's role as validating all configs before application. I narrowed it to preventing conflicting changes to managed resources when drift prevention is enabled.

## Review Notes
The remaining examples are generic and syntactically valid, but users should still adapt placeholders such as project IDs, cluster locations, repository URLs, service accounts, and RBAC bindings to their environment. The hierarchical repository format remains supported, but Google recommends unstructured sources for new Config Sync setups.
