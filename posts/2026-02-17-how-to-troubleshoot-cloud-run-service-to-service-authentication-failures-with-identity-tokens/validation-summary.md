# Validation Summary: How to Troubleshoot Cloud Run Service-to-Service Authentication Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Cloud Run
- Google Cloud IAM
- Google Cloud service accounts
- OpenID Connect ID tokens
- Google Cloud SDK / gcloud
- Python google-auth
- Node.js google-auth-library
- Go google.golang.org/api/idtoken
- JWT debugging

## Sources Consulted
- Cloud Run service-to-service authentication: https://docs.cloud.google.com/run/docs/authenticating/service-to-service
- Cloud Run custom audiences: https://docs.cloud.google.com/run/docs/configuring/custom-audiences
- Cloud Run service identity: https://cloud.google.com/run/docs/securing/service-identity
- Cloud Run ingress settings: https://docs.cloud.google.com/run/docs/securing/ingress
- Cloud Run IAM roles: https://cloud.google.com/run/docs/reference/iam/roles
- gcloud auth print-identity-token reference: https://cloud.google.com/sdk/gcloud/reference/auth/print-identity-token
- gcloud run services add-iam-policy-binding reference: https://cloud.google.com/sdk/gcloud/reference/run/services/add-iam-policy-binding
- Python google.oauth2.id_token reference: https://googleapis.dev/python/google-auth/latest/reference/google.oauth2.id_token.html
- Node.js GoogleAuth getIdTokenClient reference: https://docs.cloud.google.com/nodejs/docs/reference/google-auth-library/latest/google-auth-library/googleauth
- Go idtoken package reference: https://pkg.go.dev/google.golang.org/api/idtoken

## Issues Found
- The audience guidance said the value should not include a trailing slash. Official examples sometimes show a service URL with a trailing slash, while the real requirement is that the token audience match the Cloud Run service URL or a configured custom audience and must not include the request path or query string. Updated the wording to avoid an inaccurate blanket rule.
- The IAM section said the invoker role must not be granted on the project. Project-level grants can work, although service-level grants are the least-privilege recommendation. Updated the wording to recommend granting `roles/run.invoker` on the target service for least privilege.
- The Go example imported `log` and `net/http` without using them, which would make the snippet fail to compile. Removed the unused imports.
- The local Python example implied that `gcloud auth application-default login` user ADC works with `google.oauth2.id_token.fetch_id_token`. The Python google-auth API only obtains these ID tokens from service account credentials or supported Google metadata environments. Updated the local guidance to use service account ADC, such as `GOOGLE_APPLICATION_CREDENTIALS`.
- The JWT decoding command used plain `base64 -d`, which is unreliable for JWT base64url payloads and missing padding. Replaced it with a Python decoder that uses `base64.urlsafe_b64decode` and adds required padding.
- The ingress workflow label oversimplified internal-only Cloud Run ingress as a same-project or VPC check. Updated it to state that traffic must route through a VPC path considered internal.

## Review Notes
The main Cloud Run authentication flow, `gcloud auth print-identity-token --audiences`, `roles/run.invoker` binding command, Node.js `getIdTokenClient`, Go `idtoken.NewClient`, and metadata-server ID token behavior align with current official documentation. The container examples do not check non-2xx HTTP responses, which is acceptable for a focused authentication article but could be improved in a fuller production example.
