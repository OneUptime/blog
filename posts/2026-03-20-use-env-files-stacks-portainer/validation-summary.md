# Validation Summary: How to Use .env Files with Stacks in Portainer - Use Stacks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (CE/BE)
- Docker Compose
- Docker Compose `.env` file convention
- Portainer HTTP API (auth, stacks, webhooks)
- Portainer GitOps / Git-based stack deployment
- nginx, postgres (example services)

## Sources Consulted
- Portainer API overview: https://docs.portainer.io/api/docs
- Portainer source `api/http/handler/stacks/stack_create.go` (POST /api/stacks handler) — confirms `type`, `method`, `endpointId` are query parameters
- Portainer source `api/http/handler/auth/authenticate.go` (POST /api/auth handler) — confirms request body `Username`/`Password` and response `jwt` field
- Docker Compose file reference (env-file / variable substitution behavior)

## Issues Found
- **Stack creation curl used body fields for routing parameters.** The original example placed `type` and `endpointId` inside the JSON body. Portainer's `POST /api/stacks` handler reads `type`, `method`, and `endpointId` as URL query parameters and only consumes `name`, `stackFileContent`, and `env` from the body. Updated the curl to pass `?type=2&method=string&endpointId=1` in the query string and removed `type`/`endpointId` from the body.

## Review Notes
- Compose file uses `version: "3.8"`. The Compose v2 spec no longer requires the `version` key, but it remains backwards-compatible and Portainer still parses it correctly, so it was left as-is.
- The `stack.env` filename in the troubleshooting block is an artifact of how Portainer writes the uploaded environment file inside the deployed stack directory; the error message text is plausible and the suggested fixes are valid.
- The webhook comment mentions `--pull-always`; in practice Portainer's stack webhook respects the stack's "Re-pull image" / `prune` settings rather than literally invoking that flag, but as an inline comment describing intent it is acceptable.
- Auth example correctly targets `/api/auth` and parses the `jwt` field from the response.
