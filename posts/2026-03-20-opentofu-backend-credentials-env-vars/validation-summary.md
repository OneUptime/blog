# Validation Summary: How to Pass Backend Credentials via Environment Variables in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (backends configuration)
- Terraform (compatible config syntax)
- AWS S3 backend (AWS credential env vars, IRSA / web identity)
- Azure azurerm backend (ARM_* env vars)
- Google Cloud Storage backend (Application Default Credentials)
- PostgreSQL backend (libpq env vars)
- Consul backend
- HTTP backend
- GitHub Actions (aws-actions/configure-aws-credentials)
- AWS Secrets Manager CLI

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu azurerm backend documentation: https://opentofu.org/docs/language/settings/backends/azurerm/
- OpenTofu pg (PostgreSQL) backend documentation: https://opentofu.org/docs/language/settings/backends/pg/
- OpenTofu Consul backend documentation: https://opentofu.org/docs/language/settings/backends/consul/
- OpenTofu HTTP backend documentation: https://opentofu.org/docs/language/settings/backends/http/
- OpenTofu CLI environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/

## Issues Found
- **Introduction referenced a non-existent `TF_BACKEND_CONFIG_*` environment variable pattern.** OpenTofu does not document or support a generic `TF_BACKEND_CONFIG_*` env var pattern; backend-specific env vars are the actual mechanism (e.g., `AWS_*`, `ARM_*`, `TF_HTTP_*`). The introduction was rewritten to list the real prefixes/variables instead of the made-up pattern.

## Review Notes
- All backend-specific env vars in the post were verified against the current OpenTofu backend docs and are accurate: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `AWS_PROFILE`, `AWS_ROLE_ARN`, `AWS_WEB_IDENTITY_TOKEN_FILE` (S3); `ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID` (azurerm); `GOOGLE_APPLICATION_CREDENTIALS` (GCS); `PGUSER`/`PGPASSWORD`/`PGHOST`/`PGPORT`/`PGDATABASE` (pg backend explicitly supports libpq env vars per docs); `CONSUL_HTTP_TOKEN`, `CONSUL_HTTP_ADDR` (consul); `TF_HTTP_USERNAME`, `TF_HTTP_PASSWORD`, `TF_HTTP_ADDRESS` (http).
- `aws-actions/configure-aws-credentials@v4` is the current major version on the GitHub Actions Marketplace.
- The `tofu init -backend-config=backends/production.hcl` partial-configuration syntax is correct.
- Minor stylistic note (not corrected, since it would change scope): exporting both `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` AND `AWS_PROFILE` in the same shell session is unusual; the post's inline comment "Or use a named profile" makes the alternative clear, but in practice the explicit access keys typically take precedence over the profile.
