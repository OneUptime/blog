# Validation Summary: How to Create GCP IAM Workload Identity in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp)
- Google Cloud Platform (GCP) IAM
- GCP Workload Identity Federation
- `google_iam_workload_identity_pool` resource
- `google_iam_workload_identity_pool_provider` resource
- `google_service_account` and `google_service_account_iam_binding` resources
- `google_container_cluster` (GKE) Workload Identity
- AWS STS (as external identity provider)
- GitHub Actions OIDC
- Azure AD / Microsoft Entra ID OIDC
- Common Expression Language (CEL) for attribute mapping/conditions

## Sources Consulted
- Terraform Google provider docs: `google_iam_workload_identity_pool` (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workload_identity_pool)
- Terraform Google provider docs: `google_iam_workload_identity_pool_provider` (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workload_identity_pool_provider)
- Terraform Google provider docs: `google_service_account_iam` (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account_iam)
- Terraform Google provider docs: `google_container_cluster` (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster)
- GCP docs: Workload Identity Federation (https://cloud.google.com/iam/docs/workload-identity-federation)
- GCP docs: Configuring Workload Identity Federation with AWS (https://cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds)
- GCP docs: Workload Identity for GKE (https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)
- GitHub Actions OIDC documentation (https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- Microsoft identity platform OIDC documentation (v1.0 issuer at sts.windows.net)

## Issues Found
No technical issues found.

All Terraform resources, attribute names, and field values were verified against the official `hashicorp/google` provider documentation:

- `google_iam_workload_identity_pool` arguments (`workload_identity_pool_id`, `display_name`, `description`, `disabled`, `project`) are correct.
- `google_iam_workload_identity_pool_provider` arguments and the nested `aws { account_id }` and `oidc { issuer_uri, allowed_audiences }` blocks are correct.
- The GitHub Actions OIDC issuer URI `https://token.actions.githubusercontent.com` is correct (no trailing slash).
- The Azure AD v1.0 issuer URI `https://sts.windows.net/{tenant_id}/` is a valid issuer for v1.0 tokens; the `appid`, `tid`, and `sub` claims used in `attribute_mapping` are correct v1.0 claim names.
- The `principalSet://iam.googleapis.com/{pool_resource_name}/attribute.{name}/{value}` format is the correct member format for federated identities (the `.name` attribute on the pool resource resolves to `projects/{project_number}/locations/global/workloadIdentityPools/{id}`).
- The GKE Workload Identity member format `serviceAccount:{project_id}.svc.id.goog[{namespace}/{ksa_name}]` and the cluster-level `workload_identity_config { workload_pool = "PROJECT_ID.svc.id.goog" }` plus `node_config.workload_metadata_config.mode = "GKE_METADATA"` are correct.
- CEL expressions in `attribute_mapping` (e.g., `assertion.arn.extract('/assumed-role/{role}/')`) and `attribute_condition` (e.g., `assertion.repository_owner == '...'`) are syntactically valid.

## Review Notes
- The Azure example uses the v1.0 issuer (`https://sts.windows.net/{tenant_id}/`). The post is technically correct, but the v2.0 issuer (`https://login.microsoftonline.com/{tenant_id}/v2.0`) is the modern Microsoft recommendation. Note that switching to v2.0 would also change some claim names (e.g., `appid` becomes `azp` in v2.0 tokens). Not a defect — both are supported.
- The GKE cluster example configures the default node pool inline via `node_config`/`initial_node_count`. Current GKE best practice is to set `remove_default_node_pool = true` and define a separate `google_container_node_pool`. The example as written still works but is not the most current pattern.
- `google_service_account_iam_binding` is authoritative for the named role on the service account — it will overwrite any other bindings of the same role added outside Terraform. Use `google_service_account_iam_member` if non-authoritative behavior is desired. The post's choice is reasonable for a Terraform-managed setup.
- The post does not pin the `google` provider beyond `~> 5.0`. As of 2026, provider versions 5.x and 6.x both support the documented resources/arguments; no breaking changes affect the snippets shown.
