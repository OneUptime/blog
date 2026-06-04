# Validation Summary: How to Implement Gloo External Authentication with OAuth2 and OIDC

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Gloo Gateway / Gloo Edge Enterprise
- ExtAuth / Envoy external authorization
- OAuth2 and OpenID Connect
- Auth0 and Okta
- JWT validation and JWKS
- API key authentication
- RBAC
- Kubernetes and Helm
- Redis session storage

## Sources Consulted
- Gloo Gateway OAuth external authentication documentation: https://docs.solo.io/gloo-edge/latest/guides/security/auth/extauth/oauth/
- Gloo Gateway external authentication overview: https://docs.solo.io/gloo-edge/latest/guides/security/auth/extauth/
- Gloo Gateway API key authentication documentation: https://docs.solo.io/gloo-edge/latest/guides/security/auth/extauth/apikey_auth/
- Gloo Gateway JWT and access control documentation: https://docs.solo.io/gloo-edge/latest/guides/security/auth/jwt/access_control/
- Gloo Gateway JWT claim-based routing documentation: https://docs.solo.io/gloo-edge/latest/guides/security/auth/jwt/claim_routing/
- Gloo Gateway AuthConfig API reference: https://docs.solo.io/gloo-edge/latest/reference/api/github.com/solo-io/gloo/projects/gloo/api/v1/enterprise/options/extauth/v1/extauth.proto.sk/
- Gloo Gateway RBAC API reference: https://docs.solo.io/gloo-edge/latest/reference/api/github.com/solo-io/gloo/projects/gloo/api/v1/enterprise/options/rbac/rbac.proto.sk/
- Envoy external authorization filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter.html

## Issues Found
- The deployment section incorrectly stated that open-source Gloo could use the built-in ExtAuth OAuth/OIDC flow by manually applying an ExtAuth deployment manifest. The official docs state that this feature is available in Gloo Gateway Enterprise only, and the referenced raw GitHub URL returns 404. Updated the section to require Enterprise and use documented Helm deployment settings.
- The OAuth client secret command used an unsupported secret key format for Gloo OAuth secrets. Replaced it with `glooctl create secret oauth`, which creates the expected Gloo OAuth secret.
- Redis session examples placed `host` directly under `redis`. Updated them to use `redis.cookieName` and `redis.options.host`, matching the documented schema.
- The Auth0 cookie example used `secure: true`, but Gloo's documented cookie options use `notSecure` for non-secure demo cookies and secure cookies are the default. Removed the incorrect field.
- JWT validation and custom claim extraction were shown as `AuthConfig` resources with provider details under `spec.configs[].jwt`. Gloo Gateway configures JWT providers on VirtualService options, so these examples were converted to VirtualService `options.jwt` snippets.
- API key secret creation used a generic Kubernetes secret without the Gloo API key secret type. Replaced it with `glooctl create secret apikey` and patched metadata fields used by `headersFromMetadata`.
- The multi-provider example implied fallback behavior from two sequential configs. Gloo requires all configs by default unless `booleanExpr` is set, so named configs and `booleanExpr: "oauth || apikey"` were added.
- The RBAC example put RBAC policies inside an `AuthConfig` and then attempted to reference policy names from route options as a list. Gloo RBAC policies are configured under VirtualService or route `options.rbac.policies`, so the examples were corrected.
- The monitoring section used unverified `gloo_extauth_*` Prometheus metrics. Replaced them with Envoy's documented `cluster.<route_target_cluster>.ext_authz.*` statistics.

## Review Notes
The post is now technically aligned with current Gloo Gateway Enterprise documentation. A future improvement would be to specify an exact tested Gloo Gateway Enterprise version, because some fields such as OAuth client authentication options have evolved over time and older installations can have different AuthConfig formats.
