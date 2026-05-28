# Validation Summary: How to Enforce Service Account Key Creation Restrictions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud Organization Policy
- Service account keys
- Workload Identity Federation
- Google Cloud CLI
- Cloud Logging
- Cloud Asset Inventory

## Sources Consulted
- Google Cloud Organization Policy: Restrict IAM service account usage: https://docs.cloud.google.com/organization-policy/restrict-service-accounts
- Google Cloud Organization Policy constraints reference: https://docs.cloud.google.com/organization-policy/reference/org-policy-constraints
- Google Cloud CLI reference for `gcloud resource-manager org-policies`: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies
- Google Cloud CLI reference for `gcloud resource-manager org-policies set-policy`: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy
- Google Cloud IAM service account credentials documentation: https://docs.cloud.google.com/iam/docs/service-account-creds
- Google Cloud IAM service account key best practices: https://docs.cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys
- Google Cloud IAM Workload Identity Federation for deployment pipelines: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Google Cloud CLI reference for `gcloud iam service-accounts keys list`: https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/list
- Google Cloud CLI reference for `gcloud logging read`: https://docs.cloud.google.com/sdk/gcloud/reference/logging/read
- Google Cloud Asset Inventory resource search documentation: https://docs.cloud.google.com/asset-inventory/docs/search-resources

## Issues Found
- The post said service account keys have a 10-year default validity. Google Cloud documentation says user-managed service account keys never expire by default, so this was corrected.
- The audit and cleanup scripts used `gcloud projects list --filter="parent.id=${ORG_ID}"`, which only covers projects whose immediate parent matches that org and can miss projects under folders. The scripts now use Cloud Asset Inventory search across the organization scope.
- The exception-listing command used `gcloud resource-manager org-policies list --organization=ORG_ID`, which lists policies on the organization resource rather than project-level exception overrides. This was replaced with a per-project check for local `iam.disableServiceAccountKeyCreation` enforcement overrides.
- The key expiry policy used `"24"` as an allowed value and omitted inheritance behavior. The documented allowed value is `"24h"`, and this constraint cannot be merged with a parent policy, so the policy now sets `inheritFromParent: false`.
- The expiry section said keys would rotate frequently. Expiry does not rotate keys; it causes newly created keys to expire after the configured lifetime. The wording was corrected.

## Review Notes
The post uses the legacy boolean constraints `iam.disableServiceAccountKeyCreation` and `iam.disableServiceAccountKeyUpload`, which remain documented and supported. Google Cloud also documents newer managed constraints with `iam.managed.*` names for some use cases.
