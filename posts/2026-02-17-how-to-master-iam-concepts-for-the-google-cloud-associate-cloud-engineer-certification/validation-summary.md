# Validation Summary: Master IAM Concepts for the Google Cloud Associate Cloud Engineer Certification

## Status
validated

## Post Type
Certification study guide / technical reference

## Technologies Covered
- Google Cloud IAM
- Google Cloud resource hierarchy
- IAM roles, policies, conditions, and deny policies
- Service accounts and service account impersonation
- Google Cloud CLI (`gcloud`)
- Compute Engine, Cloud Storage, GKE, Cloud SQL, BigQuery, and Cloud Logging IAM roles

## Sources Consulted
- Google Cloud IAM roles and permissions: https://cloud.google.com/iam/docs/roles-overview
- Google Cloud IAM resource hierarchy access control: https://cloud.google.com/iam/docs/resource-hierarchy-access-control
- Google Cloud IAM Conditions overview: https://cloud.google.com/iam/docs/conditions-overview
- Google Cloud IAM deny policies overview: https://cloud.google.com/iam/docs/deny-overview
- Google Cloud service account types: https://cloud.google.com/iam/docs/service-account-types
- Google Cloud service account impersonation: https://cloud.google.com/iam/docs/service-account-impersonation
- Google Cloud roles for service account authentication: https://cloud.google.com/iam/docs/service-account-permissions
- Compute Engine service accounts and access scopes: https://cloud.google.com/compute/docs/access/service-accounts
- GKE Workload Identity Federation overview: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- GKE workload authentication guide: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud custom role permission support: https://cloud.google.com/iam/docs/custom-roles-permissions-support
- `gcloud iam roles create` reference: https://cloud.google.com/sdk/gcloud/reference/iam/roles/create
- `gcloud projects add-iam-policy-binding` reference: https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- `gcloud iam service-accounts add-iam-policy-binding` reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/add-iam-policy-binding
- `gcloud iam service-accounts keys create` reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create
- `gcloud compute instances create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create

## Issues Found
- Basic role descriptions were overstated as access to all resources or full control. Updated Viewer, Editor, and Owner descriptions to match Google Cloud documentation, including the caveat that Editor and Owner do not include every action for every service.
- Default service accounts were described as typically having Editor by default. Updated this to reflect current behavior: the automatic Editor grant depends on organization policy and is disabled by default for organizations created after May 3, 2024.
- The Google-managed service account example was ambiguous. Updated it to refer specifically to Cloud Build service agents.
- The GKE recommendation used the older shorthand "Workload Identity" and implied only service account linking. Updated it to "Workload Identity Federation for GKE" and noted both direct IAM principal grants and IAM service account linking.

## Review Notes
- The `gcloud` CLI is not installed in this workspace, so command validation was performed against the current official Google Cloud SDK reference documentation rather than local `--help` output.
- The post remains exam-oriented and intentionally high level. Future improvements could add IAM Conditions command examples for temporary access, but no additional content was required for technical correctness.
