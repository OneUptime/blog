# Validation Summary: How to Grant Fine-Grained Access Control to Individual Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Secret Manager
- Google Cloud IAM
- IAM Conditions
- Google Cloud CLI
- Cloud Asset Inventory
- IAM Recommender
- Terraform Google provider

## Sources Consulted
- Google Cloud Secret Manager access control documentation: https://cloud.google.com/secret-manager/docs/access-control
- Google Cloud Secret Manager IAM roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/secretmanager
- gcloud secrets add-iam-policy-binding reference: https://cloud.google.com/sdk/gcloud/reference/secrets/add-iam-policy-binding
- gcloud secrets create reference: https://cloud.google.com/sdk/gcloud/reference/secrets/create
- gcloud asset search-all-iam-policies reference: https://cloud.google.com/sdk/gcloud/reference/asset/search-all-iam-policies
- IAM Conditions overview: https://cloud.google.com/iam/docs/conditions-overview
- IAM Conditions attribute reference: https://cloud.google.com/iam/docs/conditions-attribute-reference
- gcloud recommender recommendations list reference: https://cloud.google.com/sdk/gcloud/reference/recommender/recommendations/list
- IAM role recommendations overview: https://cloud.google.com/policy-intelligence/docs/role-recommendations-overview
- Terraform Google provider Secret Manager IAM resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_iam

## Issues Found
- Updated the Cloud Asset Inventory query from `policy.role.permissions:secretmanager` to `policy.role.permissions:secretmanager.*` so it explicitly matches Secret Manager permission prefixes using the documented query syntax.
- Replaced the claim that IAM Recommender will suggest scoping project-level Secret Accessor access down to specific secrets. Official IAM Recommender documentation describes recommendations to remove or replace roles with excess permissions, but it does not guarantee conversion of project-level Secret Manager grants into per-secret IAM bindings.

## Review Notes
The Secret Manager role descriptions, secret-level IAM commands, service account examples, Terraform `google_secret_manager_secret_iam_member` usage, IAM Conditions examples, and warning about additive IAM bindings are consistent with current official documentation.
