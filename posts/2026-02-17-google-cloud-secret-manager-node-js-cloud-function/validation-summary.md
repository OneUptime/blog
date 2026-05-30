# Validation Summary: How to Use the google-cloud/secret-manager npm Package to Inject Secrets into a

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Secret Manager
- Cloud Run functions / Cloud Functions
- Node.js
- @google-cloud/secret-manager npm package
- Google Cloud CLI
- IAM service accounts and roles

## Sources Consulted
- Google Cloud Secret Manager: Access a secret version: https://docs.cloud.google.com/secret-manager/docs/access-secret-version
- Google Cloud Secret Manager Node.js client library reference: https://docs.cloud.google.com/nodejs/docs/reference/secret-manager/latest
- Google Cloud CLI reference for `gcloud secrets create`: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Cloud CLI reference for `gcloud functions deploy`: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Run environment variables documentation: https://docs.cloud.google.com/run/docs/configuring/services/environment-variables
- Cloud Run functions IAM documentation: https://cloud.google.com/functions/docs/concepts/iam

## Issues Found
- The title and description used `google-cloud/secret-manager`, but the npm package name is `@google-cloud/secret-manager`. Updated the README heading and description to use the correct package name, and completed the truncated title.
- The service account setup comment implied the Compute Engine default service account always applies. Current Cloud Run functions use that default when no custom runtime service account is configured, but deployments can use a custom service account. Updated the comment to make that condition explicit.
- The Node.js examples only checked `process.env.GCP_PROJECT`. Current Cloud Run functions documentation recommends not depending on implicit environment variables beyond documented function variables, and `GOOGLE_CLOUD_PROJECT` is the more common Google project ID environment variable. Updated the examples to prefer `GOOGLE_CLOUD_PROJECT` while keeping `GCP_PROJECT` as a fallback.

## Review Notes
- The Secret Manager client usage, `accessSecretVersion` call shape, `payload.data.toString('utf8')`, `latest` and numeric version references, `gcloud secrets create --data-file=- --replication-policy=automatic`, secret-level IAM binding, and `--set-secrets` environment-variable and file-mount syntax are consistent with current official documentation.
- The examples intentionally omit checksum verification, which the official Secret Manager docs include for some languages and use cases. That is acceptable for a concise Cloud Function tutorial, but checksum validation could be added in a future hardening pass.
