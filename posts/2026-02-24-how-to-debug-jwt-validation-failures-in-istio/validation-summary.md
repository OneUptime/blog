# Validation Summary: How to Debug JWT Validation Failures in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Envoy JWT authentication filter
- JSON Web Tokens and JWKS
- Kubernetes kubectl commands
- istioctl proxy debugging

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy JWT authentication filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter.html
- Envoy JWT authn v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/jwt_authn/v3/config.proto.html
- RFC 7515 JSON Web Signature: https://www.rfc-editor.org/rfc/rfc7515

## Issues Found
- The JWT decoding commands used `base64 -d`, which is not reliable for JWT compact serialization because JWT header and payload segments are base64url encoded and commonly omit padding. Replaced them with Python `urlsafe_b64decode` snippets that restore padding and accept `"$TOKEN"` as a shell variable.
- The post said a token with an unknown issuer could return 200 with no principal and later described unknown issuers as ignored. Current Istio documentation says a JWT with a different `iss` claim is rejected when validated by a matching RequestAuthentication rule. Updated the 200/no-principal and scenario text to describe the accurate case: requests without tokens are accepted unless AuthorizationPolicy requires a request principal.
- The JWKS reachability section stated that the Envoy sidecar always fetches JWKS. Istio may use Istiod or Envoy depending on remote JWKS mode, so the wording now refers to the configured JWKS resolver.
- The key rotation guidance said Envoy refreshes JWKS approximately every 5 minutes. Envoy's documented default remote JWKS cache duration is 10 minutes, while Istiod's documented default public key refresh interval is 20 minutes. Updated the guidance to keep old keys longer than the configured cache or refresh interval.
- Envoy JWT statistics were listed without their full namespace. Updated examples to use `http.<stat_prefix>.jwt_authn.*`, matching Envoy documentation.

## Review Notes
The remaining commands and configuration snippets align with current Istio and Envoy documentation. The exact JWKS fetch path and refresh behavior can vary by Istio deployment settings, especially `PILOT_JWT_ENABLE_REMOTE_JWKS`, so future version-specific articles should state the assumed Istio version and JWKS mode.
