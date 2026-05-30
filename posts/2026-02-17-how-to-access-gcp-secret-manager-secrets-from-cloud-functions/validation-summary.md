# Validation Summary: How to Access GCP Secret Manager Secrets from Cloud Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Functions / Cloud Run functions 2nd gen
- Google Secret Manager
- Google Cloud CLI (`gcloud functions deploy`, `gcloud secrets add-iam-policy-binding`)
- Python Functions Framework and Secret Manager client library
- Node.js Functions Framework and Secret Manager client library
- Go Functions Framework and Secret Manager client library
- Stripe Python SDK

## Sources Consulted
- Google Cloud Functions / Cloud Run functions secrets documentation: https://cloud.google.com/functions/docs/configuring/secrets
- Google Cloud Run service secrets documentation: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Google Cloud SDK `gcloud functions deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Secret Manager "Access a secret version" documentation and client library examples: https://docs.cloud.google.com/secret-manager/docs/access-secret-version
- Google Secret Manager client libraries documentation: https://docs.cloud.google.com/secret-manager/docs/reference/libraries
- Google Cloud Functions v2 API reference for `SecretEnvVar`, `SecretVolume`, and service account fields: https://docs.cloud.google.com/functions/docs/reference/rpc/google.cloud.functions.v2
- Stripe API reference for creating payments with Payment Intents: https://docs.stripe.com/api/payment_intents/create

## Issues Found
- The post said built-in secret references are fetched at startup for both environment variables and mounted files. Google documentation distinguishes these behaviors: environment variable secrets are resolved before instance startup, while mounted secret volumes are fetched when the file is read. Updated the introductory explanation, cold start section, approach-selection bullets, and updating-secrets section to make that distinction.
- The cold start section included an unsupported specific latency estimate of 50-200ms per secret. Removed the numeric estimate and kept the accurate claim that environment variable secret fetching can add cold start latency.
- The "Updating Secrets" section implied all built-in secret references require redeployment for warm instances to pick up new versions. Updated it to apply specifically to environment variable secrets, since mounted volumes can reflect `latest` when the file is read.
- The redeploy example omitted the original deployment settings, which could be ambiguous as a force-redeploy command. Updated the snippet to show redeploying with the same runtime, source, entry point, trigger, secret, service account, region, and project settings.
- The Python environment-variable example used Stripe's deprecated Charges API. Replaced it with a Payment Intents example using the current Stripe API.
- The "different project" bullet under client library selection implied built-in secret references do not support cross-project secrets. Google Cloud CLI supports full secret resource references for different projects, so the bullet now says to use the client library when choosing secrets or projects dynamically at runtime.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so CLI validation was performed against the official Google Cloud SDK reference instead of local `--help` output. The Secret Manager client library examples use current official access patterns for Python, Node.js, and Go.
