# Validation Summary: How to Automate Portainer Configuration with API Scripts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Bash
- `curl`
- `jq`
- HashiCorp Vault CLI
- Harbor container registry

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API example for admin initialization and JWT authentication: https://docs.portainer.io/admin/environments/add/api
- Portainer API access token documentation: https://docs.portainer.io/2.21/api/access
- Portainer source for `/api/system/status`: https://github.com/portainer/portainer/blob/develop/api/http/handler/system/status.go
- Portainer source for `/api/users/admin/init`: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/admin_init.go
- Portainer source for `/api/auth`: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source for `/api/settings`: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source for registry creation: https://github.com/portainer/portainer/blob/develop/api/http/handler/registries/registry_create.go
- Portainer source for team creation: https://github.com/portainer/portainer/blob/develop/api/http/handler/teams/team_create.go
- Portainer source for settings and registry type definitions: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Vault CLI `kv get` command reference: https://developer.hashicorp.com/vault/docs/commands/kv/get

## Issues Found
- The script treated `/api/users/admin/init` as if it returned a JWT. Portainer's admin-init handler returns a user object, so the script was updated to initialize first and then authenticate separately against `/api/auth` to obtain the `jwt`.
- The `/api/auth` example used lowercase `username` and `password` keys instead of Portainer's documented `Username` and `Password` fields. The payload was updated to match the official API contract.
- The settings payload used unsupported keys (`enableTelemetry` and `loginBannerEnabled`). These were removed and replaced with supported settings fields (`SnapshotInterval` and `EdgeAgentCheckinInterval`) accepted by the current settings update handler.
- The Harbor registry example used `Type: 1`, which is Quay.io in Portainer's registry type definitions. This was corrected to `Type: 3` for a custom registry, and `TLS: true` was added for the Harbor example.
- The post claimed idempotent automation, but the original `add_registry` and `create_team` functions would fail on repeat runs once the resources already existed. Both functions were updated to check for existing registries or teams before creating them.
- The `log` function wrote to stdout, which polluted values captured with command substitution such as `BACKEND_TEAM=$(create_team ...)`. Logging was redirected to stderr so captured IDs remain clean.

## Review Notes
- Portainer also supports long-lived API access tokens via the `X-API-Key` header. This post's JWT-based login flow is still valid, but Portainer's documentation notes that JWTs expire after 8 hours.
