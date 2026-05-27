# Validation Summary: How to Use Secret Manager with Cloud Functions to Securely Access API Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Google Cloud Secret Manager
- Google Cloud CLI
- Cloud IAM
- Cloud Audit Logs
- Node.js
- Python
- Firebase Admin SDK

## Sources Consulted
- Google Cloud Secret Manager: Create a secret and access secret versions: https://docs.cloud.google.com/secret-manager/docs/creating-and-accessing-secrets
- Google Cloud SDK reference for `gcloud functions deploy`: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Run functions / Cloud Run secret configuration: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Google Cloud Run environment variable guidance: https://docs.cloud.google.com/run/docs/configuring/services/environment-variables
- Google Cloud Secret Manager audit logging: https://docs.cloud.google.com/secret-manager/docs/audit-logging
- Google Cloud Logging alerting example for Secret Manager access: https://docs.cloud.google.com/logging/docs/alerting/log-based-alerts
- Google Cloud Secret Manager Node.js client library reference: https://cloud.google.com/nodejs/docs/reference/secret-manager/latest
- Google Cloud Secret Manager Python client library reference: https://cloud.google.com/python/docs/reference/secretmanager/latest

## Issues Found
- The original post said every Secret Manager access is logged in Cloud Audit Logs. Secret Manager access is a Data Access audit log event, so access logging depends on Data Access audit logs being enabled. Updated the wording in the overview and monitoring section.
- The environment variable section said values are stored unencrypted in function metadata. Official docs support the concern that environment variables are function/service configuration and are not recommended for secrets, but not that they are stored unencrypted in metadata. Reworded this to avoid the unsupported claim.
- The IAM example hardcoded the App Engine default service account even though Gen 2 functions can use a different runtime service account. Changed the commands to capture the deployed function service account and grant access to that principal.
- The `gcloud functions deploy` examples for HTTP functions omitted `--trigger-http`, which is required when creating a new HTTP function. Added the trigger flag to the deployment snippets.
- The Node.js database snippet used `Pool` without importing it. Added the `pg` import so the example is complete.
- The runtime secret-fetch examples only checked older project ID environment variable names. Added `GOOGLE_CLOUD_PROJECT` before the older fallbacks.

## Review Notes
The post is technically relevant and current after the fixes. For mounted file secrets, Cloud Run documentation notes that volume reads fetch secret values from Secret Manager, which makes that method better suited to rotation than environment-variable secrets.
