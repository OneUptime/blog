# Validation Summary: How to Run Zitadel in Docker for IAM

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- ZITADEL
- Docker and Docker Compose
- PostgreSQL
- OpenID Connect and OAuth 2.0
- React with oidc-client-ts
- Python Flask
- PyJWT and JWKS validation
- ZITADEL service accounts and private key JWT authentication

## Sources Consulted
- ZITADEL Docker Compose documentation: https://zitadel.com/docs/self-hosting/deploy/compose
- ZITADEL Linux/self-hosted quickstart: https://zitadel.com/docs/self-hosting/deploy/linux
- ZITADEL configuration reference: https://zitadel.com/docs/self-hosting/manage/configure/configure
- ZITADEL requirements: https://zitadel.com/docs/self-hosting/manage/requirements
- ZITADEL CLI lifecycle documentation: https://zitadel.com/docs/self-hosting/manage/cli/overview
- ZITADEL Project API v2 CreateProject reference: https://zitadel.com/docs/reference/api/project/zitadel.project.v2.ProjectService.CreateProject
- ZITADEL Application API v2 CreateApplication reference: https://zitadel.com/docs/reference/api/application/zitadel.application.v2.ApplicationService.CreateApplication
- ZITADEL User API v2 CreateUser and AddKey references: https://zitadel.com/docs/reference/api/user/zitadel.user.v2.UserService.CreateUser and https://zitadel.com/docs/reference/api/user/zitadel.user.v2.UserService.AddKey
- ZITADEL OIDC/OAuth web keys documentation: https://zitadel.com/docs/guides/integrate/login/oidc/webkeys
- ZITADEL service-account private key JWT documentation: https://zitadel.com/docs/guides/integrate/service-accounts/private-key-jwt
- PyJWT documentation: https://pyjwt.readthedocs.io/
- oidc-client-ts documentation: https://authts.github.io/oidc-client-ts/

## Issues Found
- The quick-start command claimed ZITADEL could run with an embedded CockroachDB. Current ZITADEL self-hosting documentation requires PostgreSQL, so I replaced the single-container command with a PostgreSQL container plus a ZITADEL container configured with a PostgreSQL DSN.
- The login URL was too generic. I changed it to the console URL with the documented login hint for the default admin account.
- The Compose snippet used `ZITADEL_EXTERNALDOMAIN`; current documentation uses `ZITADEL_DOMAIN` for the public domain setting. I updated the environment variable.
- The post presented `start-from-init` as a production runtime command. I added a note that it is for initial setup and that upgrades should use separate setup/runtime phases or `start-from-setup`.
- The project and OIDC application examples used deprecated v1 Management API endpoints. I updated them to the current v2 Project and Application API endpoints.
- The OIDC app example registered a confidential web client with Basic auth, but the React example is a browser client that cannot keep a client secret. I changed the app configuration to a user-agent/public client with no client authentication.
- The backend JWT validation example assumed JWT access tokens, while ZITADEL access tokens can be opaque unless configured otherwise. I set the OIDC app example to issue JWT access tokens.
- The Python JWT middleware imported `requests` without using it. I removed the unused import.
- The service-account example created only the account and then assumed a key existed. I added the current v2 key-generation API call.
- The service-account JWT example used a client ID for `iss` and `sub`. ZITADEL service-account private key JWT uses the service account `userId`, so I corrected the variable and claims.
- The conclusion referred generically to the Management API after examples had been updated to current v2 APIs. I changed that wording to "Zitadel APIs."

## Re-review 2026-06-25 (issue #148: "where is the zitadel-login service")
A reader pointed out that the Docker setup has no login service. This is a real gap on current Zitadel:
- `ghcr.io/zitadel/zitadel:latest` now tracks the Zitadel v4 line (v4.15.3 at time of re-review). Zitadel v4 split the login UI into a separate Next.js application shipped as its own image, `ghcr.io/zitadel/zitadel-login` (Login V2), served at `/ui/v2/login` on port 3000.
- New v4 instances default to `LoginV2 Required=true`, so the core redirects sign-in to `/ui/v2/login`. A single-container deployment with no login service therefore has a broken interactive login (the API and console assets still work).
- Login V1 is still bundled in v4 and can be re-enabled with `ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_REQUIRED=false`. It is not removed/deprecated yet; removal is only planned for a future major release.

Changes made:
- Pinned the image to `v4.15.3` in both the quick-start `docker run` and the production Compose (was `:latest`), so the tutorial does not silently break when `:latest` moves to a new major.
- Quick start now sets `ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_REQUIRED=false` so the single-container evaluation setup keeps a working login (bundled Login V1 at `/ui/login`).
- Added a "Where Is the Login Service?" section explaining the v2/v3 vs v4 login architecture.
- Rewrote the production Compose to the correct v4 architecture: PostgreSQL + Zitadel core + the separate `zitadel-login` container + a Traefik reverse proxy, with the `login-client` PAT bootstrap and shared volume. Modeled on Zitadel's official `deploy/compose/docker-compose.yml`.
- Updated the TLS section for the proxy-terminated layout and kept a direct-on-core TLS option.
- Standardized the PostgreSQL image to `postgres:17-alpine` (the production Compose previously used `postgres:16-alpine` while the quick start used 17).

Sources re-checked: Zitadel `deploy/compose/docker-compose.yml` and `.env.example` (v4.15.3 tag), `apps/docs/.../login-client.mdx`, `cmd/defaults.yaml`, and the GHCR `zitadel-login` package tags.

## Review Notes
The post still uses local HTTP and disabled TLS for development examples. That is appropriate for a local tutorial, but production deployments should use TLS, strong generated secrets, and the official production checklist.
