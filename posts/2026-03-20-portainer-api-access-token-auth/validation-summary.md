# Validation Summary: How to Authenticate with the Portainer API Using Access Tokens - Token Auth

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- API access tokens
- JWT authentication
- Docker Engine API (via Portainer's Docker proxy endpoints)
- `curl`
- `jq`
- GitHub Actions
- HashiCorp Vault
- Python `requests`

## Sources Consulted
- Portainer documentation, "Accessing the Portainer API": https://docs.portainer.io/api/access
- Portainer documentation, "API documentation": https://docs.portainer.io/api/docs
- Portainer documentation, "API usage examples": https://docs.portainer.io/api/examples
- Portainer source, `user_create_access_token.go`: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_create_access_token.go
- Portainer source, `user_get_access_tokens.go`: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_get_access_tokens.go
- Portainer source, `user_remove_access_token.go`: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_remove_access_token.go
- Portainer source, `logout.go`: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/logout.go
- Portainer source, `service.go` for API key format/prefix handling: https://github.com/portainer/portainer/blob/develop/api/apikey/service.go
- Docker Engine API OpenAPI spec, `POST /containers/create`: https://docs.docker.com/reference/api/engine/version/v1.44.yaml

## Issues Found
- The prerequisites incorrectly implied that admin access or a separate API-access toggle was required. I changed this to require the permissions needed for the resources being managed, because Portainer documents API access as per-user and permission-scoped.
- The comparison table said JWT revocation happens on "re-login". Current Portainer behavior supports JWT revocation on logout, so I changed this to "Logout or expiry".
- The UI token-creation steps omitted the current-password confirmation used for internal-auth token creation. I updated the steps to reflect the current flow more precisely.
- The API token-creation example omitted the current password from the `POST /users/{id}/tokens` payload. Current Portainer versions require `password` for internal authentication, so I added it and kept the example JWT-based bootstrap flow intact.
- The shell snippet extracted `rawAPIKey` from an unquoted JSON variable. I quoted the variable before piping to `jq` to avoid shell word-splitting issues.
- The container-creation example passed `name` in the JSON body. Portainer proxies Docker's `POST /containers/create`, where the container name is a query parameter, so I moved `name` into the request URL and removed it from the JSON payload.

## Review Notes
- The `POST /users/{id}/tokens` endpoint only allows a user to create a token for themselves; the post's example is correct because it first resolves the current user with `/api/users/me`.
- Current Portainer source indicates the password field is required for internal authentication (and for the initial admin account), so the API example should be understood as an internal-auth example.
