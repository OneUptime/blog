# Validation Summary: How to Set Up Request Authentication with Firebase in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Firebase Authentication
- Firebase Admin SDK for Python
- Firebase Auth REST API
- JWT and JWKS
- Kubernetes kubectl

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Firebase Admin SDK ID token verification docs: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- Firebase Admin SDK custom token docs: https://firebase.google.com/docs/auth/admin/create-custom-tokens
- Firebase Auth REST API reference: https://firebase.google.com/docs/reference/rest/auth
- Google Firebase secure token JWK endpoint: https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com

## Issues Found
- The AuthorizationPolicy example matched `request.auth.claims[email_verified]` against `"true"`, but Istio documents that `request.auth.claims[...]` supports only string or list-of-string claims. Firebase `email_verified` is a boolean claim, so the example was changed to match the string-valued `email` claim instead.
- The custom claims example set `admin` to the boolean value `True` and then matched it through `request.auth.claims[admin]`. Because Istio claim matching supports string or list-of-string claims, the example now sets `admin` to the string `"true"`.
- The JWT decoding command used plain `base64 -d` on a JWT payload. JWTs use base64url encoding and may omit padding, so the command was replaced with a Python base64url decoder that adds padding before decoding the token argument.

## Review Notes
The Firebase issuer, audience, ID token lifetime, custom-token exchange endpoint, email/password sign-in endpoint, Istio `RequestAuthentication` fields, `forwardOriginalToken`, and `notRequestPrincipals: ["*"]` authentication requirement pattern were consistent with the official documentation reviewed.
