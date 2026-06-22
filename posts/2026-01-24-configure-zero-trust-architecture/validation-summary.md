# Validation Summary: How to Configure Zero Trust Architecture

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Zero Trust Architecture
- OpenID Connect and JWT validation
- Keycloak
- Flask
- PyJWT
- NGINX mTLS
- Kubernetes NetworkPolicy
- Istio RequestAuthentication, AuthorizationPolicy, and PeerAuthentication
- Redis session and rate-limit tracking

## Sources Consulted
- NIST SP 800-207 Zero Trust Architecture: https://csrc.nist.gov/pubs/sp/800/207/final
- Keycloak OpenID Connect endpoints: https://www.keycloak.org/securing-apps/oidc-layers
- PyJWT API reference: https://pyjwt.readthedocs.io/en/stable/api.html
- Flask API documentation for request JSON parsing: https://flask.palletsprojects.com/en/stable/api/
- NGINX SSL module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio JWT authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Redis Python client guide: https://redis.io/docs/latest/develop/clients/redis-py/

## Issues Found
- The Keycloak JWKS URL was shown as `/.well-known/jwks.json` under the issuer. Keycloak exposes realm signing keys at `/realms/{realm-name}/protocol/openid-connect/certs`, so the configuration and PyJWT client setup were updated to use the correct JWKS URI.
- The Flask token validation snippet referenced undefined `app`, `auth`, and `AuthError` names. Added minimal definitions and initialization so the example is coherent.
- The device posture example trusted posture fields supplied directly by the client. Updated it to accept only a `device_id` from the request and fetch posture from a trusted MDM/EDR inventory placeholder.
- The Kubernetes ingress NetworkPolicy used separate `podSelector` and `namespaceSelector` entries, which Kubernetes interprets as OR conditions. Combined them into one `from` entry so the policy selects API pods in the production namespace as intended.
- The Kubernetes DNS egress example used a non-standard namespace label `name: kube-system`. Updated it to the standard immutable namespace label `kubernetes.io/metadata.name: kube-system`.
- The Istio examples used `security.istio.io/v1beta1` and matched JWT claims without configuring request authentication. Updated the resources to `security.istio.io/v1` and added a `RequestAuthentication` resource so JWT claims can be validated and used by the authorization policy.
- The Istio mTLS comment implied mesh-wide enforcement, but the shown `PeerAuthentication` is namespace-scoped. Updated the wording to say it enforces mTLS between services in the namespace.
- The Redis session verification snippet assumed Redis returned string keys and values. Added a note to configure the Redis client with `decode_responses=True`, matching redis-py behavior.
- The continuous verification snippet referenced undefined exception classes and `flag_for_review`. Added minimal definitions so the example is internally consistent.

## Review Notes
The remaining examples are still intentionally illustrative. In a production system, device posture and device tokens should come from trusted MDM/EDR and identity infrastructure, and JWT/device-token signing keys should be managed by a dedicated token service or IdP rather than hard-coded in application code.
