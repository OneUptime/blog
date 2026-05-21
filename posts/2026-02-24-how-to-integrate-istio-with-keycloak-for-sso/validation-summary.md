# Validation Summary: How to Integrate Istio with Keycloak for SSO

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Istio VirtualService
- Kubernetes Deployments and Services
- Keycloak
- OpenID Connect
- JSON Web Tokens
- curl and jq

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Keycloak container guide: https://www.keycloak.org/server/containers
- Keycloak database configuration guide: https://www.keycloak.org/server/db
- Keycloak reverse proxy guide: https://www.keycloak.org/server/reverseproxy
- Keycloak hostname guide: https://www.keycloak.org/server/hostname
- Keycloak Admin REST API reference: https://www.keycloak.org/docs-api/latest/rest-api/index.html
- Keycloak OIDC endpoint documentation: https://www.keycloak.org/docs/latest/server_admin/#_oidc
- Keycloak 26.6.2 release announcement: https://www.keycloak.org/2026/05/keycloak-2662-released

## Issues Found
- The Keycloak deployment used the old `quay.io/keycloak/keycloak:23.0` image. Updated it to `26.6.2`, the current Keycloak release available during validation, so the example is not pinned to an outdated server version.
- The Keycloak deployment used `KEYCLOAK_ADMIN` and `KEYCLOAK_ADMIN_PASSWORD`. Updated these to `KC_BOOTSTRAP_ADMIN_USERNAME` and `KC_BOOTSTRAP_ADMIN_PASSWORD`, which are the current documented bootstrap admin environment variables.
- The Keycloak deployment used `KC_PROXY=edge`, which is deprecated in current Keycloak. Replaced it with `KC_PROXY_HEADERS=xforwarded` and `KC_HTTP_ENABLED=true`, matching the current reverse proxy guidance for edge TLS termination through an ingress or gateway.
- The deployment introduction mentioned the embedded H2 database while the manifest configured PostgreSQL. Updated the wording to clarify that the shown manifest uses PostgreSQL with `start-dev` for a lab setup, while omitting database settings uses Keycloak's development database.
- The JWT inspection command used plain `base64 -d` on a JWT payload. Replaced it with a `jq` command that decodes the payload directly from the token string and works more reliably with unpadded JWT payloads.

## Review Notes
- The Istio `RequestAuthentication` fields `issuer`, `jwksUri`, `forwardOriginalToken`, and `outputPayloadToHeader` are valid.
- The Istio `AuthorizationPolicy` examples using `notRequestPrincipals`, `requestPrincipals`, and `request.auth.claims[roles]` match the documented API.
- The Keycloak Admin REST API paths for realms, clients, roles, and protocol mappers are valid.
- The example still uses `start-dev`, which is appropriate only for a lab or tutorial setup. Production deployments should use `start`, an optimized image, persistent storage, TLS/proxy settings appropriate to the environment, and hardened secrets management.
