# Validation Summary: How to Run Authentik in Docker for Identity Provider

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Authentik
- Docker Compose
- PostgreSQL
- OAuth2 and OpenID Connect
- SAML
- LDAP
- Authentik proxy and LDAP outposts
- Express.js
- Passport
- openid-client

## Sources Consulted
- Authentik Docker Compose installation documentation: https://docs.goauthentik.io/install-config/install/docker-compose/
- Current Authentik Compose file: https://docs.goauthentik.io/compose.yml
- Authentik OAuth2/OpenID Connect provider documentation: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/
- Authentik OAuth2 provider API reference: https://docs.goauthentik.io/docs/developer-docs/api/reference/providers-oauth-2-create
- Authentik application API reference: https://docs.goauthentik.io/docs/developer-docs/api/reference/core-applications-create
- Authentik manual outpost Docker Compose documentation: https://docs.goauthentik.io/add-secure-apps/outposts/manual-deploy-docker-compose/
- Authentik LDAP provider documentation: https://docs.goauthentik.io/docs/add-secure-apps/providers/ldap/
- Authentik authenticator validation stage documentation: https://docs.goauthentik.io/add-secure-apps/flows-stages/stages/authenticator_validate/
- Authentik email configuration documentation: https://docs.goauthentik.io/install-config/email/
- openid-client official repository documentation: https://github.com/panva/openid-client

## Issues Found
- The Docker Compose example used an older Redis-based Authentik layout and pinned `2024.8` images. Updated it to the current official 2026.5 Compose structure, including the current image tag, `/data` mount, PostgreSQL-only dependency, `shm_size`, and `docker compose pull`.
- The prerequisite and secret generation commands did not match current Authentik guidance. Updated the requirements to Compose V2 with 2 CPU cores / 2 GB RAM and changed secret generation to use the documented byte lengths and newline stripping.
- The OAuth2 provider API example used a managed flow slug where the API requires UUIDs, omitted the required invalidation flow, and used the old string form for `redirect_uris`. Updated the payload to the current API shape and added the application creation call required for the `my-web-app` slug.
- The Node.js sample used the old `openid-client` v5-style `Issuer` and `Strategy` imports. Updated it to the current v6 ESM API using `client.discovery()` and `openid-client/passport`.
- The proxy and LDAP outpost examples used old image tags, and the LDAP port mapping did not match the official outpost mapping. Updated outpost image tags and mapped LDAP/LDAPS host ports to container ports `3389` and `6636`.
- The backup command referenced the old `authentik-media` volume. Updated it to archive the current `./data` directory used by the official Compose file.

## Review Notes
The examples remain intentionally local-development oriented. For production, Authentik should be placed behind HTTPS, secrets should be managed outside committed files, and outpost versions should be upgraded with the core Authentik version.
