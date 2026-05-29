# Validation Summary: How to Authenticate Python Apps to GCP Services Using App Default Credentials

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Application Default Credentials
- Google Cloud CLI
- Python Google Cloud client libraries
- google-auth for Python
- Cloud Run, Cloud Functions, Compute Engine, and GKE
- Workload Identity Federation
- Workload Identity Federation for GKE
- Service account impersonation

## Sources Consulted
- Google Cloud: How Application Default Credentials works: https://docs.cloud.google.com/docs/authentication/application-default-credentials
- Google Cloud: Authenticate for using client libraries: https://docs.cloud.google.com/docs/authentication/client-libraries
- Google Cloud: Configure Workload Identity Federation with deployment pipelines: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Google Cloud: Download credential configuration and grant access for Workload Identity Federation: https://docs.cloud.google.com/iam/docs/workload-download-cred-and-grant-access
- Google Cloud: Authenticate to Google Cloud APIs from GKE workloads: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Auth Python: impersonated_credentials reference: https://googleapis.dev/python/google-auth/latest/reference/google.auth.impersonated_credentials.html
- Google Cloud Storage Python client reference: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.client.Client

## Issues Found
- The ADC search order incorrectly listed Workload Identity Federation credentials as a separate fourth lookup step. Google documents three ADC lookup locations, and Workload Identity Federation is provided through a credential configuration file referenced by `GOOGLE_APPLICATION_CREDENTIALS`. Updated the list and added a short clarification.
- The GitHub Actions Workload Identity Federation provider example omitted the recommended required organization-restricting attribute condition for GitHub's shared issuer. Added `attribute.repository_owner` mapping, an `--attribute-condition`, and matched the documented GitHub issuer URL form.
- The Workload Identity Federation Python credential configuration example did not state that the `credential_source` file must already contain an external OIDC subject token. Added a comment to prevent readers from assuming the token file is created by the snippet.
- The GKE Workload Identity cluster update command omitted an explicit cluster location. Added `--location=us-central1`, matching the documented `gcloud container clusters update` pattern.

## Review Notes
The remaining Python snippets and CLI examples are consistent with current Google Cloud and google-auth documentation at the time of review. The examples still use placeholder project IDs, project numbers, service account names, and locations that readers must replace for their own environments.
