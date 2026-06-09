# Validation Summary: How to Configure Keycloak Roles and Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Keycloak (Admin REST API, Admin CLI / kcadm.sh, Authorization Services)
- OAuth2 / OpenID Connect
- JWT tokens (realm_access, resource_access claims)
- Protocol mappers (oidc-usermodel-realm-role-mapper, oidc-usermodel-client-role-mapper, oidc-group-membership-mapper)
- Python (requests library, python-jose for JWT)
- FastAPI (route protection via decorators and dependencies)

## Sources Consulted
- Keycloak Admin REST API reference: https://www.keycloak.org/docs-api/latest/rest-api/index.html
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/
- Keycloak Authorization Services Guide (resources, scopes, policies, permissions, time policy fields): https://www.keycloak.org/docs/latest/authorization_services/
- Keycloak Admin CLI (`kcadm.sh`) documentation
- python-jose documentation and source: https://python-jose.readthedocs.io/ (verified `jose.jwk.construct` API and absence of `jwt.algorithms` submodule)
- PyJWT documentation (to confirm `jwt.algorithms.RSAAlgorithm.from_jwk` belongs to PyJWT, not python-jose): https://pyjwt.readthedocs.io/
- FastAPI security / OAuth2 docs: https://fastapi.tiangolo.com/tutorial/security/

## Issues Found
1. **Incorrect python-jose API usage in `app_authorization.py`.** The post imported `from jose import jwt, JWTError` and then called `jwt.algorithms.RSAAlgorithm.from_jwk(key)`. That `jwt.algorithms` path is from PyJWT, not python-jose; python-jose has no `jwt.algorithms` submodule, so this would raise `AttributeError` at runtime.
   - **Fix:** Changed imports to `from jose import jwt, jwk` and `from jose.exceptions import JWTError`, then replaced the key-construction line with `public_key = jwk.construct(key)`, which is the canonical python-jose way to build a key from a JWK dict.

2. **Incorrect Keycloak time policy range syntax.** The `create_time_policy` helper accepted `hour='9-18'` and sent it as a single `hour` field. Keycloak's `TimePolicyRepresentation` REST API expresses ranges using paired start/end fields (`hour`/`hourEnd`, `minute`/`minuteEnd`, `dayMonth`/`dayMonthEnd`, etc.), not a single hyphenated value. Passing `"9-18"` to `hour` would not produce a 9 AM–6 PM range and would be rejected/ignored by the policy evaluator.
   - **Fix:** Added `hour_end` and `minute_end` parameters to `create_time_policy`, mapped them to `hourEnd` / `minuteEnd` in the request body, and updated the business-hours example call site to use `hour='9', hour_end='18'`.

## Review Notes
- The post uses the modern Keycloak URL layout (`/realms/...` and `/admin/realms/...`), which is correct for Keycloak 17+ (the `/auth/` prefix was removed in Quarkus-based Keycloak). Anyone on legacy Wildfly Keycloak (< 17) would need to prepend `/auth`.
- The example uses the Resource Owner Password Credentials grant (`grant_type=password`) against the `admin-cli` client to obtain an admin token. This is convenient for tutorials but is deprecated/discouraged by the OAuth 2.0 Security BCP; service accounts or `kcadm.sh` with stored credentials are preferable for production automation. Not strictly incorrect, just worth flagging.
- The `oidc-usermodel-client-role-mapper` configuration in `add_client_roles_mapper` does not set `usermodel.clientRoleMapping.clientId`. Without it, the mapper still emits roles for the requesting/all clients depending on Keycloak version. If a reader wants roles scoped to one specific client, they should add that config key.
- The JWT validation example sets `audience=CLIENT_ID`. By default, Keycloak access tokens do not include the requesting client as an `aud` claim (they typically include `"account"`); an audience mapper or token configuration is required for this to validate. This is a configuration prerequisite rather than a bug in the snippet, so it was left unchanged.
- The example access token in the "Example Token Structure" section omits some standard claims (`iss`, `aud`, `azp`, `typ`) for brevity. That is acceptable for an illustrative example.
- The `directAccessGrantsEnabled: False` default in the client config is a good security choice and was preserved.
