# Validation Summary: How to Set Up Request Authentication with Google Auth in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Google OpenID Connect and OAuth ID tokens
- Google service account ID tokens
- Google service account self-signed JWTs
- Firebase Authentication ID tokens
- Google Cloud CLI
- Python google-auth library

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Google Sign-In OpenID Connect documentation: https://developers.google.com/identity/openid-connect/openid-connect
- Google Cloud token types documentation: https://cloud.google.com/docs/authentication/token-types
- Google Cloud service account ID token documentation: https://cloud.google.com/docs/authentication/get-id-token
- Google Cloud short-lived service account credentials documentation: https://cloud.google.com/iam/docs/create-short-lived-credentials-direct
- Google Cloud SDK `gcloud auth print-identity-token` reference: https://cloud.google.com/sdk/gcloud/reference/auth/print-identity-token
- Firebase ID token verification documentation: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- google-auth service account documentation: https://google-auth.readthedocs.io/en/latest/reference/google.oauth2.service_account.html

## Issues Found
- The post conflated service account ID tokens with service-account-key-signed JWTs. I clarified that service account ID tokens are Google-signed and use `https://accounts.google.com`, while self-signed service account JWTs are signed by the service account key and use the service account email as issuer.
- The service account token table label was too broad. I changed it to "Google Service Account ID tokens" to match the token type being configured.
- The service account email-claim policy could fail for tokens that do not include an email claim. I added a note and updated the service account `gcloud auth print-identity-token` example to include `--include-email`.
- The access-token description was too absolute. I reworded it to say access tokens are not ID tokens and are not what Istio RequestAuthentication should validate in this setup.
- The complete Istio example combined a `DENY` policy with an `ALLOW` health-check policy in a way that would still deny unauthenticated health checks or deny authenticated API requests because of Istio policy precedence and ALLOW default-deny behavior. I updated the example so the `DENY` excludes health paths and the `ALLOW` policy explicitly allows both valid JWT principals and health-check paths.

## Review Notes
The examples use Istio `security.istio.io/v1`, current RequestAuthentication fields, and current `gcloud auth print-identity-token` flags. Future improvements could include a separate example for Firebase Auth RequestAuthentication, since Firebase appears only in the endpoint table.
