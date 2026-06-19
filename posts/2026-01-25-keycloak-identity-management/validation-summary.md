# Validation Summary: How to Configure Keycloak for Identity Management

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Keycloak
- OAuth 2.0
- OpenID Connect
- SAML
- Docker Compose
- PostgreSQL
- Kubernetes
- Helm
- Bitnami Keycloak Helm chart
- LDAP / Active Directory
- Google identity provider integration
- Multi-factor authentication
- Node.js / Express
- Passport
- React
- keycloak-js
- Python FastAPI
- python-jose
- Keycloak Admin REST API

## Sources Consulted
- Keycloak container documentation: https://www.keycloak.org/server/containers
- Keycloak configuration documentation: https://www.keycloak.org/server/configuration
- Keycloak Admin REST API reference: https://www.keycloak.org/docs-api/latest/rest-api/index.html
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/index.html
- Keycloak JavaScript adapter documentation: https://www.keycloak.org/securing-apps/javascript-adapter
- Keycloak OpenID Connect endpoints and token validation documentation: https://www.keycloak.org/securing-apps/oidc-layers
- Keycloak UserStorageProviderResource Javadocs: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/admin/client/resource/UserStorageProviderResource.html
- Bitnami Keycloak chart values: https://github.com/bitnami/charts/blob/main/bitnami/keycloak/values.yaml
- FastAPI security reference: https://fastapi.tiangolo.com/reference/security/
- python-jose JWT implementation reference: https://github.com/mpdavis/python-jose/blob/master/jose/jwt.py
- passport-keycloak-oauth2-oidc package documentation: https://github.com/louie007/passport-keycloak-oauth2-oidc

## Issues Found
- The Docker Compose example pinned `quay.io/keycloak/keycloak:23.0` and used the older `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` bootstrap variables. Updated the image to the current official `latest` example style and changed the variables to `KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD`.
- The startup command used the legacy `docker-compose` command. Updated it to `docker compose`, which is the current Docker Compose v2 command.
- The MFA feature list implied built-in SMS MFA support. Keycloak supports OTP and WebAuthn out of the box, while SMS requires a custom authenticator/provider, so the wording was corrected.
- The PKCE instruction said "Enable PKCE", but the current admin UI exposes the method setting. Updated it to "Set PKCE method to S256".
- The backend token validation example expected `audience="backend-api"` without explaining that Keycloak access tokens must include that audience. Added a note to configure an audience mapper or token exchange before validating that audience.
- The MFA conditional flow JSON was not a valid complete Keycloak authentication-flow configuration for role-based OTP. Replaced it with accurate Admin Console steps using a conditional subflow with "Condition - user role" and "OTP Form".
- The Express/Passport example used `req.isAuthenticated()` without configuring Express sessions, Passport middleware, or serialization. Added the required session and Passport setup.
- The FastAPI JWT example validated signature and audience but omitted issuer validation. Added the realm issuer check and clarified the audience requirement.
- The role-assignment curl example posted only a role name. Keycloak Admin REST expects RoleRepresentation objects for role mappings, so the example now fetches the role representation first and posts that representation.

## Review Notes
The post is technically relevant and valid after corrections. For future improvement, the deployment examples could pin known-good image and chart versions instead of using `latest`, but using `latest` is consistent with the current official container quick-start documentation.
