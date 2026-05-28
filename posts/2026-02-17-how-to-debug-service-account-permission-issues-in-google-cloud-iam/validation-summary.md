# Validation Summary: How to Debug Service Account Permission Issues in Google Cloud IAM

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud service accounts
- Google Cloud CLI (`gcloud`)
- Compute Engine
- GKE Workload Identity Federation
- Cloud Audit Logs and Cloud Logging

## Sources Consulted
- Google Cloud CLI reference: `gcloud policy-troubleshoot iam` - https://docs.cloud.google.com/sdk/gcloud/reference/policy-troubleshoot/iam
- Google Cloud CLI reference: `gcloud logging read` - https://docs.cloud.google.com/sdk/gcloud/reference/logging/read
- Google Cloud CLI reference: `gcloud compute instances describe` - https://cloud.google.com/sdk/gcloud/reference/compute/instances/describe
- IAM roles for service account authentication - https://cloud.google.com/iam/docs/service-account-permissions
- IAM attach service accounts to resources - https://docs.cloud.google.com/iam/docs/attach-service-accounts
- Compute Engine service accounts - https://docs.cloud.google.com/compute/docs/access/service-accounts
- GKE Workload Identity Federation guide - https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Cloud Audit Logs overview and Data Access audit log configuration - https://docs.cloud.google.com/logging/docs/audit and https://docs.cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud IAM roles and permissions references for Compute Engine and Cloud SQL - https://docs.cloud.google.com/iam/docs/roles-permissions/compute and https://docs.cloud.google.com/iam/docs/roles-permissions/cloudsql

## Issues Found
- The post said default service accounts have the Editor role by default. This is now conditional because automatic Editor grants depend on organization policy configuration, and organizations created after May 3, 2024 have the automatic grant constraint enforced by default. Updated the wording to say default service accounts might receive Editor automatically depending on organization policy.
- The post treated "act as service account" errors as only impersonation failures. Google Cloud also uses `iam.serviceAccounts.actAs` for attaching service accounts to resources. Updated the explanation to mention both attaching and impersonating.
- The impersonation section said acting as another service account always requires `roles/iam.serviceAccountTokenCreator`. That role is correct for short-lived credential impersonation, but attaching a service account uses Service Account User / `iam.serviceAccounts.actAs`. Updated the section to specify short-lived credential impersonation.
- The GKE Workload Identity example only added the IAM allow-policy binding. Official GKE documentation also requires annotating the Kubernetes service account when using IAM service account impersonation. Added the missing `kubectl annotate serviceaccount` command.
- The audit logging section said audit logs show every API call. Data Access audit logs are disabled by default for most services, so this was too broad. Updated the wording to say audit logs show many administrative and access activities and to verify Data Access audit logs are enabled for read-only and data-access operations.
- The Policy Troubleshooter explanation said it shows every IAM policy that affects the decision. Updated this to the more precise wording that it shows the effective IAM policy evaluation, including inherited policies and conditional bindings.

## Review Notes
The commands and role names reviewed are current according to the official Google Cloud documentation. The local environment did not have `gcloud` installed, so CLI syntax was validated against the official Google Cloud CLI reference instead of local `--help` output.
