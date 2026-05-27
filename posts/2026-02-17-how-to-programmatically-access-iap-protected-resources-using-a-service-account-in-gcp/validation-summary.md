# Validation Summary: How to Programmatically Access IAP-Protected Resources Using a Service Account

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Identity-Aware Proxy (IAP)
- Google Cloud IAM service accounts
- Google Cloud CLI (`gcloud`)
- OpenID Connect ID tokens
- Python `google-auth`
- Go `google.golang.org/api/idtoken`
- Node.js `google-auth-library`

## Sources Consulted
- Google Cloud IAP programmatic authentication: https://cloud.google.com/iap/docs/authentication-howto
- Google Cloud IAP custom OAuth configuration: https://cloud.google.com/iap/docs/custom-oauth-configuration
- Google Cloud IAP OAuth Admin API migration notes: https://cloud.google.com/iap/docs/deprecations/migrate-oauth-client
- Google Cloud SDK `gcloud iap web add-iam-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- Google Cloud SDK `gcloud auth print-identity-token`: https://cloud.google.com/sdk/gcloud/reference/auth/print-identity-token
- Google Cloud IAM service account authentication roles: https://cloud.google.com/iam/docs/service-account-permissions
- Python `google.auth.impersonated_credentials.IDTokenCredentials`: https://googleapis.dev/python/google-auth/latest/reference/google.auth.impersonated_credentials.html

## Issues Found
- The Go sample imported `net/http` but did not use it, which would cause `go run` or `go build` to fail. Removed the unused import.
- The post assumed the backend service always exposes an IAP OAuth client ID. Added a note that Google-managed OAuth clients can leave `iap.oauth2ClientId` unset and block OIDC programmatic access unless a programmatic OAuth client allowlist is configured, or the service account signed JWT flow is used.
- The Python service account impersonation snippet and local impersonation command omitted the email claim. IAP requires service account OIDC tokens to include the email claim, so the Python snippet now sets `include_email=True` and the `gcloud` command now includes `--include-email`. The role guidance remains `roles/iam.serviceAccountTokenCreator` for the shown `google-auth` and `gcloud --impersonate-service-account` patterns.

## Review Notes
The remaining Python, Go, Node.js, IAM, and `gcloud` examples align with current official documentation. The service account key file example is technically valid, but key files should be avoided where workload identity federation or service account impersonation can be used instead.
