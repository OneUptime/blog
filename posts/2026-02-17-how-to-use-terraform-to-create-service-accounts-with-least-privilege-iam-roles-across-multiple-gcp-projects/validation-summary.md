# Validation Summary: How to Use Terraform to Create Service Accounts with Least-Privilege IAM Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud service accounts
- Terraform Google provider
- Cloud Storage IAM Conditions
- BigQuery IAM roles
- GKE Workload Identity
- Workload Identity Federation
- Google Cloud CLI
- Secret Manager
- IAM Recommender / Policy Intelligence

## Sources Consulted
- Terraform Google provider `google_project_iam` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam
- Terraform Google provider `google_service_account`, `google_project_iam_custom_role`, `google_service_account_iam_member`, Workload Identity Pool, and Secret Manager resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs
- Google Cloud IAM roles and permissions documentation: https://cloud.google.com/iam/docs/roles-overview
- Google Cloud custom roles permission support documentation: https://cloud.google.com/iam/docs/custom-roles-permissions-support
- Cloud Storage IAM and IAM Conditions documentation: https://cloud.google.com/storage/docs/access-control/iam
- Google Cloud Workload Identity Federation for GKE documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud Workload Identity Federation for deployment pipelines documentation: https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Google Cloud SDK `gcloud asset search-all-iam-policies` documentation: https://cloud.google.com/sdk/gcloud/reference/asset/search-all-iam-policies
- Google Cloud SDK `gcloud policy-intelligence query-activity` documentation: https://cloud.google.com/sdk/gcloud/reference/policy-intelligence/query-activity
- Google Cloud IAM role recommendations documentation: https://cloud.google.com/policy-intelligence/docs/review-apply-role-recommendations
- Google Cloud Secret Manager rotation documentation: https://cloud.google.com/secret-manager/docs/secret-rotation

## Issues Found
- The Cloud Storage custom role comment said the role itself allowed uploads only to a specific bucket. Custom roles define permissions, while the IAM Condition scopes those permissions. Updated the comment and tightened the condition expression to use the documented object resource prefix format.
- The audit section used `gcloud access-context-manager policies list` as a Policy Analyzer command. That command lists Access Context Manager policies and does not audit service account permission usage. Replaced it with IAM Recommender and Policy Intelligence `gcloud` commands from official documentation.
- The service account key section said to store the key in Secret Manager, not in Terraform state. Terraform stores the generated private key attribute and managed secret version data in state. Updated the note to warn about state protection and added a `google_secret_manager_secret_version` example for storing the decoded key in Secret Manager.
- The Secret Manager rotation example set only `rotation_period`. The Terraform provider documentation says `next_rotation_time` is required when `rotation_period` is set, and Secret Manager rotation notifications require Pub/Sub topics. Added `topics` and `next_rotation_time`.

## Review Notes
- The Terraform examples are illustrative and depend on variables and provider configuration not shown in the post.
- GKE documentation now commonly refers to this feature as Workload Identity Federation for GKE, but the Terraform binding and annotation shown in the post remain valid for the described pattern.
