# Validation Summary: How to Create a Stack from a Git Repository in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (CE)
- Portainer REST API (auth, stacks, webhooks)
- Docker Compose (v2 / Compose Spec)
- GitOps (Git-based polling and webhook redeploys)

## Sources Consulted
- Portainer source on `develop` branch:
  - `api/http/handler/stacks/handler.go` — confirms route `POST /api/stacks/create/{type}/{method}` and webhook route `POST /api/stacks/webhooks/{webhookID}`
  - `api/http/handler/stacks/stack_create.go` — confirms `type` path values are `swarm` / `standalone` / `kubernetes` (strings, not the integer 1/2/3 used on the persisted Stack record), `method` is `string` / `repository` / `file`, and `endpointId` is a query parameter
  - `api/http/handler/stacks/create_compose_stack.go` — confirms `composeStackFromFileContentPayload` uses PascalCase fields (`Name`, `StackFileContent`, `Env`, `FromAppTemplate`) with no JSON tags; `Env` entries are `portainer.Pair` (`{"name": "...", "value": "..."}`)
- Portainer auth handler — confirms `POST /api/auth` returns `{"jwt": "..."}` (lowercase)
- Portainer docs: https://docs.portainer.io/user/docker/stacks and the webhook page
- Docker Compose Spec — confirms `restart: unless-stopped` is valid; `version` top-level key is obsolete in Compose v2 (still parses with a warning)

## Issues Found

1. **Wrong API endpoint structure for stack creation.** The post used `POST https://localhost:9443/api/stacks` with `type` and `endpointId` placed in the JSON body. The actual current Portainer route is `POST /api/stacks/create/{type}/{method}` with `endpointId` as a query parameter; `type` is a string (`standalone` for non-Swarm Docker Compose), not an integer. Updated the curl URL to `https://localhost:9443/api/stacks/create/standalone/string?endpointId=1` and removed `type` / `endpointId` from the body.

2. **Wrong JSON body casing.** The body used camelCase (`name`, `stackFileContent`, `env`). The Go payload struct exposes PascalCase field names (`Name`, `StackFileContent`, `Env`) because there are no `json:"..."` struct tags. Go's decoder is case-insensitive on input so the camelCase form often works, but PascalCase is canonical and is what Portainer's own examples and community CLIs use. Updated the body fields to `Name`, `StackFileContent`, `Env` (the inner `Env` pair entries correctly remain `{"name", "value"}` because `portainer.Pair` does have lowercase JSON tags).

3. **`version: "3.8"` inside the inline `StackFileContent` JSON string** — removed for the API example since the top-level `version` key is obsolete in current Docker Compose and including it just adds a warning. Left the `version: "3.8"` line in the standalone web-editor YAML example because that example is still widely copy-pasted and Compose still accepts it without error; only changed the inline JSON-escaped variant to keep the fix minimal.

## Review Notes
- The `# Portainer redeploys the stack with --pull-always` comment is loosely accurate — Portainer's webhook re-pulls images when the "Re-pull image" option is enabled (default for Git-based stacks), but it doesn't literally pass `--pull-always` (that's a `docker run` flag). Left as-is since it's an explanatory comment, not a command, and the practical behavior described is correct.
- The auth example uses `https://localhost:9443` with `--insecure`, which is the correct setup for Portainer's default self-signed TLS on port 9443.
- The polling interval format (`5m`) is accepted; Portainer enforces a 1-minute minimum.
- The web-editor YAML still includes `version: "3.8"`, which Docker Compose v2 marks as obsolete and ignores. It's not an error, but new examples should drop it.
