# Validation Summary: How to Set Up GKE Workload Identity with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Workload Identity Federation for GKE
- Google Cloud IAM service accounts
- OpenTofu / Terraform HCL
- Kubernetes service accounts

## Sources Consulted
- Google Cloud: About Workload Identity Federation for GKE - https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud: Authenticate to Google Cloud APIs from GKE workloads - https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Terraform Registry: `google_container_cluster` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Terraform Registry: `google_container_node_pool` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- Terraform Registry: `google_project_service` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_service.html
- Terraform Registry: `google_service_account_iam_member` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account_iam
- Terraform Registry: `kubernetes_service_account` - https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service_account.html

## Issues Found
- The overview described Workload Identity as if it always binds a Kubernetes service account to a Google Cloud service account. Current Google Cloud documentation distinguishes direct federated access from the alternative IAM service account impersonation pattern. I updated the wording to match the pattern used by the post.
- The example omitted the IAM Service Account Credentials API, which Google documents as a prerequisite for linking a Kubernetes service account to an IAM service account. I added a `google_project_service` resource to enable `iamcredentials.googleapis.com`.

## Review Notes
- The `google_container_node_pool` example uses `workload_metadata_config { mode = "GKE_METADATA" }`, which is still valid for Standard GKE node pools and aligns with current Google Cloud guidance.
- Google now commonly refers to the feature as `Workload Identity Federation for GKE`, though `Workload Identity` is still widely used as shorthand.
