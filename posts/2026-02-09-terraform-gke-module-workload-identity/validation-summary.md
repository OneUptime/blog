# Validation Summary: Using Terraform Modules to Deploy GKE Clusters with Workload Identity Enabled

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Terraform
- Google Kubernetes Engine (GKE)
- Workload Identity Federation for GKE
- Google Cloud IAM service accounts and IAM roles
- Kubernetes service accounts and Deployments
- Google Cloud client libraries for Go and Python

## Sources Consulted
- Google Cloud documentation: Authenticate to Google Cloud APIs from GKE workloads: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud documentation: About Workload Identity Federation for GKE: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud documentation: GKE release schedule: https://docs.cloud.google.com/kubernetes-engine/docs/release-schedule
- Terraform Registry: hashicorp/google `google_container_cluster`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Terraform Registry: hashicorp/google `google_container_node_pool`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- Terraform Registry: hashicorp/kubernetes `kubernetes_service_account`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service_account

## Issues Found
- The Terraform examples pinned GKE Kubernetes version `1.29`, which is no longer supported in GKE as of the current release schedule. Updated the module default and root module example to `1.35`, a currently supported GKE minor version.
- The Go client library example omitted `package main` and the `log` import while calling `log.Fatal`, so it was not a syntactically complete Go example. Added the package declaration and missing import.
- The verification command used the metadata server `/email` endpoint and said it should return the IAM service account email. Current GKE Workload Identity Federation documentation verifies metadata server access using token retrieval/API access, and service account identifiers can differ depending on the configuration. Changed the command to request `/token` and clarified that it should return an `access_token` for the configured workload identity.
- The troubleshooting text described the Workload Identity pool string without the IAM member prefix. Updated it to the exact IAM member format used by the binding: `serviceAccount:<PROJECT_ID>.svc.id.goog[<NAMESPACE>/<KSA_NAME>]`.

## Review Notes
The post uses the IAM service account impersonation pattern for Workload Identity Federation for GKE, which remains valid. Google Cloud now recommends direct IAM principal identifiers for many use cases, with service account impersonation as an alternative when needed. The sample also allows control-plane access from `0.0.0.0/0`; that is technically valid but should be narrowed for production environments.
