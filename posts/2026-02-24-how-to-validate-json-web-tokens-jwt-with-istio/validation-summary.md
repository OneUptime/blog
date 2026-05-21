# Validation Summary: How to Validate JSON Web Tokens (JWT) with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Envoy JWT authentication filter
- JSON Web Tokens (JWT)
- JSON Web Key Sets (JWKS)
- Kubernetes manifests and kubectl commands
- curl

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio JWT authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio authorization policy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio pilot-discovery environment variable reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Envoy JWT authentication filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter.html
- Envoy JWT authentication API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/jwt_authn/v3/config.proto.html
- RFC 7519, JSON Web Token (JWT): https://www.rfc-editor.org/rfc/rfc7519
- RFC 7517, JSON Web Key (JWK): https://www.rfc-editor.org/rfc/rfc7517

## Issues Found
- The post described JWT parts as base64-encoded. JWT compact serialization uses base64url-encoded parts, so the wording was corrected.
- The post implied Envoy always fetches JWKS directly from `jwksUri`. Istio's behavior depends on the configured remote JWKS mode, so the wording was updated to mention istiod or Envoy.
- The post stated that the JWT header contains a `kid`. This is common but not mandatory in all deployments, so the wording was softened to "usually contains."
- The supported algorithm list omitted HS256/384/512 and EdDSA, which Envoy documents as supported. These were added.
- The post said there is no built-in clock skew tolerance. Istio documents a 60-second JWT clock skew, so that section was corrected.
- The "valid token" curl example used an illustrative token ending in `.signature`, which would not validate. It was changed to a `<valid-token>` placeholder generated with the configured issuer, audience, and signing key.
- The JWKS caching section stated a roughly 5-minute default. Current official docs show istiod's default JWKS refresh interval as 20 minutes and Envoy remote JWKS cache default as 10 minutes, so the section was updated.

## Review Notes
The Kubernetes resource examples use current `security.istio.io/v1` APIs and valid RequestAuthentication / AuthorizationPolicy fields. RequestAuthentication still validates invalid presented tokens but allows requests without a token unless paired with an AuthorizationPolicy.
