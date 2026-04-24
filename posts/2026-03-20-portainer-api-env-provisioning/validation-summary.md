# Validation Summary: How to Automate Environment Provisioning with the Portainer API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Portainer Agent
- Docker Engine API
- Docker Compose
- Bash
- `curl`
- `jq`

## Sources Consulted
- Portainer documentation: Add an environment via the Portainer API — https://docs.portainer.io/admin/environments/add/api
- Portainer documentation: Install Portainer Agent on Docker Standalone — https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer documentation: API usage examples — https://docs.portainer.io/sts/api/examples
- Portainer documentation: Environments — https://docs.portainer.io/admin/environments/environments
- Portainer documentation: Roles — https://docs.portainer.io/sts/admin/user/roles
- Portainer source: endpoint creation handler — https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer source: endpoint update handler — https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_update.go
- Portainer source: standalone compose stack creation handler — https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/create_compose_stack.go
- Portainer source: team creation handler — https://github.com/portainer/portainer/blob/develop/api/http/handler/teams/team_create.go
- Portainer source: access policy and role definitions — https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source: built-in role IDs migration — https://github.com/portainer/portainer/blob/develop/api/datastore/migrator/migrate_dbversion20.go
- Docker documentation: `docker network create` — https://docs.docker.com/reference/cli/docker/network/create/
- Docker documentation: Compose file version and name elements — https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The environment registration example posted JSON to `/api/endpoints`, but Portainer’s endpoint creation handler expects `multipart/form-data`. I changed the example to use `curl --form`, which matches both the official Portainer documentation and the handler implementation.
- The environment registration example used `EndpointCreationType=2` for a Portainer Agent environment without the TLS flags Portainer expects for agent connections. I added `TLS=true`, `TLSSkipVerify=true`, and `TLSSkipClientVerify=true`, and changed the sample agent address to `host:9001` to match the Portainer Agent documentation.
- The `register_environment` function printed both a log line and the endpoint ID to stdout, so `ENV_ID=$(register_environment ...)` would capture invalid multi-line output. I redirected the human-readable log line to stderr so the command substitution returns only the endpoint ID.
- The network helper defaulted to `overlay`, which is not the default Docker network driver and is only appropriate when Swarm mode is enabled. I changed the default driver to `bridge`, which aligns with Docker’s current documentation for standalone environments.
- The stack deployment example depended on `python3` even though it was not listed as a prerequisite. I replaced that conversion step with `jq -Rs .`, which preserves the same behavior using a tool already listed in the prerequisites.
- The stack deployment payload included `SwarmID` for the `/api/stacks/create/standalone/string` endpoint. Portainer’s standalone compose stack handler accepts `Name`, `StackFileContent`, `Env`, and `FromAppTemplate`; `SwarmID` is not part of that payload. I removed it.
- The team access example treated `RoleId` values as `1=ReadOnly, 2=ReadWrite`, which is incorrect for Portainer. I updated the example to use the actual built-in Portainer role IDs and changed the sample assignment to `3` for `Standard user`.

## Review Notes
- Portainer’s current documentation labels the classic Portainer Agent path on Docker Standalone as a legacy option and recommends the Edge Agent for most new deployments. The article remains technically valid after correction, but that caveat is worth keeping in mind for future revisions.
- The sample Compose file still uses the top-level `version: '3.8'` field. Docker currently treats `version` as obsolete but still accepts it for backward compatibility, so this is not incorrect.
