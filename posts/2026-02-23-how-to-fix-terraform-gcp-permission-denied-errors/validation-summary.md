# Validation Summary: How to Fix Terraform GCP Permission Denied Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (Google provider)
- Google Cloud Platform (GCP)
- GCP IAM (roles, permissions, bindings, hierarchy)
- gcloud CLI
- Service accounts and Workload Identity Federation
- GCP Organization Policies / constraints

## Sources Consulted
- GCP IAM predefined roles reference: https://cloud.google.com/iam/docs/understanding-roles
- gcloud projects add-iam-policy-binding / get-iam-policy reference (gcloud CLI docs)
- gcloud org-policies command reference
- gcloud iam list-testable-permissions reference
- Terraform Google provider docs: `google_project_iam_member`, `google_compute_instance`, `google_iam_workload_identity_pool`, `google_iam_workload_identity_pool_provider`
- GCP Organization Policy constraints reference (compute.vmExternalIpAccess, iam.allowedPolicyMemberDomains, storage.uniformBucketLevelAccess, etc.)

## Issues Found
- **`roles/iam.admin` is not a valid GCP predefined role.** In the "Common Role Requirements by Resource Type" section, the IAM management subsection listed `roles/iam.admin`, which does not exist in GCP's predefined role set. Replaced with `roles/iam.securityAdmin`, which is the correct predefined role for managing IAM policies (and pairs naturally with the already-listed `roles/resourcemanager.projectIamAdmin`).

## Review Notes
- All gcloud commands (`projects add-iam-policy-binding`, `projects get-iam-policy` with `--flatten`/`--filter`/`--format`, `org-policies list/describe`, `iam list-testable-permissions`, `iam service-accounts create/keys create`) are syntactically correct and current.
- Terraform resources (`google_project_iam_member`, `google_compute_instance`, `google_iam_workload_identity_pool`, `google_iam_workload_identity_pool_provider`) are valid in the current Google provider, and the attribute/block structures shown (e.g. `attribute_mapping`, `oidc { issuer_uri }`, `boot_disk { initialize_params }`, `service_account { email scopes }`) match the provider schema.
- The IAM hierarchy explanation (Organization → Folder → Project → Resource) and the `iam.serviceAccounts.actAs` / `roles/iam.serviceAccountUser` relationship are accurate.
- Org policy constraint names referenced (`compute.vmExternalIpAccess`, `iam.allowedPolicyMemberDomains`, `compute.restrictVpcPeering`, `storage.uniformBucketLevelAccess`, `compute.restrictLoadBalancerCreationForTypes`) are all valid.
- Service account keys are still functional but are increasingly discouraged by Google in favor of Workload Identity Federation for non-CI use cases as well. The post already promotes WIF for CI/CD, which is good guidance.
- The `debian-cloud/debian-11` image family is still published, though newer Debian families (e.g. `debian-12`) are available; the example remains valid.
