# Validation Summary: How to Integrate Istio with Google Identity Platform

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Istio RequestAuthentication and AuthorizationPolicy
- Google Cloud Identity Platform
- Firebase Authentication ID tokens and custom claims
- Google service account ID tokens
- GKE Workload Identity
- Kubernetes ServiceEntry
- Firebase Auth REST API
- Google Cloud CLI

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Authorization Policy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Firebase Authentication ID token verification docs: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- Firebase Auth REST API reference: https://firebase.google.com/docs/reference/rest/auth
- Identity Platform REST API, accounts.signInWithPassword: https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/signInWithPassword
- Identity Platform REST API, accounts.update: https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/update
- Identity Platform REST API, projects.updateConfig: https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/projects/updateConfig
- Identity Platform multi-tenancy docs: https://docs.cloud.google.com/identity-platform/docs/multi-tenancy-authentication
- Identity Platform tenant management docs: https://docs.cloud.google.com/identity-platform/docs/multi-tenancy-managing-tenants
- Google Cloud token types documentation: https://cloud.google.com/docs/authentication/token-types
- gcloud auth print-identity-token reference: https://cloud.google.com/sdk/gcloud/reference/auth/print-identity-token
- Google OpenID Connect discovery documentation: https://developers.google.com/identity/openid-connect/openid-connect

## Issues Found
- The email/password provider setup used a `gcloud identity-platform config update --enable-email-signin` command that could not be verified in current official Google Cloud SDK reference docs. Replaced it with the documented Identity Platform `projects.updateConfig` REST API PATCH request using `signIn.email.enabled` and `signIn.email.passwordRequired`.
- Google service account JWT validation examples did not constrain the audience even though the generated test token used `--audiences=your-project-id`. Added matching `audiences` entries to the Google service account JWT rules.
- The egress ServiceEntry listed `securetoken.google.com`, which is the Firebase ID token issuer, not the refresh token API host. Replaced it with `securetoken.googleapis.com` and added `identitytoolkit.googleapis.com` for the Identity Toolkit REST calls used in the post.
- The custom claims REST API example used `localId` with an administrator OAuth token but did not include `targetProjectId`. Added `targetProjectId`, matching the documented administrator form of `accounts:update`.
- The multi-tenant section said the issuer changes, but Identity Platform tenant ID tokens retain the project issuer and carry tenant information in token claims. Corrected the wording.
- The Istio tenant claim condition used `request.auth.claims[firebase.tenant]`, which treats the name as a single claim. Changed it to `request.auth.claims[firebase][tenant]` for the nested `firebase.tenant` claim.
- The Workload Identity section implied GKE Workload Identity itself is the mesh service-auth token format. Clarified that the Istio rule is for Google service account ID tokens obtained through service account impersonation or Workload Identity.
- The JWT inspection command used raw `base64 -d`, which is unreliable for base64url-encoded JWT payloads. Replaced it with a `jq` expression that normalizes base64url characters before decoding.

## Review Notes
- The Firebase ID token JWKS URI used by Istio was checked live and returns a JWKS document, although Firebase's server-side verification docs primarily document the x509 certificate endpoint.
- RequestAuthentication in `istio-system` applies mesh-wide only when `istio-system` is the configured Istio root namespace; that is the default Istio installation pattern but should be adjusted for non-default root namespaces.
