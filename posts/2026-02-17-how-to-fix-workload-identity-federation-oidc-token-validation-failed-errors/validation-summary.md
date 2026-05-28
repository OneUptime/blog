# Validation Summary: How to Fix Workload Identity Federation OIDC Token Validation Failed Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Workload Identity Federation
- Google Cloud Security Token Service
- Google Cloud IAM and service account impersonation
- OpenID Connect and JWTs
- GitHub Actions OIDC
- GitLab CI/CD OIDC ID tokens
- gcloud CLI
- CEL attribute conditions

## Sources Consulted
- Google Cloud IAM Workload Identity Federation overview: https://cloud.google.com/iam/docs/workload-identity-federation
- Google Cloud Workload Identity Federation with other providers: https://cloud.google.com/iam/docs/workload-identity-federation-with-other-providers
- Google Cloud Workload Identity Federation with AWS or Azure VMs: https://cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds
- Google Cloud SDK reference for `gcloud iam workload-identity-pools providers describe`: https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/providers/describe
- Google Cloud SDK reference for `gcloud iam workload-identity-pools providers update-oidc`: https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/providers/update-oidc
- Google Cloud Security Token Service audit logging: https://cloud.google.com/iam/docs/audit-logging/audit-logging-sts
- google-github-actions/auth README: https://github.com/google-github-actions/auth
- GitLab ID token authentication documentation: https://docs.gitlab.com/ci/secrets/id_token_authentication/
- OpenID Connect Discovery 1.0 specification: https://openid.net/specs/openid-connect-discovery-1_0.html

## Issues Found
- The JWT decoding examples used plain `base64 -d` on JWT payloads. JWT payloads are base64url encoded and often omit padding, so the examples could fail. Updated both examples to use Python `base64.urlsafe_b64decode` with padding restoration.
- The default audience section only showed the HTTPS-prefixed provider resource name. Google Cloud accepts the full canonical provider resource name with or without the HTTPS prefix when allowed audiences are empty. Added the canonical `//iam.googleapis.com/...` form.
- The GitHub Actions snippet used `google-github-actions/auth@v2`. The upstream action documentation now shows `@v3`, so the example was updated to `@v3`.
- The attribute condition section said the command tested CEL locally, but the command actually updates the provider. Reworded the text to describe the command accurately.
- The flow and service account impersonation section implied every Workload Identity Federation setup must impersonate a service account. Google Cloud supports both direct resource access and service account impersonation, so the wording was corrected.

## Review Notes
The `gcloud` binary was not installed in the local environment, so CLI syntax was checked against the official Google Cloud SDK reference instead of local `--help` output. The post is now technically consistent with the consulted official documentation.
