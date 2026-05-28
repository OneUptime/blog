# Validation Summary: How to Implement Short-Lived Credentials with Service Account Token Creator Role

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud service accounts
- Service Account Token Creator role
- Service account impersonation
- Google Cloud CLI
- Python google-auth library
- Cloud Run
- Cloud Storage signed URLs
- Cloud Audit Logs / Cloud Logging

## Sources Consulted
- Google Cloud IAM: Service account impersonation: https://cloud.google.com/iam/docs/service-account-impersonation
- Google Cloud IAM: Use service account impersonation: https://cloud.google.com/docs/authentication/use-service-account-impersonation
- Google Cloud IAM: Service account credentials: https://cloud.google.com/iam/docs/service-account-creds
- Google Cloud IAM: Roles for service account authentication: https://cloud.google.com/iam/docs/service-account-permissions
- IAM Service Account Credentials API reference: https://cloud.google.com/iam/docs/reference/credentials/rest
- google-auth impersonated credentials reference: https://google-auth.readthedocs.io/en/latest/reference/google.auth.impersonated_credentials.html
- Google Cloud CLI config set reference: https://cloud.google.com/sdk/gcloud/reference/config/set
- Cloud Run container deployment permissions: https://cloud.google.com/run/docs/deploying
- Artifact Registry deployment to Cloud Run: https://cloud.google.com/artifact-registry/docs/integrate-cloud-run
- Cloud Storage signed URLs overview and helper tooling: https://cloud.google.com/storage/docs/access-control/signed-urls and https://cloud.google.com/storage/docs/access-control/signing-urls-with-helpers
- Cloud Audit Logs AuditLog schema: https://cloud.google.com/logging/docs/reference/audit/auditlog/rest/Shared.Types/AuditLog
- IAM audit log examples for service accounts: https://cloud.google.com/iam/docs/audit-logging/examples-service-accounts

## Issues Found
- The prerequisites said to enable the IAM API. For service account impersonation and short-lived credential generation, Google Cloud documents the required API as the Service Account Credentials API. Updated the prerequisite accordingly.
- The Cloud Run deployer example granted `roles/run.developer` and `roles/artifactregistry.reader`, but Cloud Run deployment also requires `roles/iam.serviceAccountUser` on the service identity. Added a corresponding IAM binding command.
- The summary stated that short-lived tokens "cannot be stored or shared meaningfully." Unexpired bearer tokens can still be stored or shared and used until expiration, so this was overstated. Reworded it to say they expire automatically and have limited value after expiration.

## Review Notes
- The Python impersonation examples use current `google-auth` APIs, including `impersonated_credentials.Credentials`, `IDTokenCredentials`, `lifetime`, and `delegates`.
- The Token Creator role description matches Google's documented capabilities: access tokens, OIDC ID tokens, signed JWTs, signed blobs, implicit delegation, and `gcloud` impersonation.
- The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud CLI documentation rather than local `--help` output.
