# Validation Summary: How to Configure GCS Backend with Service Account Authentication in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Google Cloud Storage backend
- Google Cloud IAM service accounts
- `gcloud` CLI
- GitHub Actions
- Workload Identity Federation

## Sources Consulted
- OpenTofu `gcs` backend documentation: https://opentofu.org/docs/language/settings/backends/gcs/
- Google Cloud Application Default Credentials documentation: https://cloud.google.com/docs/authentication/application-default-credentials
- Google Cloud service account impersonation documentation: https://cloud.google.com/iam/docs/service-account-impersonation
- Google Cloud `gcloud iam service-accounts keys create` documentation: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create
- Google Cloud `gcloud iam service-accounts keys list` documentation: https://cloud.google.com/iam/docs/keys-list-get
- Google GitHub Actions auth action documentation: https://github.com/google-github-actions/auth
- OpenTofu setup action documentation: https://github.com/opentofu/setup-opentofu

## Issues Found
- The environment variable example mixed `GOOGLE_APPLICATION_CREDENTIALS` with `GOOGLE_CREDENTIALS=$(cat ...)`. For the OpenTofu `gcs` backend, the documented file-based options use a path via Application Default Credentials or backend-specific credential environment variables, so I removed the unsupported `cat`-based example.
- The "Inline Credentials" backend example was incorrect because the backend `credentials` setting is documented as a local path to a JSON credentials file, not inline JSON content. I replaced that section with the supported `GOOGLE_BACKEND_CREDENTIALS` path-based option.
- The GitHub Actions example used older action versions. I updated `google-github-actions/auth` from `@v2` to `@v3` and `opentofu/setup-opentofu` from `@v1` to `@v2` to match the current official usage examples.

## Review Notes
- The sample `roles/editor` grant is functional but very broad. The post already notes least privilege; in production, readers should replace it with resource-specific IAM roles.
- The GitHub Actions authentication flow is valid, but Google documents short-lived federated credentials. Long-running `tofu apply` steps should be tested in CI with the chosen auth pattern.
