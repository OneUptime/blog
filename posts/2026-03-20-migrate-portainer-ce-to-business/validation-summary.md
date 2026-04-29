# Validation Summary: How to Migrate from Portainer CE to Business Edition

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Portainer Community Edition (CE)
- Portainer Business Edition (BE / EE)
- Docker (image management, volumes, container lifecycle)
- Portainer HTTP API (licenses, settings, roles, endpoints, stacks)
- LDAP / Active Directory authentication
- Bash / curl / Python (json.tool) for API verification

## Sources Consulted
- Portainer BE upgrade docs: https://docs.portainer.io/start/upgrade/tobe/docker
- Portainer CE install docs: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Authentication docs: https://docs.portainer.io/admin/settings/authentication
- Portainer Active Directory docs: https://docs.portainer.io/admin/settings/authentication/active-directory
- Portainer "Deprecated and Removed Features": https://docs.portainer.io/advanced/deprecated
- Portainer CE vs BE comparison: https://www.portainer.io/blog/portainer-community-edition-ce-vs-portainer-business-edition-be-whats-the-difference
- Portainer source code (verifying handlers and payloads):
  - `app/react/portainer/licenses/license.service.ts` (license attach payload)
  - `api/http/handler/settings/handler.go` (settings routes)
  - `api/portainer.go` (auth method constants)
  - `api/cli/cli.go` (kingpin `--version` registration)

## Issues Found

1. **License API payload field name was wrong.**
   The post used `{"licenseKey": "your-be-license-key"}`. The Portainer source (`license.service.ts`) shows the API expects `licenseKeys` as an **array of strings**. Updated the curl example to `{"licenseKeys": ["your-be-license-key"]}`.

2. **LDAP configuration endpoint was wrong.**
   The post used `PUT /api/settings/authentication`, which does not exist. The settings handler (`api/http/handler/settings/handler.go`) only registers `GET /settings`, `PUT /settings`, and `GET /settings/public`. LDAP/OAuth is configured by sending the `LDAPSettings` (and `AuthenticationMethod`) inside the body of `PUT /api/settings`. Updated the URL accordingly.

3. **Feature comparison table contained outdated/inaccurate rows.**
   - **Nomad row removed.** Nomad support was deprecated and removed in Portainer 2.20.0 per the official "Deprecated and Removed Features" doc. Listing it as a BE-only feature is no longer correct.
   - **SSO (OAuth/LDAP) row corrected.** The original table claimed CE has no SSO. In reality, Portainer CE includes basic LDAP and generic OAuth (constants `AuthenticationLDAP` / `AuthenticationOAuth` and the LDAP service ship in the OSS code). What BE actually adds are AD/OAuth provider templates, automatic user provisioning, and group-to-team mapping. Row updated to "Basic" vs "Advanced (AD/OAuth templates, group-to-team sync)".

## Review Notes
- The post uses `portainer/portainer-ee:latest` and `portainer/portainer-ce:latest`. Portainer's official docs recommend pinning to the `:lts` (or `:sts`) tag for production deployments. This is a best-practice nit rather than an error and was left as-is to preserve author tone.
- `docker run --rm portainer/portainer-ee:latest --version` does work — the binary uses kingpin which auto-registers a `--version` flag (`api/cli/cli.go`).
- The Portainer API still uses `/api/endpoints` for what the UI now calls "Environments"; the path-vs-UI naming is intentional and documented.
- Default ports (`9443` for HTTPS UI, `8000` for the Edge tunnel) used in the run commands are correct.
- Custom Roles via `POST /api/roles` is BE-exclusive; the exact body field schema (`name`, `authorizations` map) is not exhaustively published in the public docs but matches the BE Swagger structure and is reasonable as a representative example. Left unchanged.
- Data-volume compatibility between CE and BE (drop-in upgrade by reusing `portainer_data`) is the official upgrade path per `docs.portainer.io/start/upgrade/tobe/docker`.
