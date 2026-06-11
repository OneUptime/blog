# Validation Summary: How to Implement GKE Workload Identity

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Workload Identity Federation for GKE
- Kubernetes service accounts and IAM service accounts
- Google Cloud IAM
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Cloud Storage, Secret Manager, Pub/Sub
- Cloud Monitoring and audit logging
- Python Flask and `google-cloud-storage`
- Docker and Kubernetes manifests

## Sources Consulted
- Google Cloud GKE documentation: Authenticate to Google Cloud APIs from GKE workloads: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud GKE documentation: Workload Identity Federation for GKE concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud SDK reference: `gcloud container clusters create`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud GKE troubleshooting documentation: https://cloud.google.com/kubernetes-engine/docs/troubleshooting/authentication
- Google Cloud Monitoring metrics list, IAM metrics: https://cloud.google.com/monitoring/api/metrics_gcp_i_o
- Google Cloud IAM documentation: Monitor usage patterns for service accounts and keys: https://cloud.google.com/iam/docs/service-account-monitoring
- Terraform Registry documentation for `google_container_cluster` and `google_container_node_pool`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster and https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool

## Issues Found
- The post described Workload Identity only as Kubernetes service accounts acting as IAM service accounts. Updated the introduction and architecture text to reflect the current GKE documentation: direct IAM principal bindings are now recommended for supported APIs, while this guide uses the still-supported service account impersonation pattern.
- The prerequisites required "Owner or Editor", which is too broad and not aligned with current Google Cloud role guidance. Replaced it with specific role examples needed to manage GKE, service accounts, IAM policy bindings, and API enablement.
- The existing-node-pool migration note said the update requires a rolling restart of all nodes. Current GKE documentation warns that changing metadata mode immediately affects workloads on that node pool. Updated the note to describe the workload-impact risk more accurately.
- The Kubernetes service account manifest did not include the optional `iam.gke.io/return-principal-id-as-email` annotation, while the testing section expected identity output that can differ in current GKE. Added the optional annotation and corrected the expected `gcloud auth list` output to an IAM principal-style identifier.
- The test section referred to "Compute Engine metadata" from the pod. In Workload Identity-enabled node pools, GKE metadata server intercepts metadata requests. Renamed the test to check the metadata server's service account identifier.
- The verification script compared the active account to a Google service account email, which is not reliable with current linked-service-account identity output. Removed that comparison.
- The troubleshooting table incorrectly implied that a pod is Pending simply because a node pool is not configured for Workload Identity. Updated the row to cover the real Pending case: a Standard-cluster nodeSelector with no matching nodes.
- The metadata timeout troubleshooting row was too narrow. Updated it to include GKE metadata server startup delay, network policy, and node pool configuration.
- The monitoring section listed a custom metric as if it were built in and used an invalid label filter (`metric.labels.result`) on `iam.googleapis.com/service_account/authn_events_count`. Replaced the table and sample alert with documented IAM metrics, including `iam.googleapis.com/workload_identity_federation/count` and its `result` label.

## Review Notes
- The service account impersonation approach shown in the post is still supported, but Google Cloud documentation now presents direct IAM principal identifiers as the preferred approach for supported APIs.
- The main `gcloud`, Kubernetes manifest, and Terraform examples are syntactically consistent with current GKE and Terraform provider documentation.
- The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK documentation rather than local `--help` output.
